import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Headphones, BadgeDollarSign, GraduationCap, HelpCircle,
  Upload, FileText, CheckCircle2, AlertCircle, Clock,
  ChevronRight, ChevronLeft, Save,
} from 'lucide-react'
import { useApp } from '../lib/store'
import { agentTemplates, buildSystemPrompt } from '../lib/data'
import type { Agent, KnowledgeItem } from '../lib/data'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import type { Route } from '../App'

interface BuilderProps {
  onNavigate: (route: Route) => void
}

const templateIcons: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  headphones: Headphones,
  'badge-dollar-sign': BadgeDollarSign,
  'graduation-cap': GraduationCap,
  'help-circle': HelpCircle,
}

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

const STEPS = ['Template & Profile', 'Knowledge', 'Review & Test']

const containerVariants = {
  animate: { transition: { staggerChildren: 0.05 } },
}
const itemVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

function inputStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text)',
    padding: '9px 12px',
    fontSize: 13,
    fontFamily: 'inherit',
    width: '100%',
    outline: 'none',
    ...extra,
  }
}

function labelStyle(): React.CSSProperties {
  return {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }
}

function KnowledgeStatusIcon({ status }: { status: KnowledgeItem['status'] }) {
  if (status === 'ready') return <CheckCircle2 size={14} color="var(--accent)" />
  if (status === 'error') return <AlertCircle size={14} color="var(--red)" />
  return <Clock size={14} color="var(--yellow)" />
}

