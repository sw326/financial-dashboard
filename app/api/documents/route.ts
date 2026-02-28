import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseServer } from "@/lib/supabase/admin";
import { parsePdf, chunkText } from "@/lib/document-parser";
import { embedBatch } from "@/lib/jina-embeddings";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const QUOTA_BYTES   = 52_428_800;        // 50MB

// GET /api/documents — 목록 + 스토리지 사용량
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

// POST /api/documents — 파일 업로드 (multipart)
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 용량 체크
  const { data: profile } = await supabaseServer
    .from("user_profiles")
    .select("storage_used_bytes, storage_quota_bytes")
    .eq("user_id", user.id)
    .single();

  const used  = profile?.storage_used_bytes  ?? 0;
  const quota = profile?.storage_quota_bytes ?? QUOTA_BYTES;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const note = formData.get("note") as string | null; // 직접 텍스트 입력

  let rawText = "";
  let docName = "";
  let docType: "pdf" | "txt" | "note" = "note";
  let sizeBytes = 0;

  if (file) {
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "파일이 너무 큽니다 (최대 20MB)" }, { status: 400 });
    }
    if (used + file.size > quota) {
      return NextResponse.json({ error: "스토리지 용량이 부족합니다" }, { status: 400 });
    }

    sizeBytes = file.size;
    docName = file.name;
    const buffer = Buffer.from(await file.arrayBuffer());

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      docType  = "pdf";
      rawText  = await parsePdf(buffer);
    } else {
      docType  = "txt";
      rawText  = buffer.toString("utf-8");
    }
  } else if (note) {
    rawText   = note;
    docName   = `메모 ${new Date().toLocaleDateString("ko-KR")}`;
    docType   = "note";
    sizeBytes = Buffer.byteLength(note, "utf-8");
  } else {
    return NextResponse.json({ error: "파일 또는 텍스트가 필요합니다" }, { status: 400 });
  }

  if (!rawText.trim()) {
    return NextResponse.json({ error: "텍스트를 추출할 수 없습니다" }, { status: 400 });
  }

  // 문서 레코드 생성
  const { data: doc, error: docErr } = await supabaseServer
    .from("user_documents")
    .insert({ user_id: user.id, name: docName, type: docType, size_bytes: sizeBytes, status: "processing" })
    .select()
    .single();

  if (docErr || !doc) {
    return NextResponse.json({ error: "문서 저장 실패" }, { status: 500 });
  }

  // 비동기로 청킹 + 임베딩 처리
  processDocument(doc.id, user.id, rawText, sizeBytes).catch(console.error);

  return NextResponse.json({ document: doc });
}

async function processDocument(docId: string, userId: string, text: string, sizeBytes: number) {
  try {
    const chunks = chunkText(text);
    const embeddings = await embedBatch(chunks);

    const rows = chunks.map((content, i) => ({
      document_id: docId,
      user_id:     userId,
      content,
      embedding:   JSON.stringify(embeddings[i]), // pgvector는 JSON 배열 문자열로
      chunk_index: i,
    }));

    await supabaseServer.from("document_chunks").insert(rows);

    await supabaseServer
      .from("user_documents")
      .update({ status: "ready", chunk_count: chunks.length })
      .eq("id", docId);

    // 스토리지 사용량 업데이트
    await supabaseServer.rpc("increment_storage_usage", {
      p_user_id: userId,
      p_bytes:   sizeBytes,
    });
  } catch (e) {
    console.error("문서 처리 오류:", e);
    await supabaseServer
      .from("user_documents")
      .update({ status: "error" })
      .eq("id", docId);
  }
}
