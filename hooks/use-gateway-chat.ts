"use client";

import { useState, useCallback, useRef } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

let idCounter = 0;
function genId() {
  return `msg_${Date.now()}_${++idCounter}`;
}

export function useGatewayChat(sessionKey: string = "webchat") {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (text: string, conversationId?: string) => {
      const trimmed = text.trim();
      if (!trimmed || status === "loading") return;

      // Add user message
      const userMsg: ChatMessage = {
        id: genId(),
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setError(null);
      setStatus("loading");
      setStreaming("");

      // Abort any previous request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/chat/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, sessionKey, conversationId }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulatedText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            let event: { type: string; text?: string; content?: string; error?: string };
            try {
              event = JSON.parse(jsonStr);
            } catch {
              continue;
            }

            if (event.type === "delta" && event.text) {
              accumulatedText += event.text;
              setStreaming(accumulatedText);
            } else if (event.type === "final") {
              const finalContent = event.content || accumulatedText;
              const assistantMsg: ChatMessage = {
                id: genId(),
                role: "assistant",
                content: finalContent,
                timestamp: Date.now(),
              };
              setMessages((prev) => [...prev, assistantMsg]);
              setStreaming("");
              setStatus("idle");
            } else if (event.type === "error") {
              setError(event.error || "오류 발생");
              setStreaming("");
              setStatus("error");
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(String(err));
        setStreaming("");
        setStatus("error");
      }
    },
    [sessionKey, status]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreaming("");
    setError(null);
    setStatus("idle");
  }, []);

  return {
    messages,
    streaming,
    isLoading: status === "loading",
    status,
    error,
    sendMessage,
    clearMessages,
  };
}
