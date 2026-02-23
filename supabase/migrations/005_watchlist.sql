-- 005_watchlist.sql — 관심종목 테이블

create table if not exists watchlist (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references auth.users not null,
  symbol     text        not null,
  name       text,
  market     text,                        -- 'kr' | 'us'
  added_at   timestamptz default now(),
  unique(user_id, symbol)
);

alter table watchlist enable row level security;

-- 본인 데이터만 전체 접근
create policy "users manage own watchlist"
  on watchlist for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- realtime 활성화
alter publication supabase_realtime add table watchlist;
