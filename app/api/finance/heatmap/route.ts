import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { getKrStockName } from "@/lib/kr-stock-names";
import { US_SECTORS } from "@/lib/us-sectors";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const NAVER_API = "https://m.stock.naver.com/api/stocks";

interface HeatmapStock {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  marketCap: number;
  market: string;
  sector?: string;
}

// 업종-종목 매핑 캐시 (5분)
let sectorCache: { map: Map<string, string>; ts: number } | null = null;
const SECTOR_CACHE_TTL = 5 * 60 * 1000;

// 네이버 업종 API에서 종목→업종 매핑 구축
async function buildSectorMap(): Promise<Map<string, string>> {
  if (sectorCache && Date.now() - sectorCache.ts < SECTOR_CACHE_TTL) {
    return sectorCache.map;
  }

  const map = new Map<string, string>();

  try {
    // 1. 업종 목록 가져오기
    const listRes = await fetch(`${NAVER_API}/industry`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!listRes.ok) return map;
    const listData = await listRes.json();
    const groups: { no: string; name: string; totalCount: number }[] =
      listData.groups || [];

    // 상위 25개 업종 (totalCount 기준 정렬)
    const topGroups = groups
      .sort((a, b) => b.totalCount - a.totalCount)
      .slice(0, 25);

    // 2. 병렬로 각 업종의 종목 목록 가져오기
    const results = await Promise.all(
      topGroups.map(async (g) => {
        try {
          const res = await fetch(
            `${NAVER_API}/industry/${g.no}?page=1&pageSize=100`,
            { headers: { "User-Agent": "Mozilla/5.0" } }
          );
          if (!res.ok) return [];
          const data = await res.json();
          return (data.stocks || []).map(
            (s: { itemCode: string }) => ({
              code: s.itemCode,
              sector: g.name,
            })
          );
        } catch {
          return [];
        }
      })
    );

    for (const stocks of results) {
      for (const s of stocks) {
        if (!map.has(s.code)) {
          map.set(s.code, s.sector);
        }
      }
    }
  } catch (e) {
    console.error("Sector map build error:", e);
  }

  sectorCache = { map, ts: Date.now() };
  return map;
}

// 네이버 API에서 코스피 시총 상위 200개
async function fetchKrStocks(): Promise<HeatmapStock[]> {
  // 시총 100개와 섹터 매핑을 병렬로 가져옴
  const [stockPages, sectorMap] = await Promise.all([
    Promise.all(
      [1].map(async (page) => {
        try {
          const res = await fetch(
            `${NAVER_API}/marketValue?page=${page}&pageSize=100`,
            {
              headers: { "User-Agent": "Mozilla/5.0" },
              next: { revalidate: 300 },
            }
          );
          if (!res.ok) return [];
          const data = await res.json();
          return data.stocks || [];
        } catch (e) {
          console.error(`KR heatmap page ${page} error:`, e);
          return [];
        }
      })
    ),
    buildSectorMap(),
  ]);

  const results: HeatmapStock[] = [];
  for (const stocks of stockPages) {
    for (const s of stocks) {
      const pct = parseFloat(s.fluctuationsRatio || "0");

      let mcap = 0;
      const cleaned = (s.marketValueHangeul || "").replace(/,/g, "");
      const mJo = cleaned.match(/([\d.]+)조/);
      const mEok = cleaned.match(/([\d.]+)억/);
      if (mJo) mcap += parseFloat(mJo[1]) * 1e12;
      if (mEok) mcap += parseFloat(mEok[1]) * 1e8;

      const code = s.itemCode as string;
      const sector = sectorMap.get(code) || "기타";

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
  }

  return results;
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
