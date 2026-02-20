"use client";

import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { useGatewayChat } from "@/hooks/use-gateway-chat";
import { supabase } from "@/lib/supabase";
import { useCallback, useRef } from "react";

export default function ChatPage() {
  const { messages, streaming, isLoading, error, sendMessage } = useGatewayChat("webchat");
  const convIdRef = useRef<string | null>(null);

  const handleSend = useCallback(async (text: string) => {
    // Create conversation on first message
    if (!convIdRef.current && messages.length === 0) {
      try {
        const title = text.length > 50 ? text.slice(0, 50) + "..." : text;
        const { data } = await supabase
          .from("conversations")
          .insert({ title })
          .select()
          .single();
        if (data) {
          convIdRef.current = data.id;
          // 컴포넌트 unmount 없이 URL만 업데이트 (SSE 스트림 유지)
          window.history.pushState({}, "", `/chat/${data.id}`);
        }
      } catch {
        // Supabase 연결 없이도 채팅 가능
      }
    }

    sendMessage(text, convIdRef.current ?? undefined);
  }, [sendMessage, messages.length, router]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {error && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm text-center">
          {error}
        </div>
      )}
      <ChatMessages messages={messages} streaming={streaming} isLoading={isLoading} />
      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
}
