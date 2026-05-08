# Aira Studio

Aira Studio is a no-code AI agent builder MVP based on the attached PRD. It lets a user configure an agent persona, upload PDF/TXT/manual FAQ knowledge, test a local RAG-style chat flow, use browser voice input/output, publish a share preview, and inspect analytics.

## Run Locally

This first version is dependency-free and can run as static files.

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Free-Tier Production Stack

- Frontend: Vercel static hosting or Next.js free tier
- Auth: Firebase Authentication with Google provider
- Database: Supabase Postgres free tier
- Vector search: Supabase pgvector
- File storage: Supabase Storage
- LLM: Gemini API free tier, with OpenAI-compatible abstraction if needed
- Voice: Browser Web Speech API for STT/TTS in the MVP
- Source control and deployment: GitHub + Vercel

## App Flow

1. Continue with Google.
2. Create an agent profile with type, tone, goal, greeting, and fallback.
3. Upload PDF/TXT or add manual FAQ knowledge.
4. Test the agent in chat or with microphone input.
5. Publish a public URL and embeddable widget snippet.
6. Review analytics for conversations, confidence, unknown questions, and voice usage.

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

## Firebase Setup

1. Create a Firebase project.
2. Enable Authentication > Google provider.
3. Add your web app config.
4. Replace the demo login in `app.js` with Firebase `signInWithPopup`.
5. Send the Firebase ID token to Supabase or your API layer for row-level authorization.

## Current MVP Notes

The included app uses localStorage and a lightweight in-browser retrieval simulation so the product flow works immediately. PDF extraction attempts to use PDF.js from a CDN; TXT and manual FAQ input work locally. The schema and README show where the production Supabase/Firebase/Gemini services attach.
