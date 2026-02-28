import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseServer } from "@/lib/supabase/admin";
import { parsePdf, chunkText } from "@/lib/document-parser";
import { embedBatchWithFallback } from "@/lib/jina-embeddings";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const QUOTA_BYTES   = 52_428_800;

// GET: 문서 목록 + 스토리지 사용량
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: docs }, { data: profile }] = await Promise.all([
    supabaseServer.from("user_documents").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabaseServer.from("user_profiles").select("storage_used_bytes, storage_quota_bytes").eq("user_id", user.id).single(),
  ]);

  return NextResponse.json({
    documents: docs ?? [],
    storage: {
      used:  profile?.storage_used_bytes  ?? 0,
      quota: profile?.storage_quota_bytes ?? QUOTA_BYTES,
    },
  });
}

// POST: 파일 업로드 (multipart)
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const note = formData.get("note") as string | null;

  let rawText = "";
  let docName = "";
  let docType: "pdf" | "txt" | "note" = "note";
  let sizeBytes = 0;

  if (file) {
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "파일이 너무 큽니다 (최대 20MB)" }, { status: 400 });
    }

    // [Critical] 용량 체크를 INSERT 전에
    const { data: profile } = await supabaseServer
      .from("user_profiles").select("storage_used_bytes, storage_quota_bytes")
      .eq("user_id", user.id).single();
    const used  = profile?.storage_used_bytes  ?? 0;
    const quota = profile?.storage_quota_bytes ?? QUOTA_BYTES;
    if (used + file.size > quota) {
      return NextResponse.json({ error: "스토리지 용량이 부족합니다" }, { status: 400 });
    }

    sizeBytes = file.size;
    docName   = file.name;
    const buffer = Buffer.from(await file.arrayBuffer());

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      docType = "pdf";
      rawText = await parsePdf(buffer);
    } else {
      docType = "txt";
      rawText = buffer.toString("utf-8");
    }
  } else if (note) {
    rawText   = note;
    docName   = `메모 ${new Date().toLocaleDateString("ko-KR")}`;
    docType   = "note";
    sizeBytes = Buffer.byteLength(note, "utf-8");

    // 용량 체크
    const { data: profile } = await supabaseServer
      .from("user_profiles").select("storage_used_bytes, storage_quota_bytes")
      .eq("user_id", user.id).single();
    const used  = profile?.storage_used_bytes  ?? 0;
    const quota = profile?.storage_quota_bytes ?? QUOTA_BYTES;
    if (used + sizeBytes > quota) {
      return NextResponse.json({ error: "스토리지 용량이 부족합니다" }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: "파일 또는 텍스트가 필요합니다" }, { status: 400 });
  }

  if (!rawText.trim()) {
    return NextResponse.json({ error: "텍스트를 추출할 수 없습니다" }, { status: 400 });
  }

  // [Critical] 용량 선차감
  await supabaseServer.rpc("increment_storage_usage", { p_user_id: user.id, p_bytes: sizeBytes });

  const { data: doc, error: docErr } = await supabaseServer
    .from("user_documents")
    .insert({ user_id: user.id, name: docName, type: docType, size_bytes: sizeBytes, status: "processing" })
    .select().single();

  if (docErr || !doc) {
    await supabaseServer.rpc("increment_storage_usage", { p_user_id: user.id, p_bytes: -sizeBytes });
    return NextResponse.json({ error: "문서 저장 실패" }, { status: 500 });
  }

  // [High] 비동기 처리 + 에러 롤백
  processDocument(doc.id, user.id, rawText, sizeBytes).catch(console.error);

  return NextResponse.json({ document: doc });
}

async function processDocument(docId: string, userId: string, text: string, sizeBytes: number) {
  try {
    const chunks = chunkText(text);
    // [Medium] Jina 실패해도 문서 저장 허용 (검색만 비활성화)
    const { embeddings, failed: embFailed } = await embedBatchWithFallback(chunks);

    await supabaseServer.from("document_chunks").insert(
      chunks.map((content, i) => ({
        document_id: docId,
        user_id:     userId,
        content,
        embedding:   JSON.stringify(embeddings[i]),
        chunk_index: i,
      }))
    );

    await supabaseServer
      .from("user_documents")
      .update({
        status: embFailed ? "ready_no_search" : "ready",
        chunk_count: chunks.length,
      })
      .eq("id", docId);
  } catch (e) {
    console.error("[documents] processDocument 실패:", e);
    await Promise.all([
      supabaseServer.from("user_documents").update({ status: "error" }).eq("id", docId),
      // 실패 시 선차감된 용량 롤백
      supabaseServer.rpc("increment_storage_usage", { p_user_id: userId, p_bytes: -sizeBytes }),
    ]);
  }
}
