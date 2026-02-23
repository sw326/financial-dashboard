import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

// GET /api/watchlist — 내 관심종목 목록
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("watchlist")
    .select("id, symbol, name, market, added_at")
    .eq("user_id", user.id)
    .order("added_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}

// POST /api/watchlist — 관심종목 추가
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { symbol, name, market } = await req.json() as { symbol: string; name?: string; market?: string };
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const { data, error } = await supabase
    .from("watchlist")
    .upsert({ user_id: user.id, symbol, name, market }, { onConflict: "user_id,symbol" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}
