create extension if not exists vector;

create table public.users (
  id uuid primary key default gen_random_uuid(),
  firebase_uid text unique not null,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  description text,
  agent_type text not null,
  tone text not null,
  voice text,
  goal text not null,
  greeting text not null,
  fallback text not null,
  system_prompt text not null,
  published boolean not null default false,
  access_control boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.knowledge_items (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  title text not null,
  source_type text not null check (source_type in ('pdf', 'txt', 'faq', 'url')),
  storage_path text,
  raw_text text,
  created_at timestamptz not null default now()
);

create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  knowledge_item_id uuid not null references public.knowledge_items(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding vector(768),
  created_at timestamptz not null default now()
);

create index knowledge_chunks_agent_idx on public.knowledge_chunks(agent_id);
create index knowledge_chunks_embedding_idx on public.knowledge_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  channel text not null default 'chat' check (channel in ('chat', 'voice', 'embed')),
  question text not null,
  answer text not null,
  confidence numeric not null default 0,
  response_time_ms integer,
  sources jsonb not null default '[]'::jsonb,
  feedback text check (feedback in ('up', 'down')),
  created_at timestamptz not null default now()
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.agents enable row level security;
alter table public.knowledge_items enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.analytics_events enable row level security;

create policy "users can read own profile"
  on public.users for select
  using (firebase_uid = auth.jwt() ->> 'sub');

create policy "users manage own agents"
  on public.agents for all
  using (user_id in (select id from public.users where firebase_uid = auth.jwt() ->> 'sub'))
  with check (user_id in (select id from public.users where firebase_uid = auth.jwt() ->> 'sub'));

create policy "users manage own knowledge"
  on public.knowledge_items for all
  using (agent_id in (select id from public.agents where user_id in (select id from public.users where firebase_uid = auth.jwt() ->> 'sub')))
  with check (agent_id in (select id from public.agents where user_id in (select id from public.users where firebase_uid = auth.jwt() ->> 'sub')));

create policy "users manage own chunks"
  on public.knowledge_chunks for all
  using (agent_id in (select id from public.agents where user_id in (select id from public.users where firebase_uid = auth.jwt() ->> 'sub')))
  with check (agent_id in (select id from public.agents where user_id in (select id from public.users where firebase_uid = auth.jwt() ->> 'sub')));

create policy "owners read conversations"
  on public.conversations for select
  using (agent_id in (select id from public.agents where user_id in (select id from public.users where firebase_uid = auth.jwt() ->> 'sub')));

create policy "owners read analytics"
  on public.analytics_events for select
  using (agent_id in (select id from public.agents where user_id in (select id from public.users where firebase_uid = auth.jwt() ->> 'sub')));
