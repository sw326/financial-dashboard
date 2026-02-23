-- 006_user_memories.sql — 웹챗 개인화 메모리 (CHM-272)

create table if not exists user_memories (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references auth.users not null,
  category    text        not null default 'note',
  -- categories: preference(투자성향), pattern(행동패턴), note(메모), goal(목표)
  key         text        not null,   -- 메모리 식별 키 (upsert 기준)
  value       text        not null,   -- 실제 내용
  importance  int2        not null default 3 check (importance between 1 and 5),
  source      text        default 'auto',  -- 'auto'(Haiku 추출) | 'user'(직접)
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique(user_id, key)
);

alter table user_memories enable row level security;

create policy "users manage own memories"
  on user_memories for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- updated_at 자동 갱신
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger user_memories_updated_at
  before update on user_memories
  for each row execute function update_updated_at();
