"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser"; // 싱글톤 (M-1: WebSocket 중복 방지)
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null | undefined>(undefined); // undefined = 로딩 중

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    isLoading: user === undefined,
    isLoggedIn: !!user,
  };
}
