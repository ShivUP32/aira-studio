import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Volume2, RotateCcw, Mic, Send,
  ThumbsUp, ThumbsDown, FileText,
} from 'lucide-react'
import { useApp } from '../lib/store'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import type { Message } from '../lib/store'

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

const MOCK_RESPONSES: { content: string; confidence: number; sources: string[] }[] = [
  {
    content: "## Supported File Formats\n\nAira Studio supports the following formats for knowledge base ingestion:\n\n- **PDF** — most common for documentation and manuals\n- **TXT** — plain text files\n- **Markdown (.md)** — ideal for structured docs\n- **DOCX** — Word documents\n\nFiles are automatically **chunked** and stored in the vector database for semantic retrieval.",
    confidence: 0.91,
    sources: ['Aira Studio PRD Summary', 'File Upload Guide'],
  },
  {
    content: "## How Confidence Score Works\n\nThe confidence score measures how well retrieved knowledge chunks match your query.\n\n- **Above 80%** — High quality, source-backed answer\n- **50–80%** — Moderate match, partial coverage\n- **Below 50%** — Low confidence, fallback response triggered\n\nScores are computed using **cosine similarity** between your query embedding and the top-k retrieved chunks.",
    confidence: 0.87,
    sources: ['Aira Studio PRD Summary'],
  },
  {
    content: "## Voice Mode\n\nVoice mode uses the **Web Speech API** — no additional API keys required.\n\n- **Speech-to-text** — click the mic icon to speak your question\n- **Text-to-speech** — responses are read aloud automatically\n- **Toggle** — click the volume icon to mute or unmute\n\nVoice mode works in all modern browsers that support the Web Speech API.",
    confidence: 0.84,
    sources: ['Voice Integration Guide'],
  },
]

const QUICK_TESTS = [
  'Upload readiness',
  'Source-backed answer',
  'Fallback behavior',
]

const SUGGESTED_QUESTIONS = [
  'What file formats are supported?',
  'How does the confidence score work?',
  'Can I use voice mode?',
  'How do I publish my agent?',
]

interface ActiveConversation {
  id: string
  messages: Message[]
  lastConfidence: number
  lastSources: string[]
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>
      : part
  )
}

function MarkdownText({ content }: { content: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {content.split('\n').map((line, i) => {
        if (line.startsWith('## '))
          return <div key={i} style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginTop: 6, marginBottom: 2 }}>{renderInline(line.slice(3))}</div>
        if (line.startsWith('# '))
          return <div key={i} style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)', marginTop: 6, marginBottom: 2 }}>{renderInline(line.slice(2))}</div>
        if (line.startsWith('- '))
          return <div key={i} style={{ display: 'flex', gap: 7, paddingLeft: 4 }}><span style={{ color: 'var(--accent)', flexShrink: 0 }}>•</span><span>{renderInline(line.slice(2))}</span></div>
        if (line === '')
          return <div key={i} style={{ height: 4 }} />
        return <div key={i}>{renderInline(line)}</div>
      })}
    </div>
  )
}

function StreamingText({ content, streamingId, msgId }: { content: string; streamingId: string | null; msgId: string }) {
  const [displayed, setDisplayed] = useState(streamingId === msgId ? '' : content)

  useEffect(() => {
    if (streamingId !== msgId) { setDisplayed(content); return }
    setDisplayed('')
    const words = content.split(' ')
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayed(words.slice(0, i).join(' '))
      if (i >= words.length) clearInterval(interval)
    }, 90)
    return () => clearInterval(interval)
  }, [content, streamingId, msgId])

  return <MarkdownText content={displayed} />
}

