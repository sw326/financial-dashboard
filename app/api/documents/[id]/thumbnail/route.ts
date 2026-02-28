import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseServer } from "@/lib/supabase/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  const { data: doc } = await supabaseServer
    .from("user_documents")
    .select("storage_path, type")
    .eq("id", id)
    .eq("user_id", user.id) // 소유권 검증
    .single();

  if (!doc?.storage_path || doc.type !== "image") {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data, error } = await supabaseServer.storage
    .from("chat-attachments")
    .download(doc.storage_path);

  if (error || !data) return new NextResponse("Storage error", { status: 500 });

  const ext = doc.storage_path.split(".").pop()?.toLowerCase() ?? "jpg";
  const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  const buffer = Buffer.from(await data.arrayBuffer());

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
