-- 007_documents.sql — 문서함 + pgvector RAG
create extension if not exists vector;

create table if not exists user_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  type text not null check (type in ('pdf', 'txt', 'url', 'note')),
  size_bytes bigint default 0,
  storage_path text,
  source_url text,
  status text default 'processing' check (status in ('processing', 'ready', 'error')),
  chunk_count int default 0,
  created_at timestamptz default now()
);

create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references user_documents on delete cascade not null,
  user_id uuid references auth.users not null,
  content text not null,
  embedding vector(1024),
  chunk_index int default 0,
  created_at timestamptz default now()
);

create index if not exists document_chunks_embedding_idx
  on document_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

alter table user_profiles
  add column if not exists storage_used_bytes bigint default 0,
  add column if not exists storage_quota_bytes bigint default 52428800;

alter table user_documents enable row level security;
alter table document_chunks enable row level security;

create policy "user_documents_own" on user_documents
  for all using (auth.uid() = user_id);

create policy "document_chunks_own" on document_chunks
  for all using (auth.uid() = user_id);
