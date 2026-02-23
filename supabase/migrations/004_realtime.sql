-- 004_realtime.sql
-- conversations 테이블 Supabase Realtime 활성화 (CHM-248 sidebar 실시간 갱신)
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
