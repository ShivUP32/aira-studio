import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { STORAGE_KEY } from './data'
import type { Agent, KnowledgeItem } from './data'

export type { Agent, KnowledgeItem }

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  confidence?: number
  sources?: string[]
}

export interface Conversation {
  id: string
  agentId: string
  messages: Message[]
  confidence: number
  timestamp: number
}

export interface AppState {
  agents: Agent[]
  conversations: Conversation[]
  activeAgentId: string
}

type Action =
  | { type: 'SET_ACTIVE_AGENT'; id: string }
  | { type: 'CREATE_AGENT'; agent: Agent }
  | { type: 'UPDATE_AGENT'; agent: Agent }
  | { type: 'DELETE_AGENT'; id: string }
  | { type: 'ADD_CONVERSATION'; conversation: Conversation }
  | { type: 'ADD_MESSAGE'; conversationId: string; message: Message }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_ACTIVE_AGENT':
      return { ...state, activeAgentId: action.id }
    case 'CREATE_AGENT':
      return { ...state, agents: [...state.agents, action.agent], activeAgentId: action.agent.id }
    case 'UPDATE_AGENT':
      return { ...state, agents: state.agents.map(a => a.id === action.agent.id ? action.agent : a) }
    case 'DELETE_AGENT': {
      const agents = state.agents.filter(a => a.id !== action.id)
      const activeAgentId = state.activeAgentId === action.id ? (agents[0]?.id ?? '') : state.activeAgentId
      return { ...state, agents, activeAgentId }
    }
    case 'ADD_CONVERSATION':
      return { ...state, conversations: [...state.conversations, action.conversation] }
    case 'ADD_MESSAGE':
      return {
        ...state,
        conversations: state.conversations.map(c =>
          c.id === action.conversationId
            ? { ...c, messages: [...c.messages, action.message] }
            : c
        ),
      }
    default:
      return state
  }
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function defaultState(): AppState {
  const agent1: Agent = {
    id: makeId(),
    name: 'Aira Support Assistant',
    type: 'Support Agent',
    description: 'Answers customer questions from the Aira Studio product documentation.',
    tone: 'Professional',
    voice: 'en-US',
    goal: 'Help users understand and use Aira Studio effectively.',
    greeting: 'Hi there! I\'m Aira, your support assistant. How can I help you today?',
    fallback: 'I\'m not sure about that. Please reach out to our support team for more help.',
    knowledge: [
      { id: makeId(), title: 'Aira Studio PRD Summary', status: 'ready', chunks: 12 },
    ],
    published: false,
    createdAt: Date.now() - 86400000,
  }
  const agent2: Agent = {
    id: makeId(),
    name: 'Untitled Agent',
    type: 'Support Agent',
    description: '',
    tone: 'Friendly',
    voice: 'en-US',
    goal: '',
    greeting: 'Hello! How can I help?',
    fallback: 'I\'m not sure. Please contact support.',
    knowledge: [],
    published: false,
    createdAt: Date.now(),
  }
  return {
    agents: [agent1, agent2],
    conversations: [],
    activeAgentId: agent1.id,
  }
}

const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as AppState
        // Validate that parsed value has required agents array
        if (parsed && Array.isArray(parsed.agents)) {
          return parsed
        }
      }
    } catch {
      // ignore parsing errors
    }
    return defaultState()
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // ignore
    }
  }, [state])

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
