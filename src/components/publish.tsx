"use client";
import { motion } from "framer-motion";
import { Copy, MessageCircle, Check, CheckCircle2, Circle } from "lucide-react";
import { useState } from "react";
import type { AppState, Agent } from "@/lib/agent-state";
import { slugify } from "@/lib/agent-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function getReadiness(agent: Agent, conversations: AppState["conversations"]) {
  const agentConvos = conversations.filter((c) => c.agentId === agent.id);
  return [
    { label: "Profile complete", detail: "Name, type, goal, greeting, and fallback are set.", done: Boolean(agent.name && agent.type && agent.goal && agent.greeting && agent.fallback) },
    { label: "Knowledge ready", detail: "At least one PDF, TXT, or FAQ source is available.", done: agent.knowledge.length > 0 },
    { label: "Three test questions", detail: `${agentConvos.length}/3 test questions completed.`, done: agentConvos.length >= 3 },
    { label: "Trusted answer found", detail: "At least one answer reached 60%+ confidence.", done: agentConvos.some((c) => c.confidence >= 60) },
  ];
}

interface PublishProps { state: AppState; onStateChange: (s: AppState) => void; }

export function Publish({ state, onStateChange }: PublishProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const agent = state.agents.find((a) => a.id === state.activeAgentId) || state.agents[0];
  const readiness = getReadiness(agent, state.conversations);
  const allReady = readiness.every((r) => r.done);
  const slug = slugify(agent.name);
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/agents/${slug}` : `https://yourdomain.com/agents/${slug}`;
  const embedCode = `<script async src="${shareUrl}/widget.js" data-agent="${agent.id}"></script>`;

  function updateAgent(updates: Partial<Agent>) {
    const agents = state.agents.map((a) => a.id === agent.id ? { ...a, ...updates } : a);
    onStateChange({ ...state, agents });
  }

  function copyUrl() {
    navigator.clipboard?.writeText(shareUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 1500);
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        {/* Publish controls card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-aira-card border-aira-line overflow-hidden">
            <CardHeader className="border-b border-aira-line bg-aira-bg/40 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-100">Publish Agent</CardTitle>
                <Badge variant={agent.published ? "live" : allReady ? "default" : "draft"}>
                  {agent.published ? "Live" : allReady ? "Ready" : "Needs setup"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Readiness checklist */}
              <div className="divide-y divide-aira-line">
                {readiness.map((check) => (
                  <div key={check.label} className={cn("flex items-start gap-3 px-5 py-3.5", check.done && "bg-emerald-500/5")}>
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

              {/* Toggle rows */}
              <div className="divide-y divide-aira-line border-t border-aira-line">
                {[
                  { key: "published", label: "Public share URL", disabled: !allReady },
                  { key: "embedEnabled", label: "Embeddable widget", disabled: false },
                  { key: "accessControl", label: "Access controls (planned)", disabled: true },
                ].map(({ key, label, disabled }) => (
                  <label key={key} className={cn("flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-white/3 transition-colors", disabled && !agent[key as keyof Agent] && "opacity-50 cursor-not-allowed")}>
                    <span className="text-sm text-slate-300">{label}</span>
                    <div className="relative h-5 w-10">
                      <input type="checkbox" className="sr-only peer" checked={Boolean(agent[key as keyof Agent])} disabled={disabled && key !== "embedEnabled"}
                        onChange={(e) => {
                          if (key === "published" && !allReady) return;
                          updateAgent({ [key]: e.target.checked });
                        }} />
                      <div className="absolute inset-0 rounded-full bg-white/10 peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-emerald-600 transition-colors" />
                      <motion.div
                        className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                        animate={{ x: agent[key as keyof Agent] ? 20 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Share URL card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-aira-card border-aira-line overflow-hidden">
            <CardHeader className="border-b border-aira-line bg-aira-bg/40 pb-3">
              <CardTitle className="text-slate-100">Share URL</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-2">
                <input readOnly value={shareUrl} className="flex-1 h-9 bg-aira-bg border border-aira-line rounded-lg px-3 text-xs text-slate-400 truncate" />
                <button onClick={copyUrl} className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-aira-line hover:border-emerald-500/30 hover:bg-emerald-500/5 text-slate-400 hover:text-emerald-400 transition-all text-sm">
                  {copiedUrl ? <><Check className="w-3.5 h-3.5" /></> : <><Copy className="w-3.5 h-3.5" /></>}
                </button>
              </div>
              <pre className="text-[11px] text-slate-500 bg-aira-bg rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all font-mono border border-aira-line">{embedCode}</pre>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Widget preview */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex flex-col items-center justify-center">
        <div className="w-72 bg-aira-card border border-aira-line rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.08),0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
          <div className="bg-gradient-to-r from-aira-forest to-aira-forest-light px-4 py-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
              {agent.name.charAt(0).toUpperCase()}
            </div>
            <strong className="text-sm font-semibold text-slate-100">{agent.name}</strong>
            <div className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-slate-400">{agent.greeting}</p>
            <button className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-sm font-medium transition-all">
              <MessageCircle className="w-4 h-4" /> Open Chat
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-600 mt-3 text-center">Widget preview</p>
      </motion.div>
    </div>
  );
}
