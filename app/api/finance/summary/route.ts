import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { getKrStockName } from "@/lib/kr-stock-names";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// 재무 데이터 — 30분 캐시 (자주 안 변함)
const cache = new Map<string, { data: unknown; expiresAt: number }>();
const TTL = 30 * 60_000;

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  const now = Date.now();
  const hit = cache.get(symbol);
  if (hit && hit.expiresAt > now) return NextResponse.json(hit.data);

  try {
    const data = await yf.quoteSummary(symbol, {
      modules: [
        "summaryDetail",
        "defaultKeyStatistics",
        "financialData",
        "calendarEvents",
        "earningsTrend",
      ],
    });

    const sd = data.summaryDetail;
    const ks = data.defaultKeyStatistics;
    const fd = data.financialData;
    const ce = data.calendarEvents;

    const result = {
      // 기본 시세
      dayHigh: sd?.dayHigh ?? sd?.regularMarketDayHigh,
      dayLow: sd?.dayLow ?? sd?.regularMarketDayLow,
      open: sd?.open ?? sd?.regularMarketOpen,
      prevClose: sd?.previousClose ?? sd?.regularMarketPreviousClose,
      volume: sd?.volume ?? sd?.regularMarketVolume,
      avgVolume: sd?.averageVolume,
      avgVolume10d: sd?.averageVolume10days,
      marketCap: sd?.marketCap,
      beta: sd?.beta ?? ks?.beta,
      fiftyTwoWeekHigh: sd?.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: sd?.fiftyTwoWeekLow,

      // 밸류에이션
      trailingPE: sd?.trailingPE,
      forwardPE: ks?.forwardPE,
      priceToSales: sd?.priceToSalesTrailing12Months,
      priceToBook: ks?.priceToBook,
      enterpriseValue: ks?.enterpriseValue,
      enterpriseToRevenue: ks?.enterpriseToRevenue,
      enterpriseToEbitda: ks?.enterpriseToEbitda,

      // 배당
      dividendRate: sd?.dividendRate,
      dividendYield: sd?.dividendYield,
      exDividendDate: sd?.exDividendDate,
      payoutRatio: sd?.payoutRatio,
      fiveYearAvgDividendYield: sd?.fiveYearAvgDividendYield,

      // 재무
      totalRevenue: fd?.totalRevenue,
      revenuePerShare: fd?.revenuePerShare,
      grossProfits: fd?.grossProfits,
      ebitda: fd?.ebitda,
      netIncome: ks?.netIncomeToCommon,
      profitMargins: ks?.profitMargins,
      operatingMargins: fd?.operatingMargins,
      returnOnAssets: fd?.returnOnAssets,
      returnOnEquity: fd?.returnOnEquity,
      totalCash: fd?.totalCash,
      totalCashPerShare: fd?.totalCashPerShare,
      totalDebt: fd?.totalDebt,
      debtToEquity: fd?.debtToEquity,
      currentRatio: fd?.currentRatio,
      quickRatio: fd?.quickRatio,
      freeCashflow: fd?.freeCashflow,
      operatingCashflow: fd?.operatingCashflow,
      earningsGrowth: fd?.earningsGrowth,
      revenueGrowth: fd?.revenueGrowth,

      // 애널리스트
      targetHighPrice: fd?.targetHighPrice,
      targetLowPrice: fd?.targetLowPrice,
      targetMeanPrice: fd?.targetMeanPrice,
      targetMedianPrice: fd?.targetMedianPrice,
      recommendationKey: fd?.recommendationKey,
      numberOfAnalystOpinions: fd?.numberOfAnalystOpinions,

      // 주주 구성
      heldPercentInsiders: ks?.heldPercentInsiders,
      heldPercentInstitutions: ks?.heldPercentInstitutions,
      floatShares: ks?.floatShares,
      sharesOutstanding: ks?.sharesOutstanding,

      // 실적 일정
      earningsDate: ce?.earnings?.earningsDate?.[0],
      dividendDate: ce?.dividendDate,

      // 기타
      lastSplitFactor: ks?.lastSplitFactor,
      lastSplitDate: ks?.lastSplitDate,
      fiftyDayAverage: sd?.fiftyDayAverage,
      twoHundredDayAverage: sd?.twoHundredDayAverage,
      currency: sd?.currency || "KRW",
    };

    cache.set(symbol, { data: result, expiresAt: now + TTL });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Summary API error:", error);
    return NextResponse.json({ error: "Failed to fetch summary" }, { status: 500 });
  }
}
