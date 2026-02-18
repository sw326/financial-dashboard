// Run in Seoul for Naver API access
export const preferredRegion = "icn1";

import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const isKr = symbol.endsWith(".KS") || symbol.endsWith(".KQ");

  try {
    // 국장: 네이버 API 시도, 실패 시 yahoo 폴백
    if (isKr) {
      const code = symbol.replace(/\.(KS|KQ)$/, "");
      try {
        const res = await fetch(`https://m.stock.naver.com/api/stock/${code}/basic`, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(3000),
        });
        if (res.ok) {
          const data = await res.json();
          // 네이버 API 응답 구조에서 현재가 추출
          const price = Number(data?.stockItemTotalInfos?.[0]?.closePrice ?? data?.closePrice);
          if (!isNaN(price) && price > 0) {
            return NextResponse.json({
              price,
              time: Math.floor(Date.now() / 1000),
              volume: Number(data?.accumulatedTradingVolume) || undefined,
            });
          }
        }
      } catch {
        // 네이버 실패 → yahoo 폴백
      }
    }

    // yahoo-finance2 quote — 프리/포스트 마켓 가격 우선
    const result = await yf.quote(symbol);

    // 프리마켓 or 포스트마켓 가격이 있으면 우선 사용
    const prePrice = (result as Record<string, unknown>).preMarketPrice as number | undefined;
    const postPrice = (result as Record<string, unknown>).postMarketPrice as number | undefined;
    const extPrice = prePrice || postPrice;
    const marketState = (result as Record<string, unknown>).marketState as string | undefined;
    const isExtended = marketState === "PRE" || marketState === "POST" || marketState === "PREPRE" || marketState === "POSTPOST";

    const price = (isExtended && extPrice) ? extPrice : (result.regularMarketPrice ?? 0);
    const time = result.regularMarketTime
      ? Math.floor(new Date(result.regularMarketTime).getTime() / 1000)
      : Math.floor(Date.now() / 1000);

    return NextResponse.json({
      price,
      time,
      volume: result.regularMarketVolume ?? undefined,
      marketState: marketState || "REGULAR",
    });
  } catch (err) {
    console.error("Realtime API error:", err);
    return NextResponse.json({ error: "Failed to fetch realtime data" }, { status: 500 });
  }
}
