const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { question, systemPrompt, context, sources = [], agentName = "Aira Agent", priorMessageCount = 0 } = req.body || {};

    if (!question || !systemPrompt) {
      return res.status(400).json({ error: "Missing question or systemPrompt" });
    }

    const prompt = buildPrompt({ question, systemPrompt, context, sources, agentName, priorMessageCount });
    const groqResult = await callGroq(prompt);
    if (groqResult.ok) {
      return res.status(200).json({
        answer: groqResult.answer,
        provider: "groq",
        model: groqResult.model
      });
    }

    const geminiResult = await callGemini(prompt);
    if (geminiResult.ok) {
      return res.status(200).json({
        answer: geminiResult.answer,
        provider: "gemini",
        model: geminiResult.model,
        fallbackFrom: "groq"
      });
    }

    return res.status(502).json({
      error: "LLM providers unavailable",
      groqError: groqResult.error,
      geminiError: geminiResult.error
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unexpected chat error" });
  }
};

function buildPrompt({ question, systemPrompt, context, sources, agentName, priorMessageCount }) {
  const sourceList = sources.map((source, index) => `${index + 1}. ${source.title}: ${source.preview}`).join("\n");
  return `${systemPrompt}

Agent name: ${agentName}
Prior agent responses in this conversation: ${priorMessageCount}

Important greeting rule:
The UI already shows the agent greeting before the user asks a question. Do not repeat the greeting. Answer the user's current question directly.

Retrieved knowledge context:
${context || "No relevant context was retrieved."}

Retrieved sources:
${sourceList || "No sources available."}

User question:
${question}

Answer as the configured agent. If the context is insufficient, say what is missing and ask one clear follow-up question.`;
}

async function callGroq(prompt) {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
  if (!apiKey) return { ok: false, error: "GROQ_API_KEY is not configured" };

  try {
    const response = await fetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are the production LLM for Aira Studio agents." },
          { role: "user", content: prompt }
        ],
        temperature: 0.4,
        max_completion_tokens: 700
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return { ok: false, error: data.error?.message || `Groq returned ${response.status}` };
    }

    return {
      ok: true,
      model,
      answer: data.choices?.[0]?.message?.content?.trim() || ""
    };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  if (!apiKey) return { ok: false, error: "GEMINI_API_KEY is not configured" };

  try {
    const response = await fetch(`${GEMINI_BASE_URL}/${model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: "You are the fallback LLM for Aira Studio agents." }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 700
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return { ok: false, error: data.error?.message || `Gemini returned ${response.status}` };
    }

    return {
      ok: true,
      model,
      answer: data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim() || ""
    };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
