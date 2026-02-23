"use client";

// 클라이언트 컴포넌트에서 사용하는 Supabase 클라이언트
// @supabase/ssr의 createBrowserClient 사용 → 세션을 쿠키에 저장 (SSR과 호환)
import { createBrowserClient } from "@supabase/ssr";

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
