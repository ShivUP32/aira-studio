import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, X, Send, ChevronDown } from 'lucide-react'
import { ONBOARDING_FAQ, ONBOARDING_SYSTEM_PROMPT, type OnboardingFAQItem } from '../../lib/data'
import type { Route } from '../../App'

const NUDGES: Record<Route, string> = {
  dashboard:  'Welcome to Aira Studio! Click Create Agent in the sidebar to build your first AI agent.',
  builder:    'You\'re in the Agent Builder. Fill in agent details step by step — pick a type, set a goal, and upload knowledge.',
  test:       'Chat with your agent here. Ask it questions to see how it responds in real time.',
  publish:    'Ready to share? Copy the embed snippet to add your agent to any website.',
  analytics:  'Track how users interact with your agent — conversations, confidence, and feedback over time.',
}

const SUGGESTED_QUESTIONS = [
  'How do I create an agent?',
  'What files can I upload?',
  'How does the confidence score work?',
  'How do I publish my agent?',
]

function findFAQMatch(input: string, faq: OnboardingFAQItem[]): OnboardingFAQItem | null {
  const words = input.toLowerCase().split(/\W+/).filter(Boolean)
  let bestScore = 0
  let bestItem: OnboardingFAQItem | null = null
  for (const item of faq) {
    const score = item.tags.filter(tag =>
      words.some(w => w.includes(tag) || tag.includes(w))
    ).length
    if (score > bestScore) { bestScore = score; bestItem = item }
  }
  return bestScore >= 2 ? bestItem : null
}

function makeId() { return Math.random().toString(36).slice(2, 10) }

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i} style={{ fontWeight: 700, color: 'var(--accent)' }}>{p.slice(2, -2)}</strong>
      : p
  )
}

function MsgContent({ content }: { content: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {content.split('\n').map((line, i) => {
        if (/^[-*] /.test(line))
          return (
            <div key={i} style={{ display: 'flex', gap: 6 }}>
              <span style={{ color: 'var(--accent)', flexShrink: 0 }}>•</span>
              <span>{renderInline(line.slice(2))}</span>
            </div>
          )
        if (/^\d+\./.test(line)) return <div key={i}>{renderInline(line)}</div>
        if (line === '') return <div key={i} style={{ height: 3 }} />
        return <div key={i}>{renderInline(line)}</div>
      })}
    </div>
  )
}

interface FloatingMsg { id: string; role: 'user' | 'assistant'; content: string }

interface Props {
  currentRoute: Route
  testPageHasMessages: boolean
}

