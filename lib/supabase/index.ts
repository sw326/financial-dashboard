/**
 * Supabase 클라이언트 진입점 (SSOT)
 * - 브라우저: import { supabase, createSupabaseBrowser } from "@/lib/supabase/browser"
 * - 서버:     import { createSupabaseServer } from "@/lib/supabase/server"
 * - 어드민:   import { supabaseServer } from "@/lib/supabase/admin"
 */
export { supabase, createSupabaseBrowser } from "./browser";
export { createSupabaseServer } from "./server";
export { supabaseServer } from "./admin";
