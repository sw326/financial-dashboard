import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { getKrStockName } from "@/lib/kr-stock-names";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const NAVER_API = "https://m.stock.naver.com/api/stocks";

interface HeatmapStock {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  marketCap: number;
  market: string;
}

// 네이버 API에서 코스피 시총 상위 200개
async function fetchKrStocks(): Promise<HeatmapStock[]> {
  const results: HeatmapStock[] = [];

  for (const page of [1, 2]) {
    try {
      const res = await fetch(
        `${NAVER_API}/marketValue?page=${page}&pageSize=100`,
        {
          headers: { "User-Agent": "Mozilla/5.0" },
          next: { revalidate: 300 }, // 5분 캐시
        }
      );
      if (!res.ok) continue;
      const data = await res.json();
      for (const s of data.stocks || []) {
        const isFalling =
          s.compareToPreviousPrice?.name === "FALLING" ||
          s.compareToPreviousPrice?.name === "LOWER_LIMIT" ||
          s.compareToPreviousPrice?.code === "5" ||
          s.compareToPreviousPrice?.code === "2";
        const pct = parseFloat(s.fluctuationsRatio || "0");

        // marketValueHangeul → number
        let mcap = 0;
        const m = (s.marketValueHangeul || "").match(/([\d.]+)(억|조)원?/);
        if (m) {
          mcap = parseFloat(m[1]) * (m[2] === "조" ? 1e12 : 1e8);
        }

        results.push({
          symbol: `${s.itemCode}.${s.stockExchangeType?.name === "KOSDAQ" ? "KQ" : "KS"}`,
          name: s.stockName,
          price: Number((s.closePrice || "0").replace(/,/g, "")) || 0,
          changePercent: isFalling ? -Math.abs(pct) : pct,
          marketCap: mcap,
          market: s.stockExchangeType?.name === "KOSDAQ" ? "KOSDAQ" : "KOSPI",
        });
      }
    } catch (e) {
      console.error(`KR heatmap page ${page} error:`, e);
    }
  }

  return results;
}

// Yahoo Finance에서 미장 시총 상위 (batch quote)
const US_TOP_SYMBOLS = [
  // Mega cap
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
        allQuotes.push({
          symbol: q.symbol || "",
          name: getKrStockName(q.symbol || "", q.shortName || q.longName || q.symbol || ""),
          price: q.regularMarketPrice || 0,
          changePercent: q.regularMarketChangePercent || 0,
          marketCap: q.marketCap || 0,
          market: "US",
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
