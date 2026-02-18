import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { getKrStockName } from "@/lib/kr-stock-names";
import { US_SECTORS } from "@/lib/us-sectors";
import { getKrSector, INDUSTRY_CODE_MAP } from "@/lib/kr-sectors";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const NAVER_API = "https://m.stock.naver.com/api";

interface HeatmapStock {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  marketCap: number;
  market: string;
  sector?: string;
}

// 네이버 개별 종목 API에서 업종코드 조회 (캐시 24시간)
const sectorCache = new Map<string, { sector: string; timestamp: number }>();
const SECTOR_CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간

async function fetchSectorFromNaver(code: string): Promise<string | null> {
  // 캐시 확인
  const cached = sectorCache.get(code);
  if (cached && Date.now() - cached.timestamp < SECTOR_CACHE_TTL) {
    return cached.sector;
  }

  try {
    const res = await fetch(`${NAVER_API}/stock/${code}/integration`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const industryCode = data.industryCode;
    if (industryCode && INDUSTRY_CODE_MAP[industryCode]) {
      const sector = INDUSTRY_CODE_MAP[industryCode];
      sectorCache.set(code, { sector, timestamp: Date.now() });
      return sector;
    }
    return null;
  } catch {
    return null;
  }
}

// 네이버 API에서 코스피 시총 상위 100개 (ETF 제외)
async function fetchKrStocks(): Promise<HeatmapStock[]> {
  try {
    // ETF 제외 후에도 100개 확보하기 위해 넉넉히 가져옴
    const res = await fetch(
      `${NAVER_API}/stocks/marketValue?page=1&pageSize=150`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 300 },
      }
    );
    if (!res.ok) {
      console.error("KR heatmap: naver API responded", res.status);
      return [];
    }
    const data = await res.json();
    const stocks = data.stocks || [];
    console.log(`KR heatmap: fetched ${stocks.length} stocks, first stockEndType: ${stocks[0]?.stockEndType}`);

    // ETF 필터링: stockEndType이 "stock"인 것만 (etf 제외)
    // fallback: stockEndType 필드 없으면 종목명 prefix로 필터링
    const hasEndType = stocks.length > 0 && stocks[0]?.stockEndType;
    const ETF_PREFIXES = ["KODEX", "TIGER", "KBSTAR", "ARIRANG", "ACE", "HANARO", "SOL", "KOSEF"];
    const filteredStocks = hasEndType
      ? stocks.filter((s: { stockEndType?: string }) => s.stockEndType === "stock")
      : stocks.filter((s: { stockName?: string }) => !ETF_PREFIXES.some(p => (s.stockName || "").startsWith(p)));

    const results: HeatmapStock[] = [];
    // 하드코딩 매핑이 없는 종목들만 API 조회 (병렬 처리)
    const unmappedCodes: string[] = [];
    
    for (const s of filteredStocks.slice(0, 100)) {
      const code = s.itemCode as string;
      if (!getKrSector(code)) {
        unmappedCodes.push(code);
      }
    }

    // 매핑 없는 종목들 병렬로 업종 조회 (최대 20개씩)
    const BATCH_SIZE = 20;
    for (let i = 0; i < unmappedCodes.length; i += BATCH_SIZE) {
      const batch = unmappedCodes.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map((code) => fetchSectorFromNaver(code)));
    }

    for (const s of filteredStocks.slice(0, 100)) {
      const pct = parseFloat(s.fluctuationsRatio || "0");

      let mcap = 0;
      const cleaned = (s.marketValueHangeul || "").replace(/,/g, "");
      const mJo = cleaned.match(/([\d.]+)조/);
      const mEok = cleaned.match(/([\d.]+)억/);
      if (mJo) mcap += parseFloat(mJo[1]) * 1e12;
      if (mEok) mcap += parseFloat(mEok[1]) * 1e8;

      const code = s.itemCode as string;
      // 1. 하드코딩 매핑 우선
      // 2. 없으면 네이버 API에서 조회한 캐시 사용
      // 3. 그래도 없으면 "기타"
      let sector = getKrSector(code);
      if (!sector) {
        const cached = sectorCache.get(code);
        sector = cached?.sector || "기타";
      }

      results.push({
        symbol: `${code}.${s.stockExchangeType?.name === "KOSDAQ" ? "KQ" : "KS"}`,
        name: s.stockName,
        price: Number((s.closePrice || "0").replace(/,/g, "")) || 0,
        changePercent: pct,
        marketCap: mcap,
        market: s.stockExchangeType?.name === "KOSDAQ" ? "KOSDAQ" : "KOSPI",
        sector,
      });
    }

    return results;
  } catch (e) {
    console.error("KR heatmap error:", e);
    return [];
  }
}

// Yahoo Finance에서 미장 시총 상위 (batch quote)
const US_TOP_SYMBOLS = [
  "AAPL","MSFT","GOOGL","AMZN","NVDA","META","TSLA","BRK-B","LLY","AVGO",
  "JPM","V","UNH","MA","XOM","COST","HD","PG","JNJ","ABBV",
  "WMT","NFLX","BAC","CRM","ORCL","CVX","MRK","KO","AMD","PEP",
  "TMO","LIN","ADBE","ACN","MCD","CSCO","ABT","WFC","PM","NOW",
  "GE","ISRG","IBM","INTU","CAT","VZ","AMGN","QCOM","TXN","AMAT",
  "GS","BKNG","T","MS","AXP","BLK","BA","SPGI","PLTR","UBER",
  "PFE","RTX","GILD","DE","NEE","SYK","PANW","LOW","MDT","SCHW",
  "DIS","INTC","COP","BMY","UNP","CMCSA","HON","CRWD","MU","LRCX",
  "SLB","CB","ETN","BSX","SO","PLD","SNOW","CME","ICE","ABNB",
  "KLAC","ANET","APH","GD","D","WM","COF","DASH","BX","CI",
];

async function fetchUsStocks(): Promise<HeatmapStock[]> {
  try {
    const batchSize = 20;
    const allQuotes: HeatmapStock[] = [];

    for (let i = 0; i < US_TOP_SYMBOLS.length; i += batchSize) {
      const batch = US_TOP_SYMBOLS.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map((sym) => yf.quote(sym).catch(() => null))
      );
      for (const q of results) {
        if (!q || !q.regularMarketPrice) continue;
        const sym = q.symbol || "";
        allQuotes.push({
          symbol: sym,
          name: getKrStockName(sym, q.shortName || q.longName || sym),
          price: q.regularMarketPrice || 0,
          changePercent: q.regularMarketChangePercent || 0,
          marketCap: q.marketCap || 0,
          market: "US",
          sector: US_SECTORS[sym] || "Other",
        });
      }
    }

    return allQuotes;
  } catch (e) {
    console.error("US heatmap error:", e);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const market = request.nextUrl.searchParams.get("market") || "all";

  try {
    const [krStocks, usStocks] = await Promise.all([
      market === "us" ? Promise.resolve([]) : fetchKrStocks(),
      market === "kr" ? Promise.resolve([]) : fetchUsStocks(),
    ]);

    const stocks = [...krStocks, ...usStocks].sort(
      (a, b) => b.marketCap - a.marketCap
    );

    return NextResponse.json({ stocks, total: stocks.length });
  } catch (error) {
    console.error("Heatmap API error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
