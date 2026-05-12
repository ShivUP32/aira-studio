export const STORAGE_KEY = "aira-studio-state"

export interface AgentTemplate {
  id: string
  name: string
  icon: string
  description: string
  type: string
}

export const agentTemplates: AgentTemplate[] = [
  {
    id: "support",
    name: "Support Agent",
    icon: "headphones",
    description: "Answer customer questions from product docs",
    type: "Support Agent",
  },
  {
    id: "sales",
    name: "Sales Assistant",
    icon: "badge-dollar-sign",
    description: "Qualify leads and answer product/pricing questions",
    type: "Sales Assistant",
  },
  {
    id: "learning",
    name: "Learning Companion",
    icon: "graduation-cap",
    description: "Guide learners through educational content",
    type: "Learning Companion",
  },
  {
    id: "faq",
    name: "FAQ Assistant",
    icon: "help-circle",
    description: "Answer common questions instantly",
    type: "FAQ Assistant",
  },
]

export interface Agent {
  id: string
  name: string
  type: string
  description: string
  tone: string
  voice: string
  goal: string
  greeting: string
  fallback: string
  knowledge: KnowledgeItem[]
  published: boolean
  createdAt: number
}

export interface KnowledgeItem {
  id: string
  title: string
  status: 'processing' | 'ready' | 'error'
  chunks: number
}

export function buildSystemPrompt(agent: Agent): string {
  const knowledgeTitles = agent.knowledge.map(k => `- ${k.title} (${k.chunks} chunks)`).join('\n')
  return `You are ${agent.name}, a ${agent.type}.

## Goal
${agent.goal || 'Help users with their questions.'}

## Tone
${agent.tone || 'Professional and helpful'}

## Greeting
${agent.greeting || 'Hello! How can I help you today?'}

## Fallback
${agent.fallback || "I'm sorry, I don't have information about that. Please contact support for more help."}

## Knowledge Base
${knowledgeTitles || 'No knowledge items uploaded yet.'}

## Instructions
- Answer questions based on the provided knowledge base
- Be concise and accurate
- If you don't know the answer, use the fallback message
- Always maintain the specified tone`
}
