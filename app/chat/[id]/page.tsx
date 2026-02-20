"use client";

import { useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { useGatewayChat } from "@/hooks/use-gateway-chat";
import { supabase } from "@/lib/supabase";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "";
const GATEWAY_TOKEN = process.env.NEXT_PUBLIC_GATEWAY_TOKEN || "";

export default function ChatConversationPage() {
  const { id } = useParams<{ id: string }>();
  const { messages, streaming, isLoading, status, error, sendMessage } = useGatewayChat(GATEWAY_URL, GATEWAY_TOKEN);

  // Save messages to Supabase
  const handleSend = useCallback(async (text: string) => {
    sendMessage(text);

    try {
      await supabase.from("messages").insert({
        conversation_id: id,
        role: "user",
        content: text,
      });
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", id);
    } catch {
      // Supabase tables might not exist yet
    }
  }, [sendMessage, id]);

  // Save assistant responses
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === "assistant") {
      supabase.from("messages").insert({
        conversation_id: id,
        role: "assistant",
        content: lastMsg.content,
      }).then(() => {});
    }
  }, [messages.length, id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {error && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm text-center">
          {error}
        </div>
      )}
      {status === "connecting" && (
        <div className="px-4 py-2 bg-muted text-muted-foreground text-sm text-center">
          연결 중...
        </div>
      )}
      <ChatMessages messages={messages} streaming={streaming} isLoading={isLoading} />
      <ChatInput onSend={handleSend} disabled={status !== "connected"} />
    </div>
  );
}
