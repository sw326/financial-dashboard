"use client";

import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { useGatewayChat } from "@/hooks/use-gateway-chat";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "";
const GATEWAY_TOKEN = process.env.NEXT_PUBLIC_GATEWAY_TOKEN || "";

export default function ChatPage() {
  const router = useRouter();
  const { messages, streaming, isLoading, status, error, sendMessage } = useGatewayChat(GATEWAY_URL, GATEWAY_TOKEN);
  const creatingRef = useRef(false);

  const handleSend = useCallback(async (text: string) => {
    sendMessage(text);

    // Create a conversation in Supabase on first message
    if (!creatingRef.current && messages.length === 0) {
      creatingRef.current = true;
      try {
        const title = text.length > 50 ? text.slice(0, 50) + "..." : text;
        const { data } = await supabase
          .from("conversations")
          .insert({ title })
          .select()
          .single();
        if (data) {
          // Save the user message
          await supabase.from("messages").insert({
            conversation_id: data.id,
            role: "user",
            content: text,
          });
          router.push(`/chat/${data.id}`);
        }
      } catch {
        // Supabase might not have tables yet, continue anyway
      }
    }
  }, [sendMessage, messages.length, router]);

  return (
    <>
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
    </>
  );
}
