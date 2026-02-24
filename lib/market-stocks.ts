/**
 * 공유 종목 유틸 — trending route + interests route 공용 (HTTP 내부 호출 제거)
 */
import YahooFinance from "yahoo-finance2";
import { getKrStockName } from "@/lib/kr-stock-names";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export const KR_STOCKS = [
  "005930.KS", "000660.KS", "373220.KS", "207940.KS", "005380.KS",
  "000270.KS", "068270.KS", "035420.KS", "035720.KS", "051910.KS",
  "006400.KS", "028260.KS", "105560.KS", "055550.KS", "017670.KS",
  "003550.KS", "034730.KS", "015760.KS", "012330.KS", "066570.KS",
  "032830.KS", "003670.KS", "086790.KS", "316140.KS", "010130.KS",
  "009150.KS", "034020.KS", "018260.KS", "011200.KS", "352820.KS",
  "247540.KS", "042700.KQ", "377300.KQ", "263750.KS", "036570.KS",
  "259960.KS", "000810.KS", "030200.KS", "033780.KS", "096770.KS",
];

export const US_STOCKS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA",
  "AMD", "INTC", "QCOM", "AVGO", "MU", "AMAT", "LRCX",
  "CRM", "ORCL", "ADBE", "NOW", "SNOW", "PLTR",
  "SHOP", "SQ", "PYPL", "UBER", "ABNB", "DASH",
  "JPM", "BAC", "WFC", "GS", "MS", "V", "MA",
  "JNJ", "UNH", "PFE", "ABBV", "TMO", "LLY",
  "WMT", "COST", "NKE", "SBUX", "MCD", "DIS",
  "XOM", "CVX", "COP", "BA", "CAT", "GE",
];

export interface StockData {
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
  isKR?: boolean;
}

export async function fetchQuotesBatch(symbols: string[]): Promise<StockData[]> {
  const batchSize = 10;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quotes: any[] = [];
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const res = await Promise.all(batch.map((s) => yf.quote(s).catch(() => null)));
    quotes.push(...res.filter(Boolean));
  }
  return quotes
    .filter((q) => q?.regularMarketPrice != null)
    .map((q) => ({
      symbol: q.symbol ?? "",
      name: getKrStockName(q.symbol ?? "", q.shortName ?? q.longName ?? q.symbol ?? ""),
      price: q.regularMarketPrice ?? 0,
      change: q.regularMarketChange ?? 0,
      changePercent: q.regularMarketChangePercent ?? 0,
      volume: q.regularMarketVolume ?? 0,
      marketCap: q.marketCap ?? 0,
      per: q.trailingPE || undefined,
      pbr: q.priceToBook || undefined,
      high52w: q.fiftyTwoWeekHigh || undefined,
      low52w: q.fiftyTwoWeekLow || undefined,
      dividendYield: q.trailingAnnualDividendYield ? q.trailingAnnualDividendYield * 100 : undefined,
      isKR: (q.symbol ?? "").endsWith(".KS") || (q.symbol ?? "").endsWith(".KQ"),
    }));
}

/** 인기 국장 종목 (시가총액 내림차순) — cold start 피드용 */
export async function getHotKrStocks(limit: number, offset = 0): Promise<StockData[]> {
  const stocks = await fetchQuotesBatch(KR_STOCKS);
  return stocks
    .filter((s) => s.price > 0)
    .sort((a, b) => b.marketCap - a.marketCap)
    .slice(offset, offset + limit);
}
