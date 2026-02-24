import { createSupabaseServer } from "@/lib/supabase/server";
import { AuthButtonClient } from "./auth-button-client";

export async function AuthButton() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  return <AuthButtonClient user={user ? { name: user.user_metadata?.full_name, avatar: user.user_metadata?.avatar_url, email: user.email } : null} />;
}
