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

    // yahoo-finance2 quote
    const result = await yf.quote(symbol);
    return NextResponse.json({
      price: result.regularMarketPrice ?? 0,
      time: result.regularMarketTime
        ? Math.floor(new Date(result.regularMarketTime).getTime() / 1000)
        : Math.floor(Date.now() / 1000),
      volume: result.regularMarketVolume ?? undefined,
    });
  } catch (err) {
    console.error("Realtime API error:", err);
    return NextResponse.json({ error: "Failed to fetch realtime data" }, { status: 500 });
  }
}
