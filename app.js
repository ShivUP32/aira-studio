const STORAGE_KEY = "aira-studio-state";

const defaultAgent = {
  id: crypto.randomUUID(),
  name: "Aira Support Assistant",
  type: "Support Agent",
  description: "Answers product and support questions from uploaded knowledge.",
  tone: "Friendly and concise",
  voice: "Browser default",
  goal: "Resolve user questions accurately using the knowledge base. Ask for clarification when the answer is not present.",
  greeting: "Hi, I’m Aira. How can I help?",
  fallback: "I don’t have enough context yet. Could you add detail?",
  published: false,
  accessControl: false,
  embedEnabled: true,
  knowledge: [
    {
      id: crypto.randomUUID(),
      title: "Aira Studio PRD Summary",
      type: "manual",
      text:
        "Aira Studio is a no-code AI agent builder. The user journey is Landing Page, Google Login, Dashboard, Create Agent, Configure Persona, Upload Knowledge, Test Agent, Publish, and Analytics Dashboard. It supports PDF, TXT, and manual FAQ knowledge. The RAG flow is user query, embedding, similarity search, top K retrieval, context injection, LLM response, confidence score, and source attribution. The recommended free-tier stack includes Firebase Authentication, Supabase PostgreSQL, Supabase Storage, pgvector, Gemini API or OpenAI, Vercel hosting, GitHub, and Web Speech API for browser voice."
    }
  ],
  createdAt: new Date().toISOString()
};

