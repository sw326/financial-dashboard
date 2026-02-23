"use client";

import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { useGatewayChat } from "@/hooks/use-gateway-chat";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { useCallback, useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LogIn } from "lucide-react";

const ANON_MSG_LIMIT = 5;
const ANON_COUNT_KEY = "chat-anon-count";

export default function ChatPage() {
  const { messages, streaming, isLoading, error, sendMessage } = useGatewayChat("webchat");
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const convIdRef = useRef<string | null>(null);
  const [anonCount, setAnonCount] = useState(0);
  const [showNudge, setShowNudge] = useState(false);

  // 비회원 메시지 카운터 초기화
  useEffect(() => {
    const count = parseInt(localStorage.getItem(ANON_COUNT_KEY) ?? "0", 10);
    setAnonCount(count);
  }, []);

  const handleSend = useCallback(async (text: string) => {
    // 로그인 유저: Supabase에 conversation 생성
    if (isLoggedIn) {
      if (!convIdRef.current && messages.length === 0) {
        try {
          const title = text.length > 50 ? text.slice(0, 50) + "..." : text;
          const { data } = await supabase
            .from("conversations")
            .insert({ title, user_id: (await supabase.auth.getUser()).data.user?.id })
            .select()
            .single();
          if (data) {
            convIdRef.current = data.id;
            window.history.pushState({}, "", `/chat/${data.id}`);
          }
        } catch { /* no-op */ }
      }
      sendMessage(text, convIdRef.current ?? undefined);
      return;
    }

    // 비회원: 카운터 증가 + 넛지 표시
    const newCount = anonCount + 1;
    setAnonCount(newCount);
    localStorage.setItem(ANON_COUNT_KEY, String(newCount));
    if (newCount >= ANON_MSG_LIMIT) {
      setShowNudge(true);
    }
    sendMessage(text);
  }, [isLoggedIn, anonCount, messages.length, sendMessage]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {error && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm text-center">
          {error}
        </div>
      )}

      {/* 비회원 넛지 배너 */}
      {!authLoading && !isLoggedIn && showNudge && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-primary/5 border-b text-sm">
          <span className="text-muted-foreground">
            💬 로그인하면 대화가 저장되고 무제한으로 이용할 수 있어요
          </span>
          <Button size="sm" variant="default" asChild className="shrink-0 gap-1.5">
            <Link href="/auth/login?next=/chat">
              <LogIn className="h-3.5 w-3.5" />
              로그인
            </Link>
          </Button>
        </div>
      )}

      <ChatMessages messages={messages} streaming={streaming} isLoading={isLoading} />
      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
}
