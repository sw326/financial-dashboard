import { NextResponse } from "next/server";

export const preferredRegion = "icn1";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const url = "https://m.stock.naver.com/api/stocks/marketValue?page=1&pageSize=3";
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      cache: "no-store",
    });
    const status = res.status;
    const text = await res.text();
    return NextResponse.json({
      status,
      bodyLength: text.length,
      bodyPreview: text.slice(0, 500),
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) });
  }
}
