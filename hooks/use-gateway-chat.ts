"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface GatewayEvent {
  type: "event" | "res";
  event?: string;
  payload?: Record<string, unknown>;
  id?: string;
  ok?: boolean;
  error?: { message: string };
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

let idCounter = 0;
function genId() {
  return `msg_${Date.now()}_${++idCounter}`;
}

export function useGatewayChat(gatewayUrl: string, token: string) {
  const sessionKey = "webchat";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState("");
  const [status, setStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pendingRef = useRef<Map<string, PendingRequest>>(new Map());
  const runIdRef = useRef<string | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mountedRef = useRef(true);
  const connectSentRef = useRef(false);

  const request = useCallback((method: string, params: Record<string, unknown>): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        reject(new Error("Not connected"));
        return;
      }
      const id = genId();
      pendingRef.current.set(id, { resolve, reject });
      ws.send(JSON.stringify({ type: "req", id, method, params }));
    });
  }, []);

  const parseMessages = useCallback((rawMessages: Array<{ role: string; content: string | Array<{ type: string; text?: string }>; timestamp?: number; id?: string }>): ChatMessage[] => {
    return rawMessages
      .filter((m) => {
        if (m.role !== "user" && m.role !== "assistant") return false;
        if (m.role === "assistant") {
          const text = typeof m.content === "string"
            ? m.content
            : Array.isArray(m.content)
              ? m.content.filter((p) => p.type === "text").map((p) => p.text || "").join("")
              : "";
          if (text.trim() === "NO_REPLY" || text.trim() === "") return false;
        }
        return true;
      })
      .map((m, i) => {
        let content = "";
        if (typeof m.content === "string") {
          content = m.content;
        } else if (Array.isArray(m.content)) {
          content = m.content
            .filter((p): p is { type: string; text: string } => p.type === "text" && typeof p.text === "string")
            .map((p) => p.text)
            .join("");
        }
        return {
          id: m.id || `hist_${i}`,
          role: m.role as "user" | "assistant",
          content,
          timestamp: m.timestamp || Date.now(),
        };
      });
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const res = await request("chat.history", { sessionKey, limit: 50 }) as {
        messages?: Array<{ role: string; content: string | Array<{ type: string; text?: string }>; timestamp?: number; id?: string }>;
      };
      if (!res?.messages || !mountedRef.current) return;
      setMessages(parseMessages(res.messages));
    } catch {
      // Start fresh
    }
  }, [request, parseMessages]);

  const sendConnect = useCallback(async () => {
    if (connectSentRef.current) return;
    connectSentRef.current = true;
    try {
      await request("connect", {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: "webchat",
          version: "1.0",
          platform: "web",
          mode: "webchat",
          instanceId: genId(),
        },
        role: "operator",
        scopes: ["operator.read", "operator.write"],
        caps: [],
        auth: { token, password: "" },
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "financial-dashboard",
        locale: "ko",
      });
      if (mountedRef.current) {
        setStatus("connected");
        setError(null);
        loadHistory();
      }
    } catch (err) {
      if (mountedRef.current) {
        setStatus("error");
        setError(String(err));
      }
    }
  }, [request, token, loadHistory]);

  const handleEvent = useCallback((evt: GatewayEvent) => {
    if (evt.event === "connect.challenge") {
      sendConnect();
      return;
    }

    if (evt.event === "chat") {
      const payload = evt.payload as {
        state?: string;
        message?: { role?: string; content?: string | Array<{ type: string; text?: string }> };
        sessionKey?: string;
      };
      if (!payload) return;
      if (payload.sessionKey && !payload.sessionKey.endsWith(sessionKey)) return;

      if (payload.state === "delta" && payload.message) {
        let text = "";
        const msg = payload.message;
        if (typeof msg.content === "string") {
          text = msg.content;
        } else if (Array.isArray(msg.content)) {
          text = msg.content
            .filter((p): p is { type: string; text: string } => p.type === "text" && typeof p.text === "string")
            .map((p) => p.text)
            .join("");
        }
        setStreaming(text);
      } else if (payload.state === "final") {
        setStreaming("");
        runIdRef.current = null;

        if (payload.message?.role === "assistant") {
          let content = "";
          const msg = payload.message;
          if (typeof msg.content === "string") {
            content = msg.content;
          } else if (Array.isArray(msg.content)) {
            content = msg.content
              .filter((p): p is { type: string; text: string } => p.type === "text" && typeof p.text === "string")
              .map((p) => p.text)
              .join("");
          }
          if (content.trim() !== "NO_REPLY" && content.trim() !== "") {
            setMessages((prev) => [
              ...prev,
              { id: genId(), role: "assistant", content, timestamp: Date.now() },
            ]);
          }
        }
      } else if (payload.state === "error" || payload.state === "aborted") {
        setStreaming("");
        runIdRef.current = null;
        if (payload.state === "error") {
          setError("응답 중 오류가 발생했습니다");
        }
      }
    }
  }, [sendConnect]);

  useEffect(() => {
    mountedRef.current = true;

    function connect() {
      if (!mountedRef.current) return;
      setStatus("connecting");

      const ws = new WebSocket(gatewayUrl);
      wsRef.current = ws;

      ws.addEventListener("message", (e) => {
        let data: GatewayEvent;
        try {
          data = JSON.parse(e.data);
        } catch {
          return;
        }

        if (data.type === "event") {
          handleEvent(data);
        } else if (data.type === "res") {
          const pending = pendingRef.current.get(data.id!);
          if (pending) {
            pendingRef.current.delete(data.id!);
            if (data.ok) {
              pending.resolve(data.payload);
            } else {
              pending.reject(new Error(data.error?.message || "Request failed"));
            }
          }
        }
      });

      ws.addEventListener("close", () => {
        if (mountedRef.current) {
          setStatus("error");
          connectSentRef.current = false;
          pendingRef.current.forEach((p) => p.reject(new Error("Disconnected")));
          pendingRef.current.clear();
          reconnectRef.current = setTimeout(connect, 3000);
        }
      });

      ws.addEventListener("error", () => {
        if (mountedRef.current) {
          setStatus("error");
          setError("연결 실패");
        }
      });
    }

    connect();

    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
      wsRef.current = null;
      pendingRef.current.forEach((p) => p.reject(new Error("Unmounted")));
      pendingRef.current.clear();
    };
  }, [gatewayUrl, handleEvent]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((prev) => [
      ...prev,
      { id: genId(), role: "user", content: trimmed, timestamp: Date.now() },
    ]);
    setError(null);

    const idempotencyKey = genId();
    runIdRef.current = idempotencyKey;

    try {
      await request("chat.send", {
        sessionKey,
        message: trimmed,
        deliver: false,
        idempotencyKey,
      });
    } catch (err) {
      setError(String(err));
      runIdRef.current = null;
    }
  }, [request]);

  const isLoading = streaming !== "" || runIdRef.current !== null;

  return { messages, streaming, isLoading, status, error, sendMessage };
}