const state = loadState();
let activeRoute = "dashboard";
let lastQuestion = "";
let recognition = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return {
      user: null,
      activeAgentId: defaultAgent.id,
      agents: [defaultAgent],
      conversations: [],
      events: []
    };
  }

  try {
    const parsed = JSON.parse(saved);
    if (!parsed.agents?.length) parsed.agents = [defaultAgent];
    if (!parsed.activeAgentId) parsed.activeAgentId = parsed.agents[0].id;
    return parsed;
  } catch {
    return {
      user: null,
      activeAgentId: defaultAgent.id,
      agents: [defaultAgent],
      conversations: [],
      events: []
    };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function activeAgent() {
  return state.agents.find((agent) => agent.id === state.activeAgentId) || state.agents[0];
}

function setRoute(route) {
  activeRoute = route;
  $$(".route").forEach((section) => section.classList.toggle("active", section.id === route));
  $$(".nav-link").forEach((link) => link.classList.toggle("active", link.dataset.route === route));
  $("#pageTitle").textContent = {
    dashboard: "Dashboard",
    builder: "Create Agent",
    test: "Test Agent",
    publish: "Publish",
    analytics: "Analytics"
  }[route];

  if (route === "builder") populateForm();
  render();
}

function renderIcons() {
  if (!window.lucide) return;
  $$("[data-icon]").forEach((slot) => {
    const icon = slot.dataset.icon;
    slot.innerHTML = "";
    const node = window.lucide.createElement(window.lucide.icons[toPascal(icon)]);
    if (node) slot.appendChild(node);
  });
}

function toPascal(value) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function render() {
  renderAuth();
  renderAgentSelect();
  renderDashboard();
  renderPrompt();
  renderChat();
  renderPublish();
  renderAnalytics();
  renderIcons();
}

function renderAuth() {
  $("#googleLoginBtn").classList.toggle("hidden", Boolean(state.user));
  $("#logoutBtn").classList.toggle("hidden", !state.user);
}

function renderAgentSelect() {
  const select = $("#activeAgentSelect");
  select.innerHTML = state.agents
    .map((agent) => `<option value="${agent.id}">${escapeHtml(agent.name)}</option>`)
    .join("");
  select.value = activeAgent().id;
}

function renderDashboard() {
  const conversations = state.conversations.filter((item) => item.agentId === activeAgent().id);
  const unknown = conversations.filter((item) => item.confidence < 45).length;
  const avgConfidence = average(conversations.map((item) => item.confidence));
  const metrics = [
    ["Agents", state.agents.length, "Configured workspaces"],
    ["Conversations", conversations.length, "Test messages"],
    ["Resolution", `${Math.max(0, Math.round(avgConfidence || 0))}%`, "Confidence proxy"],
    ["Unknown", unknown, "Needs more knowledge"]
  ];
  $("#dashboardMetrics").innerHTML = metrics.map(metricCard).join("");
  $("#agentList").innerHTML = state.agents
    .map(
      (agent) => `
        <button class="agent-row" data-agent="${agent.id}">
          <span>
            <strong>${escapeHtml(agent.name)}</strong>
            <small>${escapeHtml(agent.type)} · ${agent.knowledge.length} sources</small>
          </span>
          <span class="status-pill">${agent.published ? "Live" : "Draft"}</span>
        </button>`
    )
    .join("");
}

function metricCard([label, value, hint]) {
  return `
    <article class="metric-card">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${hint}</small>
    </article>`;
}

function populateForm() {
  const agent = activeAgent();
  const form = $("#agentForm");
  ["name", "type", "description", "tone", "voice", "goal", "greeting", "fallback"].forEach((key) => {
    form.elements[key].value = agent[key] || "";
  });
  form.elements.manualFaq.value = "";
  renderFileList();
}

function renderFileList() {
  const agent = activeAgent();
  $("#fileList").innerHTML =
    agent.knowledge
      .map(
        (item) => `
          <div class="file-item">
            <span>
              <strong>${escapeHtml(item.title)}</strong>
              <small>${item.type.toUpperCase()} · ${item.text.length.toLocaleString()} chars</small>
            </span>
            <button class="icon-button" data-remove-source="${item.id}" aria-label="Remove source">
              <span data-icon="trash-2"></span>
            </button>
          </div>`
      )
      .join("") || "<p>No sources yet.</p>";
}

function buildPrompt(agent = activeAgent()) {
  return `You are ${agent.name}.
Type: ${agent.type}
Tone: ${agent.tone}
Goal: ${agent.goal}

Rules:
- Use the provided knowledge context before answering.
- Do not invent facts when context is missing.
- If confidence is low, ask a clarifying question.
- Keep answers aligned with the agent domain and persona.
- Return source attribution when possible.

Greeting: ${agent.greeting}
Fallback: ${agent.fallback}`;
}

function renderPrompt() {
  $("#promptPreview").textContent = buildPrompt(formDraftAgent());
}

function formDraftAgent() {
  const form = $("#agentForm");
  if (!form || activeRoute !== "builder") return activeAgent();
  const agent = { ...activeAgent() };
  ["name", "type", "description", "tone", "voice", "goal", "greeting", "fallback"].forEach((key) => {
    if (form.elements[key]) agent[key] = form.elements[key].value.trim() || agent[key];
  });
  return agent;
}

function renderChat() {
  const agent = activeAgent();
  $("#chatAgentName").textContent = agent.name;
  const messages = state.conversations.filter((item) => item.agentId === agent.id).slice(-20);
  $("#chatMessages").innerHTML =
    messages
      .map(
        (message) => `
          <div class="message user">${escapeHtml(message.question)}</div>
          <div class="message agent">
            ${escapeHtml(message.answer)}
            <span class="message-meta">${message.confidence}% confidence · ${message.sources.length} sources</span>
          </div>`
      )
      .join("") || `<div class="message agent">${escapeHtml(agent.greeting)}</div>`;

  const suggestions = buildSuggestions(agent);
  $("#suggestedQuestions").innerHTML = suggestions
    .map((question) => `<button type="button" data-suggestion="${escapeHtml(question)}">${escapeHtml(question)}</button>`)
    .join("");

  const latest = messages.at(-1);
  $("#confidenceBadge").textContent = `${latest?.confidence || 0}%`;
  $("#thumbsUpBtn").disabled = !latest;
  $("#thumbsDownBtn").disabled = !latest;
  $("#thumbsUpBtn").classList.toggle("selected", latest?.feedback === "up");
  $("#thumbsDownBtn").classList.toggle("selected", latest?.feedback === "down");
  $("#sourceList").innerHTML =
    latest?.sources
      .map(
        (source) => `
        <div class="source-item">
          <strong>${escapeHtml(source.title)}</strong>
          <small>${escapeHtml(source.preview)}</small>
        </div>`
      )
      .join("") || "<p>No retrieval yet.</p>";
}

function buildSuggestions(agent) {
  const base = [
    `What can ${agent.name} help with?`,
    "Summarize the uploaded document.",
    "What should users do first?"
  ];
  const firstSource = agent.knowledge[0]?.text || "";
  const qMatch = firstSource.match(/Q:\s*(.+)/i);
  if (qMatch) base[0] = qMatch[1].trim();
  return base;
}

function renderPublish() {
  const agent = activeAgent();
  $("#publishToggle").checked = agent.published;
  $("#embedToggle").checked = agent.embedEnabled;
  $("#accessToggle").checked = agent.accessControl;
  $("#publishState").textContent = agent.published ? "Live" : "Draft";
  const slug = slugify(agent.name);
  const url = `${window.location.origin}/agents/${slug}`;
  $("#shareUrl").value = url;
  $("#embedCode").textContent = `<script async src="${url}/widget.js" data-agent="${agent.id}"></script>`;
  $("#widgetAgentName").textContent = agent.name;
  $("#widgetGreeting").textContent = agent.greeting;
}

function renderAnalytics() {
  const agent = activeAgent();
  const conversations = state.conversations.filter((item) => item.agentId === agent.id);
  const avgResponse = average(conversations.map((item) => item.responseTime));
  const voice = state.events.filter((item) => item.agentId === agent.id && item.type === "voice").length;
  const metrics = [
    ["Total conversations", conversations.length, "Chat sessions"],
    ["Avg response time", `${(avgResponse || 0).toFixed(1)}s`, "Local simulation"],
    ["Voice usage", voice, "Mic interactions"],
    ["Avg confidence", `${Math.round(average(conversations.map((item) => item.confidence)) || 0)}%`, "Retrieval score"]
  ];
  $("#analyticsMetrics").innerHTML = metrics.map(metricCard).join("");

  const buckets = [
    ["0-40", conversations.filter((item) => item.confidence <= 40).length],
    ["41-70", conversations.filter((item) => item.confidence > 40 && item.confidence <= 70).length],
    ["71-100", conversations.filter((item) => item.confidence > 70).length]
  ];
  const total = Math.max(1, conversations.length);
  $("#confidenceChart").innerHTML = buckets
    .map(
      ([label, count]) => `
      <div class="bar-row">
        <strong>${label}</strong>
        <span class="bar-track"><span class="bar-fill" style="width:${(count / total) * 100}%"></span></span>
        <span>${count}</span>
      </div>`
    )
    .join("");

  $("#unknownQuestions").innerHTML =
    conversations
      .filter((item) => item.confidence < 45)
      .slice(-6)
      .map((item) => `<div class="unknown-item">${escapeHtml(item.question)}</div>`)
      .join("") || "<p>No unknown questions yet.</p>";
}

async function handleFiles(files) {
  const agent = activeAgent();
  for (const file of files) {
    const text = await extractFileText(file);
    agent.knowledge.push({
      id: crypto.randomUUID(),
      title: file.name,
      type: file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "txt",
      text
    });
  }
  saveState();
  renderFileList();
  renderPrompt();
  renderIcons();
}

async function extractFileText(file) {
  if (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt")) {
    return file.text();
  }

  if (file.name.toLowerCase().endsWith(".pdf")) {
    try {
      const pdfjsLib =
        window.pdfjsLib || (await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs"));
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const pages = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        pages.push(content.items.map((item) => item.str).join(" "));
      }
      return pages.join("\n\n");
    } catch (error) {
      console.warn(error);
    }
  }

  return `${file.name} was uploaded. In production this file is stored in Supabase Storage, parsed by an Edge Function, chunked, embedded, and indexed in pgvector. Add manual FAQ text for offline local retrieval.`;
}

function saveAgentFromForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const agent = activeAgent();
  ["name", "type", "description", "tone", "voice", "goal", "greeting", "fallback"].forEach((key) => {
    agent[key] = form.elements[key].value.trim();
  });

  const manualFaq = form.elements.manualFaq.value.trim();
  if (manualFaq) {
    agent.knowledge.push({
      id: crypto.randomUUID(),
      title: "Manual FAQ",
      type: "faq",
      text: manualFaq
    });
    form.elements.manualFaq.value = "";
  }

  saveState();
  render();
  setRoute("test");
}

