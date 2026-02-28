import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseServer } from "@/lib/supabase/admin";
import { parsePdf, chunkText } from "@/lib/document-parser";
import { embedBatchWithFallback } from "@/lib/jina-embeddings";

const MAX_FILE_SIZE  = 20 * 1024 * 1024; // 20MB (문서)
const MAX_IMAGE_SIZE =  5 * 1024 * 1024; //  5MB (이미지)
const QUOTA_BYTES    = 52_428_800;        // 50MB
const IMAGE_MIMES    = ["image/jpeg", "image/png", "image/webp", "image/gif"];

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

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const note = formData.get("note") as string | null;

  // ─── 이미지 업로드 분기 ───────────────────────────────────────
  if (file && IMAGE_MIMES.includes(file.type)) {
    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "이미지는 최대 5MB까지 허용됩니다" }, { status: 400 });
    }
    return handleImageUpload(file, user.id);
  }

  // ─── 문서 업로드 (PDF / TXT / 메모) ──────────────────────────
  let rawText = "";
  let docName = "";
  let docType: "pdf" | "txt" | "note" = "note";
  let sizeBytes = 0;

  if (file) {
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "파일이 너무 큽니다 (최대 20MB)" }, { status: 400 });
    }
    sizeBytes = file.size;
    docName   = file.name;
    const buf = Buffer.from(await file.arrayBuffer());
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      docType = "pdf"; rawText = await parsePdf(buf);
    } else {
      docType = "txt"; rawText = buf.toString("utf-8");
    }
  } else if (note) {
    rawText = note;
    docName = `메모 ${new Date().toLocaleDateString("ko-KR")}`;
    docType = "note";
    sizeBytes = Buffer.byteLength(note, "utf-8");
  } else {
    return NextResponse.json({ error: "파일 또는 텍스트가 필요합니다" }, { status: 400 });
  }

  if (!rawText.trim()) {
    return NextResponse.json({ error: "텍스트를 추출할 수 없습니다" }, { status: 400 });
  }

  // 용량 체크 + 선차감
  const quota = await getQuota(user.id);
  if (quota.used + sizeBytes > quota.limit) {
    return NextResponse.json({ error: "스토리지 용량이 부족합니다" }, { status: 400 });
  }
  await supabaseServer.rpc("increment_storage_usage", { p_user_id: user.id, p_bytes: sizeBytes });

  const { data: doc, error: docErr } = await supabaseServer
    .from("user_documents")
    .insert({ user_id: user.id, name: docName, type: docType, size_bytes: sizeBytes, status: "processing" })
    .select().single();

  if (docErr || !doc) {
    await supabaseServer.rpc("increment_storage_usage", { p_user_id: user.id, p_bytes: -sizeBytes });
    return NextResponse.json({ error: "문서 저장 실패" }, { status: 500 });
  }

  processDocument(doc.id, user.id, rawText, sizeBytes).catch(console.error);
  return NextResponse.json({ document: doc });
}

// ── 이미지 업로드 핸들러 ────────────────────────────────────────
async function handleImageUpload(file: File, userId: string): Promise<NextResponse> {
  const quota = await getQuota(userId);
  if (quota.used + file.size > quota.limit) {
    return NextResponse.json({ error: "스토리지 용량이 부족합니다" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const storagePath = `${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  // Supabase Storage 업로드
  const { error: storageErr } = await supabaseServer.storage
    .from("chat-attachments")
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (storageErr) {
    console.error("[documents] Storage 업로드 실패:", storageErr);
    return NextResponse.json({ error: "이미지 저장 실패" }, { status: 500 });
  }

  // 용량 선차감
  await supabaseServer.rpc("increment_storage_usage", { p_user_id: userId, p_bytes: file.size });

  const { data: doc } = await supabaseServer
    .from("user_documents")
    .insert({
      user_id:      userId,
      name:         file.name,
      type:         "image",
      size_bytes:   file.size,
      storage_path: storagePath,
      status:       "ready",   // 이미지는 임베딩 없음 → 즉시 ready
    })
    .select().single();

  return NextResponse.json({ document: doc });
}

// ── 문서 비동기 처리 (청킹 + 임베딩) ───────────────────────────
async function processDocument(docId: string, userId: string, text: string, sizeBytes: number) {
  try {
    const chunks = chunkText(text);
    const { embeddings, failed } = await embedBatchWithFallback(chunks);

    await supabaseServer.from("document_chunks").insert(
      chunks.map((content, i) => ({
        document_id: docId, user_id: userId,
        content, embedding: JSON.stringify(embeddings[i]), chunk_index: i,
      }))
    );

    await supabaseServer.from("user_documents")
      .update({ status: failed ? "ready_no_search" : "ready", chunk_count: chunks.length })
      .eq("id", docId);
  } catch (e) {
    console.error("[documents] processDocument 실패:", e);
    await Promise.all([
      supabaseServer.from("user_documents").update({ status: "error" }).eq("id", docId),
      supabaseServer.rpc("increment_storage_usage", { p_user_id: userId, p_bytes: -sizeBytes }),
    ]);
  }
}

async function getQuota(userId: string) {
  const { data } = await supabaseServer
    .from("user_profiles").select("storage_used_bytes, storage_quota_bytes").eq("user_id", userId).single();
  return { used: data?.storage_used_bytes ?? 0, limit: data?.storage_quota_bytes ?? QUOTA_BYTES };
}
