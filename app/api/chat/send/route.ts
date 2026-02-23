import { NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { supabaseServer } from "@/lib/supabase-server-admin";

const GATEWAY_URL = (process.env.GATEWAY_URL || "https://desktop-76g4sk0.tailcfd4f8.ts.net").replace(/^wss?:\/\//, "https://");
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || "";

export const maxDuration = 60;

async function buildPersonalizedContext(userId: string): Promise<string | null> {
  const { data: profile } = await supabaseServer
    .from("user_profiles")
    .select("display_name, investment_style, risk_tolerance")
    .eq("user_id", userId)
    .single();

  if (!profile) return null;

  const parts: string[] = [];
  if (profile.display_name) parts.push(`사용자 이름: ${profile.display_name}`);
  if (profile.investment_style) parts.push(`투자 성향: ${profile.investment_style}`);
  if (profile.risk_tolerance) parts.push(`리스크 허용도: ${profile.risk_tolerance}/5`);

  if (parts.length === 0) return null;
  return `[사용자 정보]\n${parts.join("\n")}`;
}

export async function POST(req: NextRequest) {
  const { message, sessionKey = "webchat", conversationId } = await req.json();

  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: "message required" }), { status: 400 });
  }

  // 로그인 유저 확인 + 개인화 컨텍스트
  let personalizedSession = sessionKey;
  let systemContext: string | null = null;

  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      personalizedSession = `webchat:${user.id}`;
      systemContext = await buildPersonalizedContext(user.id);
    }
  } catch { /* 인증 실패 시 비회원으로 진행 */ }

  const body = {
    model: "openclaw:main",
    input: message.trim(),
    stream: true,
    user: personalizedSession,
    ...(conversationId && { metadata: { conversationId } }),
    ...(systemContext && { system: systemContext }),
  };

  const upstream = await fetch(`${GATEWAY_URL}/v1/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GATEWAY_TOKEN}`,
      "x-openclaw-session-key": personalizedSession,
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

            const evType = event.type as string;

            if (evType === "response.output_text.delta") {
              controller.enqueue(
                `data: ${JSON.stringify({ type: "delta", text: event.delta })}\n\n`
              );
            } else if (evType === "response.output_text.done") {
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
