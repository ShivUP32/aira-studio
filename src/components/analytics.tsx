"use client";
import { motion } from "framer-motion";
import type { AppState } from "@/lib/agent-state";
import { average } from "@/lib/agent-state";

function MetricCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <motion.article initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <strong className="text-2xl font-bold tracking-tight">{value}</strong>
      <small className="text-xs text-muted-foreground">{hint}</small>
    </motion.article>
  );
}

interface AnalyticsProps { state: AppState; }

export function Analytics({ state }: AnalyticsProps) {
  const agent = state.agents.find((a) => a.id === state.activeAgentId) || state.agents[0];
  const conversations = state.conversations.filter((c) => c.agentId === agent.id);
  const avgConfidence = average(conversations.map((c) => c.confidence));
  const avgResponse = average(conversations.map((c) => c.responseTime || 0));
  const voice = state.events.filter((e) => e.agentId === agent.id && e.type === "voice").length;
  const total = Math.max(1, conversations.length);

  const metrics = [
    { label: "Total conversations", value: conversations.length, hint: "Chat sessions" },
    { label: "Resolution rate", value: `${Math.round((conversations.filter((c) => c.confidence >= 60).length / total) * 100)}%`, hint: "60%+ confidence" },
    { label: "Low-confidence rate", value: `${Math.round((conversations.filter((c) => c.confidence < 45).length / total) * 100)}%`, hint: "Needs review" },
    { label: "Human escalation", value: conversations.filter((c) => c.confidence < 35 || c.feedback === "down").length, hint: "Likely needed" },
    { label: "Feedback ratio", value: `${conversations.filter((c) => c.feedback === "up").length}/${conversations.filter((c) => c.feedback === "down").length}`, hint: "Positive / negative" },
    { label: "Voice usage", value: voice, hint: "Mic interactions" },
    { label: "Avg response time", value: `${avgResponse.toFixed(1)}s`, hint: "Local simulation" },
    { label: "Avg confidence", value: `${Math.round(avgConfidence || 0)}%`, hint: "Retrieval score" },
  ];

  const buckets = [
    { label: "0–40", count: conversations.filter((c) => c.confidence <= 40).length, color: "bg-red-400" },
    { label: "41–70", count: conversations.filter((c) => c.confidence > 40 && c.confidence <= 70).length, color: "bg-yellow-400" },
    { label: "71–100", count: conversations.filter((c) => c.confidence > 70).length, color: "bg-green-400" },
  ];

  const unknowns = conversations.filter((c) => c.confidence < 45).slice(-6);
  const failed = conversations.filter((c) => c.confidence < 45 || c.feedback === "down").slice(-6);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((m, i) => <motion.div key={m.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}><MetricCard {...m} /></motion.div>)}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Confidence chart */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border"><h3 className="font-semibold text-sm">Confidence Distribution</h3></div>
          <div className="p-4 space-y-3">
            {buckets.map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs font-medium w-12 text-muted-foreground">{label}</span>
                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(count / total) * 100}%` }} transition={{ duration: 0.8, delay: 0.3 }} className={`h-full rounded-full ${color}`} />
                </div>
                <span className="text-xs text-muted-foreground w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Unknown questions */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border"><h3 className="font-semibold text-sm">Unknown Questions</h3></div>
          <div className="divide-y divide-border">
            {unknowns.length ? unknowns.map((c, i) => (
              <div key={i} className="px-4 py-2.5 text-sm text-muted-foreground">{c.question}</div>
            )) : <div className="px-4 py-4 text-xs text-muted-foreground">No unknown questions yet.</div>}
          </div>
        </motion.section>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Failed intents */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border"><h3 className="font-semibold text-sm">Top Failed Intents</h3></div>
          <div className="divide-y divide-border">
            {failed.length ? failed.map((c, i) => (
              <div key={i} className="px-4 py-2.5 text-sm text-muted-foreground truncate">{c.question}</div>
            )) : <div className="px-4 py-4 text-xs text-muted-foreground">No failed intents yet.</div>}
          </div>
        </motion.section>

        {/* Suggestions */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border"><h3 className="font-semibold text-sm">Improvement Suggestions</h3></div>
          <div className="divide-y divide-border">
            {conversations.some((c) => c.confidence < 45) ? (
              ["Add low-confidence questions as Manual FAQ entries.", "Upload clearer source documents for repeated unknowns.", "Retest failed answers before publishing."].map((s, i) => (
                <div key={i} className="px-4 py-2.5 text-sm text-muted-foreground">{s}</div>
              ))
            ) : (
              <div className="px-4 py-4 text-xs text-muted-foreground">Keep testing common user questions to build confidence.</div>
            )}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
