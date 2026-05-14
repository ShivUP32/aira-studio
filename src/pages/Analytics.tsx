import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  MessageSquare, TrendingUp, CheckCircle2, HelpCircle,
  AlertTriangle, Lightbulb, BarChart3,
} from 'lucide-react'
import { useApp } from '../lib/store'
import type { Conversation } from '../lib/store'

const containerVariants = {
  animate: { transition: { staggerChildren: 0.06 } },
}
const itemVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

function useCountUp(target: number, duration = 1000) {
  const nodeRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = nodeRef.current
    if (!el) return
    const start = performance.now()
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      el.textContent = String(Math.round(eased * target))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration])
  return nodeRef
}

function MetricCard({
  icon: Icon, label, value, unit = '', hint, accent = false,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>
  label: string; value: number; unit?: string; hint: string; accent?: boolean
}) {
  const numRef = useCountUp(value)
  return (
    <motion.div variants={itemVariants} style={{ background: 'var(--surface)', border: `1px solid ${accent ? 'var(--border-accent)' : 'var(--border)'}`, borderRadius: 12, padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: accent ? 'var(--accent-dim)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} color={accent ? 'var(--accent)' : 'var(--text-muted)'} />
        </div>
      </div>
      <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, color: accent ? 'var(--accent)' : 'var(--text)', marginBottom: 4 }}>
        <span ref={numRef}>0</span>
        {unit && <span style={{ fontSize: 18, color: 'var(--text-muted)', marginLeft: 2 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{hint}</div>
    </motion.div>
  )
}

const CONF_RANGES = [
  { label: '90–100%', min: 0.9,  max: 1.01, color: 'var(--accent)' },
  { label: '80–89%',  min: 0.8,  max: 0.9,  color: '#34d399' },
  { label: '70–79%',  min: 0.7,  max: 0.8,  color: 'var(--yellow)' },
  { label: '60–69%',  min: 0.6,  max: 0.7,  color: '#fb923c' },
  { label: '<60%',    min: 0,    max: 0.6,  color: 'var(--red)' },
]

function computeAnalytics(convs: Conversation[]) {
  const total = convs.length

  const avgConfidence = total > 0
    ? Math.round(convs.reduce((sum, c) => sum + c.confidence, 0) / total * 100)
    : 0

  const answeredCount = convs.filter(c => c.confidence >= 0.6).length
  const answeredPct = total > 0 ? Math.round(answeredCount / total * 100) : 0

  const unknownConvs = convs.filter(c => c.confidence < 0.6)
  const unknownCount = unknownConvs.length

  const distribution = CONF_RANGES.map(r => ({
    ...r,
    count: convs.filter(c => c.confidence >= r.min && c.confidence < r.max).length,
  }))

  const unknownQuestions = unknownConvs.slice(-10).reverse().map(c => c.userQuery)

  // Group low-confidence questions by first keyword
  const intentMap = new Map<string, { questions: string[] }>()
  for (const c of unknownConvs) {
    const key = c.userQuery.trim().split(/\s+/)[0].toLowerCase()
    const existing = intentMap.get(key)
    if (existing) existing.questions.push(c.userQuery)
    else intentMap.set(key, { questions: [c.userQuery] })
  }
  const failedIntents = Array.from(intentMap.entries())
    .map(([, val]) => ({
      intent: val.questions[0].slice(0, 50),
      count: val.questions.length,
      suggestion: `Add more knowledge covering: "${val.questions[0].slice(0, 40)}"`,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const suggestions: string[] = []
  if (unknownCount > 0)
    suggestions.push(`Add content to answer the ${unknownCount} unanswered question${unknownCount > 1 ? 's' : ''}`)
  if (avgConfidence > 0 && avgConfidence < 70)
    suggestions.push('Upload more documentation to improve confidence scores')
  if (unknownQuestions.length > 3)
    suggestions.push('Create a FAQ document for your most common unknown questions')
  if (avgConfidence > 0 && avgConfidence < 80)
    suggestions.push('Consider lowering the confidence threshold from 60% to 55%')
  if (total > 10 && unknownCount / total > 0.2)
    suggestions.push('Over 20% of questions go unanswered — review your knowledge base')
  if (suggestions.length === 0 && total > 0)
    suggestions.push('Your agent is performing well! Keep the knowledge base updated.')

  return { total, avgConfidence, answeredPct, unknownCount, distribution, unknownQuestions, failedIntents, suggestions }
}

export function Analytics() {
  const { state } = useApp()
  const localConvs = state.conversations.filter(c => c.agentId === state.activeAgentId)
  const [remoteConvs, setRemoteConvs] = useState<Conversation[] | null>(null)

  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
    if (!supabaseUrl || !supabaseKey || !state.activeAgentId) return

    const params = new URLSearchParams({
      agent_id: `eq.${state.activeAgentId}`,
      order: 'created_at.desc',
      limit: '500',
      select: 'agent_id,user_query,assistant_answer,confidence,created_at',
    })

    fetch(`${supabaseUrl}/rest/v1/aira_conversations?${params}`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    })
      .then(r => r.json())
      .then((rows: Array<{ agent_id: string; user_query: string; assistant_answer: string; confidence: number; created_at: string }>) => {
        if (!Array.isArray(rows)) return
        setRemoteConvs(rows.map(r => ({
          id: r.created_at,
          agentId: r.agent_id,
          userQuery: r.user_query,
          assistantAnswer: r.assistant_answer,
          confidence: r.confidence,
          timestamp: new Date(r.created_at).getTime(),
        })))
      })
      .catch(() => { /* keep localStorage fallback */ })
  }, [state.activeAgentId])

  // Merge remote + local, deduplicate by userQuery+timestamp proximity
  const agentConvs: Conversation[] = remoteConvs ?? localConvs

  const { total, avgConfidence, answeredPct, unknownCount, distribution, unknownQuestions, failedIntents, suggestions } = computeAnalytics(agentConvs)
  const maxCount = Math.max(...distribution.map(r => r.count), 1)

  return (
    <motion.div variants={containerVariants} initial="initial" animate="animate" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <MetricCard icon={MessageSquare} label="Total Conversations" value={total} hint="All sessions" />
        <MetricCard icon={TrendingUp} label="Avg Confidence" value={avgConfidence} unit="%" hint="Across all answers" accent />
        <MetricCard icon={CheckCircle2} label="Questions Answered" value={answeredPct} unit="%" hint="Above confidence threshold" />
        <MetricCard icon={HelpCircle} label="Unknown" value={unknownCount} hint="Fell back to fallback message" />
      </div>

      {/* Empty state */}
      {total === 0 && (
        <motion.div variants={itemVariants} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '48px 20px', textAlign: 'center' }}>
          <MessageSquare size={32} color="var(--text-muted)" style={{ marginBottom: 12, opacity: 0.35 }} />
          <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)', fontSize: 14 }}>No conversations yet</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Chat with your agent on the Test page to start seeing real analytics here.</div>
        </motion.div>
      )}

      {total > 0 && (
        <>
          {/* Confidence distribution + Unknown questions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <motion.div variants={itemVariants} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <BarChart3 size={15} color="var(--accent)" />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Confidence Distribution</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {distribution.map(range => (
                  <div key={range.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 56, flexShrink: 0, textAlign: 'right' }}>{range.label}</span>
                    <div style={{ flex: 1, position: 'relative', height: 20, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(range.count / maxCount) * 100}%` }}
                        transition={{ duration: 0.7, delay: 0.2 }}
                        style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: range.color, borderRadius: 4, opacity: 0.85 }}
                      />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', width: 20, flexShrink: 0, textAlign: 'right' }}>{range.count}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div variants={itemVariants} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <HelpCircle size={15} color="var(--yellow)" />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Unknown Questions</span>
              </div>
              {unknownQuestions.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', paddingTop: 16 }}>No low-confidence answers — great job!</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {unknownQuestions.map((q, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <span style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--yellow)', flexShrink: 0, marginTop: 1 }}>?</span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{q}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Failed intents + Improvement suggestions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <motion.div variants={itemVariants} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <AlertTriangle size={15} color="var(--red)" />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Failed Intents</span>
              </div>
              {failedIntents.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', paddingTop: 16 }}>No failed intents recorded.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {failedIntents.map(fi => (
                    <div key={fi.intent} style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{fi.intent}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 4, padding: '1px 6px' }}>{fi.count}×</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>→ {fi.suggestion}</div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            <motion.div variants={itemVariants} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Lightbulb size={15} color="var(--accent)" />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Improvement Suggestions</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {suggestions.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: i === 0 ? 'var(--accent-dim)' : 'var(--surface-2)', border: `1px solid ${i === 0 ? 'var(--border-accent)' : 'var(--border)'}`, borderRadius: 8 }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: i === 0 ? 'var(--accent)' : 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: i === 0 ? '#0a0c12' : 'var(--text-muted)', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                    <span style={{ fontSize: 12, color: i === 0 ? 'var(--text)' : 'var(--text-secondary)', lineHeight: 1.4 }}>{s}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </motion.div>
  )
}