export function Builder({ onNavigate }: BuilderProps) {
  const { dispatch } = useApp()
  const [step, setStep] = useState(0)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('support')
  const [form, setForm] = useState<Omit<Agent, 'id' | 'knowledge' | 'published' | 'createdAt'>>({
    name: '',
    type: 'Support Agent',
    description: '',
    tone: 'Professional',
    voice: 'en-US',
    goal: '',
    greeting: 'Hi! How can I help you today?',
    fallback: "I'm not sure about that. Please contact our support team.",
  })
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([])
  const [faqText, setFaqText] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  // Generate a stable agent ID and creation timestamp so preview and saved agent match
  const agentId = useMemo(() => makeId(), [])
  const createdAt = useMemo(() => Date.now(), [])

  const builtAgent: Agent = {
    id: agentId,
    ...form,
    knowledge,
    published: false,
    createdAt,
  }

  const systemPrompt = buildSystemPrompt(builtAgent)

  const selectedTemplateObj = agentTemplates.find(t => t.id === selectedTemplate)

  const handleTemplateSelect = (tplId: string) => {
    const tpl = agentTemplates.find(t => t.id === tplId)
    if (!tpl) return
    setSelectedTemplate(tplId)
    setForm(prev => ({ ...prev, type: tpl.type, description: tpl.description }))
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    addFiles(files)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    addFiles(Array.from(e.target.files))
  }

  const addFiles = (files: File[]) => {
    const newItems: KnowledgeItem[] = files.map(f => ({
      id: makeId(),
      title: f.name,
      status: 'processing' as const,
      chunks: 0,
    }))
    setKnowledge(prev => [...prev, ...newItems])
    // Simulate processing
    newItems.forEach(item => {
      setTimeout(() => {
        setKnowledge(prev =>
          prev.map(k => k.id === item.id ? { ...k, status: 'ready', chunks: Math.floor(Math.random() * 20) + 5 } : k)
        )
      }, 2000 + Math.random() * 1500)
    })
  }

  const handleSave = () => {
    const agent: Agent = builtAgent
    dispatch({ type: 'CREATE_AGENT', agent })
    onNavigate('test')
  }

  const readinessItems = [
    { label: 'Agent name set', done: form.name.length > 0 },
    { label: 'Goal defined', done: form.goal.length > 0 },
    { label: 'Greeting configured', done: form.greeting.length > 0 },
    { label: 'Fallback configured', done: form.fallback.length > 0 },
    { label: 'Knowledge uploaded', done: knowledge.some(k => k.status === 'ready') },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      style={{ display: 'flex', gap: 24 }}
    >
      {/* Main area */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Step progress */}
        <motion.div variants={itemVariants} style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {STEPS.map((s, i) => (
            <button
              key={s}
              onClick={() => setStep(i)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                background: step === i ? 'var(--accent-dim)' : 'var(--surface)',
                color: step === i ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: step === i ? 600 : 500,
                fontSize: 13,
                borderLeft: step === i ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: step === i ? 'var(--accent)' : 'var(--surface-2)',
                  color: step === i ? '#0a0c12' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {i + 1}
              </span>
              {s}
            </button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Template grid */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Choose a template</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {agentTemplates.map(tpl => {
                    const Icon = templateIcons[tpl.icon]
                    const isSelected = selectedTemplate === tpl.id
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => handleTemplateSelect(tpl.id)}
                        style={{
                          background: isSelected ? 'var(--accent-dim)' : 'var(--surface)',
                          border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                          borderRadius: 12,
                          padding: '18px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: isSelected ? 'var(--accent)' : 'var(--surface-2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 10,
                          }}
                        >
                          {Icon && <Icon size={18} color={isSelected ? '#0a0c12' : 'var(--text-secondary)'} />}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: isSelected ? 'var(--accent)' : 'var(--text)', marginBottom: 4 }}>
                          {tpl.name}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                          {tpl.description}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Profile form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Agent Profile</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={labelStyle()}>Agent Name *</label>
                    <input
                      style={inputStyle()}
                      placeholder="e.g. Support Assistant"
                      value={form.name}
                      onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={labelStyle()}>Type</label>
                    <select
                      style={inputStyle()}
                      value={form.type}
                      onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}
                    >
                      {agentTemplates.map(t => (
                        <option key={t.id} value={t.type}>{t.type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={labelStyle()}>Description</label>
                  <textarea
                    style={inputStyle({ resize: 'vertical', minHeight: 72 })}
                    placeholder="What does this agent do?"
                    value={form.description}
                    onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={labelStyle()}>Tone</label>
                    <select
                      style={inputStyle()}
                      value={form.tone}
                      onChange={e => setForm(prev => ({ ...prev, tone: e.target.value }))}
                    >
                      {['Professional', 'Friendly', 'Casual', 'Formal', 'Empathetic'].map(t => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle()}>Voice</label>
                    <select
                      style={inputStyle()}
                      value={form.voice}
                      onChange={e => setForm(prev => ({ ...prev, voice: e.target.value }))}
                    >
                      {['en-US', 'en-GB', 'en-AU', 'es-ES', 'fr-FR', 'de-DE'].map(v => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={labelStyle()}>Goal</label>
                  <textarea
                    style={inputStyle({ resize: 'vertical', minHeight: 72 })}
                    placeholder="What should this agent accomplish?"
                    value={form.goal}
                    onChange={e => setForm(prev => ({ ...prev, goal: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={labelStyle()}>Greeting Message</label>
                  <input
                    style={inputStyle()}
                    placeholder="Hi! How can I help you today?"
                    value={form.greeting}
                    onChange={e => setForm(prev => ({ ...prev, greeting: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={labelStyle()}>Fallback Message</label>
                  <input
                    style={inputStyle()}
                    placeholder="I'm not sure. Please contact support."
                    value={form.fallback}
                    onChange={e => setForm(prev => ({ ...prev, fallback: e.target.value }))}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Knowledge Base</div>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                style={{
                  border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 12,
                  padding: '40px 24px',
                  textAlign: 'center',
                  background: isDragging ? 'var(--accent-dim)' : 'var(--surface)',
                  transition: 'all 0.15s',
                  marginBottom: 20,
                  cursor: 'pointer',
                }}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <Upload size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                  Drop PDF or text files here
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Supports PDF, TXT, MD, DOCX files up to 10MB each
                </div>
                <Button variant="secondary" size="sm">
                  Browse Files
                </Button>
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept=".pdf,.txt,.md,.docx"
                  style={{ display: 'none' }}
                  onChange={handleFileInput}
                />
              </div>

              {/* File list */}
              {knowledge.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                  {knowledge.map(item => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 14px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                      }}
                    >
                      <FileText size={14} color="var(--text-muted)" />
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{item.title}</span>
                      {item.status === 'ready' && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.chunks} chunks</span>
                      )}
                      <Badge variant={item.status === 'ready' ? 'live' : item.status === 'error' ? 'error' : 'draft'}>
                        <KnowledgeStatusIcon status={item.status} />
                        {item.status === 'processing' ? 'Processing...' : item.status === 'ready' ? 'Ready' : 'Error'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Manual FAQ */}
              <div>
                <label style={labelStyle()}>Manual FAQ / Context (optional)</label>
                <textarea
                  style={inputStyle({ resize: 'vertical', minHeight: 120 })}
                  placeholder="Add any Q&A pairs or extra context here..."
                  value={faqText}
                  onChange={e => setFaqText(e.target.value)}
                />
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Review & Test</div>

              {/* Readiness checklist */}
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '20px',
                  marginBottom: 20,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Readiness Checklist</div>
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
              </div>

              {/* Skills included card */}
              {selectedTemplateObj && selectedTemplateObj.skills?.length > 0 && (
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-accent)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                    Skills Included
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {selectedTemplateObj.skills.map((skill, i) => (
                      <div key={i} style={{ display: 'flex', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--accent)' }}>✓</span>
                        {skill}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* System prompt preview */}
              <div>
                <label style={labelStyle()}>System Prompt Preview</label>
                <pre
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '14px',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace',
                    lineHeight: 1.6,
                    maxHeight: 320,
                    overflowY: 'auto',
                    margin: 0,
                  }}
                >
                  {systemPrompt}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <Button variant="ghost" size="md" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>
            <ChevronLeft size={16} />
            Back
          </Button>
          <div style={{ display: 'flex', gap: 10 }}>
            {step < STEPS.length - 1 ? (
              <Button variant="primary" onClick={() => setStep(s => s + 1)}>
                Continue
                <ChevronRight size={16} />
              </Button>
            ) : (
              <Button variant="primary" onClick={handleSave}>
                <Save size={16} />
                Save & Test
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Right sidebar — system prompt preview */}
      <div style={{ width: 260, flexShrink: 0 }}>
        <motion.div
          variants={itemVariants}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '18px',
            position: 'sticky',
            top: 0,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Live Preview
          </div>
          {form.name && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{form.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{form.type}</div>
            </div>
          )}
          <pre
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '10px',
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              lineHeight: 1.5,
              maxHeight: 400,
              overflowY: 'auto',
              margin: 0,
            }}
          >
            {systemPrompt}
          </pre>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Knowledge ({knowledge.filter(k => k.status === 'ready').length} ready)</div>
            {knowledge.filter(k => k.status === 'ready').map(k => (
              <div key={k.id} style={{ fontSize: 11, color: 'var(--accent)', padding: '2px 0' }}>• {k.title}</div>
            ))}
            {knowledge.filter(k => k.status === 'ready').length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>No knowledge items yet</div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
