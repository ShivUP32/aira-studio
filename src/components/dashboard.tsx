"use client";
import { motion } from "framer-motion";
import { Sparkles, Play, FileText, Scissors, Database, Bot, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
      className="bg-[#091323] border border-[#162135] rounded-xl p-4 flex flex-col gap-1 hover:border-[rgba(16,185,129,0.15)] hover:shadow-[0_0_24px_rgba(16,185,129,0.07)] transition-all duration-300"
    >
      <span className="text-xs text-slate-500 font-medium">{label}</span>
      <strong className="text-2xl font-bold text-slate-100 tracking-tight">{value}</strong>
      <small className="text-xs text-slate-500">{hint}</small>
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
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#091323] via-[#0A1A2E] to-[#091323] border border-[#162135] p-6 md:p-8"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_20%_50%,rgba(16,185,129,0.08)_0%,transparent_70%)] pointer-events-none" />

        <div className="relative flex flex-col md:flex-row gap-8 items-start">
          {/* Left side content */}
          <div className="flex-1 space-y-4">
            {/* Feature pills */}
            <div className="flex flex-wrap gap-2">
              {["3-step agent builder","PDF to RAG","Voice ready"].map((pill) => (
                <span key={pill} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium px-2.5 py-1 rounded-full">
                  {pill}
                </span>
              ))}
            </div>

            {/* Eyebrow + Heading */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-400 mb-2">
                Aira Studio
              </p>
              <h2 className="text-3xl font-bold text-slate-100 leading-tight tracking-tight">
                Build voice-ready AI agents from your documents.
              </h2>
            </div>

            {/* Subtext */}
            <p className="text-slate-400 text-sm leading-relaxed max-w-md">
              A lightweight agent studio that turns business documents into tested, source-backed, voice-ready agents you can publish outside ChatGPT.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => onNavigate("builder")}
                className="bg-gradient-to-r from-emerald-400 to-emerald-600 text-black font-semibold hover:from-emerald-300 hover:to-emerald-500 gap-2"
              >
                <Sparkles className="w-4 h-4" /> Start Building
              </Button>
              <Button
                variant="secondary"
                onClick={() => onNavigate("test")}
                className="bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-slate-100 gap-2"
              >
                <Play className="w-4 h-4" /> Try Chat
              </Button>
            </div>
          </div>

          {/* Right side: Agent console mockup */}
          <div className="shrink-0 w-full md:w-72">
            <div className="bg-[#050C1A] border border-[#162135] rounded-xl overflow-hidden shadow-xl">
              {/* Top bar with dots */}
              <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-[#162135] bg-[#050C1A]/60">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="ml-2 text-xs text-slate-500 font-medium">Agent prompt</span>
              </div>

              {/* Prompt text */}
              <div className="p-3 text-xs text-slate-500 bg-[#050C1A]/60 border-b border-[#162135] italic">
                Build an agent that reads my PDF, answers with sources, and speaks while the transcript appears.
              </div>

              {/* Pipeline steps */}
              <div className="grid grid-cols-4 gap-1 p-3 border-b border-[#162135]">
                {[{icon: FileText, label:"Upload"},{icon:Scissors,label:"Chunk"},{icon:Database,label:"Store"},{icon:Bot,label:"Speak"}].map(({icon:Icon,label}) => (
                  <div key={label} className="flex flex-col items-center gap-1 text-[10px] text-slate-500">
                    <div className="w-7 h-7 rounded-lg bg-[#091323] flex items-center justify-center">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    {label}
                  </div>
                ))}
              </div>

              {/* Confidence row */}
              <div className="flex items-center justify-between px-3 py-2 text-xs border-b border-[#162135]">
                <span className="text-slate-500">Confidence</span>
                <strong className="text-slate-200">87%</strong>
                <span className="text-slate-500 ml-2">Sources</span>
                <strong className="text-slate-200">3</strong>
              </div>

              {/* Status row */}
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-emerald-400">
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.6 }}
                  className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"
                />
                Ready for tester review
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((m, i) => <MetricCard key={m.label} {...m} delay={i * 0.06} />)}
      </div>

      {/* Agents + Service Stack */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Agents List */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-[#091323] border-[#162135]">
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-sm font-semibold text-slate-100">Agents</CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={onNewAgent}
                className="gap-1 text-xs h-7 px-2 text-slate-400 hover:text-slate-100"
              >
                <Plus className="w-3.5 h-3.5" /> Create
              </Button>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-[#162135]">
              {state.agents.map((a, idx) => (
                <motion.button
                  key={a.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + idx * 0.08 }}
                  onClick={() => { state.activeAgentId = a.id; onNavigate("builder"); }}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/4 transition-all text-left"
                >
                  <div>
                    <div className="font-medium text-sm text-slate-200">{a.name}</div>
                    <div className="text-xs text-slate-500">{a.type} · {a.knowledge.length} sources</div>
                  </div>
                  <Badge variant={a.published ? "live" : "draft"}>
                    {a.published ? "Live" : "Draft"}
                  </Badge>
                </motion.button>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Service Stack */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
        >
          <Card className="bg-[#091323] border-[#162135]">
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-sm font-semibold text-slate-100">Service Stack</CardTitle>
              <Badge variant="green">Free tier ready</Badge>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-2">
                {stack.map((s) => (
                  <span key={s} className="bg-white/5 border border-white/8 text-slate-400 text-xs px-2.5 py-1 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Why Aira + Demo Flow */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Why Aira */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36 }}
        >
          <Card className="bg-[#091323] border-[#162135]">
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-sm font-semibold text-slate-100">Aira Studio vs Custom GPTs</CardTitle>
              <Badge variant="green">Why Aira</Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {features.map((f, idx) => (
                <motion.div
                  key={f}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.36 + idx * 0.06 }}
                  className="flex items-center gap-2 text-sm text-slate-300"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-0.5" />
                  {f}
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Demo Flow */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.44 }}
        >
          <Card className="bg-[#091323] border-[#162135]">
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-sm font-semibold text-slate-100">Best Demo Flow</CardTitle>
              <Badge variant="green">Support agent</Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {flow.map((f, i) => (
                <motion.div
                  key={f}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.44 + i * 0.07 }}
                  className="flex items-center gap-3 text-sm text-slate-300"
                >
                  <span className="w-5 h-5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 text-black text-[10px] font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  {f}
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
