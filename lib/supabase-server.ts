import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// 세션 인식 Supabase 클라이언트 (Server Components / Route Handlers용)
export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component에서 set 불가 (읽기 전용 컨텍스트) — middleware가 대신 처리
          }
        },
      },
    }
  );
}
