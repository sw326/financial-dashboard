import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { getKrStockName } from "@/lib/kr-stock-names";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const ALLOWED_TYPES = new Set(["EQUITY", "INDEX", "ETF"]);

interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
}

// 한글 포함 여부 체크
function hasKorean(s: string): boolean {
  return /[가-힣]/.test(s);
}

// 네이버 자동완성 API로 국장 종목 검색 (한글/종목코드 모두 지원)
async function searchNaver(q: string): Promise<SearchResult[]> {
  try {
    const url = `https://ac.stock.naver.com/ac?q=${encodeURIComponent(q)}&target=stock`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const items = (data.items || []) as {
      code: string;
      name: string;
      typeCode: string;
      nationCode: string;
    }[];
    return items
      .filter((item) => item.nationCode === "KOR") // 국내 종목만
      .slice(0, 10)
      .map((item) => ({
        symbol: `${item.code}.${item.typeCode === "KOSDAQ" ? "KQ" : "KS"}`,
        name: item.name,
        type: "EQUITY",
        exchange: item.typeCode || "KOSPI",
      }));
  } catch {
    return [];
  }
}

// Yahoo Finance API로 해외 종목 검색 (영문만)
async function searchYahoo(q: string): Promise<SearchResult[]> {
  try {
    const data = await yf.search(q);
    return (data.quotes || [])
      .filter(
        (quote): quote is Extract<typeof quote, { isYahooFinance: true }> =>
          "quoteType" in quote && ALLOWED_TYPES.has(String(quote.quoteType))
      )
      .filter((quote) => {
        // KR 종목은 네이버에서 가져오므로 제외
        const sym = String(quote.symbol);
        return !sym.endsWith(".KS") && !sym.endsWith(".KQ");
      })
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
    return [];
  }
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    // 한글 → 네이버만, 영문 → 네이버 + Yahoo 병렬
    const isKorean = hasKorean(q);
    const [naverResults, yahooResults] = await Promise.all([
      searchNaver(q),
      isKorean ? Promise.resolve([]) : searchYahoo(q),
    ]);

    // 병합 (네이버 국장 우선, 그 뒤 해외)
    const seen = new Set<string>();
    const merged: SearchResult[] = [];
    for (const r of [...naverResults, ...yahooResults]) {
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