export function FloatingAssistant({ currentRoute, testPageHasMessages }: Props) {
  const [isOpen, setIsOpen]             = useState(false)
  const [messages, setMessages]         = useState<FloatingMsg[]>([])
  const [input, setInput]               = useState('')
  const [isTyping, setIsTyping]         = useState(false)
  const [showNudge, setShowNudge]       = useState(false)
  const [shownRoutes, setShownRoutes]   = useState<Set<Route>>(new Set())
  const messagesEndRef                  = useRef<HTMLDivElement>(null)
  const nudgeTimeout                    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimeout                     = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Show nudge 2s after landing on a new route — suppress on test page when user is chatting
  useEffect(() => {
    if (nudgeTimeout.current) clearTimeout(nudgeTimeout.current)
    if (hideTimeout.current)  clearTimeout(hideTimeout.current)
    setShowNudge(false)

    const isTestBusy = currentRoute === 'test' && testPageHasMessages
    if (isOpen || isTestBusy || shownRoutes.has(currentRoute)) return

    nudgeTimeout.current = setTimeout(() => setShowNudge(true), 2000)
    hideTimeout.current  = setTimeout(() => {
      setShowNudge(false)
      setShownRoutes(prev => new Set([...prev, currentRoute]))
    }, 10000)

    return () => {
      if (nudgeTimeout.current) clearTimeout(nudgeTimeout.current)
      if (hideTimeout.current)  clearTimeout(hideTimeout.current)
    }
  }, [currentRoute, isOpen, testPageHasMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const dismissNudge = () => {
    setShowNudge(false)
    setShownRoutes(prev => new Set([...prev, currentRoute]))
  }

  const openAssistant = () => {
    dismissNudge()
    setIsOpen(true)
    if (messages.length === 0) {
      setMessages([{
        id: makeId(),
        role: 'assistant',
        content: "Hi! I'm Aira Guide, your onboarding assistant for Aira Studio. 👋\n\nWhat would you like to know?",
      }])
    }
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return
    const userMsg: FloatingMsg = { id: makeId(), role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    // Try keyword FAQ match first — instant, no API call
    const match = findFAQMatch(text, ONBOARDING_FAQ)
    if (match) {
      await new Promise(r => setTimeout(r, 500))
      setMessages(prev => [...prev, { id: makeId(), role: 'assistant', content: match.a }])
      setIsTyping(false)
      return
    }

    // Groq fallback for questions not in FAQ
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          systemPrompt: ONBOARDING_SYSTEM_PROMPT,
          agentName: 'Aira Guide',
          priorMessageCount: messages.filter(m => m.role === 'assistant').length,
        }),
      })
      const data = await res.json()
      const answer = res.ok
        ? (data.answer ?? "I'm not sure about that. Try rephrasing!")
        : 'Having trouble connecting. Please try again in a moment.'
      setMessages(prev => [...prev, { id: makeId(), role: 'assistant', content: answer }])
    } catch {
      setMessages(prev => [...prev, { id: makeId(), role: 'assistant', content: 'Having trouble connecting right now. Try again shortly!' }])
    }
    setIsTyping(false)
  }

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>

      {/* Nudge tooltip */}
      <AnimatePresence>
        {showNudge && !isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-accent, rgba(0,212,160,0.3))',
              borderRadius: 12,
              padding: '12px 36px 12px 14px',
              maxWidth: 260,
              fontSize: 12.5,
              color: 'var(--text)',
              lineHeight: 1.55,
              boxShadow: '0 4px 24px rgba(0,212,160,0.12)',
              position: 'relative',
            }}
          >
            <button
              onClick={dismissNudge}
              style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex' }}
            >
              <X size={12} />
            </button>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Aira Guide
            </div>
            {NUDGES[currentRoute]}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            style={{
              width: 360,
              height: 500,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 12px 48px rgba(0,0,0,0.45)',
            }}
          >
            {/* Header */}
            <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-2)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot size={16} color="var(--accent)" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Aira Guide</div>
                  <div style={{ fontSize: 11, color: 'var(--accent)' }}>Onboarding Assistant</div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex', borderRadius: 6 }}>
                <ChevronDown size={16} />
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <AnimatePresence initial={false}>
                {messages.map(msg => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
                  >
                    <div style={{
                      maxWidth: '88%',
                      padding: '8px 12px',
                      borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      background: msg.role === 'user' ? 'var(--accent)' : 'var(--surface-2)',
                      color: msg.role === 'user' ? '#0a0c12' : 'var(--text)',
                      fontSize: 12.5,
                      lineHeight: 1.6,
                      fontWeight: msg.role === 'user' ? 500 : 400,
                    }}>
                      {msg.role === 'user' ? msg.content : <MsgContent content={msg.content} />}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isTyping && (
                <div style={{ display: 'flex', gap: 4, padding: '4px 0' }}>
                  {[0, 1, 2].map(i => (
                    <motion.div key={i}
                      animate={{ y: [0, -3, 0] }}
                      transition={{ repeat: Infinity, duration: 0.55, delay: i * 0.15 }}
                      style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-muted)' }}
                    />
                  ))}
                </div>
              )}

              {/* FAQ quick starters shown only before user has asked anything */}
              {messages.length <= 1 && !isTyping && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                  {SUGGESTED_QUESTIONS.map(q => (
                    <button key={q} onClick={() => sendMessage(q)}
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left' }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={e => { e.preventDefault(); sendMessage(input) }}
              style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}
            >
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about Aira Studio..."
                style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '8px 12px', fontSize: 12.5, fontFamily: 'inherit', outline: 'none' }}
              />
              <button type="submit" disabled={!input.trim() || isTyping}
                style={{ background: !input.trim() || isTyping ? 'var(--surface-2)' : 'var(--accent)', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: input.trim() && !isTyping ? 'pointer' : 'default', color: !input.trim() || isTyping ? 'var(--text-muted)' : '#0a0c12', display: 'flex', alignItems: 'center', transition: 'background 0.15s' }}
              >
                <Send size={13} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating trigger button */}
      <motion.button
        onClick={isOpen ? () => setIsOpen(false) : openAssistant}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: isOpen ? 'var(--surface-2)' : 'var(--accent)',
          border: isOpen ? '1px solid var(--border)' : 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isOpen ? 'none' : '0 4px 20px rgba(0,212,160,0.35)',
          flexShrink: 0,
        }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <ChevronDown size={20} color="var(--text-muted)" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <Bot size={20} color="#0a0c12" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pulse ring when nudge is active */}
        {showNudge && !isOpen && (
          <motion.span
            animate={{ scale: [1, 1.7], opacity: [0.5, 0] }}
            transition={{ repeat: Infinity, duration: 1.4 }}
            style={{ position: 'absolute', width: 52, height: 52, borderRadius: '50%', border: '2px solid var(--accent)', pointerEvents: 'none' }}
          />
        )}
      </motion.button>
    </div>
  )
}
