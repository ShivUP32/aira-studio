import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  MessageSquare, TrendingUp, CheckCircle2, HelpCircle,
  AlertTriangle, Lightbulb, BarChart3,
} from 'lucide-react'
import { useApp } from '../lib/store'

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
  icon: Icon,
  label,
  value,
  unit = '',
  hint,
  accent = false,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>
  label: string
  value: number
  unit?: string
  hint: string
  accent?: boolean
}) {
  const numRef = useCountUp(value)
  return (
    <motion.div
      variants={itemVariants}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${accent ? 'var(--border-accent)' : 'var(--border)'}`,
        borderRadius: 12,
        padding: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </div>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: accent ? 'var(--accent-dim)' : 'var(--surface-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
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

const confidenceRanges = [
  { label: '90–100%', count: 12, color: 'var(--accent)' },
  { label: '80–89%', count: 8, color: '#34d399' },
  { label: '70–79%', count: 5, color: 'var(--yellow)' },
  { label: '60–69%', count: 3, color: '#fb923c' },
  { label: '<60%', count: 2, color: 'var(--red)' },
]

const unknownQuestions = [
  'What is your pricing for enterprise?',
  'Can I integrate with Slack?',
  'Do you support HIPAA compliance?',
  'Is there a mobile app?',
  'What languages do you support?',
]

const failedIntents = [
  { intent: 'Pricing inquiry', count: 4, suggestion: 'Add pricing FAQ to knowledge base' },
  { intent: 'Integration question', count: 3, suggestion: 'Upload integrations documentation' },
  { intent: 'Compliance query', count: 2, suggestion: 'Add compliance doc or redirect to sales' },
]

const improvements = [
  'Upload a pricing document to answer cost-related questions',
  'Add integrations documentation to handle API questions',
  'Create a FAQ section for your most common unknown questions',
  'Consider lowering the confidence threshold from 60% to 55%',
  'Add a "Contact Sales" CTA for enterprise queries',
]

const maxCount = Math.max(...confidenceRanges.map(r => r.count))

export function Analytics() {
  const { state } = useApp()
  const totalConvs = state.conversations.length
  const avgConfidence = state.conversations.length > 0
    ? Math.round(state.conversations.reduce((sum, c) => sum + c.confidence, 0) / state.conversations.length * 100)
    : 87
  const answeredPct = 92
  const unknownCount = state.conversations.filter(c => c.confidence < 0.5).length

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
    >
      {/* Metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <MetricCard icon={MessageSquare} label="Total Conversations" value={totalConvs} hint="All sessions" />
        <MetricCard icon={TrendingUp} label="Avg Confidence" value={avgConfidence} unit="%" hint="Across all answers" accent />
        <MetricCard icon={CheckCircle2} label="Questions Answered" value={answeredPct} unit="%" hint="Above confidence threshold" />
        <MetricCard icon={HelpCircle} label="Unknown" value={unknownCount} hint="Fell back to fallback message" />
      </div>

      {/* Confidence distribution + unknown questions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Confidence distribution */}
        <motion.div
          variants={itemVariants}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <BarChart3 size={15} color="var(--accent)" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Confidence Distribution</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {confidenceRanges.map(range => (
              <div key={range.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 56, flexShrink: 0, textAlign: 'right' }}>
                  {range.label}
                </span>
                <div style={{ flex: 1, position: 'relative', height: 20, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(range.count / maxCount) * 100}%` }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      height: '100%',
                      background: range.color,
                      borderRadius: 4,
                      opacity: 0.8,
                    }}
                  />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', width: 20, flexShrink: 0, textAlign: 'right' }}>
                  {range.count}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Unknown questions */}
        <motion.div
          variants={itemVariants}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <HelpCircle size={15} color="var(--yellow)" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Unknown Questions</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {unknownQuestions.map((q, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '8px 10px',
                  background: 'var(--surface-2)',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    background: 'rgba(251,191,36,0.1)',
                    border: '1px solid rgba(251,191,36,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    fontWeight: 700,
                    color: 'var(--yellow)',
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  ?
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{q}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Failed intents + Improvements */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Failed intents */}
        <motion.div
          variants={itemVariants}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <AlertTriangle size={15} color="var(--red)" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Failed Intents</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {failedIntents.map(fi => (
              <div
                key={fi.intent}
                style={{
                  padding: '12px',
                  background: 'var(--surface-2)',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{fi.intent}</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--red)',
                      background: 'rgba(248,113,113,0.1)',
                      border: '1px solid rgba(248,113,113,0.2)',
                      borderRadius: 4,
                      padding: '1px 6px',
                    }}
                  >
                    {fi.count}×
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  → {fi.suggestion}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Improvement suggestions */}
        <motion.div
          variants={itemVariants}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Lightbulb size={15} color="var(--accent)" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Improvement Suggestions</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {improvements.map((suggestion, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 12px',
                  background: i === 0 ? 'var(--accent-dim)' : 'var(--surface-2)',
                  border: `1px solid ${i === 0 ? 'var(--border-accent)' : 'var(--border)'}`,
                  borderRadius: 8,
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: i === 0 ? 'var(--accent)' : 'var(--surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    fontWeight: 800,
                    color: i === 0 ? '#0a0c12' : 'var(--text-muted)',
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ fontSize: 12, color: i === 0 ? 'var(--text)' : 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {suggestion}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
