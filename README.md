# Aira Studio

Aira Studio is a no-code AI agent builder. It lets a user configure an agent persona, upload PDF/TXT/manual FAQ knowledge, test a local RAG-style chat flow, use browser voice input/output, publish a share preview, and inspect analytics.

## Run Locally

This first version is dependency-free and can run as static files.

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Free-Tier Production Stack

- Frontend: Vercel static hosting or Next.js free tier
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

Groq is used first. If Groq fails or is not configured, the API tries Gemini. If neither provider is available, the browser keeps using the local demo retrieval answer.

## App Flow

1. Choose a starter template or custom agent.
2. Complete the 3-step builder: Profile, Knowledge, Review & Test.
3. Upload PDF/TXT or add manual FAQ knowledge.
4. Test the agent in chat or with microphone input.
5. Use the readiness checklist before publishing.
6. Publish a public URL and embeddable widget snippet.
7. Review analytics for conversations, confidence, unknown questions, and voice usage.

## Supabase Setup

1. Create a free Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Create a private storage bucket named `agent-knowledge`.
4. Add an Edge Function for ingestion:
   - Store uploaded file in Supabase Storage.
   - Extract text from PDF/TXT.
   - Chunk text into 700-900 character chunks.
   - Generate embeddings with Gemini `text-embedding-004` or another free embedding endpoint.
   - Insert chunks into `knowledge_chunks`.
5. Add an Edge Function for chat:
   - Embed the user query.
   - Search `knowledge_chunks` by cosine distance.
   - Build the system prompt from the agent settings.
   - Call Gemini/OpenAI.
   - Save `conversations` and `analytics_events`.

## Current MVP Notes

The included app uses localStorage and a lightweight in-browser retrieval simulation so the product flow works immediately. PDF extraction attempts to use PDF.js from a CDN; TXT and manual FAQ input work locally. The schema and README show where the production Supabase and LLM services attach. Google sign-in is intentionally not part of the current product direction.