const containerVariants = {
  animate: { transition: { staggerChildren: 0.05 } },
}
const itemVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export function Test() {
  const { state } = useApp()
  const activeAgent = state.agents.find(a => a.id === state.activeAgentId)
  const [conv, setConv] = useState<ActiveConversation>({
    id: makeId(),
    messages: [],
    lastConfidence: 0,
    lastSources: [],
  })
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [modelStatus, setModelStatus] = useState<'waiting' | 'thinking' | 'ready'>('waiting')
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const speak = (text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 1.05
    utt.pitch = 1
    window.speechSynthesis.speak(utt)
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conv.messages, isTyping])

  const sendMessage = (text: string) => {
    if (!text.trim()) return

    const userMsg: Message = {
      id: makeId(),
      role: 'user',
      content: text.trim(),
    }

    setConv(prev => ({ ...prev, messages: [...prev.messages, userMsg] }))
    setInput('')
    setIsTyping(true)
    setModelStatus('thinking')

    const mockResp = MOCK_RESPONSES[conv.messages.length % MOCK_RESPONSES.length]
    // Compute confidence before the timeout to avoid impure side effects
    const confidenceScore = mockResp.confidence
    const randomDelay = Math.random() * 800

    setTimeout(() => {
      const assistantMsg: Message = {
        id: makeId(),
        role: 'assistant',
        content: mockResp.content,
        confidence: confidenceScore,
        sources: mockResp.sources,
      }

      setStreamingMsgId(assistantMsg.id)
      setConv(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMsg],
        lastConfidence: confidenceScore,
        lastSources: mockResp.sources,
      }))
      speak(mockResp.content)
      setIsTyping(false)
      setModelStatus('ready')
      setFeedback(null)
    }, 1200 + randomDelay)
  }

  const reset = () => {
    setConv({ id: makeId(), messages: [], lastConfidence: 0, lastSources: [] })
    setModelStatus('waiting')
    setFeedback(null)
  }

  const confidencePct = Math.round(conv.lastConfidence * 100)

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, height: 'calc(100vh - 120px)', minHeight: 600 }}
    >
      {/* Left — Chat panel */}
      <motion.div
        variants={itemVariants}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Chat header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.8 }}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--accent)',
              }}
            />
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {activeAgent?.name ?? 'Agent'}
            </span>
            <Badge variant="draft" style={{ fontSize: 10 }}>{activeAgent?.type ?? 'Agent'}</Badge>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => { setVoiceEnabled(v => !v); window.speechSynthesis?.cancel() }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: voiceEnabled ? 'var(--accent)' : 'var(--text-muted)', padding: 6, borderRadius: 6 }}
              title={voiceEnabled ? 'Voice on — click to mute' : 'Voice off — click to enable'}
            >
              <Volume2 size={15} />
            </button>
            <button
              onClick={reset}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6, borderRadius: 6 }}
              title="Reset conversation"
            >
              <RotateCcw size={15} />
            </button>
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6, borderRadius: 6 }}
              title="Voice input"
            >
              <Mic size={15} />
            </button>
          </div>
        </div>

        {/* Model status bar */}
        <div
          style={{
            padding: '6px 18px',
            background: 'var(--surface-2)',
            borderBottom: '1px solid var(--border)',
            fontSize: 11,
            color: 'var(--text-muted)',
            flexShrink: 0,
          }}
        >
          Model status:{' '}
          <span style={{ color: modelStatus === 'thinking' ? 'var(--yellow)' : modelStatus === 'ready' ? 'var(--accent)' : 'var(--text-muted)' }}>
            {modelStatus === 'waiting' ? 'waiting for first question' : modelStatus === 'thinking' ? 'generating response...' : 'ready'}
          </span>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {conv.messages.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                {activeAgent?.greeting ?? 'Hi! How can I help you today?'}
              </div>
              {/* Suggested questions */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {SUGGESTED_QUESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 20,
                      padding: '6px 14px',
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence>
            {conv.messages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '78%',
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    background: msg.role === 'user' ? 'var(--accent)' : 'var(--surface-2)',
                    color: msg.role === 'user' ? '#0a0c12' : 'var(--text)',
                    fontSize: 13,
                    lineHeight: 1.65,
                    fontWeight: msg.role === 'user' ? 500 : 400,
                  }}
                >
                  {msg.role === 'user'
                    ? msg.content
                    : <StreamingText content={msg.content} streamingId={streamingMsgId} msgId={msg.id} />
                  }
                </div>
                {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {msg.sources.map(s => (
                      <span
                        key={s}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          background: 'var(--accent-dim)',
                          border: '1px solid var(--border-accent)',
                          borderRadius: 4,
                          padding: '2px 8px',
                          fontSize: 10,
                          color: 'var(--accent)',
                          fontWeight: 500,
                        }}
                      >
                        <FileText size={9} />
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', gap: 4, padding: '8px 0' }}>
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
                  style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)' }}
                />
              ))}
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick test buttons */}
        <div
          style={{
            padding: '10px 18px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 8,
            flexShrink: 0,
          }}
        >
          {QUICK_TESTS.map(t => (
            <button
              key={t}
              onClick={() => sendMessage(t)}
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '5px 10px',
                fontSize: 11,
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Input form */}
        <form
          onSubmit={e => { e.preventDefault(); sendMessage(input) }}
          style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask a question..."
            style={{
              flex: 1,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text)',
              padding: '9px 14px',
              fontSize: 13,
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
          <Button type="submit" variant="primary" size="md" disabled={!input.trim() || isTyping}>
            <Send size={14} />
          </Button>
        </form>
      </motion.div>

      {/* Right — Sources panel */}
      <motion.div
        variants={itemVariants}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Confidence card */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '20px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Confidence
          </div>
          <div
            style={{
              fontSize: 52,
              fontWeight: 900,
              color: confidencePct >= 80 ? 'var(--accent)' : confidencePct >= 60 ? 'var(--yellow)' : 'var(--red)',
              lineHeight: 1,
              marginBottom: 4,
            }}
          >
            {conv.messages.length > 0 ? `${confidencePct}%` : '—'}
          </div>
          {conv.messages.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {confidencePct >= 80 ? 'High confidence — source-backed' : confidencePct >= 60 ? 'Moderate — partial match' : 'Low — consider fallback'}
            </div>
          )}
        </div>

        {/* Sources list */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '16px',
            flex: 1,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Sources
          </div>
          {conv.lastSources.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {conv.lastSources.map((src, i) => (
                <div
                  key={i}
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '10px 12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <FileText size={12} color="var(--accent)" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{src}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    Relevant chunk retrieved from knowledge base with high semantic similarity.
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
              Sources appear after a response
            </div>
          )}

          {/* Confidence reasoning */}
          {conv.lastConfidence > 0 && (
            <div style={{ marginTop: 14, padding: '10px', background: 'var(--accent-dim)', borderRadius: 8, border: '1px solid var(--border-accent)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}>Confidence Reasoning</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Cosine similarity between query embedding and retrieved chunks: {(conv.lastConfidence * 0.98).toFixed(2)}. Top-k=3 chunks retrieved, all above threshold.
              </div>
            </div>
          )}

          {/* Feedback */}
          {conv.messages.some(m => m.role === 'assistant') && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textAlign: 'center' }}>
                Was this answer helpful?
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button
                  onClick={() => setFeedback('up')}
                  style={{
                    background: feedback === 'up' ? 'var(--accent-dim)' : 'var(--surface-2)',
                    border: `1px solid ${feedback === 'up' ? 'var(--border-accent)' : 'var(--border)'}`,
                    borderRadius: 8,
                    padding: '8px 20px',
                    cursor: 'pointer',
                    color: feedback === 'up' ? 'var(--accent)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  <ThumbsUp size={13} />
                  Yes
                </button>
                <button
                  onClick={() => setFeedback('down')}
                  style={{
                    background: feedback === 'down' ? 'rgba(248,113,113,0.1)' : 'var(--surface-2)',
                    border: `1px solid ${feedback === 'down' ? 'rgba(248,113,113,0.3)' : 'var(--border)'}`,
                    borderRadius: 8,
                    padding: '8px 20px',
                    cursor: 'pointer',
                    color: feedback === 'down' ? 'var(--red)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  <ThumbsDown size={13} />
                  No
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
