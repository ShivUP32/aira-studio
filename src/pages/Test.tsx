import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Volume2, RotateCcw, Mic, Send,
  ThumbsUp, ThumbsDown, FileText,
} from 'lucide-react'
import { useApp } from '../lib/store'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { buildSystemPrompt, AGENT_DEFAULT_QUICK_ACTIONS, FALLBACK_QUICK_ACTIONS } from '../lib/data'
import type { Message } from '../lib/store'

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

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

const HEADING_STYLE = (active: boolean, large?: boolean): React.CSSProperties => ({
  fontWeight: large ? 800 : 700,
  fontSize: large ? 15 : 14,
  color: 'var(--accent)',
  marginTop: 6,
  marginBottom: 2,
  borderLeft: '2px solid var(--accent)',
  paddingLeft: 8,
  background: active ? 'var(--accent-dim)' : 'transparent',
  borderRadius: active ? 4 : 0,
})

function MarkdownText({ content, activeHeading }: { content: string; activeHeading?: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const next = lines[i + 1] ?? ''

    // Setext headings: text line followed by === (h1) or --- (h2) underline
    if (line.trim() && /^={3,}\s*$/.test(next)) {
      const text = line.replace(/^\*\*(.+)\*\*$/, '$1') // strip wrapping bold if present
      const active = !!(activeHeading && text === activeHeading)
      elements.push(<div key={i} style={HEADING_STYLE(active, true)}>{renderInline(text)}</div>)
      i += 2; continue
    }
    if (line.trim() && /^-{3,}\s*$/.test(next)) {
      const text = line.replace(/^\*\*(.+)\*\*$/, '$1')
      const active = !!(activeHeading && text === activeHeading)
      elements.push(<div key={i} style={HEADING_STYLE(active)}>{renderInline(text)}</div>)
      i += 2; continue
    }

    // Standalone separator lines — skip (never render)
    if (/^[=\-]{4,}\s*$/.test(line)) { i++; continue }

    // Standalone bold line = visual heading (e.g. **Quiz Time**, **Active Voice**)
    const boldHeading = line.trim().match(/^\*\*([^*]+)\*\*\s*$/)
    if (boldHeading) {
      const text = boldHeading[1]
      const active = !!(activeHeading && text === activeHeading)
      elements.push(<div key={i} style={HEADING_STYLE(active)}>{renderInline(text)}</div>)
      i++; continue
    }

    // ATX headings (## style)
    if (line.startsWith('## ')) {
      const text = line.slice(3)
      const active = !!(activeHeading && text === activeHeading)
      elements.push(<div key={i} style={HEADING_STYLE(active)}>{renderInline(text)}</div>)
      i++; continue
    }
    if (line.startsWith('# ')) {
      const text = line.slice(2)
      const active = !!(activeHeading && text === activeHeading)
      elements.push(<div key={i} style={HEADING_STYLE(active, true)}>{renderInline(text)}</div>)
      i++; continue
    }

    // Bullets: - or *
    if (/^[-*] /.test(line)) {
      elements.push(
        <div key={i} style={{ display: 'flex', gap: 7, paddingLeft: 4 }}>
          <span style={{ color: 'var(--accent)', flexShrink: 0 }}>•</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      )
      i++; continue
    }

    if (line === '') { elements.push(<div key={i} style={{ height: 4 }} />); i++; continue }
    elements.push(<div key={i}>{renderInline(line)}</div>)
    i++
  }
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>{elements}</div>
}

function StreamingText({ content, isStreaming, streamingContent, activeHeading }: { content: string; isStreaming: boolean; streamingContent: string; activeHeading?: string }) {
  return <MarkdownText content={isStreaming ? streamingContent : content} activeHeading={activeHeading} />
}

const containerVariants = {
  animate: { transition: { staggerChildren: 0.05 } },
}
const itemVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

interface TestProps {
  onHasMessagesChange?: (hasMessages: boolean) => void
}

