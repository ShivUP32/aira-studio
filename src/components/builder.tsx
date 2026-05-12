"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, Trash2, ArrowLeft, ArrowRight, Save, RotateCcw, Check, CheckCircle2, Circle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AppState, Agent, KnowledgeItem } from "@/lib/agent-state";
import { agentTemplates, buildPrompt, formatBytes } from "@/lib/agent-state";
import { chunkText } from "@/lib/retrieval";
import { cn } from "@/lib/utils";

const STEPS = ["Template & Profile", "Knowledge", "Review & Test"];

function getReadiness(agent: Agent, conversations: AppState["conversations"]) {
  const agentConvos = conversations.filter((c) => c.agentId === agent.id);
  const tested = agentConvos.length >= 3;
  const goodAnswer = agentConvos.some((c) => c.confidence >= 60);
  return [
    { label: "Profile complete", detail: "Name, type, goal, greeting, and fallback are set.", done: Boolean(agent.name && agent.type && agent.goal && agent.greeting && agent.fallback) },
    { label: "Knowledge ready", detail: "At least one PDF, TXT, or FAQ source is available.", done: (agent.knowledge || []).length > 0 },
    { label: "Three test questions", detail: `${agentConvos.length}/3 test questions completed.`, done: tested },
    { label: "Trusted answer found", detail: "At least one answer reached 60%+ confidence.", done: goodAnswer },
  ];
}

interface BuilderProps {
  state: AppState;
  onStateChange: (s: AppState) => void;
  onNavigate: (r: string) => void;
  onReset: () => void;
}

