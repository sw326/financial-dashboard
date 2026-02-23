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
  const savedMsgIds = useRef<Set<string>>(new Set());
  const [anonCount, setAnonCount] = useState(0);
  const [showNudge, setShowNudge] = useState(false);

  useEffect(() => {
    const count = parseInt(localStorage.getItem(ANON_COUNT_KEY) ?? "0", 10);
    setAnonCount(count);
  }, []);

  const handleSend = useCallback(async (text: string) => {
    if (isLoggedIn) {
      // 첫 메시지: conversation 생성
      if (!convIdRef.current) {
        try {
          const title = text.length > 50 ? text.slice(0, 50) + "..." : text;
          const { data: { user } } = await supabase.auth.getUser();
          const { data } = await supabase
            .from("conversations")
            .insert({ title, user_id: user?.id })
            .select()
            .single();
          if (data) {
            convIdRef.current = data.id;
            // URL 업데이트 (pushState — 컴포넌트 유지, 새로고침 시 /chat/[id] 로드)
            window.history.replaceState({}, "", `/chat/${data.id}`);
          }
        } catch { /* Supabase 없이도 채팅 가능 */ }
      }

      // user 메시지 즉시 저장
      if (convIdRef.current) {
        supabase.from("messages")
          .insert({ conversation_id: convIdRef.current, role: "user", content: text })
          .then(() => {});
        supabase.from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", convIdRef.current)
          .then(() => {});
      }

      sendMessage(text, convIdRef.current ?? undefined);
      return;
    }

    // 비회원: 카운터 증가 + 넛지
    const newCount = anonCount + 1;
    setAnonCount(newCount);
    localStorage.setItem(ANON_COUNT_KEY, String(newCount));
    if (newCount >= ANON_MSG_LIMIT) setShowNudge(true);
    sendMessage(text);
  }, [isLoggedIn, anonCount, sendMessage]);

  // assistant 메시지 저장 (streaming 완료 후)
  useEffect(() => {
    if (streaming || !convIdRef.current || !isLoggedIn) return;
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== "assistant") return;
    if (savedMsgIds.current.has(lastMsg.id)) return;
    savedMsgIds.current.add(lastMsg.id);

    supabase.from("messages").insert({
      conversation_id: convIdRef.current,
      role: "assistant",
      content: lastMsg.content,
    }).then(() => {});
  }, [messages, streaming, isLoggedIn]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {error && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm text-center">
          {error}
        </div>
      )}
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
