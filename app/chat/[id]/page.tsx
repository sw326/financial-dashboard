"use client";

import { useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { ChatMessages } from "@/features/chat/components/chat-messages";
import { ChatInput } from "@/features/chat/components/chat-input";
import { useGatewayChat, ChatMessage } from "@/features/chat/hooks/use-gateway-chat";
import { supabase } from "@/lib/supabase/browser";

let msgIdCounter = 0;
function genId() { return `hist_${Date.now()}_${++msgIdCounter}`; }

export default function ChatConversationPage() {
  const { id } = useParams<{ id: string }>();
  const { messages, streaming, isLoading, error, sendMessage, setMessages } = useGatewayChat(`webchat:${id}`);
  const savedMsgIds = useRef<Set<string>>(new Set());
  const historyLoaded = useRef(false);

  // Supabase에서 기존 대화 내역 로드
  useEffect(() => {
    if (historyLoaded.current) return;
    historyLoaded.current = true;

    supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        const loaded: ChatMessage[] = data.map((m) => ({
          id: m.id || genId(),
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
        }));
        setMessages(loaded);
        // 이미 저장된 메시지 ID를 saved 목록에 추가 (중복 저장 방지)
        loaded.forEach((m) => savedMsgIds.current.add(m.id));
      });
  }, [id, setMessages]);

  const handleSend = useCallback(async (text: string) => {
    try {
      await supabase.from("messages").insert({ conversation_id: id, role: "user", content: text });
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", id);
    } catch { /* no-op */ }

    sendMessage(text, id);
  }, [sendMessage, id]);

  // 새 assistant 메시지 Supabase 저장 (streaming 완료 후에만)
  useEffect(() => {
    if (streaming) return; // 스트리밍 중엔 저장 안 함 (중복 방지)
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== "assistant") return;
    if (savedMsgIds.current.has(lastMsg.id)) return;
    savedMsgIds.current.add(lastMsg.id); // 비동기 저장 전에 마킹 (재진입 방지)

    supabase.from("messages").insert({
      conversation_id: id,
      role: "assistant",
      content: lastMsg.content,
    }).then(() => {});
  }, [messages, streaming, id]);

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
