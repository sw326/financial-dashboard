import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseServer } from "@/lib/supabase/admin";
import { extractMemoriesWithHaiku, saveMemory } from "@/lib/chat-memory";

const GATEWAY_URL = (process.env.GATEWAY_URL || "https://desktop-76g4sk0.tailcfd4f8.ts.net").replace(/^wss?:\/\//, "https://");
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || "";

// POST /api/memory/extract — 대화 종료 후 Haiku로 메모리 추출
// 클라이언트가 final SSE 이벤트 수신 후 fire-and-forget으로 호출
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { conversationId } = await req.json() as { conversationId?: string };
  if (!conversationId) return NextResponse.json({ ok: false }, { status: 400 });

  // Critical fix: conversationId 소유권 검증 → 타인 대화 분석 방지
  const { data: conv } = await supabaseServer
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (!conv) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  // 최근 대화 로드 (최대 20턴)
  const { data: messages } = await supabaseServer
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(20);

  if (!messages?.length) return NextResponse.json({ ok: true, extracted: 0 });

  // Haiku로 메모리 추출
  const extracted = await extractMemoriesWithHaiku(messages, GATEWAY_URL, GATEWAY_TOKEN);

  // DB 저장
  let saved = 0;
  for (const item of extracted) {
    if (!item.key || !item.value) continue;
    try {
      await saveMemory(user.id, item.key, item.value, {
        category: item.category,
        importance: item.importance,
        source: "auto",
      });
      saved++;
    } catch { /* 개별 실패 무시 */ }
  }

  return NextResponse.json({ ok: true, extracted: extracted.length, saved });
}
