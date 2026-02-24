"use client";

/**
 * Supabase 브라우저 클라이언트 (SSOT)
 * 클라이언트 컴포넌트 / 훅에서 사용
 * CHM-275
 */
import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** 싱글톤 — 클라이언트 컴포넌트에서 직접 사용 */
export const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON);

/** 팩토리 — 매번 새 인스턴스가 필요한 경우 */
export function createSupabaseBrowser() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON);
}