function createAgent() {
  const agent = {
    ...defaultAgent,
    id: crypto.randomUUID(),
    name: "Untitled Agent",
    description: "",
    knowledge: [],
    createdAt: new Date().toISOString()
  };
  state.agents.push(agent);
  state.activeAgentId = agent.id;
  saveState();
  setRoute("builder");
}

function answerQuestion(question) {
  const started = performance.now();
  const agent = activeAgent();
  const retrieval = retrieve(question, agent.knowledge);
  const confidence = Math.min(98, Math.max(18, Math.round(retrieval.score)));
  const answer = composeAnswer(question, agent, retrieval, confidence);
  const record = {
    id: crypto.randomUUID(),
    agentId: agent.id,
    question,
    answer,
    confidence,
    sources: retrieval.sources,
    responseTime: (performance.now() - started) / 1000 + 0.4,
    createdAt: new Date().toISOString()
  };
  state.conversations.push(record);
  lastQuestion = question;
  saveState();
  render();
  speak(answer, agent);
}

function retrieve(query, knowledge) {
  const chunks = knowledge.flatMap((item) => chunkText(item.text).map((text) => ({ title: item.title, text })));
  if (/summari[sz]e|overview|uploaded document|what.*document/i.test(query) && chunks.length) {
    return {
      score: 78,
      sources: chunks.slice(0, 3).map((item) => ({
        title: item.title,
        preview: item.text.slice(0, 220)
      })),
      context: chunks
        .slice(0, 2)
        .map((item) => item.text)
        .join("\n")
    };
  }

  const queryTerms = tokenize(query);
  const ranked = chunks
    .map((chunk) => {
      const terms = tokenize(chunk.text);
      const overlap = queryTerms.filter((term) => terms.includes(term)).length;
      const density = overlap / Math.max(1, queryTerms.length);
      return {
        ...chunk,
        score: density * 100 + Math.min(18, overlap * 4)
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return {
    score: ranked[0]?.score || 0,
    sources: ranked.map((item) => ({
      title: item.title,
      preview: item.text.slice(0, 220)
    })),
    context: ranked.map((item) => item.text).join("\n")
  };
}

function composeAnswer(question, agent, retrieval, confidence) {
  if (!retrieval.context || confidence < 35) {
    return `${agent.fallback.replace(/[.!?]+$/, "")}. I checked the available knowledge, but I could not find a reliable answer for "${question}".`;
  }

  const sentences = retrieval.context
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence.length > 18)
    .slice(0, 3);
  const body = sentences.join(" ");
  return `${body} ${confidence < 55 ? "This looks partially supported, so I would confirm the missing detail before acting." : ""}`.trim();
}

function chunkText(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  const chunks = [];
  for (let index = 0; index < clean.length; index += 700) {
    chunks.push(clean.slice(index, index + 900));
  }
  return chunks.length ? chunks : [clean];
}

function tokenize(text) {
  return [...new Set(text.toLowerCase().match(/[a-z0-9]+/g) || [])].filter((word) => word.length > 2);
}

function speak(text, agent) {
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text.slice(0, 260));
  utterance.rate = agent.voice === "Formal assistant" ? 0.92 : 1;
  utterance.pitch = agent.voice === "Bright helper" ? 1.14 : 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function startVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Speech recognition is not available in this browser. Try Chrome or Edge.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    $("#chatInput").value = transcript;
    state.events.push({ id: crypto.randomUUID(), agentId: activeAgent().id, type: "voice", createdAt: new Date().toISOString() });
    answerQuestion(transcript);
  };
  recognition.start();
}

