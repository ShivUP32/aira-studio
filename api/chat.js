// TODO: build systemPrompt server-side from stored agent config — never trust client-supplied prompts

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-aira-key");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const airaApiKey = process.env.AIRA_API_KEY;
  if (airaApiKey && req.headers["x-aira-key"] !== airaApiKey) {
    return res.status(401).json({ error: "Missing or invalid x-aira-key header" });
  }

  try {
    const {
      question,
      systemPrompt,
      context,
      sources = [],
      agentName = "Aira Agent",
      priorMessageCount = 0,
      conversationHistory = [],
    } = req.body || {};

    if (!question || !systemPrompt) {
      return res.status(400).json({ error: "Missing question or systemPrompt" });
    }
    if (question.length > 4000)     return res.status(400).json({ error: "question exceeds 4000 chars" });
    if (systemPrompt.length > 8000) return res.status(400).json({ error: "systemPrompt exceeds 8000 chars" });
    if (context && context.length > 12000) return res.status(400).json({ error: "context exceeds 12000 chars" });

    const payload = { question, systemPrompt, context, sources, agentName, priorMessageCount, conversationHistory };

    const groqResult = await callGroq(payload);
    if (groqResult.ok) return res.status(200).json({ answer: groqResult.answer, provider: "groq", model: groqResult.model });

    const geminiResult = await callGemini(payload);
    if (geminiResult.ok) return res.status(200).json({ answer: geminiResult.answer, provider: "gemini", model: geminiResult.model, fallbackFrom: "groq" });

    return res.status(502).json({ error: "LLM providers unavailable", groqError: groqResult.error, geminiError: geminiResult.error });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unexpected chat error" });
  }
}

function buildSystemContent({ systemPrompt, agentName, priorMessageCount, context, sources }) {
  const sourceList = sources.map((s, i) => `${i + 1}. ${s.title}: ${s.preview}`).join("\n");
  return `${systemPrompt}

Agent name: ${agentName}
Prior agent responses in this conversation: ${priorMessageCount}

Important greeting rule:
The UI already shows the agent greeting. Do not repeat it. Answer the user's current question directly.

Retrieved knowledge context:
${context || "No relevant context was retrieved."}

Retrieved sources:
${sourceList || "No sources available."}

Formatting requirements:
- Return clean markdown the UI can structure.
- Use bold labels on their own line when helpful, e.g. **Active Voice** or **Summary**.
- Use bullets for examples or comparisons.
- Keep each paragraph under three sentences.
- For teaching questions use: short intro → labeled sections → bullets → summary.
- End with one natural next-step question the user could answer.
- If context is insufficient, say what is missing and ask one clear follow-up question.`;
}

async function callGroq({ systemPrompt, conversationHistory, question, agentName, priorMessageCount, context, sources }) {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
  if (!apiKey) return { ok: false, error: "GROQ_API_KEY is not configured" };

  const history = (conversationHistory || [])
    .slice(-8)
    .map(m => ({ role: m.role, content: String(m.content).slice(0, 2000) }));

  try {
    const response = await fetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: buildSystemContent({ systemPrompt, agentName, priorMessageCount, context, sources }) },
          ...history,
          { role: "user", content: question },
        ],
        temperature: 0.4,
        max_completion_tokens: 700,
      }),
    });

    const data = await response.json();
    if (!response.ok) return { ok: false, error: data.error?.message || `Groq returned ${response.status}` };
    return { ok: true, model, answer: data.choices?.[0]?.message?.content?.trim() || "" };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function callGemini({ systemPrompt, conversationHistory, question, agentName, priorMessageCount, context, sources }) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  if (!apiKey) return { ok: false, error: "GEMINI_API_KEY is not configured" };

  const history = (conversationHistory || [])
    .slice(-8)
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content).slice(0, 2000) }],
    }));

  try {
    const response = await fetch(`${GEMINI_BASE_URL}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildSystemContent({ systemPrompt, agentName, priorMessageCount, context, sources }) }] },
        contents: [
          ...history,
          { role: "user", parts: [{ text: question }] },
        ],
        generationConfig: { temperature: 0.4, maxOutputTokens: 700 },
      }),
    });

    const data = await response.json();
    if (!response.ok) return { ok: false, error: data.error?.message || `Gemini returned ${response.status}` };
    return { ok: true, model, answer: data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim() || "" };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