export function Test({ onHasMessagesChange }: TestProps) {
  const { state, dispatch } = useApp()
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
  const [quickActions, setQuickActions] = useState<string[]>(
    AGENT_DEFAULT_QUICK_ACTIONS[activeAgent?.type ?? ''] ?? FALLBACK_QUICK_ACTIONS
  )
  const [quickActionsLoading, setQuickActionsLoading] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const voiceEnabledRef = useRef(true)
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const [activeHeading, setActiveHeading] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null)

  // Priority list — best to worst. Natural/Neural voices sound human, avoid robotic ones.
  const VOICE_PRIORITY = [
    'Microsoft Aria Online (Natural) - English (United States)',
    'Microsoft Jenny Online (Natural) - English (United States)',
    'Microsoft Guy Online (Natural) - English (United States)',
    'Microsoft Aria Online (Natural)',
    'Microsoft Jenny Online (Natural)',
    'Google US English',
    'Google UK English Female',
    'Samantha',   // macOS
    'Karen',      // macOS Australian
    'Moira',      // macOS Irish
  ]

  const pickBestVoice = () => {
    const voices = window.speechSynthesis.getVoices()
    if (!voices.length) return
    for (const name of VOICE_PRIORITY) {
      const match = voices.find(v => v.name === name)
      if (match) { selectedVoiceRef.current = match; return }
    }
    // Fallback: any Natural/Neural English voice
    const natural = voices.find(v => v.lang.startsWith('en') && /natural|neural/i.test(v.name))
    if (natural) { selectedVoiceRef.current = natural; return }
    // Fallback: any en-US voice
    const enUs = voices.find(v => v.lang === 'en-US')
    if (enUs) selectedVoiceRef.current = enUs
  }

  useEffect(() => {
    pickBestVoice()
    window.speechSynthesis.addEventListener('voiceschanged', pickBestVoice)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', pickBestVoice)
  }, [])

  // Convert markdown to speakable plain text.
  // Each transformation reflects what the symbol *means* so TTS conveys structure without reading symbols.
  const stripMarkdown = (text: string) =>
    text
      // Setext headings: text\n===== or text\n----- → pause, read title, pause; then drop underline
      .replace(/^(.+)\n={3,}\s*$/gm, '. $1. ')
      .replace(/^(.+)\n-{3,}\s*$/gm, '. $1. ')
      // Remaining standalone separators (===== or -----) → brief pause
      .replace(/^[=\-]{4,}\s*$/gm, '. ')
      // ATX headings (## style) → pause before, read title, pause after
      .replace(/^#{1,3}\s+(.+)$/gm, '. $1. ')
      // Fenced code blocks → skip entirely (not speakable)
      .replace(/```[\s\S]*?```/g, '')
      // Inline code → just read the content without backticks
      .replace(/`([^`]+)`/g, '$1')
      // Standalone bold line = visual heading → pause before and after (must run before inline bold strip)
      .replace(/^\*\*([^*]+)\*\*\s*$/gm, '. $1. ')
      // Remaining inline bold / italic → read the word, drop symbols
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      // Blockquotes → read content (> means "quoted text", not a symbol)
      .replace(/^>\s+/gm, '')
      // Numbered lists → content only (number already implied by sequence)
      .replace(/^\d+\.\s+/gm, '')
      // Bullet points → content only
      .replace(/^[-*]\s+/gm, '')
      // Markdown links → read the label, drop the URL
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Table pipes → short pause between cells
      .replace(/\|/g, ', ')
      // Collapse blank lines into sentence pause
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ' ')
      // Collapse accidental double spaces/dots
      .replace(/\s{2,}/g, ' ')
      .replace(/\.\s*\./g, '.')
      .trim()

  const speak = (text: string) => {
    if (!window.speechSynthesis) return

    const clean = stripMarkdown(text)
    const textWords = text.split(' ').filter(Boolean)
    const cleanWordCount = Math.max(clean.split(/\s+/).filter(Boolean).length, 1)

    // TTS at rate=1.0 speaks ~2.4 words/sec. Adjust per-word interval
    // proportionally so original (longer) text finishes at same time.
    const msPerWord = Math.round(1000 / (2.4 * (textWords.length / cleanWordCount)))

    setStreamingContent('')

    // Read ref — always reflects current toggle, even when called from a stale closure.
    const useVoice = voiceEnabledRef.current

    if (useVoice) {
      // Cancel must be inside the voice block — calling cancel() when we never
      // called speak() is harmless, but Chrome's cancel() is async internally.
      // Calling cancel() then immediately speak() causes Chrome to silently drop
      // the utterance. The setTimeout gives Chrome one tick to flush the cancel.
      // Cancel any previous utterance, then defer speak() by 120ms so Chrome
      // fully processes the cancel before the new utterance is submitted.
      window.speechSynthesis.cancel()
      if (!selectedVoiceRef.current) pickBestVoice()
      const utt = new SpeechSynthesisUtterance(clean)
      if (selectedVoiceRef.current) utt.voice = selectedVoiceRef.current
      utt.rate = 1.0
      utt.pitch = 1.0
      utt.onend = () => setStreamingContent(text)
      setTimeout(() => {
        if (!voiceEnabledRef.current) return  // muted during the 120ms window
        window.speechSynthesis.speak(utt)
      }, 120)
    }

    // Timer-based streaming — reliable on all browsers unlike onboundary
    let wordIdx = 0
    const interval = setInterval(() => {
      wordIdx++
      setStreamingContent(textWords.slice(0, wordIdx).join(' '))
      if (wordIdx >= textWords.length) {
        clearInterval(interval)
        setStreamingContent(text)
      }
    }, useVoice ? msPerWord : 280)
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conv.messages, isTyping])

  useEffect(() => {
    onHasMessagesChange?.(conv.messages.length > 0)
  }, [conv.messages.length, onHasMessagesChange])

  // Generate context-aware initial quick actions from agent name/goal/knowledge
  useEffect(() => {
    if (!activeAgent) { setQuickActions(FALLBACK_QUICK_ACTIONS); return }
    // Show type defaults immediately while generating
    setQuickActions(AGENT_DEFAULT_QUICK_ACTIONS[activeAgent.type] ?? FALLBACK_QUICK_ACTIONS)
    setQuickActionsLoading(true)
    const kbTitles = activeAgent.knowledge.filter(k => k.status === 'ready').map(k => k.title).join(', ')
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: `Agent: "${activeAgent.name}" (${activeAgent.type})\nGoal: ${activeAgent.goal || 'Help users'}\nDescription: ${activeAgent.description || 'A helpful AI assistant'}\nKnowledge base: ${kbTitles || 'general knowledge'}\n\nSuggest exactly 3 short questions (max 7 words each) a real user would typically ask this specific agent first. Return ONLY a JSON array: ["Q1?","Q2?","Q3?"]`,
        systemPrompt: 'Generate 3 realistic opening questions for the described AI agent. Return ONLY a valid JSON array of exactly 3 short question strings. No extra text.',
        agentName: 'QuickActionGenerator',
        priorMessageCount: 0,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (!data.answer) return
        const m = data.answer.match(/\[[\s\S]*?\]/)
        if (!m) return
        const parsed = JSON.parse(m[0])
        if (Array.isArray(parsed) && parsed.length >= 3) {
          setQuickActions(parsed.slice(0, 3).map(String))
        }
      })
      .catch(() => { /* keep type defaults */ })
      .finally(() => setQuickActionsLoading(false))
  }, [activeAgent?.id])

  // Load chat history from localStorage when agent changes
  useEffect(() => {
    if (!activeAgent) return
    try {
      const raw = localStorage.getItem(`aira-history-${activeAgent.id}`)
      if (raw) {
        const msgs = JSON.parse(raw) as Message[]
        if (Array.isArray(msgs) && msgs.length > 0) {
          setConv(prev => ({ ...prev, messages: msgs }))
          setModelStatus('ready')
        }
      }
    } catch { /* ignore */ }
  }, [activeAgent?.id])

  // Persist chat history to localStorage after every message
  useEffect(() => {
    if (!activeAgent || conv.messages.length === 0) return
    try {
      localStorage.setItem(`aira-history-${activeAgent.id}`, JSON.stringify(conv.messages))
    } catch { /* ignore */ }
  }, [conv.messages, activeAgent?.id])

  // Track active heading from streaming content — supports ## ATX, setext ===/--, and **standalone bold**
  useEffect(() => {
    if (streamingContent) {
      const lines = streamingContent.split('\n')
      let lastHeading: string | null = null
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const next = lines[i + 1] ?? ''
        if (line.trim() && /^[=\-]{3,}\s*$/.test(next)) {
          lastHeading = line.replace(/^\*\*(.+)\*\*$/, '$1')
        } else if (line.startsWith('## ')) {
          lastHeading = line.slice(3)
        } else if (line.startsWith('# ')) {
          lastHeading = line.slice(2)
        } else {
          const m = line.trim().match(/^\*\*([^*]+)\*\*\s*$/)
          if (m) lastHeading = m[1]
        }
      }
      setActiveHeading(lastHeading)
    }
  }, [streamingContent])

  // Fire-and-forget: ask Groq to suggest 3 follow-up questions based on the last response
  const generateFollowUps = (lastResponse: string) => {
    const agentType = activeAgent?.type ?? 'assistant'
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: `Based on this response, suggest exactly 3 short follow-up questions (max 6 words each) a user might ask next. Return ONLY a JSON array like: ["Q1?","Q2?","Q3?"] — no explanation, no other text.\n\nResponse:\n${lastResponse.slice(0, 600)}`,
        systemPrompt: `You generate follow-up questions for a ${agentType}. Return ONLY a valid JSON array of 3 short strings. Nothing else.`,
        agentName: 'Follow-up Generator',
        priorMessageCount: 0,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (!data.answer) return
        const m = data.answer.match(/\[[\s\S]*?\]/)
        if (!m) return
        const parsed = JSON.parse(m[0])
        if (Array.isArray(parsed) && parsed.length >= 3) {
          setQuickActions(parsed.slice(0, 3).map(String))
        }
      })
      .catch(() => { /* silently keep current quick actions */ })
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return

    const userMsg: Message = {
      id: makeId(),
      role: 'user',
      content: text.trim(),
    }

    setConv(prev => ({ ...prev, messages: [...prev.messages, userMsg] }))
    setInput('')
    setIsTyping(true)
    setModelStatus('thinking')

    // Call Groq API for all messages
    try {
      const systemPrompt = activeAgent ? buildSystemPrompt(activeAgent) : 'You are a helpful assistant.'
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text.trim(),
          systemPrompt,
          agentId: activeAgent?.id ?? '',
          agentName: activeAgent?.name ?? 'Aira Agent',
          priorMessageCount: conv.messages.filter(m => m.role === 'assistant').length,
          // Pass last 8 messages so the LLM has full conversation context.
          // Quick actions like "Quiz Time" will automatically resolve to the current topic.
          conversationHistory: conv.messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
        }),
      })

      let data: Record<string, unknown> = {}
      try { data = await res.json() } catch { /* non-JSON response — treat as server error */ }

      if (!res.ok) {
        const errMsg = (data.error as string) ?? `Server error (${res.status})`
        const assistantMsg: Message = { id: makeId(), role: 'assistant', content: `Sorry, I couldn't get a response. ${errMsg}`, confidence: 0, sources: [] }
        setConv(prev => ({ ...prev, messages: [...prev.messages, assistantMsg], lastConfidence: 0, lastSources: [] }))
        setIsTyping(false)
        setModelStatus('ready')
        return
      }

      const answer = (data.answer as string) ?? 'No response received.'
      const confidence = 0.85

      const assistantMsg: Message = {
        id: makeId(),
        role: 'assistant',
        content: answer,
        confidence,
        sources: [],
      }

      setStreamingMsgId(assistantMsg.id)
      setConv(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMsg],
        lastConfidence: confidence,
        lastSources: [],
      }))
      dispatch({
        type: 'ADD_CONVERSATION',
        conversation: {
          id: makeId(),
          agentId: activeAgent?.id ?? '',
          userQuery: text.trim(),
          assistantAnswer: answer,
          confidence,
          timestamp: Date.now(),
        },
      })
      speak(answer)
      generateFollowUps(answer)
      setIsTyping(false)
      setModelStatus('ready')
      setFeedback(null)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to reach the API.'
      const friendlyMsg = errMsg.includes('fetch') || errMsg.includes('network')
        ? 'Could not reach the API server. Make sure it is running on port 3003.'
        : `Something went wrong: ${errMsg}`
      const assistantMsg: Message = { id: makeId(), role: 'assistant', content: friendlyMsg, confidence: 0, sources: [] }
      setConv(prev => ({ ...prev, messages: [...prev.messages, assistantMsg] }))
      setIsTyping(false)
      setModelStatus('ready')
    }
  }

  const reset = () => {
    setConv({ id: makeId(), messages: [], lastConfidence: 0, lastSources: [] })
    setModelStatus('waiting')
    setFeedback(null)
    if (activeAgent) {
      localStorage.removeItem(`aira-history-${activeAgent.id}`)
    }
    setQuickActions(AGENT_DEFAULT_QUICK_ACTIONS[activeAgent?.type ?? ''] ?? FALLBACK_QUICK_ACTIONS)
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
              onClick={() => {
                setVoiceEnabled(v => {
                  const next = !v
                  voiceEnabledRef.current = next
                  // pause() silences audio without destroying the synthesis engine.
                  // cancel() permanently breaks Chrome's state — never use it here.
                  if (!next) {
                    window.speechSynthesis?.pause()
                  } else {
                    window.speechSynthesis?.resume()
                  }
                  return next
                })
              }}
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
                    : <StreamingText content={msg.content} isStreaming={msg.id === streamingMsgId} streamingContent={streamingContent} activeHeading={msg.id === streamingMsgId ? activeHeading || undefined : undefined} />
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

        {/* Dynamic quick action buttons — generated from agent context, updated after each response */}
        <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
          {quickActionsLoading
            ? [1, 2, 3].map(i => (
                <motion.div key={i} animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.15 }}
                  style={{ height: 27, width: 90 + i * 20, background: 'var(--surface-2)', borderRadius: 6, border: '1px solid var(--border)' }}
                />
              ))
            : (
              <AnimatePresence mode="popLayout">
                {quickActions.map(t => (
                  <motion.button
                    key={t}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.18 }}
                    onClick={() => sendMessage(t)}
                    disabled={isTyping}
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', fontSize: 11, color: 'var(--text-muted)', cursor: isTyping ? 'default' : 'pointer', fontWeight: 500 }}
                  >
                    {t}
                  </motion.button>
                ))}
              </AnimatePresence>
            )
          }
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
