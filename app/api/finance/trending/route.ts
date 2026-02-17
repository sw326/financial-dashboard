import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { getKrStockName } from "@/lib/kr-stock-names";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// 국장 종목 풀 확대 - 코스피200 주요 40개
const KR_STOCKS = [
  "005930.KS", // 삼성전자
  "000660.KS", // SK하이닉스
  "373220.KS", // LG에너지솔루션
  "207940.KS", // 삼성바이오로직스
  "005380.KS", // 현대차
  "000270.KS", // 기아
  "068270.KS", // 셀트리온
  "035420.KS", // NAVER
  "035720.KS", // 카카오
  "051910.KS", // LG화학
  "006400.KS", // 삼성SDI
  "028260.KS", // 삼성물산
  "105560.KS", // KB금융
  "055550.KS", // 신한지주
  "017670.KS", // SK텔레콤
  "003550.KS", // LG
  "034730.KS", // SK
  "015760.KS", // 한국전력
  "012330.KS", // 현대모비스
  "066570.KS", // LG전자
  "032830.KS", // 삼성생명
  "003670.KS", // 포스코홀딩스
  "086790.KS", // 하나금융지주
  "316140.KS", // 우리금융지주
  "010130.KS", // 고려아연
  "009150.KS", // 삼성전기
  "034020.KS", // 두산에너빌리티
  "018260.KS", // 삼성에스디에스
  "011200.KS", // HMM
  "352820.KS", // 하이브
  "247540.KS", // 에코프로비엠
  "042700.KQ", // 한미반도체 (코스닥)
  "377300.KQ", // 카카오페이 (코스닥)
  "263750.KS", // 펄어비스
  "036570.KS", // 엔씨소프트
  "259960.KS", // 크래프톤
  "000810.KS", // 삼성화재
  "030200.KS", // KT
  "033780.KS", // KT&G
  "096770.KS", // SK이노베이션
];

// 미장 주요 종목 (50개)
const US_STOCKS = [
  // Tech Giants
  "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA",
  // Semiconductors
  "AMD", "INTC", "QCOM", "AVGO", "MU", "AMAT", "LRCX",
  // Software & Cloud
  "CRM", "ORCL", "ADBE", "NOW", "SNOW", "PLTR",
  // E-commerce & Digital
  "SHOP", "SQ", "PYPL", "UBER", "ABNB", "DASH",
  // Finance
  "JPM", "BAC", "WFC", "GS", "MS", "V", "MA",
  // Healthcare
  "JNJ", "UNH", "PFE", "ABBV", "TMO", "LLY",
  // Consumer
  "WMT", "COST", "NKE", "SBUX", "MCD", "DIS",
  // Energy
  "XOM", "CVX", "COP",
  // Others
  "BA", "CAT", "GE",
];

interface QuoteData {
  symbol?: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  trailingPE?: number;
  priceToBook?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  trailingAnnualDividendYield?: number;
}

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  per?: number;
  pbr?: number;
  high52w?: number;
  low52w?: number;
  dividendYield?: number;
}

async function fetchQuotesBatch(symbols: string[]): Promise<StockData[]> {
  const batchSize = 10;
  const quotes: QuoteData[] = [];
  
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const batchPromises = batch.map((s) => yf.quote(s).catch(() => null));
    const batchResults = await Promise.all(batchPromises);
    quotes.push(...batchResults.filter(Boolean) as QuoteData[]);
  }

  return quotes
    .filter((q) => q && q.regularMarketPrice != null)
    .map((q) => ({
      symbol: q.symbol || "",
      name: getKrStockName(q.symbol || "", q.shortName || q.longName || q.symbol || ""),
      price: q.regularMarketPrice || 0,
      change: q.regularMarketChange || 0,
      changePercent: q.regularMarketChangePercent || 0,
      volume: q.regularMarketVolume || 0,
      marketCap: q.marketCap || 0,
      per: q.trailingPE || undefined,
      pbr: q.priceToBook || undefined,
      high52w: q.fiftyTwoWeekHigh || undefined,
      low52w: q.fiftyTwoWeekLow || undefined,
      dividendYield: q.trailingAnnualDividendYield 
        ? q.trailingAnnualDividendYield * 100 
        : undefined,
    }));
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tab = searchParams.get("tab") || "hot";
    const market = searchParams.get("market") || "all"; // all | us | kr
    const page = parseInt(searchParams.get("page") || "1", 10);
    const size = parseInt(searchParams.get("size") || "20", 10);

    let allStocks: StockData[] = [];

    // 미장 데이터 가져오기
    if (market === "us" || market === "all") {
      try {
        const usStocks = await fetchQuotesBatch(US_STOCKS);
        allStocks = allStocks.concat(usStocks);
      } catch (err) {
        console.error("US quotes error:", err);
      }
    }

    // 국장 데이터 가져오기
    if (market === "kr" || market === "all") {
      try {
        const krStocks = await fetchQuotesBatch(KR_STOCKS);
        allStocks = allStocks.concat(krStocks);
      } catch (err) {
        console.error("KR quotes error:", err);
      }
    }

    // 탭별 정렬
    switch (tab) {
      case "volume":
        allStocks.sort((a, b) => b.volume - a.volume);
        break;
      case "gainers":
        allStocks.sort((a, b) => b.changePercent - a.changePercent);
        break;
      case "losers":
        allStocks.sort((a, b) => a.changePercent - b.changePercent);
        break;
      case "hot":
      default:
        allStocks.sort((a, b) => b.marketCap - a.marketCap);
        break;
    }

    // 페이지네이션
    const total = allStocks.length;
    const startIdx = (page - 1) * size;
    const endIdx = startIdx + size;
    const pagedStocks = allStocks.slice(startIdx, endIdx);

    return NextResponse.json({
      stocks: pagedStocks,
      total,
      page,
      size,
    });
  } catch (error) {
    console.error("Trending API error:", error);
    return NextResponse.json({ error: "Failed to fetch trending stocks" }, { status: 500 });
  }
}
