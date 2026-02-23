"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

const PUSH_SERVER_URL = "https://desktop-76g4sk0.tailcfd4f8.ts.net/push";
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64: string): BufferSource {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function usePushNotification() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const supported = "serviceWorker" in navigator && "PushManager" in window;
    setIsSupported(supported);
    if (!supported) return;

    // 기존 구독 여부 확인
    navigator.serviceWorker.register("/sw.js").then((reg) =>
      reg.pushManager.getSubscription()
    ).then((sub) => {
      setIsSubscribed(!!sub);
    }).catch(() => {});
  }, []);

  const subscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. 알림 권한 요청
      const perm = await Notification.requestPermission();
      if (perm !== "granted") throw new Error("알림 권한이 거부되었습니다");

      // 2. SW 등록 + 구독 생성
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // 3. Supabase JWT 가져오기 (auth 검증용)
      const supabase = createSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("로그인이 필요합니다");

      // 4. 서버에 구독 등록 (JWT 포함 → userId 검증)
      const res = await fetch(`${PUSH_SERVER_URL}/api/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("구독 등록 실패");

      setIsSubscribed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;

      const supabase = createSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();

      await fetch(`${PUSH_SERVER_URL}/api/unsubscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session && { "Authorization": `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });

      await sub.unsubscribe();
      setIsSubscribed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isSupported, isSubscribed, isLoading, error, subscribe, unsubscribe };
}