function average(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function copyText(value) {
  navigator.clipboard?.writeText(value);
}

function setLatestFeedback(value) {
  const agent = activeAgent();
  const latest = state.conversations.filter((item) => item.agentId === agent.id).at(-1);
  if (!latest) return;
  latest.feedback = value;
  state.events.push({
    id: crypto.randomUUID(),
    agentId: agent.id,
    type: "feedback",
    payload: { conversationId: latest.id, value },
    createdAt: new Date().toISOString()
  });
  saveState();
  renderChat();
}

window.addEventListener("hashchange", () => setRoute(location.hash.replace("#", "") || "dashboard"));

$("#googleLoginBtn").addEventListener("click", () => {
  state.user = { name: "Demo User", email: "demo@gmail.com", provider: "google" };
  saveState();
  render();
});

$("#logoutBtn").addEventListener("click", () => {
  state.user = null;
  saveState();
  render();
});

$("#newAgentBtn").addEventListener("click", createAgent);
$("#activeAgentSelect").addEventListener("change", (event) => {
  state.activeAgentId = event.target.value;
  saveState();
  render();
  if (activeRoute === "builder") populateForm();
});

$("#agentForm").addEventListener("input", renderPrompt);
$("#agentForm").addEventListener("submit", saveAgentFromForm);
$("#knowledgeFiles").addEventListener("change", (event) => handleFiles(event.target.files));
$("#dropZone").addEventListener("dragover", (event) => event.preventDefault());
$("#dropZone").addEventListener("drop", (event) => {
  event.preventDefault();
  handleFiles(event.dataTransfer.files);
});

$("#fileList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-source]");
  if (!button) return;
  const agent = activeAgent();
  agent.knowledge = agent.knowledge.filter((item) => item.id !== button.dataset.removeSource);
  saveState();
  renderFileList();
  renderIcons();
});

