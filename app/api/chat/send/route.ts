import { NextRequest } from "next/server";
import WebSocket from "ws";

const GATEWAY_URL = process.env.GATEWAY_URL || "wss://desktop-76g4sk0.tailcfd4f8.ts.net";
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || "";

let idCounter = 0;
function genId() {
  return `srv_${Date.now()}_${++idCounter}`;
}

export const maxDuration = 60; // Vercel Pro: 60s timeout

export async function POST(req: NextRequest) {
  const { message, sessionKey = "webchat", conversationId } = await req.json();

  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: "message required" }), { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      };

      let ws: WebSocket | null = null;
      let done = false;

      const cleanup = () => {
        done = true;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      };

      try {
        ws = new WebSocket(GATEWAY_URL);

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("Connection timeout")), 10000);

          ws!.on("open", () => clearTimeout(timeout));
          ws!.on("error", (err) => {
            clearTimeout(timeout);
            reject(err);
          });

          let connected = false;
          const idempotencyKey = genId();

          ws!.on("message", async (raw) => {
            if (done) return;
            let data: Record<string, unknown>;
            try {
              data = JSON.parse(raw.toString());
            } catch {
              return;
            }

            // 1) connect.challenge → send connect handshake
            if (data.type === "event" && data.event === "connect.challenge" && !connected) {
              const connectReq = {
                type: "req",
                id: genId(),
                method: "connect",
                params: {
                  minProtocol: 3,
                  maxProtocol: 3,
                  client: {
                    id: "webchat",
                    version: "1.0",
                    platform: "server",
                    mode: "webchat",
                    instanceId: genId(),
                  },
                  role: "operator",
                  scopes: ["operator.read", "operator.write"],
                  caps: [],
                  auth: { token: GATEWAY_TOKEN, password: "" },
                  userAgent: "financial-dashboard-server/1.0",
                  locale: "ko",
                },
              };
              ws!.send(JSON.stringify(connectReq));
              return;
            }

            // 2) connect response
            if (data.type === "res" && !connected) {
              if (!data.ok) {
                const errMsg = (data.error as { message?: string })?.message || "connect failed";
                send({ type: "error", error: errMsg });
                cleanup();
                resolve();
                return;
              }
              connected = true;

              // 3) send chat.send
              const chatReq = {
                type: "req",
                id: genId(),
                method: "chat.send",
                params: {
                  sessionKey,
                  message: message.trim(),
                  deliver: false,
                  idempotencyKey,
                },
              };
              ws!.send(JSON.stringify(chatReq));
              return;
            }

            // 4) chat events (streaming response)
            if (data.type === "event" && data.event === "chat") {
              const payload = data.payload as {
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
                send({ type: "delta", text });
              } else if (payload.state === "final") {
                let content = "";
                if (payload.message) {
                  const msg = payload.message;
                  if (typeof msg.content === "string") {
                    content = msg.content;
                  } else if (Array.isArray(msg.content)) {
                    content = msg.content
                      .filter((p): p is { type: string; text: string } => p.type === "text" && typeof p.text === "string")
                      .map((p) => p.text)
                      .join("");
                  }
                }
                send({ type: "final", content, conversationId });
                cleanup();
                resolve();
              } else if (payload.state === "error" || payload.state === "aborted") {
                send({ type: "error", error: payload.state === "error" ? "응답 오류" : "응답 중단" });
                cleanup();
                resolve();
              }
            }
          });

          ws!.on("close", () => {
            if (!done) {
              send({ type: "error", error: "연결 끊김" });
              resolve();
            }
          });
        });
      } catch (err) {
        send({ type: "error", error: String(err) });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
