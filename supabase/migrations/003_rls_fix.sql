-- 003_rls_fix.sql
-- 비회원은 DB 저장 없이 채팅만 → 회원 전용으로 RLS 재정의 (CHM-248)

-- 기존 정책 제거
DROP POLICY IF EXISTS "conversations_select" ON conversations;
DROP POLICY IF EXISTS "conversations_insert" ON conversations;
DROP POLICY IF EXISTS "conversations_update" ON conversations;
DROP POLICY IF EXISTS "conversations_delete" ON conversations;
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;

-- conversations: 로그인 유저 본인 것만
CREATE POLICY "conversations_select" ON conversations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "conversations_insert" ON conversations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "conversations_update" ON conversations
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "conversations_delete" ON conversations
  FOR DELETE USING (user_id = auth.uid());

-- messages: 본인 conversation에 속한 것만
CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND c.user_id = auth.uid()
    )
  );
