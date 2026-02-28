import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseServer } from "@/lib/supabase/admin";
import { parseUrl, chunkText } from "@/lib/document-parser";
import { embedBatch } from "@/lib/jina-embeddings";

const QUOTA_BYTES = 52_428_800;

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url } = await req.json() as { url: string };
  if (!url) return NextResponse.json({ error: "url 필요" }, { status: 400 });

  let text: string;
  try {
    text = await parseUrl(url);
  } catch (e) {
    return NextResponse.json({ error: `URL 파싱 실패: ${e}` }, { status: 400 });
  }

  const sizeBytes = Buffer.byteLength(text, "utf-8");

  // 용량 체크
  const { data: profile } = await supabaseServer
    .from("user_profiles").select("storage_used_bytes, storage_quota_bytes")
    .eq("user_id", user.id).single();
  const used  = profile?.storage_used_bytes  ?? 0;
  const quota = profile?.storage_quota_bytes ?? QUOTA_BYTES;
  if (used + sizeBytes > quota) {
    return NextResponse.json({ error: "스토리지 용량이 부족합니다" }, { status: 400 });
  }

  const hostname = new URL(url).hostname;
  const { data: doc } = await supabaseServer
    .from("user_documents")
    .insert({ user_id: user.id, name: hostname, type: "url", source_url: url, size_bytes: sizeBytes, status: "processing" })
    .select().single();

  if (!doc) return NextResponse.json({ error: "문서 저장 실패" }, { status: 500 });

  // 비동기 처리
  (async () => {
    try {
      const chunks = chunkText(text);
      const embeddings = await embedBatch(chunks);
      await supabaseServer.from("document_chunks").insert(
        chunks.map((content, i) => ({
          document_id: doc.id, user_id: user.id,
          content, embedding: JSON.stringify(embeddings[i]), chunk_index: i,
        }))
      );
      await supabaseServer.from("user_documents").update({ status: "ready", chunk_count: chunks.length }).eq("id", doc.id);
      await supabaseServer.rpc("increment_storage_usage", { p_user_id: user.id, p_bytes: sizeBytes });
    } catch {
      await supabaseServer.from("user_documents").update({ status: "error" }).eq("id", doc.id);
    }
  })();

  return NextResponse.json({ document: doc });
}
