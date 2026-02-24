-- CHM-293: 알고리즘 피드 — 채팅 기반 관심사 누적 테이블
-- half-life 14일 기반 score 감쇄: score = mention_count * exp(-0.05 * days_since_last)

CREATE TABLE IF NOT EXISTS public.user_interests (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol            text        NOT NULL,
  name              text,
  is_kr             boolean     DEFAULT true,
  mention_count     int         NOT NULL DEFAULT 1,
  last_mentioned_at timestamptz NOT NULL DEFAULT now(),
  score             float       NOT NULL DEFAULT 1.0,
  created_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT user_interests_unique UNIQUE (user_id, symbol)
);

-- RLS
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can manage own interests" ON public.user_interests;
CREATE POLICY "users can manage own interests"
  ON public.user_interests
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 인덱스: score DESC 피드 조회 최적화
CREATE INDEX IF NOT EXISTS idx_user_interests_user_score
  ON public.user_interests (user_id, score DESC);

-- score 재계산 함수 (half-life 14일, λ = ln(2)/14 ≈ 0.0495)
DROP FUNCTION IF EXISTS public.recalculate_interest_score(int, timestamptz);
CREATE OR REPLACE FUNCTION public.recalculate_interest_score(
  p_mention_count int,
  p_last_mentioned_at timestamptz
) RETURNS float
LANGUAGE sql IMMUTABLE AS $$
  SELECT p_mention_count::float * exp(-0.0495 * EXTRACT(EPOCH FROM (now() - p_last_mentioned_at)) / 86400)
$$;

COMMENT ON TABLE public.user_interests IS
  'CHM-293: 채팅 대화에서 추출된 종목 관심도. score = mention_count * exp(-λ * days_since_last), half-life 14일';
