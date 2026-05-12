"use client";
import { motion } from "framer-motion";
import type { AppState } from "@/lib/agent-state";
import { average } from "@/lib/agent-state";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

function MetricCard({ label, value, hint, delay }: { label: string; value: string | number; hint: string; delay?: number }) {
  return (
    <motion.article initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay || 0 }}
      className="bg-aira-card border border-aira-line rounded-xl p-5 hover:border-[rgba(16,185,129,0.15)] transition-all">
      <span className="text-xs text-slate-500 font-medium">{label}</span>
      <strong className="text-2xl font-bold text-slate-100 mt-1.5 tabular-nums">{value}</strong>
      <small className="text-xs text-slate-600 mt-0.5 block">{hint}</small>
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
    { label: "0–40", count: conversations.filter((c) => c.confidence <= 40).length, gradient: "from-red-500 to-red-400" },
    { label: "41–70", count: conversations.filter((c) => c.confidence > 40 && c.confidence <= 70).length, gradient: "from-amber-500 to-yellow-400" },
    { label: "71–100", count: conversations.filter((c) => c.confidence > 70).length, gradient: "from-emerald-500 to-emerald-400" },
  ];

  const unknowns = conversations.filter((c) => c.confidence < 45).slice(-6);
  const failed = conversations.filter((c) => c.confidence < 45 || c.feedback === "down").slice(-6);

  return (
    <div className="space-y-6">
      {/* Metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((m, i) => <MetricCard key={m.label} {...m} delay={i * 0.06} />)}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Confidence distribution card */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-aira-card border-aira-line overflow-hidden h-full">
            <CardHeader className="border-b border-aira-line bg-aira-bg/40 pb-3">
              <CardTitle className="text-slate-100">Confidence Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {buckets.map(({ label, count, gradient }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-14 text-slate-500">{label}</span>
                  <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / total) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                      className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-6 text-right">{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.section>

        {/* Unknown questions card */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="bg-aira-card border-aira-line overflow-hidden h-full">
            <CardHeader className="border-b border-aira-line bg-aira-bg/40 pb-3">
              <CardTitle className="text-slate-100">Unknown Questions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-aira-line">
                {unknowns.length ? unknowns.map((c, i) => (
                  <div key={i} className="px-4 py-2.5 text-sm text-slate-400">{c.question}</div>
                )) : <div className="px-4 py-4 text-xs text-slate-600">No unknown questions yet.</div>}
              </div>
            </CardContent>
          </Card>
        </motion.section>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Failed intents card */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-aira-card border-aira-line overflow-hidden h-full">
            <CardHeader className="border-b border-aira-line bg-aira-bg/40 pb-3">
              <CardTitle className="text-slate-100">Top Failed Intents</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-aira-line">
                {failed.length ? failed.map((c, i) => (
                  <div key={i} className="px-4 py-2.5 text-sm text-slate-400 truncate">{c.question}</div>
                )) : <div className="px-4 py-4 text-xs text-slate-600">No failed intents yet.</div>}
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Improvement suggestions card */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="bg-aira-card border-aira-line overflow-hidden h-full">
            <CardHeader className="border-b border-aira-line bg-aira-bg/40 pb-3">
              <CardTitle className="text-slate-100">Improvement Suggestions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-aira-line">
                {conversations.some((c) => c.confidence < 45) ? (
                  ["Add low-confidence questions as Manual FAQ entries.", "Upload clearer source documents for repeated unknowns.", "Retest failed answers before publishing."].map((s, i) => (
                    <div key={i} className="px-4 py-2.5 text-sm text-slate-400 flex items-start gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                      <span>{s}</span>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-4 text-xs text-slate-600">Keep testing common user questions to build confidence.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.section>
      </div>
    </div>
  );
}
