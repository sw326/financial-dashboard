import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseServer } from "@/lib/supabase/admin";
import { parseUrl, chunkText } from "@/lib/document-parser";
import { embedBatchWithFallback } from "@/lib/jina-embeddings";

const QUOTA_BYTES = 52_428_800;
const MAX_TEXT_BYTES = 10 * 1024 * 1024; // 10MB

// [Critical] SSRF 방어: private IP + 내부 서비스 차단
const SSRF_BLOCKED_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,        // link-local
  /^::1$/,              // IPv6 loopback
  /^fc00:/i,            // IPv6 private
  /^fd[0-9a-f]{2}:/i,  // IPv6 ULA
];

function isSafeUrl(raw: string): { safe: boolean; reason?: string } {
  let parsed: URL;
  try { parsed = new URL(raw); }
  catch { return { safe: false, reason: "유효하지 않은 URL" }; }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { safe: false, reason: "http/https만 허용됩니다" };
  }
  const host = parsed.hostname;
  if (SSRF_BLOCKED_PATTERNS.some((p) => p.test(host))) {
    return { safe: false, reason: "접근할 수 없는 URL입니다" };
  }
  return { safe: true };
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // [Medium] 입력 검증 강화
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "요청 형식 오류" }, { status: 400 }); }
  const url = typeof (body as Record<string, unknown>).url === "string"
    ? ((body as Record<string, unknown>).url as string).trim()
    : null;
  if (!url) return NextResponse.json({ error: "url 필요" }, { status: 400 });

  // [Critical] SSRF 검증
  const { safe, reason } = isSafeUrl(url);
  if (!safe) return NextResponse.json({ error: reason }, { status: 400 });

  let text: string;
  try {
    text = await parseUrl(url);
  } catch (e) {
    return NextResponse.json({ error: `URL 파싱 실패: ${e}` }, { status: 400 });
  }

  const sizeBytes = Math.min(Buffer.byteLength(text, "utf-8"), MAX_TEXT_BYTES);

  // 용량 체크
  const { data: profile } = await supabaseServer
    .from("user_profiles").select("storage_used_bytes, storage_quota_bytes")
    .eq("user_id", user.id).single();
  const used  = profile?.storage_used_bytes  ?? 0;
  const quota = profile?.storage_quota_bytes ?? QUOTA_BYTES;
  if (used + sizeBytes > quota) {
    return NextResponse.json({ error: "스토리지 용량이 부족합니다" }, { status: 400 });
  }

  // [Critical] 용량 선차감 (처리 전 예약)
  await supabaseServer.rpc("increment_storage_usage", { p_user_id: user.id, p_bytes: sizeBytes });

  const hostname = new URL(url).hostname;
  const { data: doc } = await supabaseServer
    .from("user_documents")
    .insert({ user_id: user.id, name: hostname, type: "url", source_url: url, size_bytes: sizeBytes, status: "processing" })
    .select().single();

  if (!doc) {
    // 선차감 롤백
    await supabaseServer.rpc("increment_storage_usage", { p_user_id: user.id, p_bytes: -sizeBytes });
    return NextResponse.json({ error: "문서 저장 실패" }, { status: 500 });
  }

  // [High] 비동기 처리 + 에러 로깅
  (async () => {
    try {
      const chunks = chunkText(text);
      const { embeddings, failed: embFailed } = await embedBatchWithFallback(chunks);
      await supabaseServer.from("document_chunks").insert(
        chunks.map((content, i) => ({
          document_id: doc.id, user_id: user.id,
          content, embedding: JSON.stringify(embeddings[i]), chunk_index: i,
        }))
      );
      await supabaseServer.from("user_documents")
        .update({ status: embFailed ? "ready_no_search" : "ready", chunk_count: chunks.length }).eq("id", doc.id);
    } catch (e) {
      console.error("[documents/url] 처리 실패:", e);
      // 용량 롤백 + 에러 상태 기록
      await Promise.all([
        supabaseServer.from("user_documents")
          .update({ status: "error" }).eq("id", doc.id),
        supabaseServer.rpc("increment_storage_usage", { p_user_id: user.id, p_bytes: -sizeBytes }),
      ]);
    }
  })();

  return NextResponse.json({ document: doc });
}
