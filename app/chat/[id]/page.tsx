"use client";

import { useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { useGatewayChat } from "@/hooks/use-gateway-chat";
import { supabase } from "@/lib/supabase";

export default function ChatConversationPage() {
  const { id } = useParams<{ id: string }>();
  const { messages, streaming, isLoading, error, sendMessage } = useGatewayChat(`webchat:${id}`);
  const savedMsgIds = useRef<Set<string>>(new Set());

  const handleSend = useCallback(async (text: string) => {
    try {
      await supabase.from("messages").insert({ conversation_id: id, role: "user", content: text });
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", id);
    } catch { /* no-op */ }

    sendMessage(text, id);
  }, [sendMessage, id]);

  // Save assistant messages to Supabase
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== "assistant") return;
    if (savedMsgIds.current.has(lastMsg.id)) return;
    savedMsgIds.current.add(lastMsg.id);

    supabase.from("messages").insert({
      conversation_id: id,
      role: "assistant",
      content: lastMsg.content,
    }).then(() => {});
  }, [messages, id]);

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
