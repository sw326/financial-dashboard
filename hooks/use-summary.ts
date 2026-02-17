import { useQuery } from "@tanstack/react-query";

export interface StockSummary {
  // 기본 시세
  dayHigh?: number;
  dayLow?: number;
  open?: number;
  prevClose?: number;
  volume?: number;
  avgVolume?: number;
  avgVolume10d?: number;
  marketCap?: number;
  beta?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;

  // 밸류에이션
  trailingPE?: number;
  forwardPE?: number;
  priceToSales?: number;
  priceToBook?: number;
  enterpriseValue?: number;
  enterpriseToRevenue?: number;
  enterpriseToEbitda?: number;

  // 배당
  dividendRate?: number;
  dividendYield?: number;
  exDividendDate?: string;
  payoutRatio?: number;
  fiveYearAvgDividendYield?: number;

  // 재무
  totalRevenue?: number;
  revenuePerShare?: number;
  grossProfits?: number;
  ebitda?: number;
  netIncome?: number;
  profitMargins?: number;
  operatingMargins?: number;
  returnOnAssets?: number;
  returnOnEquity?: number;
  totalCash?: number;
  totalCashPerShare?: number;
  totalDebt?: number;
  debtToEquity?: number;
  currentRatio?: number;
  quickRatio?: number;
  freeCashflow?: number;
  operatingCashflow?: number;
  earningsGrowth?: number;
  revenueGrowth?: number;

  // 애널리스트
  targetHighPrice?: number;
  targetLowPrice?: number;
  targetMeanPrice?: number;
  targetMedianPrice?: number;
  recommendationKey?: string;
  numberOfAnalystOpinions?: number;

  // 주주 구성
  heldPercentInsiders?: number;
  heldPercentInstitutions?: number;
  floatShares?: number;
  sharesOutstanding?: number;

  // 실적 일정
  earningsDate?: string;
  dividendDate?: string;

  // 기타
  lastSplitFactor?: string;
  lastSplitDate?: number;
  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;
  currency?: string;
}

export function useSummary(symbol: string) {
  return useQuery({
    queryKey: ["summary", symbol],
    queryFn: async () => {
      const res = await fetch(`/api/finance/summary?symbol=${encodeURIComponent(symbol)}`);
      if (!res.ok) throw new Error("Failed to fetch summary");
      return res.json() as Promise<StockSummary>;
    },
    enabled: !!symbol,
    staleTime: 1000 * 60 * 5,
  });
}
