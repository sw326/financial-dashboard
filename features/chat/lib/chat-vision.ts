import { supabaseServer } from "@/lib/supabase/admin";

const IMAGE_TAG = /\[이미지:\s*(.+?)\]/g;
const ATTACH_TAG = /\[첨부:\s*(.+?)\]/g;

interface ImageBlock {
  type: "image";
  source: {
    type: "base64";
    media_type: string;
    data: string;
  };
}

interface TextBlock {
  type: "text";
  text: string;
}

export type ContentBlock = TextBlock | ImageBlock;

/**
 * 메시지에서 [이미지: filename] 태그 감지 → Supabase Storage에서 base64 로드
 * 반환: content 배열 (text + image blocks) 또는 null (이미지 없음)
 */
export async function buildVisionContent(
  message: string,
  userId: string
): Promise<ContentBlock[] | null> {
  const imageMatches = [...message.matchAll(IMAGE_TAG)];
  if (imageMatches.length === 0) return null;

  // 태그 없애고 텍스트만 추출
  const cleanText = message.replace(IMAGE_TAG, "").replace(ATTACH_TAG, "").trim();

  const blocks: ContentBlock[] = [];

  // 이미지 블록 병렬 로드
  const imageResults = await Promise.allSettled(
    imageMatches.map(async (match) => {
      const filename = match[1].trim();

      // DB에서 storage_path 조회 (소유권 검증 포함)
      const { data: doc } = await supabaseServer
        .from("user_documents")
        .select("storage_path, type, name")
        .eq("user_id", userId)
        .eq("name", filename)
        .eq("type", "image")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!doc?.storage_path) throw new Error(`이미지 없음: ${filename}`);

      // Storage에서 다운로드
      const { data, error } = await supabaseServer.storage
        .from("chat-attachments")
        .download(doc.storage_path);

      if (error || !data) throw new Error(`Storage 다운로드 실패: ${filename}`);

      const ext = doc.storage_path.split(".").pop()?.toLowerCase() ?? "jpg";
      const mimeMap: Record<string, string> = {
        jpg: "image/jpeg", jpeg: "image/jpeg",
        png: "image/png", webp: "image/webp", gif: "image/gif",
      };
      const mediaType = mimeMap[ext] ?? "image/jpeg";
      const base64 = Buffer.from(await data.arrayBuffer()).toString("base64");

      return { mediaType, base64 };
    })
  );

  // 이미지 블록 먼저 (Claude는 이미지를 앞에 배치 권장)
  for (const result of imageResults) {
    if (result.status === "fulfilled") {
      blocks.push({
        type: "image",
        source: {
          type:       "base64",
          media_type: result.value.mediaType,
          data:       result.value.base64,
        },
      });
    } else {
      console.error("[chat-vision]", result.reason);
    }
  }

  if (blocks.length === 0) return null; // 이미지 로드 전부 실패 → 일반 텍스트로 폴백

  // 텍스트 블록
  if (cleanText) {
    blocks.push({ type: "text", text: cleanText });
  }

  return blocks;
}
