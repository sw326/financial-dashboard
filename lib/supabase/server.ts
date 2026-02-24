/**
 * Supabase 서버 클라이언트 (SSOT)
 * Server Components / Route Handlers에서 사용 (세션 인식)
 * CHM-275
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./constants";

export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component에서 set 불가 — middleware가 처리
          }
        },
      },
    }
  );
}
