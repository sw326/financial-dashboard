import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { getKrStockName } from "@/lib/kr-stock-names";
import { US_SECTORS } from "@/lib/us-sectors";
import { getKrSector } from "@/lib/kr-sectors";

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

// 네이버 API에서 코스피 시총 상위 100개 (업종 매핑은 KRX 하드코딩 사용)
async function fetchKrStocks(): Promise<HeatmapStock[]> {
  try {
    const res = await fetch(
      `${NAVER_API}/marketValue?page=1&pageSize=100`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 300 },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const stocks = data.stocks || [];

    const results: HeatmapStock[] = [];
    for (const s of stocks) {
      const pct = parseFloat(s.fluctuationsRatio || "0");

      let mcap = 0;
      const cleaned = (s.marketValueHangeul || "").replace(/,/g, "");
      const mJo = cleaned.match(/([\d.]+)조/);
      const mEok = cleaned.match(/([\d.]+)억/);
      if (mJo) mcap += parseFloat(mJo[1]) * 1e12;
      if (mEok) mcap += parseFloat(mEok[1]) * 1e8;

      const code = s.itemCode as string;
      // KRX 하드코딩 매핑 사용 (네이버 업종 API 대신)
      const sector = getKrSector(code) || "기타";

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
