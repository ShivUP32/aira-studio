# Aira Studio

Aira Studio is a no-code AI agent builder. Configure an agent persona, upload PDF/TXT/manual FAQ knowledge, test a RAG-style chat flow, use browser voice input/output, publish a share preview, and inspect analytics.

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Free-Tier Production Stack

- Frontend: Next.js on Vercel free tier
- Auth: No sign-in required for the current prototype
- Database: Supabase Postgres free tier
- Vector search: Supabase pgvector
- File storage: Supabase Storage
- LLM: Groq as the primary chat model, Gemini as fallback
- Voice: Browser Web Speech API for STT/TTS in the MVP
- Source control and deployment: GitHub + Vercel

## LLM Setup

The app calls `/api/chat`, a Vercel serverless function. Do not put LLM keys in browser code.

Add these environment variables in Vercel:

```text
GROQ_API_KEY=...
GROQ_MODEL=llama-3.1-8b-instant
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
```

Groq is used first. If Groq fails or is not configured, the API tries Gemini. If neither is available, the browser uses local demo retrieval.

## App Flow

1. Choose a starter template or custom agent.
2. Complete the 3-step builder: Profile, Knowledge, Review & Test.
3. Upload PDF/TXT or add manual FAQ knowledge.
4. Test the agent in chat or with microphone input.
5. Use the readiness checklist before publishing.
6. Publish a public URL and embeddable widget snippet.
7. Review analytics for conversations, confidence, unknown questions, and voice usage.

## Tech Stack (v2)

- **Next.js 16** — App Router, TypeScript
- **Tailwind CSS v4** — utility-first styling
- **framer-motion** — animated transitions and micro-interactions
- **shadcn/ui** — component primitives (Button, utils)
- **UI UX Pro Max** — Claude Code skill for design guidance
- **Lucide React** — icons

## Supabase Setup

1. Create a free Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Create a private storage bucket named `agent-knowledge`.
4. Add an Edge Function for ingestion (store → extract → chunk → embed → pgvector).
5. Add an Edge Function for chat (embed query → vector search → LLM → save analytics).

## Current MVP Notes

The app uses localStorage and in-browser retrieval simulation so the product flow works immediately. PDF extraction uses PDF.js from CDN; TXT and manual FAQ input work locally. The schema and README show where production Supabase and LLM services attach.
