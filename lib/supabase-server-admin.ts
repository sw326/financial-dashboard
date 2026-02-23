import { createClient } from "@supabase/supabase-js";

// 서비스 롤 클라이언트 — RLS 우회, 서버 전용
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
