import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// 주요 한국/미국 종목 리스트 (하드코딩)
const MAJOR_STOCKS = [
  "005930.KS", // 삼성전자
  "000660.KS", // SK하이닉스
  "035420.KS", // NAVER
  "035720.KS", // 카카오
  "051910.KS", // LG화학
  "006400.KS", // 삼성SDI
  "207940.KS", // 삼성바이오로직스
  "068270.KS", // 셀트리온
  "005380.KS", // 현대차
  "000270.KS", // 기아
  "012330.KS", // 현대모비스
  "028260.KS", // 삼성물산
  "105560.KS", // KB금융
  "055550.KS", // 신한지주
  "017670.KS", // SK텔레콤
  "AAPL",      // Apple
  "MSFT",      // Microsoft
  "GOOGL",     // Alphabet
  "AMZN",      // Amazon
  "NVDA",      // NVIDIA
  "TSLA",      // Tesla
  "META",      // Meta
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tab = searchParams.get("tab") || "hot";

    // 모든 주요 종목의 quote 개별 조회 (v3에서는 배열 지원 불안정)
    const quotePromises = MAJOR_STOCKS.map((s) => yf.quote(s).catch(() => null));
    const quotes = (await Promise.all(quotePromises)).filter(Boolean);

    // 유효한 데이터만 필터링
    const validQuotes = (quotes as QuoteData[])
      .filter((q) => q && q.regularMarketPrice != null)
      .map((q) => ({
        symbol: q.symbol || "",
        name: q.shortName || q.longName || q.symbol || "",
        price: q.regularMarketPrice || 0,
        change: q.regularMarketChange || 0,
        changePercent: q.regularMarketChangePercent || 0,
        volume: q.regularMarketVolume || 0,
        marketCap: q.marketCap || 0,
        per: q.trailingPE || undefined,
        pbr: q.priceToBook || undefined,
        high52w: q.fiftyTwoWeekHigh || undefined,
        low52w: q.fiftyTwoWeekLow || undefined,
        dividendYield: q.trailingAnnualDividendYield ? q.trailingAnnualDividendYield * 100 : undefined,
      }));

    // 탭에 따라 정렬
    const sorted = [...validQuotes];
    switch (tab) {
      case "volume":
        sorted.sort((a, b) => b.volume - a.volume);
        break;
      case "gainers":
        sorted.sort((a, b) => b.changePercent - a.changePercent);
        break;
      case "losers":
        sorted.sort((a, b) => a.changePercent - b.changePercent);
        break;
      case "hot":
      default:
        // 기본: 시가총액 순
        sorted.sort((a, b) => b.marketCap - a.marketCap);
        break;
    }

    return NextResponse.json(sorted);
  } catch (error) {
    console.error("Trending API error:", error);
    return NextResponse.json({ error: "Failed to fetch trending stocks" }, { status: 500 });
  }
}
