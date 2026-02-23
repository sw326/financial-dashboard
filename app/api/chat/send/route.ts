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

// CHM-255: request body 타입 정의
interface ChatSendRequest {
  message: string;
  sessionKey?: string;
  conversationId?: string;
}

export async function POST(req: NextRequest) {
  const reqBody = (await req.json()) as ChatSendRequest;
  const { message, sessionKey: clientSessionKey, conversationId } = reqBody;

  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: "message required" }), { status: 400 });
  }

  // 로그인 유저 확인 + 개인화 컨텍스트 + 세션 키 결정
  let systemContext: string | null = null;
  let sessionKey = clientSessionKey || "webchat";

  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // 인증 유저: webchat:{userId} → 푸시 서버 타겟 매핑 가능
      sessionKey = `webchat:${user.id}`;
      systemContext = await buildPersonalizedContext(user.id);
    }
  } catch { /* 인증 실패 시 비회원으로 진행 */ }

  // 개인화 컨텍스트는 메시지 앞에 주석으로 주입 (게이트웨이 system 파라미터 미지원)
  const inputWithContext = systemContext
    ? `[사용자 컨텍스트: ${systemContext.replace(/\n/g, ", ")}]\n\n${message.trim()}`
    : message.trim();

  const body = {
    model: "openclaw:main",
    input: inputWithContext,
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

  // CHM-256: upstream.body null 체크
  if (!upstream.body) {
    return new Response(JSON.stringify({ error: "Empty upstream response" }), { status: 502 });
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
