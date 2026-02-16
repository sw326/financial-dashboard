import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
const cache = new Map<string, { data: unknown; ts: number }>();
const TTL = 5 * 60 * 1000; // 5 min

export async function GET(req: NextRequest) {
  const symbols = req.nextUrl.searchParams.get("symbols")?.split(",").filter(Boolean);
  if (!symbols?.length) return NextResponse.json({ error: "symbols required" }, { status: 400 });

  const key = symbols.sort().join(",");
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const results = await Promise.all(
      symbols.map(async (s) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const q: any = await yf.quote(s);
          return {
            symbol: q.symbol,
            name: q.shortName ?? q.longName ?? q.symbol,
            price: q.regularMarketPrice ?? 0,
            change: q.regularMarketChange ?? 0,
            changePercent: q.regularMarketChangePercent ?? 0,
            marketCap: q.marketCap,
            per: q.trailingPE,
            pbr: q.priceToBook,
            high52w: q.fiftyTwoWeekHigh,
            low52w: q.fiftyTwoWeekLow,
            dividendYield: q.dividendYield,
          };
        } catch {
          return { symbol: s, name: s, price: 0, change: 0, changePercent: 0 };
        }
      })
    );
    cache.set(key, { data: results, ts: Date.now() });
    return NextResponse.json(results);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
