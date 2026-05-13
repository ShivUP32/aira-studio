import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Upload, Database, Mic, CheckCircle2, Cpu,
  Plus, Zap, FileText, Server, Globe,
} from 'lucide-react'
import { useApp } from '../lib/store'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import type { Route } from '../App'

interface DashboardProps {
  onNavigate: (route: Route) => void
  onEditAgent?: (agentId: string) => void
}

const containerVariants = {
  animate: { transition: { staggerChildren: 0.06 } },
}
const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
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

function MetricCard({ label, value, hint, unit = '' }: { label: string; value: number; hint: string; unit?: string }) {
  const numRef = useCountUp(value)
  return (
    <motion.div
      variants={itemVariants}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '20px 24px',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--text)', lineHeight: 1, marginBottom: 6 }}>
        <span ref={numRef}>0</span>
        {unit && <span style={{ fontSize: 20, color: 'var(--text-muted)', marginLeft: 2 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{hint}</div>
    </motion.div>
  )
}

const serviceStack = [
  'No-login prototype', 'Supabase Postgres', 'Supabase Storage',
  'pgvector', 'Groq API', 'Gemini fallback', 'Web Speech API', 'Vercel', 'GitHub',
]

const airaFeatures = [
  'Upload PDF → auto-chunked RAG',
  'Voice input & output (Web Speech API)',
  'Confidence score per answer',
  'Source citations inline',
  'No API key needed for prototype',
  'One-click publish + embed',
]

const gptsLimits = [
  'Manual copy-paste knowledge',
  'No voice out of the box',
  'No confidence scoring',
  'No source transparency',
  'Requires ChatGPT Plus subscription',
  'No embed widget',
]

const demoFlow = [
  'Open Aira Studio',
  'Pick a template (Support / Sales / Learning)',
  'Upload a PDF → watch it chunk',
  'Type a question → see sources + confidence',
  'Toggle voice mode — speak your question',
  'Hit Publish → copy embed snippet',
]

export function Dashboard({ onNavigate, onEditAgent }: DashboardProps) {
  const { state } = useApp()
  const activeAgent = state.agents.find(a => a.id === state.activeAgentId)

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      style={{ display: 'flex', flexDirection: 'column', gap: 28 }}
    >
      {/* Hero Band */}
      <motion.div
        variants={itemVariants}
        className="dot-grid"
        style={{
          minHeight: 340,
          borderRadius: 16,
          overflow: 'hidden',
          position: 'relative',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'stretch',
        }}
      >
        {/* Dark gradient overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(10,12,18,0.85) 0%, rgba(17,21,32,0.6) 100%)',
            zIndex: 1,
          }}
        />
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            width: '100%',
            alignItems: 'center',
            padding: '48px',
            gap: 48,
          }}
        >
          {/* Left text */}
          <motion.div
            style={{ flex: 1 }}
            variants={containerVariants}
            initial="initial"
            animate="animate"
          >
            <motion.div variants={itemVariants} style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              <Badge>3-step agent builder</Badge>
              <Badge>PDF to RAG</Badge>
              <Badge>Voice ready</Badge>
            </motion.div>
            <motion.h2
              variants={itemVariants}
              style={{
                fontSize: 36,
                fontWeight: 900,
                color: 'var(--text)',
                lineHeight: 1.1,
                marginBottom: 16,
                letterSpacing: '-0.02em',
              }}
            >
              Build voice-ready AI agents<br />from your documents.
            </motion.h2>
            <motion.p
              variants={itemVariants}
              style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 28, maxWidth: 420 }}
            >
              Upload a PDF, configure your agent in minutes, and deploy a voice-enabled chatbot with confidence scoring and source citations — no ML expertise required.
            </motion.p>
            <motion.div variants={itemVariants} style={{ display: 'flex', gap: 12 }}>
              <Button variant="primary" size="lg" onClick={() => onNavigate('builder')}>
                <Zap size={16} />
                Start Building
              </Button>
              <Button variant="secondary" size="lg" onClick={() => onNavigate('test')}>
                <Mic size={16} />
                Try Chat
              </Button>
            </motion.div>
          </motion.div>

          {/* Right — Agent Console Card */}
          <motion.div
            variants={itemVariants}
            className="glass"
            style={{
              width: 300,
              flexShrink: 0,
              borderRadius: 12,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Agent Console
            </div>
            <div
              style={{
                background: 'rgba(0,212,160,0.06)',
                border: '1px solid var(--border-accent)',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 12,
                color: 'var(--text-secondary)',
                fontFamily: 'monospace',
                lineHeight: 1.5,
              }}
            >
              You are {activeAgent?.name ?? 'Aira Support Assistant'}, a {activeAgent?.type ?? 'Support Agent'}. Answer questions from your knowledge base accurately...
            </div>
            {/* Pipeline steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { Icon: Upload, label: 'Upload' },
                { Icon: Cpu, label: 'Chunk' },
                { Icon: Database, label: 'Store' },
                { Icon: Mic, label: 'Speak' },
              ].map(({ Icon, label }, i) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: 'var(--accent-dim)',
                      border: '1px solid var(--border-accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={12} color="var(--accent)" />
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
                  {i < 3 && (
                    <div style={{ flex: 1, height: 1, background: 'var(--border)', marginLeft: 4 }} />
                  )}
                </div>
              ))}
            </div>
            {/* Confidence row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                background: 'var(--surface-2)',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 12,
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>Confidence</span>
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>87%</span>
              <span style={{ color: 'var(--text-muted)' }}>Sources</span>
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>3</span>
            </div>
            {/* Ready indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.8 }}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  boxShadow: '0 0 8px var(--accent)',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Ready for tester review</span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <MetricCard label="Agents" value={state.agents.length} hint="Total agents created" />
        <MetricCard label="Conversations" value={state.conversations.length} hint="All-time sessions" />
        <MetricCard label="Resolution" value={92} hint="Questions answered" unit="%" />
        <MetricCard label="Unknown" value={state.conversations.filter(c => c.confidence < 0.5).length} hint="Low-confidence replies" />
      </div>

      {/* Agents + Service Stack */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Agents list */}
        <motion.div
          variants={itemVariants}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14 }}>Agents</span>
            <button
              onClick={() => onNavigate('builder')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 6,
              }}
            >
              <Plus size={12} />
              Create
            </button>
          </div>
          <div style={{ padding: '8px 0' }}>
            {state.agents.map(agent => (
              <div
                key={agent.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 20px',
                  gap: 12,
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {agent.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {agent.type} · {agent.knowledge.length} source{agent.knowledge.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge variant={agent.published ? 'live' : 'draft'}>
                    {agent.published ? 'Live' : 'Draft'}
                  </Badge>
                  <button
                    onClick={() => onEditAgent?.(agent.id)}
                    title="Edit agent"
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 500, transition: 'color 0.15s, border-color 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)' }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
            {state.agents.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No agents yet. Create one to get started.
              </div>
            )}
          </div>
        </motion.div>

        {/* Service Stack */}
        <motion.div
          variants={itemVariants}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '20px',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Service Stack</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {serviceStack.map(item => (
              <span
                key={item}
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 20,
                  padding: '5px 12px',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                }}
              >
                {item}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 20, padding: '12px', background: 'var(--accent-dim)', borderRadius: 8, border: '1px solid var(--border-accent)' }}>
            <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>
              <Server size={12} style={{ display: 'inline', marginRight: 6 }} />
              Infrastructure ready
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              All services are pre-configured. No DevOps setup required for prototype.
            </div>
          </div>
        </motion.div>
      </div>

      {/* Comparison + Demo Flow */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Aira vs Custom GPTs */}
        <motion.div
          variants={itemVariants}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '24px',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Aira vs Custom GPTs</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Aira Studio ✓
              </div>
              {airaFeatures.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                  <CheckCircle2 size={13} color="var(--accent)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{f}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Custom GPTs ✗
              </div>
              {gptsLimits.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--red)', flexShrink: 0, marginTop: 1 }}>✗</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Best Demo Flow */}
        <motion.div
          variants={itemVariants}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '24px',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>
            <Globe size={15} style={{ display: 'inline', marginRight: 8 }} />
            Best Demo Flow
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {demoFlow.map((step, i) => (
              <div key={step} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'var(--accent-dim)',
                    border: '1px solid var(--border-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--accent)',
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, paddingTop: 2 }}>{step}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20 }}>
            <Button variant="primary" size="sm" onClick={() => onNavigate('builder')} style={{ width: '100%', justifyContent: 'center' }}>
              <FileText size={14} />
              Start Demo Now
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
