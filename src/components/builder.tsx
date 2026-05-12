"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, Trash2, ArrowLeft, ArrowRight, Save, RotateCcw, Check, Circle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="grid lg:grid-cols-[1fr_300px] gap-6">
      <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
        {/* Progress */}
        <div className="flex border-b border-border">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <button key={n} onClick={() => { syncFormToAgent(); setStep(n); }}
                className={cn("flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-colors border-b-2", active ? "border-foreground text-foreground bg-background" : "border-transparent text-muted-foreground hover:text-foreground")}>
                <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold", active ? "bg-foreground text-background" : done ? "bg-green-500 text-white" : "bg-secondary")}>{done ? <Check className="w-3 h-3" /> : n}</span>
                <span className="hidden sm:block">{label}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="p-6 flex-1 overflow-y-auto scrollbar-thin space-y-5">
            {step === 1 && (
              <>
                <div>
                  <h3 className="font-semibold mb-1">Choose a Template</h3>
                  <p className="text-sm text-muted-foreground mb-4">Start simple, then customize the agent persona.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {agentTemplates.map((tpl) => (
                      <button key={tpl.id} onClick={() => applyTemplate(tpl.id)}
                        className={cn("flex flex-col gap-1 p-3 rounded-xl border text-left transition-all hover:shadow-sm", draftAgent.templateId === tpl.id ? "border-foreground bg-foreground/5 shadow-sm" : "border-border hover:border-foreground/30")}>
                        <span className="text-xs font-semibold">{tpl.name}</span>
                        <span className="text-[10px] text-muted-foreground leading-snug">{tpl.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Agent Profile</h3>
                  <p className="text-sm text-muted-foreground mb-4">Name, role, goal, tone, and guardrails.</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[{ key: "name", label: "Agent name", placeholder: "Aira Support Assistant" }, { key: "type", label: "Agent type", type: "select", options: ["Support Agent","Sales Agent","Learning Companion","FAQ Assistant","Personal Assistant"] }, { key: "tone", label: "Persona tone", type: "select", options: ["Friendly and concise","Professional and calm","Warm teacher","Direct sales advisor","Technical expert"] }, { key: "voice", label: "Voice persona", type: "select", options: ["Browser default","Calm guide","Bright helper","Formal assistant"] }].map(({ key, label, placeholder, type, options }) => (
                      <label key={key} className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted-foreground">{label}</span>
                        {type === "select" ? (
                          <select value={(form as Record<string, string>)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                            className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                            {options!.map((o) => <option key={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input value={(form as Record<string, string>)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                            className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                        )}
                      </label>
                    ))}
                    {[{ key: "description", label: "Description", placeholder: "Helps customers find accurate answers from product PDFs." }, { key: "goal", label: "Goal", placeholder: "Resolve user questions using uploaded knowledge..." }, { key: "greeting", label: "Greeting", placeholder: "Hi, I'm Aira. How can I help?" }, { key: "fallback", label: "Fallback", placeholder: "I don't have enough context yet." }].map(({ key, label, placeholder }) => (
                      <label key={key} className="sm:col-span-2 flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted-foreground">{label}</span>
                        <textarea value={(form as Record<string, string>)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} rows={key === "goal" || key === "description" ? 3 : 2}
                          className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-semibold mb-1">Knowledge</h3>
                  <p className="text-sm text-muted-foreground mb-4">PDF, TXT, or manual FAQ input.</p>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
                    className="flex flex-col items-center gap-3 p-8 rounded-xl border-2 border-dashed border-border hover:border-foreground/30 cursor-pointer transition-colors bg-muted/20">
                    <UploadCloud className="w-8 h-8 text-muted-foreground" />
                    <div className="text-center">
                      <p className="font-medium text-sm">Drop files or click to upload</p>
                      <p className="text-xs text-muted-foreground mt-1">Supports PDF and TXT. Uploading → Extracting → Chunking → Ready.</p>
                    </div>
                    <input ref={fileInputRef} type="file" accept=".pdf,.txt,text/plain,application/pdf" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                  </div>
                </div>
                {agent.knowledge.length > 0 && (
                  <div className="space-y-2">
                    {agent.knowledge.map((item) => (
                      <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{item.title}</div>
                          <div className="text-xs text-muted-foreground">{item.type.toUpperCase()} · {formatBytes(item.size || item.text.length)} · {item.chunkCount || chunkText(item.text).length} chunks</div>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground shrink-0">{item.status || "Ready"}</span>
                        <button onClick={() => removeSource(item.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </motion.div>
                    ))}
                  </div>
                )}
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Manual FAQ</span>
                  <textarea value={form.manualFaq} onChange={(e) => setForm((f) => ({ ...f, manualFaq: e.target.value }))} rows={6}
                    placeholder={"Q: What is the refund policy?\nA: Refunds are available within 14 days..."}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none font-mono text-xs" />
                </label>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-semibold mb-1">Review & Test</h3>
                <p className="text-sm text-muted-foreground mb-4">Check readiness before saving and testing.</p>
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                    <strong className="text-sm">{readiness.every((r) => r.done) ? "Agent ready" : "Agent readiness"}</strong>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{readiness.filter((r) => r.done).length}/{readiness.length}</span>
                  </div>
                  {readiness.map((check) => (
                    <div key={check.label} className={cn("flex items-start gap-3 px-4 py-3 border-b border-border last:border-0", check.done ? "bg-green-50/50 dark:bg-green-900/10" : "")}>
                      {check.done ? <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" /> : <Circle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}
                      <div>
                        <div className="font-medium text-sm">{check.label}</div>
                        <div className="text-xs text-muted-foreground">{check.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className="flex items-center gap-2 p-4 border-t border-border bg-muted/20">
          <Button variant="ghost" size="sm" onClick={onReset} className="gap-1.5 text-xs mr-auto">
            <RotateCcw className="w-3.5 h-3.5" /> Reset Demo
          </Button>
          {step > 1 && <Button variant="secondary" size="sm" onClick={() => setStep((s) => s - 1)} className="gap-1.5"><ArrowLeft className="w-3.5 h-3.5" />Back</Button>}
          {step < 3 && <Button size="sm" onClick={handleNext} className="gap-1.5">Continue<ArrowRight className="w-3.5 h-3.5" /></Button>}
          {step === 3 && <Button size="sm" onClick={handleSave} className="gap-1.5"><Save className="w-3.5 h-3.5" />Save & Test Agent</Button>}
        </div>
      </div>

      {/* Prompt Preview */}
      <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col h-fit sticky top-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">System Prompt</h3>
          <button onClick={copyPrompt} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            {copied ? <><Check className="w-3.5 h-3.5 text-green-500" />Copied!</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
          </button>
        </div>
        <div className="flex gap-1.5 px-4 py-2 border-b border-border bg-muted/20">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">Auto-generated</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">Universal guidelines</span>
        </div>
        <pre className="p-4 text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap break-words max-h-96 overflow-y-auto scrollbar-thin font-mono">{buildPrompt(draftAgent)}</pre>
      </div>
    </div>
  );
}