$("#resetDemoBtn").addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
});

$("#copyPromptBtn").addEventListener("click", () => copyText($("#promptPreview").textContent));

$("#chatForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("#chatInput");
  const question = input.value.trim();
  if (!question) return;
  input.value = "";
  answerQuestion(question);
});

$("#suggestedQuestions").addEventListener("click", (event) => {
  const button = event.target.closest("[data-suggestion]");
  if (button) answerQuestion(button.dataset.suggestion);
});

$("#retryBtn").addEventListener("click", () => {
  if (lastQuestion) answerQuestion(lastQuestion);
});

$("#micBtn").addEventListener("click", startVoice);

["publishToggle", "embedToggle", "accessToggle"].forEach((id) => {
  $(`#${id}`).addEventListener("change", (event) => {
    const agent = activeAgent();
    if (id === "publishToggle") agent.published = event.target.checked;
    if (id === "embedToggle") agent.embedEnabled = event.target.checked;
    if (id === "accessToggle") agent.accessControl = event.target.checked;
    saveState();
    renderPublish();
  });
});

$("#copyShareBtn").addEventListener("click", () => copyText($("#shareUrl").value));
$("#thumbsUpBtn").addEventListener("click", () => setLatestFeedback("up"));
$("#thumbsDownBtn").addEventListener("click", () => setLatestFeedback("down"));

$("#agentList").addEventListener("click", (event) => {
  const row = event.target.closest("[data-agent]");
  if (!row) return;
  state.activeAgentId = row.dataset.agent;
  saveState();
  setRoute("builder");
});

setRoute(location.hash.replace("#", "") || "dashboard");
