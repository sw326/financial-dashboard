/**
 * Supabase 서비스 롤 클라이언트 (SSOT)
 * RLS 우회 — 서버 전용 (절대 클라이언트에 노출 금지)
 * CHM-275
 */
import { createClient } from "@supabase/supabase-js";

export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
