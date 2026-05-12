"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mic, Volume2, RefreshCw, ThumbsUp, ThumbsDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppState, Conversation } from "@/lib/agent-state";
import { buildPrompt } from "@/lib/agent-state";
import { retrieve, composeAnswer, chunkText } from "@/lib/retrieval";
import { cn } from "@/lib/utils";

const TEST_LIBRARY: Record<string, { question: string; expected: string }> = {
  "upload-readiness": { question: "What should I upload for this agent?", expected: "The agent should recommend focused FAQ, product, policy, or help documents." },
  "source-backed": { question: "Give me an answer with sources.", expected: "The agent should answer from retrieved knowledge, show confidence, and expose the source snippets." },
  "fallback-behavior": { question: "What if the answer is not in my documents?", expected: "The agent should avoid guessing, explain what is missing, and suggest adding a manual FAQ or clearer document." },
};

function formatAnswer(text: string): string {
  const lines = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").split("\n");
  const html: string[] = [];
  let listOpen = false;
  for (const line of lines) {
    const t = line.trim();
    if (!t) { if (listOpen) { html.push("</ul>"); listOpen = false; } continue; }
    const bullet = t.match(/^[-*]\s+(.+)/);
    if (bullet) { if (!listOpen) { html.push("<ul class='list-disc pl-4 space-y-1'>"); listOpen = true; } html.push(`<li>${bullet[1]}</li>`); continue; }
    if (listOpen) { html.push("</ul>"); listOpen = false; }
    const heading = t.match(/^#{1,6}\s+(.+)/);
    html.push(heading ? `<p class="font-semibold mt-1">${heading[1]}</p>` : `<p>${t}</p>`);
  }
  if (listOpen) html.push("</ul>");
  return html.join("");
}

interface TestAgentProps {
  state: AppState;
  onStateChange: (s: AppState) => void;
}

export function TestAgent({ state, onStateChange }: TestAgentProps) {
  const [input, setInput] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const agent = state.agents.find((a) => a.id === state.activeAgentId) || state.agents[0];
  const conversations = state.conversations.filter((c) => c.agentId === agent.id);
  const latest = conversations.at(-1);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [conversations.length, streaming]);

  async function answerQuestion(question: string, opts: { expected?: string; testId?: string } = {}) {
    if (!question.trim() || streaming) return;
    setStreaming(true);
    const retrieval = retrieve(question, agent.knowledge);
    const confidence = Math.min(98, Math.max(18, Math.round(retrieval.score)));

    let llmAnswer = "";
    let provider = "local-demo";
    let model = "browser-retrieval";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, agentName: agent.name, systemPrompt: buildPrompt(agent), priorMessageCount: conversations.length, context: retrieval.context, sources: retrieval.sources }),
      });
      if (res.ok) { const d = await res.json(); llmAnswer = d.answer; provider = d.provider; model = d.model; }
    } catch { /* fallback */ }

    const answer = llmAnswer || composeAnswer(question, agent, retrieval, confidence);
    const record: Conversation = {
      id: crypto.randomUUID(), agentId: agent.id, question, answer, confidence,
      sources: retrieval.sources, provider, model, expected: opts.expected, testId: opts.testId,
      streaming: false, responseTime: 0.5, createdAt: new Date().toISOString(),
    };
    const newConvos = [...state.conversations, record];
    onStateChange({ ...state, conversations: newConvos });
    setStreaming(false);
    if (voiceEnabled && "speechSynthesis" in window) {
      const utter = new SpeechSynthesisUtterance(answer.replace(/\*\*(.+?)\*\*/g, "$1").replace(/#{1,6}\s/g, "").slice(0, 400));
      utter.rate = 0.88;
      window.speechSynthesis.speak(utter);
    }
  }

  function setFeedback(val: "up" | "down") {
    if (!latest) return;
    const convos = state.conversations.map((c) => c.id === latest.id ? { ...c, feedback: val } : c);
    onStateChange({ ...state, conversations: convos });
  }

  function retry() {
    const last = conversations.at(-1);
    if (last) answerQuestion(last.question);
  }

  function startVoice() {
    type SpeechRecognitionCtor = new () => { lang: string; interimResults: boolean; onresult: (e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => void; start: () => void };
    const win = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not available. Try Chrome or Edge."); return; }
    const r = new SR();
    r.lang = "en-US";
    r.interimResults = false;
    r.onresult = (e) => { const t = e.results[0][0].transcript; setInput(t); answerQuestion(t); };
    r.start();
  }

  function addFailedToFaq() {
    if (!latest) return;
    const faqText = `Q: ${latest.question}\nA: Add the correct source-backed answer here before publishing.`;
    const item = { id: crypto.randomUUID(), title: "Failed answer FAQ draft", type: "faq" as const, text: faqText, size: faqText.length, status: "Needs correction", chunkCount: 1, updatedAt: new Date().toISOString() };
    const agents = state.agents.map((a) => a.id === agent.id ? { ...a, knowledge: [...a.knowledge, item] } : a);
    onStateChange({ ...state, agents });
  }

  const suggestions = (() => {
    if (!latest) return [`What can ${agent.name} help with?`, "Summarize the uploaded document.", "What should users do first?"];
    return latest.sources.length ? ["Go deeper on this topic.", "Give me a simpler explanation.", "What should I ask next?"] : ["What should I upload?", "Help me set up the agent.", "What does the knowledge base cover?"];
  })();

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-6 h-[calc(100vh-10rem)]">
      {/* Chat panel */}
      <div className="bg-aira-card border border-aira-line rounded-xl flex flex-col overflow-hidden">
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-aira-line bg-aira-bg/40">
          <h3 className="font-semibold text-sm text-slate-100">{agent.name}</h3>
          <div className="flex items-center gap-1">
            <button onClick={() => { setVoiceEnabled((v) => !v); window.speechSynthesis?.cancel(); }}
              className={cn("p-1.5 rounded-lg transition-all", voiceEnabled ? "text-emerald-400 bg-emerald-500/10" : "text-slate-500 hover:text-slate-200 hover:bg-white/8")}>
              <Volume2 className="w-4 h-4" />
            </button>
            <button onClick={retry} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/8 transition-all"><RefreshCw className="w-4 h-4" /></button>
            <button onClick={startVoice} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/8 transition-all"><Mic className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Model status bar */}
        <div className="px-4 py-1.5 text-[11px] border-b border-aira-line bg-aira-bg/30 text-slate-500 flex items-center gap-2">
          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", !latest ? "bg-slate-600" : latest.provider === "groq" ? "bg-emerald-500" : latest.provider === "gemini" ? "bg-yellow-500" : "bg-slate-600")} />
          {!latest ? "Model status: waiting for first question" : latest.provider === "groq" ? `Groq active (${latest.model})` : latest.provider === "gemini" ? `Gemini fallback active (${latest.model})` : "Local retrieval fallback"}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {conversations.length === 0 && (
            <div className="flex justify-start">
              <div className="max-w-[78%] bg-aira-bg border border-aira-line rounded-2xl rounded-tl-none px-4 py-2.5 text-sm text-slate-200">{agent.greeting}</div>
            </div>
          )}
          <AnimatePresence initial={false}>
            {conversations.map((conv) => (
              <motion.div key={conv.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                <div className="flex justify-end">
                  <div className="max-w-[78%] bg-gradient-to-br from-emerald-500/15 to-emerald-600/8 border border-emerald-500/15 rounded-2xl rounded-tr-none px-4 py-2.5 text-sm text-slate-100">{conv.question}</div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[78%]">
                    <div className="bg-aira-bg border border-aira-line rounded-2xl rounded-tl-none px-4 py-2.5 text-sm text-slate-200 space-y-1" dangerouslySetInnerHTML={{ __html: formatAnswer(conv.answer) }} />
                    <div className="flex items-center gap-2 mt-1 px-1">
                      <span className="text-[10px] text-slate-500">{conv.confidence}% confidence · {conv.sources.length} sources · {conv.provider}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {streaming && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-aira-bg border border-aira-line rounded-2xl rounded-tl-none px-4 py-3">
                <div className="flex gap-1">
                  {[0,1,2].map((i) => <motion.span key={i} animate={{ y: [0,-4,0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i*0.15 }} className="w-1.5 h-1.5 rounded-full bg-slate-600" />)}
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Test library strip */}
        <div className="flex gap-1.5 px-4 py-2 border-t border-aira-line bg-aira-bg/30 overflow-x-auto">
          {Object.entries(TEST_LIBRARY).map(([id, sc]) => (
            <button key={id} onClick={() => answerQuestion(sc.question, { expected: sc.expected, testId: id })}
              className="text-[10px] whitespace-nowrap px-2.5 py-1 rounded-full bg-white/4 border border-white/8 text-slate-500 hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all cursor-pointer">
              {sc.question.slice(0, 28)}…
            </button>
          ))}
        </div>

        {/* Suggestions strip */}
        {!streaming && (
          <div className="flex gap-1.5 px-4 py-2 border-t border-aira-line overflow-x-auto">
            {suggestions.map((s) => (
              <button key={s} onClick={() => answerQuestion(s)}
                className="text-[10px] whitespace-nowrap px-2.5 py-1 rounded-full bg-white/4 border border-white/8 text-slate-500 hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all cursor-pointer">
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input form */}
        <form onSubmit={(e) => { e.preventDefault(); answerQuestion(input); setInput(""); }} className="flex gap-2 p-3 border-t border-aira-line bg-aira-bg/40">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about the uploaded knowledge..."
            className="flex-1 h-10 bg-aira-card border border-aira-line rounded-xl px-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/15 transition-all" />
          <Button type="submit" size="icon" disabled={!input.trim() || streaming} className="h-10 w-10 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"><Send className="w-4 h-4" /></Button>
        </form>
      </div>

      {/* Sources panel */}
      <div className="space-y-3 overflow-y-auto">
        {/* Sources card */}
        <div className="bg-aira-card border border-aira-line rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-aira-line">
            <h3 className="font-semibold text-sm text-slate-100">Retrieved Sources</h3>
            <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full", latest ? latest.confidence >= 70 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : latest.confidence >= 45 ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-slate-500/10 text-slate-400 border border-slate-500/20")}>
              {latest ? `${latest.confidence}%` : "Ask first"}
            </span>
          </div>
          <div className="divide-y divide-aira-line">
            {latest?.sources.length ? latest.sources.map((src, i) => (
              <div key={i} className="px-4 py-3 border-b border-aira-line last:border-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-medium text-xs text-slate-300 truncate">{src.title}</span>
                  {src.score && <span className="text-[10px] text-emerald-400 shrink-0">{Math.round(src.score)}</span>}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-1">{src.preview}</p>
              </div>
            )) : <p className="px-4 py-5 text-xs text-slate-600">No retrieval yet.</p>}
          </div>
        </div>

        {/* Confidence reasoning */}
        {latest && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-aira-card border border-aira-line rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-aira-line">
              <h3 className="font-semibold text-sm text-slate-100">{latest.confidence >= 70 ? "High" : latest.confidence >= 45 ? "Medium" : "Low"} confidence</h3>
            </div>
            <div className="p-3 space-y-1 text-xs text-slate-500">
              <p>{latest.confidence >= 70 ? "The top source is closely aligned with the question." : latest.confidence >= 45 ? "The answer has partial source support." : "The answer needs better knowledge or FAQ additions."}</p>
              <p>Top source: {latest.sources[0]?.score ? `${Math.round(latest.sources[0].score)} relevance` : "no strong match"}.</p>
            </div>
          </motion.div>
        )}

        {/* Improvement */}
        {latest && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("bg-aira-card border rounded-xl overflow-hidden", latest.confidence < 60 || latest.feedback === "down" ? "border-amber-500/20 bg-amber-500/5" : "border-aira-line")}>
            <div className="px-4 py-3 border-b border-aira-line">
              <h3 className="font-semibold text-sm text-slate-100">{latest.confidence >= 60 && latest.feedback !== "down" ? "Next improvement" : "Improve this answer"}</h3>
            </div>
            <div className="p-3 text-xs text-slate-500 space-y-2">
              {latest.confidence >= 60 && latest.feedback !== "down"
                ? <p>Save this as a passing test question before publishing.</p>
                : <><p>Turn this question into a manual FAQ or upload a clearer source.</p><Button size="sm" variant="outline" onClick={addFailedToFaq} className="gap-1.5 h-7 text-xs w-full border-emerald-500/20 hover:bg-emerald-500/5 text-emerald-400"><Plus className="w-3 h-3" />Add to FAQ draft</Button></>
              }
            </div>
          </motion.div>
        )}

        {/* Feedback */}
        <div className="bg-aira-card border border-aira-line rounded-xl p-3">
          <p className="text-xs font-medium mb-2 text-slate-300">Response feedback</p>
          <div className="flex gap-2">
            <Button size="sm" variant={latest?.feedback === "up" ? "default" : "outline"} onClick={() => setFeedback("up")} disabled={!latest} className="flex-1 gap-1.5 h-8"><ThumbsUp className="w-3.5 h-3.5" />Helpful</Button>
            <Button size="sm" variant={latest?.feedback === "down" ? "destructive" : "outline"} onClick={() => setFeedback("down")} disabled={!latest} className="flex-1 gap-1.5 h-8"><ThumbsDown className="w-3.5 h-3.5" />Poor</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
