import { NextRequest } from "next/server";

const GATEWAY_URL = (process.env.GATEWAY_URL || "https://desktop-76g4sk0.tailcfd4f8.ts.net").replace(/^wss?:\/\//, "https://");
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || "";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { message, sessionKey = "webchat", conversationId } = await req.json();

  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: "message required" }), { status: 400 });
  }

  const body = {
    model: "openclaw:main",
    input: message.trim(),
    stream: true,
    user: sessionKey,
    ...(conversationId && { metadata: { conversationId } }),
  };

  const upstream = await fetch(`${GATEWAY_URL}/v1/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GATEWAY_TOKEN}`,
      "x-openclaw-session-key": sessionKey,
    },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return new Response(JSON.stringify({ error: err }), { status: upstream.status });
  }

  // SSE 스트림을 클라이언트에 그대로 relay
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") {
              controller.enqueue(`data: ${JSON.stringify({ type: "done" })}\n\n`);
              continue;
            }

            let event: Record<string, unknown>;
            try {
              event = JSON.parse(jsonStr);
            } catch {
              continue;
            }

            // OpenResponses 이벤트 → 클라이언트 형식으로 변환
            const evType = event.type as string;

            if (evType === "response.output_text.delta") {
              controller.enqueue(
                `data: ${JSON.stringify({ type: "delta", text: event.delta })}\n\n`
              );
            } else if (evType === "response.output_text.done") {
              // 전체 텍스트 완성
              controller.enqueue(
                `data: ${JSON.stringify({ type: "final", content: event.text, conversationId })}\n\n`
              );
            } else if (evType === "response.failed" || evType === "error") {
              controller.enqueue(
                `data: ${JSON.stringify({ type: "error", error: event.message || "응답 오류" })}\n\n`
              );
            }
          }
        }
      } catch (err) {
        controller.enqueue(
          `data: ${JSON.stringify({ type: "error", error: String(err) })}\n\n`
        );
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
