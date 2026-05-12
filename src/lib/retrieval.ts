import type { KnowledgeItem } from "./agent-state";

const commonSupportTerms = new Set(["user","users","platform","agent","support","help","question","answer","document","profile","account"]);
const stopWords = new Set(["the","and","for","with","from","that","this","your","you","how","what","when","where","who","why","can","do","does","are","is","should","could","would","will","about","into","using","available","different"]);

export function tokenize(text: string): string[] {
  return [...new Set(String(text).toLowerCase().match(/[a-z0-9]+/g) || [])].filter((w) => w.length > 2 && !stopWords.has(w));
}

export function chunkText(text: string): string[] {
  const clean = String(text).replace(/\r/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  const marked = clean.replace(/\s+(?=((?:Q[:.)]\s*)?(?:How|What|When|Where|Who|Why|Can|Do|Does|Is|Are|Should|Could|Will|Which)\b[^?\n]{8,180}\?))/g, "\n\n");
  const blocks = marked.split(/\n{2,}/).map((b) => b.replace(/\s+/g, " ").trim()).filter(Boolean);
  const chunks = blocks.flatMap(splitLongChunk);
  return chunks.length ? chunks : splitLongChunk(clean.replace(/\s+/g, " "));
}

function splitLongChunk(text: string): string[] {
  if (text.length <= 1100) return [text];
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    if (`${current} ${s}`.trim().length > 950 && current) { chunks.push(current.trim()); current = s; }
    else { current = `${current} ${s}`.trim(); }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

function detectQuestionHeading(text: string): string {
  return String(text).match(/(?:^|\s)((?:Q[:.)]\s*)?(?:How|What|When|Where|Who|Why|Can|Do|Does|Is|Are|Should|Could|Will|Which)\b[^?]{8,180}\?)/i)?.[1] || "";
}

function chunkKnowledge(item: KnowledgeItem) {
  return chunkText(item.text).map((text) => ({ title: item.title, text, heading: detectQuestionHeading(text) }));
}

function scoreChunk(query: string, queryTerms: string[], chunk: { text: string; heading: string }): number {
  if (!queryTerms.length) return 0;
  const chunkTerms = tokenize(chunk.text);
  const headingTerms = tokenize(chunk.heading || "");
  const bodyOverlap = queryTerms.filter((t) => chunkTerms.includes(t)).length;
  const headingOverlap = queryTerms.filter((t) => headingTerms.includes(t)).length;
  const bodyDensity = bodyOverlap / queryTerms.length;
  const headingDensity = headingTerms.length ? headingOverlap / queryTerms.length : 0;
  const normalizedQuery = tokenize(query).join(" ");
  const normalizedHeading = tokenize(chunk.heading || "").join(" ");
  const exactHeadingBoost = normalizedHeading && normalizedHeading.includes(normalizedQuery.slice(0, 80)) ? 18 : 0;
  const importantOverlap = queryTerms.filter((t) => !commonSupportTerms.has(t) && headingTerms.includes(t)).length;
  const score = headingDensity * 58 + bodyDensity * 28 + importantOverlap * 5 + exactHeadingBoost;
  return Math.min(98, Math.round(score));
}

export interface RetrievalResult {
  score: number;
  sources: { title: string; preview: string; text: string; score?: number }[];
  context: string;
}

export function retrieve(query: string, knowledge: KnowledgeItem[]): RetrievalResult {
  const chunks = knowledge.flatMap(chunkKnowledge);
  if (/summari[sz]e|overview|uploaded document|what.*document/i.test(query) && chunks.length) {
    return {
      score: 72,
      sources: chunks.slice(0, 3).map((c) => ({ title: c.title, preview: c.text.slice(0, 220), text: c.text, score: 72 })),
      context: chunks.slice(0, 2).map((c) => c.text).join("\n"),
    };
  }
  const queryTerms = tokenize(query);
  const ranked = chunks.map((c) => ({ ...c, score: scoreChunk(query, queryTerms, c) })).sort((a, b) => b.score - a.score).slice(0, 3);
  const useful = ranked.filter((c) => c.score >= 12);
  return {
    score: useful[0]?.score || 0,
    sources: useful.map((c) => ({ title: c.title, preview: c.text.slice(0, 220), text: c.text, score: c.score })),
    context: useful.map((c) => c.text).join("\n"),
  };
}

function stripQuestionHeading(text: string): string {
  const heading = detectQuestionHeading(text);
  if (!heading) return String(text).trim();
  const val = String(text);
  const idx = val.indexOf(heading);
  return idx >= 0 ? val.slice(idx + heading.length).trim() : val.replace(heading, "").trim();
}

export function composeAnswer(question: string, agent: { fallback: string }, retrieval: RetrievalResult, confidence: number): string {
  if (!retrieval.context || confidence < 35) {
    return `${agent.fallback.replace(/[.!?]+$/, "")}. I checked the available knowledge, but I could not find a reliable answer for "${question}".`;
  }
  const bestSource = retrieval.sources[0]?.text || retrieval.context;
  const answerText = stripQuestionHeading(bestSource);
  const sentences = answerText.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 30 && !/recommended prompt pattern|greeting:|fallback:/i.test(s)).slice(0, 4);
  const body = sentences.length ? sentences.join(" ") : answerText.slice(0, 360);
  return `**Answer**\n${body}\n\n**Next step**\n${confidence < 55 ? "This looks partially supported, so add clearer knowledge or test another question." : "Ask a follow-up question or test this answer before publishing."}`;
}
