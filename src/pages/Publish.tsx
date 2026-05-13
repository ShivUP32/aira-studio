import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle2, AlertCircle, Copy, Check,
  Globe, Code2, Shield, MessageCircle,
} from 'lucide-react'
import { useApp } from '../lib/store'
import { Button } from '../components/ui/button'

const containerVariants = {
  animate: { transition: { staggerChildren: 0.06 } },
}
const itemVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        background: checked ? 'var(--accent)' : 'var(--surface-2)',
        border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.2s',
        flexShrink: 0,
      }}
      role="switch"
      aria-checked={checked}
    >
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: checked ? '#0a0c12' : 'var(--text-muted)',
          position: 'absolute',
          top: 2,
          left: checked ? 20 : 2,
          transition: 'left 0.2s',
        }}
      />
    </button>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setError(false)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      setError(true)
      setTimeout(() => setError(false), 3000)
    })
  }
  return (
    <button
      onClick={handleCopy}
      style={{
        background: error ? 'rgba(248,113,113,0.1)' : copied ? 'var(--accent-dim)' : 'var(--surface-2)',
        border: `1px solid ${error ? 'rgba(248,113,113,0.3)' : copied ? 'var(--border-accent)' : 'var(--border)'}`,
        borderRadius: 6,
        padding: '5px 10px',
        cursor: 'pointer',
        color: error ? 'var(--red)' : copied ? 'var(--accent)' : 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 12,
        fontWeight: 500,
        transition: 'all 0.15s',
        flexShrink: 0,
      }}
    >
      {error ? <AlertCircle size={12} /> : copied ? <Check size={12} /> : <Copy size={12} />}
      {error ? 'Copy failed' : copied ? 'Copied' : 'Copy'}
    </button>
  )
}

export function Publish() {
  const { state, dispatch } = useApp()
  const activeAgent = state.agents.find(a => a.id === state.activeAgentId)

  const [publicUrl, setPublicUrl] = useState(false)
  const [embeddable, setEmbeddable] = useState(false)
  const [accessControl, setAccessControl] = useState(false)

  const shareUrl = `https://aira.studio/agent/${state.activeAgentId}`
  const embedCode = `<script src="https://aira.studio/embed.js" data-agent="${state.activeAgentId}" data-theme="dark"></script>`

  const readinessItems = [
    { label: 'Agent name configured', done: !!activeAgent?.name },
    { label: 'Goal defined', done: !!activeAgent?.goal },
    { label: 'Greeting set', done: !!activeAgent?.greeting },
    { label: 'Knowledge base uploaded', done: (activeAgent?.knowledge?.filter(k => k.status === 'ready').length ?? 0) > 0 },
    { label: 'Fallback message set', done: !!activeAgent?.fallback },
  ]

  const allReady = readinessItems.every(i => i.done)

  const handlePublish = () => {
    if (!activeAgent) return
    dispatch({ type: 'UPDATE_AGENT', agent: { ...activeAgent, published: !activeAgent.published } })
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}
    >
      {/* Left — Settings */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Readiness checklist */}
        <motion.div
          variants={itemVariants}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '20px',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Readiness Checklist</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {readinessItems.map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {item.done
                  ? <CheckCircle2 size={15} color="var(--accent)" />
                  : <AlertCircle size={15} color="var(--text-muted)" />}
                <span style={{ fontSize: 13, color: item.done ? 'var(--text)' : 'var(--text-muted)' }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
          {!allReady && (
            <div style={{ marginTop: 14, padding: '10px 12px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--yellow)' }}>
              Complete all checklist items before publishing for the best experience.
            </div>
          )}
        </motion.div>

        {/* Publish toggles */}
        <motion.div
          variants={itemVariants}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '20px',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Deployment Options</div>

          {[
            { icon: Globe, label: 'Public URL', desc: 'Anyone with the link can chat with your agent', value: publicUrl, setter: setPublicUrl },
            { icon: Code2, label: 'Embeddable Widget', desc: 'Embed the chat widget on any website', value: embeddable, setter: setEmbeddable },
            { icon: Shield, label: 'Access Controls', desc: 'Restrict who can access your agent', value: accessControl, setter: setAccessControl },
          ].map(({ icon: Icon, label, desc, value, setter }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'var(--surface-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={15} color="var(--text-muted)" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{desc}</div>
                </div>
              </div>
              <Toggle checked={value} onChange={setter} />
            </div>
          ))}
        </motion.div>

        {/* Share URL */}
        {publicUrl && (
          <motion.div
            variants={itemVariants}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '20px',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Share URL</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                readOnly
                value={shareUrl}
                style={{
                  flex: 1,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text-secondary)',
                  padding: '8px 12px',
                  fontSize: 12,
                  fontFamily: 'monospace',
                  outline: 'none',
                }}
              />
              <CopyButton text={shareUrl} />
            </div>
          </motion.div>
        )}

        {/* Embed code */}
        {embeddable && (
          <motion.div
            variants={itemVariants}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Embed Code</div>
              <CopyButton text={embedCode} />
            </div>
            <pre
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '12px',
                fontSize: 11,
                color: 'var(--accent)',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              {embedCode}
            </pre>
          </motion.div>
        )}

        {/* Publish CTA */}
        <motion.div variants={itemVariants}>
          <Button
            variant="primary"
            size="lg"
            onClick={handlePublish}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {activeAgent?.published ? 'Unpublish Agent' : 'Publish Agent'}
          </Button>
          {activeAgent?.published && (
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--accent)', marginTop: 8 }}>
              Agent is live and accessible
            </p>
          )}
        </motion.div>
      </div>

      {/* Right — Widget preview */}
      <motion.div variants={itemVariants}>
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '20px',
            position: 'sticky',
            top: 0,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 16, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Widget Preview
          </div>

          {/* Mini chat widget */}
          <div
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {/* Widget header */}
            <div
              style={{
                background: 'var(--accent)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <MessageCircle size={15} color="#0a0c12" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0a0c12' }}>
                {activeAgent?.name ?? 'AI Assistant'}
              </span>
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.8 }}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#0a0c12',
                  marginLeft: 'auto',
                }}
              />
            </div>

            {/* Widget messages */}
            <div style={{ padding: '14px 14px 8px', minHeight: 160 }}>
              <div
                style={{
                  background: 'var(--surface)',
                  borderRadius: '10px 10px 10px 2px',
                  padding: '8px 12px',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  marginBottom: 10,
                  maxWidth: '85%',
                  lineHeight: 1.4,
                }}
              >
                {activeAgent?.greeting ?? 'Hi! How can I help you today?'}
              </div>
              <div
                style={{
                  background: 'var(--accent)',
                  borderRadius: '10px 10px 2px 10px',
                  padding: '8px 12px',
                  fontSize: 12,
                  color: '#0a0c12',
                  fontWeight: 500,
                  marginLeft: 'auto',
                  maxWidth: '80%',
                  lineHeight: 1.4,
                }}
              >
                What can you help me with?
              </div>
            </div>

            {/* Widget input */}
            <div style={{ padding: '8px 14px 14px', display: 'flex', gap: 6 }}>
              <div
                style={{
                  flex: 1,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '7px 10px',
                  fontSize: 11,
                  color: 'var(--text-muted)',
                }}
              >
                Type a message...
              </div>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MessageCircle size={12} color="#0a0c12" />
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
            This is how the widget appears when embedded on a website.
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
