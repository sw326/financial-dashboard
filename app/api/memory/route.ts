import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

// GET /api/memory — 내 메모리 목록
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("user_memories")
    .select("id, category, key, value, importance, source, updated_at")
    .eq("user_id", user.id)
    .order("importance", { ascending: false })
    .order("updated_at", { ascending: false });

  return NextResponse.json({ items: data ?? [] });
}

// DELETE /api/memory?id=xxx — 메모리 삭제
export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await supabase.from("user_memories").delete().eq("user_id", user.id).eq("id", id);
  return NextResponse.json({ ok: true });
}
