import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { KR_STOCK_NAMES, getKrStockName } from "@/lib/kr-stock-names";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const ALLOWED_TYPES = new Set(["EQUITY", "INDEX", "ETF"]);

// 한글 포함 여부 체크
function hasKorean(s: string): boolean {
  return /[가-힣]/.test(s);
}

// 로컬 KR 매핑에서 한글 이름 검색
function searchLocalKr(q: string): { symbol: string; name: string; type: string; exchange: string }[] {
  const lower = q.toLowerCase();
  return Object.entries(KR_STOCK_NAMES)
    .filter(([symbol, name]) =>
      name.toLowerCase().includes(lower) || symbol.toLowerCase().includes(lower)
    )
    .map(([symbol, name]) => ({
      symbol,
      name,
      type: "EQUITY",
      exchange: symbol.endsWith(".KQ") ? "KOSDAQ" : "KOSPI",
    }));
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    // 1. 항상 로컬 KR 매핑에서 검색
    const localResults = searchLocalKr(q);

    // 2. Yahoo API는 한글이 아닐 때만 (한글 검색 미지원)
    let yahooResults: typeof localResults = [];
    if (!hasKorean(q)) {
      try {
        const data = await yf.search(q);
        yahooResults = (data.quotes || [])
          .filter((quote): quote is Extract<typeof quote, { isYahooFinance: true }> =>
            "quoteType" in quote && ALLOWED_TYPES.has(String(quote.quoteType))
          )
          .slice(0, 10)
          .map((quote) => {
            const symbol = String(quote.symbol);
            const shortname = quote.shortname ? String(quote.shortname) : undefined;
            const longname = quote.longname ? String(quote.longname) : undefined;
            return {
              symbol,
              name: getKrStockName(symbol, shortname || longname || symbol),
              type: String(quote.quoteType),
              exchange: String(quote.exchange),
            };
          });
      } catch {
        // Yahoo API 실패 시 로컬 결과만 사용
      }
    }

    // 3. 병합 (로컬 우선, 중복 제거)
    const seen = new Set<string>();
    const merged = [];
    for (const r of [...localResults, ...yahooResults]) {
      if (!seen.has(r.symbol)) {
        seen.add(r.symbol);
        merged.push(r);
      }
    }

    return NextResponse.json({ results: merged.slice(0, 15) });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
