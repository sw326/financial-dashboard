"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatBubble } from "./chat-bubble";
import type { ChatMessage } from "@/hooks/use-gateway-chat";

interface ChatMessagesProps {
  messages: ChatMessage[];
  streaming: string;
  isLoading: boolean;
}

export function ChatMessages({ messages, streaming, isLoading }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-6xl">🦞</div>
          <h2 className="text-xl font-semibold">첨지봇과 대화를 시작하세요</h2>
          <p className="text-muted-foreground text-sm">무엇이든 물어보세요!</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} role={msg.role} content={msg.content} />
        ))}
        {streaming && (
          <ChatBubble role="assistant" content={streaming} />
        )}
        {isLoading && !streaming && (
          <ChatBubble role="assistant" content="" loading />
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
