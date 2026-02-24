/**
 * Supabase 서비스 롤 클라이언트 (SSOT)
 * RLS 우회 — 서버 전용 (절대 클라이언트에 노출 금지)
 * `server-only` import로 클라이언트 번들 포함 시 빌드 에러 강제 (C-2)
 * CHM-275, CHM-284
 */
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./constants";

export const supabaseServer = createClient(
  SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
