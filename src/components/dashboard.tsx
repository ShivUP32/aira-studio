"use client";
import { motion } from "framer-motion";
import { Sparkles, Play, FileText, Scissors, Database, Bot, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppState } from "@/lib/agent-state";
import { average } from "@/lib/agent-state";
import { cn } from "@/lib/utils";

const stagger = { container: { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }, item: { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } } };

function MetricCard({ label, value, hint, delay = 0 }: { label: string; value: string | number; hint: string; delay?: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1 hover:shadow-md transition-shadow"
    >
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <strong className="text-2xl font-bold tracking-tight">{value}</strong>
      <small className="text-xs text-muted-foreground">{hint}</small>
    </motion.article>
  );
}

interface DashboardProps {
  state: AppState;
  onNavigate: (route: string) => void;
  onNewAgent: () => void;
}

export function Dashboard({ state, onNavigate, onNewAgent }: DashboardProps) {
  const agent = state.agents.find((a) => a.id === state.activeAgentId) || state.agents[0];
  const conversations = state.conversations.filter((c) => c.agentId === agent.id);
  const unknown = conversations.filter((c) => c.confidence < 45).length;
  const avgConfidence = average(conversations.map((c) => c.confidence));

  const metrics = [
    { label: "Agents", value: state.agents.length, hint: "Configured workspaces" },
    { label: "Conversations", value: conversations.length, hint: "Test messages" },
    { label: "Resolution", value: `${Math.max(0, Math.round(avgConfidence || 0))}%`, hint: "Confidence proxy" },
    { label: "Unknown", value: unknown, hint: "Needs more knowledge" },
  ];

  const stack = ["No-login prototype","Supabase Postgres","Supabase Storage","pgvector","Groq API","Gemini fallback","Web Speech API","Vercel","GitHub"];
  const features = ["Embeddable website/app widget","Public share URL","Voice-first agent experience","Source-backed answers","Confidence scores","Agent analytics","No dependency on ChatGPT interface"];
  const flow = ["Upload FAQ/product docs","Create support agent","Test answers","Check sources and confidence","Publish widget"];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-secondary/30 p-6 md:p-8"
      >
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap gap-2">
              {["3-step agent builder","PDF to RAG","Voice ready"].map((badge) => (
                <span key={badge} className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary border border-border text-muted-foreground">{badge}</span>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Aira Studio</p>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight">Build voice-ready AI agents from your documents.</h2>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-md">A lightweight agent studio that turns business documents into tested, source-backed, voice-ready agents you can publish outside ChatGPT.</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => onNavigate("builder")} className="gap-2">
                <Sparkles className="w-4 h-4" /> Start Building
              </Button>
              <Button variant="secondary" onClick={() => onNavigate("test")} className="gap-2">
                <Play className="w-4 h-4" /> Try Chat
              </Button>
            </div>
          </div>

          {/* Console art */}
          <div className="shrink-0 w-full md:w-72">
            <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-border bg-muted/40">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <span className="ml-2 text-xs text-muted-foreground font-medium">Agent prompt</span>
              </div>
              <div className="p-3 text-xs text-muted-foreground bg-muted/20 border-b border-border italic">
                Build an agent that reads my PDF, answers with sources, and speaks while the transcript appears.
              </div>
              <div className="grid grid-cols-4 gap-1 p-3 border-b border-border">
                {[{icon: FileText, label:"Upload"},{icon:Scissors,label:"Chunk"},{icon:Database,label:"Store"},{icon:Bot,label:"Speak"}].map(({icon:Icon,label}) => (
                  <div key={label} className="flex flex-col items-center gap-1 text-[10px] text-muted-foreground">
                    <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Icon className="w-3.5 h-3.5" /></div>
                    {label}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between px-3 py-2 text-xs border-b border-border">
                <span className="text-muted-foreground">Confidence</span><strong>87%</strong>
                <span className="text-muted-foreground ml-2">Sources</span><strong>3</strong>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-green-600 dark:text-green-400">
                <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.6 }} className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                Ready for tester review
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((m, i) => <MetricCard key={m.label} {...m} delay={i * 0.07} />)}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Agents list */}
        <motion.section variants={stagger.container} initial="hidden" animate="show" className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm">Agents</h3>
            <Button size="sm" variant="ghost" onClick={onNewAgent} className="gap-1 text-xs h-7 px-2">
              <Plus className="w-3.5 h-3.5" /> Create
            </Button>
          </div>
          <div className="divide-y divide-border">
            {state.agents.map((a) => (
              <motion.button key={a.id} variants={stagger.item} onClick={() => { state.activeAgentId = a.id; onNavigate("builder"); }}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent transition-colors text-left">
                <div>
                  <div className="font-medium text-sm">{a.name}</div>
                  <div className="text-xs text-muted-foreground">{a.type} · {a.knowledge.length} sources</div>
                </div>
                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", a.published ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-secondary text-muted-foreground")}>{a.published ? "Live" : "Draft"}</span>
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* Service Stack */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm">Service Stack</h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Free tier ready</span>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {stack.map((s) => (
              <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-secondary border border-border text-muted-foreground">{s}</span>
            ))}
          </div>
        </motion.section>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Aira vs Custom GPTs */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm">Aira Studio vs Custom GPTs</h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Why Aira</span>
          </div>
          <div className="p-4 space-y-2">
            {features.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </motion.section>

        {/* Best Demo Flow */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm">Best Demo Flow</h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Support agent</span>
          </div>
          <div className="p-4 space-y-3">
            {flow.map((f, i) => (
              <div key={f} className="flex items-center gap-3 text-sm">
                <span className="w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                {f}
              </div>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
