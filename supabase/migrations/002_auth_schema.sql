-- 002_auth_schema.sql
-- Auth 연동을 위한 스키마 확장 (CHM-243)

-- 1. conversations에 user_id 추가 (nullable = 비회원 허용)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);

-- 2. 개인 설정 테이블
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT,
  avatar_url    TEXT,
  investment_style TEXT CHECK (investment_style IN ('공격형', '중립형', '안정형')),
  risk_tolerance   INT CHECK (risk_tolerance BETWEEN 1 AND 5),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 포트폴리오 (Phase 3에서 활용)
CREATE TABLE IF NOT EXISTS portfolios (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol     TEXT NOT NULL,
  quantity   NUMERIC,
  avg_price  NUMERIC,
  note       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portfolios_user ON portfolios(user_id);

-- 4. RLS 활성화
ALTER TABLE conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios     ENABLE ROW LEVEL SECURITY;

-- 5. RLS 정책 — conversations
-- 로그인 유저: 본인 대화만 / 비회원: anon 역할로 user_id=null 대화 접근
CREATE POLICY "conversations_select" ON conversations
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "conversations_insert" ON conversations
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "conversations_update" ON conversations
  FOR UPDATE USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "conversations_delete" ON conversations
  FOR DELETE USING (user_id = auth.uid());

-- 6. RLS 정책 — messages
CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.user_id = auth.uid() OR c.user_id IS NULL)
    )
  );

CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.user_id = auth.uid() OR c.user_id IS NULL)
    )
  );

-- 7. RLS 정책 — user_profiles
CREATE POLICY "profiles_select" ON user_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "profiles_insert" ON user_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_update" ON user_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- 8. RLS 정책 — portfolios
CREATE POLICY "portfolios_all" ON portfolios
  FOR ALL USING (user_id = auth.uid());

-- 9. 신규 유저 가입 시 user_profiles 자동 생성 트리거
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
