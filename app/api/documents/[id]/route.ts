import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseServer } from "@/lib/supabase/admin";

// DELETE /api/documents/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // 소유권 확인 + 사이즈 조회
  const { data: doc } = await supabaseServer
    .from("user_documents")
    .select("id, size_bytes, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!doc) return NextResponse.json({ error: "문서를 찾을 수 없습니다" }, { status: 404 });

  // 삭제 (chunks는 cascade)
  await supabaseServer.from("user_documents").delete().eq("id", id);

  // 스토리지 사용량 차감
  await supabaseServer.rpc("increment_storage_usage", {
    p_user_id: user.id,
    p_bytes:   -(doc.size_bytes ?? 0),
  });

  return NextResponse.json({ success: true });
}
