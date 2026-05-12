"use client";
import { motion } from "framer-motion";
import { Copy, MessageCircle, Check } from "lucide-react";
import { useState } from "react";
import type { AppState, Agent } from "@/lib/agent-state";
import { slugify } from "@/lib/agent-state";
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
        {/* Publish controls */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm">Publish Agent</h3>
            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", agent.published ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : allReady ? "bg-blue-100 text-blue-700" : "bg-secondary text-muted-foreground")}>
              {agent.published ? "Live" : allReady ? "Ready" : "Needs setup"}
            </span>
          </div>

          {/* Readiness */}
          <div className="divide-y divide-border">
            {readiness.map((check) => (
              <div key={check.label} className={cn("flex items-start gap-3 px-4 py-3", check.done && "bg-green-50/50 dark:bg-green-900/10")}>
                <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5", check.done ? "border-green-500 bg-green-500" : "border-muted-foreground")}>
                  {check.done && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <div>
                  <div className="font-medium text-sm">{check.label}</div>
                  <div className="text-xs text-muted-foreground">{check.detail}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Toggles */}
          <div className="divide-y divide-border border-t border-border">
            {[
              { key: "published", label: "Public share URL", disabled: !allReady },
              { key: "embedEnabled", label: "Embeddable widget", disabled: false },
              { key: "accessControl", label: "Access controls (planned)", disabled: true },
            ].map(({ key, label, disabled }) => (
              <label key={key} className={cn("flex items-center justify-between px-4 py-3", disabled && !agent[key as keyof Agent] && "opacity-50")}>
                <span className="text-sm">{label}</span>
                <div className="relative">
                  <input type="checkbox" className="sr-only peer" checked={Boolean(agent[key as keyof Agent])} disabled={disabled && key !== "embedEnabled"}
                    onChange={(e) => {
                      if (key === "published" && !allReady) return;
                      updateAgent({ [key]: e.target.checked });
                    }} />
                  <div className="w-9 h-5 rounded-full bg-secondary peer-checked:bg-foreground transition-colors cursor-pointer" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background shadow transition-transform peer-checked:translate-x-4" />
                </div>
              </label>
            ))}
          </div>
        </motion.div>

        {/* Share URL */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border"><h3 className="font-semibold text-sm">Share URL</h3></div>
          <div className="p-4 space-y-3">
            <div className="flex gap-2">
              <input readOnly value={shareUrl} className="flex-1 h-9 rounded-lg border border-input bg-muted px-3 text-sm text-muted-foreground" />
              <button onClick={copyUrl} className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border hover:bg-accent transition-colors text-sm">
                {copiedUrl ? <><Check className="w-3.5 h-3.5 text-green-500" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
              </button>
            </div>
            <pre className="text-[11px] text-muted-foreground bg-muted rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all font-mono">{embedCode}</pre>
          </div>
        </motion.div>
      </div>

      {/* Widget preview */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex flex-col items-center justify-center">
        <div className="w-72 bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-foreground text-background">
            <div className="w-8 h-8 rounded-full bg-background/20 flex items-center justify-center font-bold text-sm">A</div>
            <strong className="text-sm">{agent.name}</strong>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">{agent.greeting}</p>
            <button className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity">
              <MessageCircle className="w-4 h-4" /> Open Chat
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4">Widget preview</p>
      </motion.div>
    </div>
  );
}