export function Builder({ state, onStateChange, onNavigate, onReset }: BuilderProps) {
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);
  const agent = state.agents.find((a) => a.id === state.activeAgentId) || state.agents[0];

  const [form, setForm] = useState({ name: agent.name, type: agent.type, description: agent.description, tone: agent.tone, voice: agent.voice, goal: agent.goal, greeting: agent.greeting, fallback: agent.fallback, manualFaq: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const a = state.agents.find((x) => x.id === state.activeAgentId) || state.agents[0];
    setForm((f) => ({ ...f, name: a.name, type: a.type, description: a.description, tone: a.tone, voice: a.voice, goal: a.goal, greeting: a.greeting, fallback: a.fallback }));
  }, [state.activeAgentId, state.agents]);

  function updateAgent(updates: Partial<Agent>) {
    const agents = state.agents.map((a) => a.id === agent.id ? { ...a, ...updates } : a);
    onStateChange({ ...state, agents });
  }

  function applyTemplate(templateId: string) {
    const tpl = agentTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    const newForm = { ...form, type: tpl.type, tone: tpl.tone, description: tpl.description, goal: tpl.goal, greeting: tpl.greeting, fallback: tpl.fallback };
    const existing = agentTemplates.map((t) => t.name).concat("Aira Support Assistant", "Untitled Agent");
    if (!form.name || existing.includes(form.name)) newForm.name = tpl.name;
    setForm(newForm);
    updateAgent({ ...newForm, templateId });
  }

  function syncFormToAgent() {
    updateAgent({ name: form.name, type: form.type, description: form.description, tone: form.tone, voice: form.voice, goal: form.goal, greeting: form.greeting, fallback: form.fallback });
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const items: KnowledgeItem[] = [];
    for (const file of Array.from(files)) {
      let text = "";
      if (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt")) {
        text = await file.text();
      } else if (file.name.toLowerCase().endsWith(".pdf")) {
        text = `${file.name} uploaded. In production this is stored in Supabase Storage, parsed, chunked, embedded, and indexed in pgvector. Add manual FAQ for offline retrieval.`;
      }
      items.push({ id: crypto.randomUUID(), title: file.name, type: file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "txt", text, size: file.size, status: "Ready for testing", chunkCount: chunkText(text).length, updatedAt: new Date().toISOString() });
    }
    updateAgent({ knowledge: [...agent.knowledge, ...items] });
  }

  function removeSource(id: string) {
    updateAgent({ knowledge: agent.knowledge.filter((k) => k.id !== id) });
  }

  function addManualFaq() {
    if (!form.manualFaq.trim()) return;
    const item: KnowledgeItem = { id: crypto.randomUUID(), title: "Manual FAQ", type: "faq", text: form.manualFaq.trim(), size: form.manualFaq.length, status: "Ready for testing", chunkCount: chunkText(form.manualFaq).length, updatedAt: new Date().toISOString() };
    updateAgent({ knowledge: [...agent.knowledge, item] });
    setForm((f) => ({ ...f, manualFaq: "" }));
  }

  function handleSave() {
    syncFormToAgent();
    if (form.manualFaq.trim()) addManualFaq();
    onNavigate("test");
  }

  function handleNext() {
    syncFormToAgent();
    if (step === 2 && form.manualFaq.trim()) addManualFaq();
    setStep((s) => Math.min(3, s + 1));
  }

  function copyPrompt() {
    const draftAgent = { ...agent, ...form };
    navigator.clipboard?.writeText(buildPrompt(draftAgent));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const draftAgent = { ...agent, ...form };
  const readiness = getReadiness(draftAgent, state.conversations);

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      <div className="bg-aira-card border border-aira-line rounded-xl overflow-hidden flex flex-col">
        {/* Progress bar */}
        <div className="flex border-b border-aira-line bg-aira-bg/50">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <button
                key={n}
                onClick={() => {
                  syncFormToAgent();
                  setStep(n);
                }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-medium transition-all cursor-pointer border-b-2",
                  active ? "border-emerald-500 text-emerald-400 bg-emerald-500/5" : done ? "border-emerald-500/40 text-slate-400" : "border-transparent text-slate-500 hover:text-slate-400"
                )}
              >
                <span
                  className={cn("w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center", active ? "bg-gradient-to-r from-emerald-400 to-emerald-600 text-black" : done ? "bg-emerald-500 text-white" : "bg-white/8 text-slate-500")}
                >
                  {done ? <Check className="w-3 h-3" /> : n}
                </span>
                <span className="hidden sm:block">{label}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
            className="p-6 flex-1 overflow-y-auto scrollbar-thin space-y-6"
          >
            {step === 1 && (
              <>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-400 mb-3">Choose Template</div>
                  <p className="text-sm text-slate-400 mb-4">Start simple, then customize the agent persona.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {agentTemplates.map((tpl) => (
                      <motion.button
                        key={tpl.id}
                        onClick={() => applyTemplate(tpl.id)}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                          "flex flex-col gap-1.5 p-3.5 rounded-xl border cursor-pointer transition-all text-left",
                          draftAgent.templateId === tpl.id
                            ? "bg-emerald-500/8 border-emerald-500/40 shadow-[0_0_16px_rgba(16,185,129,0.08)]"
                            : "bg-aira-bg border-aira-line hover:border-emerald-500/25 hover:bg-emerald-500/4"
                        )}
                      >
                        <span className="text-xs font-semibold text-slate-200">{tpl.name}</span>
                        <span className="text-[10px] text-slate-500 leading-snug">{tpl.description}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-400 mb-3">Agent Profile</div>
                  <p className="text-sm text-slate-400 mb-4">Name, role, goal, tone, and guardrails.</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { key: "name", label: "Agent name", placeholder: "Aira Support Assistant" },
                      { key: "type", label: "Agent type", type: "select", options: ["Support Agent", "Sales Agent", "Learning Companion", "FAQ Assistant", "Personal Assistant"] },
                      { key: "tone", label: "Persona tone", type: "select", options: ["Friendly and concise", "Professional and calm", "Warm teacher", "Direct sales advisor", "Technical expert"] },
                      { key: "voice", label: "Voice persona", type: "select", options: ["Browser default", "Calm guide", "Bright helper", "Formal assistant"] },
                    ].map(({ key, label, placeholder, type, options }) => (
                      <label key={key} className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium text-slate-400">{label}</span>
                        {type === "select" ? (
                          <select
                            value={(form as Record<string, string>)[key]}
                            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                            className="h-9 w-full bg-aira-card border border-aira-line rounded-lg px-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                          >
                            {options!.map((o) => (
                              <option key={o}>{o}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            value={(form as Record<string, string>)[key]}
                            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                            placeholder={placeholder}
                            className="h-9 w-full bg-aira-card border border-aira-line rounded-lg px-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                          />
                        )}
                      </label>
                    ))}
                    {[
                      { key: "description", label: "Description", placeholder: "Helps customers find accurate answers from product PDFs." },
                      { key: "goal", label: "Goal", placeholder: "Resolve user questions using uploaded knowledge..." },
                      { key: "greeting", label: "Greeting", placeholder: "Hi, I'm Aira. How can I help?" },
                      { key: "fallback", label: "Fallback", placeholder: "I don't have enough context yet." },
                    ].map(({ key, label, placeholder }) => (
                      <label key={key} className="sm:col-span-2 flex flex-col gap-1.5">
                        <span className="text-xs font-medium text-slate-400">{label}</span>
                        <textarea
                          value={(form as Record<string, string>)[key]}
                          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                          placeholder={placeholder}
                          rows={key === "goal" || key === "description" ? 3 : 2}
                          className="w-full bg-aira-card border border-aira-line rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-400 mb-3">Knowledge</div>
                  <p className="text-sm text-slate-400 mb-4">PDF, TXT, or manual FAQ input.</p>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleFiles(e.dataTransfer.files);
                    }}
                    className="border-2 border-dashed border-aira-line hover:border-emerald-500/40 bg-aira-bg/50 rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors group"
                  >
                    <UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                    <div className="text-center">
                      <p className="font-medium text-sm text-slate-300">Drop files or click to upload</p>
                      <p className="text-xs text-slate-500 mt-0.5">Supports PDF and TXT. Uploading → Extracting → Chunking → Ready.</p>
                    </div>
                    <input ref={fileInputRef} type="file" accept=".pdf,.txt,text/plain,application/pdf" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                  </div>
                </div>

                {agent.knowledge.length > 0 && (
                  <div className="space-y-2">
                    {agent.knowledge.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-3 bg-aira-bg border border-aira-line rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-slate-200 truncate">{item.title}</div>
                          <div className="text-xs text-slate-500">
                            {item.type.toUpperCase()} · {formatBytes(item.size || item.text.length)} · {item.chunkCount || chunkText(item.text).length} chunks
                          </div>
                        </div>
                        <Badge variant="green" className="shrink-0">
                          Ready
                        </Badge>
                        <button
                          onClick={() => removeSource(item.id)}
                          className="text-slate-500 hover:text-emerald-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-slate-400">Manual FAQ</span>
                  <textarea
                    value={form.manualFaq}
                    onChange={(e) => setForm((f) => ({ ...f, manualFaq: e.target.value }))}
                    rows={6}
                    placeholder={"Q: What is the refund policy?\nA: Refunds are available within 14 days..."}
                    className="w-full bg-aira-card border border-aira-line rounded-lg px-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
                  />
                </label>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-400 mb-3">Review & Test</div>
                  <p className="text-sm text-slate-400 mb-4">Check readiness before saving and testing.</p>
                </div>

                <div className="bg-aira-card border border-aira-line rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-aira-line bg-emerald-500/5">
                    <strong className="text-sm text-slate-200">{readiness.every((r) => r.done) ? "Agent ready" : "Agent readiness"}</strong>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                      {readiness.filter((r) => r.done).length}/{readiness.length}
                    </span>
                  </div>
                  {readiness.map((check) => (
                    <div
                      key={check.label}
                      className={cn(
                        "flex items-start gap-3 px-5 py-3.5 border-b border-aira-line last:border-0",
                        check.done ? "bg-emerald-500/5" : ""
                      )}
                    >
                      {check.done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-medium text-sm text-slate-200">{check.label}</div>
                        <div className="text-xs text-slate-500">{check.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className="flex items-center gap-2 p-4 border-t border-aira-line bg-aira-bg/50">
          <Button variant="ghost" size="sm" onClick={onReset} className="gap-1.5 text-xs mr-auto text-slate-400 hover:text-slate-200">
            <RotateCcw className="w-3.5 h-3.5" /> Reset Demo
          </Button>
          {step > 1 && (
            <Button variant="secondary" size="sm" onClick={() => setStep((s) => s - 1)} className="gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Button>
          )}
          {step < 3 && (
            <Button size="sm" onClick={handleNext} className="gap-1.5 bg-gradient-to-r from-emerald-400 to-emerald-600 text-black hover:opacity-90">
              Continue
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
          {step === 3 && (
            <Button size="sm" onClick={handleSave} className="gap-1.5 bg-gradient-to-r from-emerald-400 to-emerald-600 text-black hover:opacity-90">
              <Save className="w-3.5 h-3.5" />
              Save & Test Agent
            </Button>
          )}
        </div>
      </div>

      {/* Right panel — System Prompt Preview */}
      <div className="bg-aira-card border border-aira-line rounded-xl overflow-hidden flex flex-col h-fit sticky top-4">
        <div className="h-0.5 bg-gradient-to-r from-emerald-500/0 via-emerald-500/60 to-emerald-500/0" />
        <div className="flex items-center justify-between px-4 py-3 border-b border-aira-line">
          <h3 className="font-semibold text-sm text-slate-100">System Prompt</h3>
          <button
            onClick={copyPrompt}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <div className="flex gap-1.5 px-4 py-2 border-b border-aira-line">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-500 font-medium">Auto-generated</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-500 font-medium">Universal guidelines</span>
        </div>
        <pre className="p-4 text-[11px] font-mono text-slate-400 leading-relaxed whitespace-pre-wrap break-words max-h-[480px] overflow-y-auto">
          {buildPrompt(draftAgent)}
        </pre>
      </div>
    </div>
  );
}
