"use client";

import { use, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// ToggleGroup removed - using Button group instead
import { TrendingUp, TrendingDown, BarChart3, Activity, Target, Landmark, PiggyBank, Users } from "lucide-react";
import type { StockQuote } from "@/lib/types";
import { useQuotes } from "@/hooks/use-quotes";
import { useChart } from "@/hooks/use-chart";
import { useSummary, type StockSummary } from "@/hooks/use-summary";
import { useRealtime } from "@/hooks/use-realtime";
import { isKrMarketOpen, isUsMarketOpen } from "@/lib/market-hours";
import { LightweightChart, MA_COLORS } from "@/components/lightweight-chart";

const MINUTE_OPTIONS = [
  { value: "1m", label: "1분" },
  { value: "3m", label: "3분" },
  { value: "5m", label: "5분" },
  { value: "10m", label: "10분" },
  { value: "15m", label: "15분" },
  { value: "30m", label: "30분" },
  { value: "60m", label: "60분" },
];

const PERIOD_OPTIONS = [
  { value: "1d", label: "일" },
  { value: "1wk", label: "주" },
  { value: "1mo", label: "월" },
  { value: "1y", label: "년" },
];

const isMinutePeriod = (p: string) => MINUTE_OPTIONS.some((m) => m.value === p);

interface Props {
  params: Promise<{ symbol: string }>;
}

export default function StockDetailPage({ params }: Props) {
  const resolvedParams = use(params);
  const symbol = decodeURIComponent(resolvedParams.symbol);
  return <StockDetailContent symbol={symbol} />;
}

// === 유틸 ===
const color = (v: number) => (v >= 0 ? "text-[var(--color-up)]" : "text-[var(--color-down)]");
const sign = (v: number) => (v >= 0 ? "+" : "");
const fmt = (v?: number, digits = 2) =>
  v != null ? v.toLocaleString(undefined, { maximumFractionDigits: digits }) : "-";
const fmtKrw = (v?: number) => {
  if (v == null) return "-";
  if (Math.abs(v) >= 1e12) return (v / 1e12).toFixed(1) + "조";
  if (Math.abs(v) >= 1e8) return (v / 1e8).toFixed(0) + "억";
  if (Math.abs(v) >= 1e4) return (v / 1e4).toFixed(0) + "만";
  return v.toLocaleString();
};
const pct = (v?: number) => (v != null ? (v * 100).toFixed(2) + "%" : "-");
const fmtDate = (v?: string | number) => {
  if (!v) return "-";
  const d = new Date(typeof v === "number" ? v * 1000 : v);
  return d.toLocaleDateString("ko-KR");
};

// === 종목정보 행 ===
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}

function StockDetailContent({ symbol }: { symbol: string }) {
  const [period, setPeriod] = useState("1mo");
  const [chartType, setChartType] = useState<"candle" | "line" | "area">("candle");
  const [maLines, setMaLines] = useState<number[]>([5, 20, 60]);

  const isMinute = isMinutePeriod(period);
  const minuteValue = isMinute ? period : "1m";

  const { data: quoteData = [], isLoading: quoteLoading, error: quoteError } = useQuotes([symbol]);
  const { data: chartData = [], isLoading: chartLoading } = useChart(symbol, period);
  const { data: summary, isLoading: summaryLoading } = useSummary(symbol);
  const { data: realtime } = useRealtime(symbol);

  const isKr = symbol.endsWith(".KS") || symbol.endsWith(".KQ");
  const isMarketOpen = isKr ? isKrMarketOpen() : isUsMarketOpen();

  const toggleMA = (p: number) => {
    setMaLines((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const quote = quoteData.length > 0 ? (quoteData[0] as unknown as StockQuote) : null;
  const error = quoteError ? "데이터 로딩 실패" : (!quote && !quoteLoading ? "종목을 찾을 수 없습니다" : "");

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{symbol}</h1>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (quoteLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!quote) {
    return <p className="text-muted-foreground text-center py-12">종목 정보를 불러올 수 없습니다</p>;
  }

  const isKRW = summary?.currency === "KRW";
  const unit = isKRW ? "원" : "$";
  const fmtPrice = (v?: number) => v != null ? (isKRW ? fmtKrw(v) + "원" : "$" + fmt(v)) : "-";
  const fmtBigNum = (v?: number) => v != null ? (fmtKrw(v) + (isKRW ? "원" : "$")) : "-";
  const fmtX = (v?: number) => v != null ? fmt(v) + "배" : "-"; // PER, PBR 등 배수

  return (
    <div className="space-y-6">
      {/* 기본 정보 헤더 */}
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div className="space-y-2">
            <CardDescription>{quote.symbol}</CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">
              {fmt(realtime?.price ?? quote.price)}
              {isMarketOpen && <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse ml-2 align-middle" />}
            </CardTitle>
            <div className="text-lg font-medium">{quote.name}</div>
          </div>
          <CardAction>
            <Badge variant="outline" className={`text-sm ${color(quote.change)}`}>
              {quote.change >= 0 ? <TrendingUp className="size-4 mr-1" /> : <TrendingDown className="size-4 mr-1" />}
              {sign(quote.change)}{quote.change.toFixed(2)} ({sign(quote.changePercent)}{quote.changePercent.toFixed(2)}%)
            </Badge>
          </CardAction>
        </CardHeader>
      </Card>

      {/* 탭 */}
      <Tabs defaultValue="chart">
        <TabsList>
          <TabsTrigger value="chart">차트</TabsTrigger>
          <TabsTrigger value="overview">종목정보</TabsTrigger>
          <TabsTrigger value="financials">재무</TabsTrigger>
          <TabsTrigger value="dividend">배당</TabsTrigger>
        </TabsList>

        {/* === 차트 탭 === */}
        <TabsContent value="chart" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Select value={minuteValue} onValueChange={(v) => setPeriod(v)} onOpenChange={(open) => { if (open && !isMinute) setPeriod("1m"); }}>
                <SelectTrigger className="w-[80px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MINUTE_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                {PERIOD_OPTIONS.map((p) => (
                  <Button
                    key={p.value}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "rounded-md text-xs h-7 px-3",
                      !isMinute && period === p.value && "bg-background shadow-sm"
                    )}
                    onClick={() => setPeriod(p.value)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {[
                { value: "candle" as const, icon: BarChart3, title: "캔들" },
                { value: "line" as const, icon: TrendingUp, title: "라인" },
                { value: "area" as const, icon: Activity, title: "영역" },
              ].map((ct) => (
                <Button
                  key={ct.value}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "rounded-md text-xs h-7 px-2",
                    chartType === ct.value && "bg-background shadow-sm"
                  )}
                  onClick={() => setChartType(ct.value)}
                  title={ct.title}
                >
                  <ct.icon className="size-4" />
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground text-xs">이동평균선:</span>
            {[5, 20, 60].map((p) => (
              <label key={p} className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={maLines.includes(p)} onChange={() => toggleMA(p)} className="rounded cursor-pointer" />
                <span className="text-xs" style={{ color: MA_COLORS[p] }}>{p}일</span>
              </label>
            ))}
          </div>
          <Card>
            <CardContent className="p-0 overflow-hidden rounded-b-lg">
              <div className="h-[450px] md:h-[600px]">
                <LightweightChart data={chartData} loading={chartLoading} chartType={chartType} maLines={maLines} realtimePrice={realtime ? { price: realtime.price, time: realtime.time } : undefined} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === 종목정보 탭 === */}
        <TabsContent value="overview" className="space-y-4">
          {summaryLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48" />)}</div>
          ) : summary ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 시세 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="size-4" /> 시세 정보
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <InfoRow label="시가" value={fmtPrice(summary.open)} />
                  <InfoRow label="고가" value={fmtPrice(summary.dayHigh)} />
                  <InfoRow label="저가" value={fmtPrice(summary.dayLow)} />
                  <InfoRow label="전일종가" value={fmtPrice(summary.prevClose)} />
                  <InfoRow label="거래량" value={fmt(summary.volume, 0) + "주"} />
                  <InfoRow label="평균 거래량" value={fmt(summary.avgVolume, 0) + "주"} />
                  <InfoRow label="52주 고가" value={fmtPrice(summary.fiftyTwoWeekHigh)} />
                  <InfoRow label="52주 저가" value={fmtPrice(summary.fiftyTwoWeekLow)} />
                  <InfoRow label="50일 평균" value={fmtPrice(summary.fiftyDayAverage)} />
                  <InfoRow label="200일 평균" value={fmtPrice(summary.twoHundredDayAverage)} />
                </CardContent>
              </Card>

              {/* 밸류에이션 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="size-4" /> 밸류에이션
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <InfoRow label="시가총액" value={fmtBigNum(summary.marketCap)} />
                  <InfoRow label="PER (trailing)" value={fmtX(summary.trailingPE)} />
                  <InfoRow label="PER (forward)" value={fmtX(summary.forwardPE)} />
                  <InfoRow label="PBR" value={fmtX(summary.priceToBook)} />
                  <InfoRow label="PSR" value={fmtX(summary.priceToSales)} />
                  <InfoRow label="EV" value={fmtBigNum(summary.enterpriseValue)} />
                  <InfoRow label="EV/Revenue" value={fmtX(summary.enterpriseToRevenue)} />
                  <InfoRow label="EV/EBITDA" value={fmtX(summary.enterpriseToEbitda)} />
                  <InfoRow label="Beta" value={fmt(summary.beta)} />
                </CardContent>
              </Card>

              {/* 애널리스트 */}
              {summary.numberOfAnalystOpinions != null && summary.numberOfAnalystOpinions > 0 && (
                <Card className="md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="size-4" /> 애널리스트 의견 ({summary.numberOfAnalystOpinions}명)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">목표가 (평균)</div>
                        <div className="text-lg font-semibold tabular-nums">{fmtPrice(summary.targetMeanPrice)}</div>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">목표가 (중간)</div>
                        <div className="text-lg font-semibold tabular-nums">{fmtPrice(summary.targetMedianPrice)}</div>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">최고 목표가</div>
                        <div className="text-lg font-semibold tabular-nums text-[var(--color-up)]">{fmtPrice(summary.targetHighPrice)}</div>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">최저 목표가</div>
                        <div className="text-lg font-semibold tabular-nums text-[var(--color-down)]">{fmtPrice(summary.targetLowPrice)}</div>
                      </div>
                    </div>
                    {summary.recommendationKey && summary.recommendationKey !== "none" && (
                      <div className="mt-3 text-center">
                        <Badge variant="outline" className="text-sm">
                          투자의견: {summary.recommendationKey.toUpperCase()}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 주주 구성 */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="size-4" /> 주주 구성
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <InfoRow label="발행주식수" value={fmtKrw(summary.sharesOutstanding) + "주"} />
                    <InfoRow label="유통주식수" value={fmtKrw(summary.floatShares) + "주"} />
                    <InfoRow label="내부자 보유" value={pct(summary.heldPercentInsiders)} />
                    <InfoRow label="기관 보유" value={pct(summary.heldPercentInstitutions)} />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">종목 정보를 불러올 수 없습니다</p>
          )}
        </TabsContent>

        {/* === 재무 탭 === */}
        <TabsContent value="financials" className="space-y-4">
          {summaryLoading ? (
            <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-48" />)}</div>
          ) : summary ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 손익 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Landmark className="size-4" /> 손익
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <InfoRow label="매출" value={fmtBigNum(summary.totalRevenue)} />
                  <InfoRow label="매출총이익" value={fmtBigNum(summary.grossProfits)} />
                  <InfoRow label="EBITDA" value={fmtBigNum(summary.ebitda)} />
                  <InfoRow label="순이익" value={fmtBigNum(summary.netIncome)} />
                  <InfoRow label="주당매출" value={fmt(summary.revenuePerShare)} />
                  <InfoRow label="영업이익률" value={pct(summary.operatingMargins)} />
                  <InfoRow label="순이익률" value={pct(summary.profitMargins)} />
                  <InfoRow label="매출 성장률" value={pct(summary.revenueGrowth)} />
                  <InfoRow label="이익 성장률" value={pct(summary.earningsGrowth)} />
                </CardContent>
              </Card>

              {/* 재무 건전성 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Landmark className="size-4" /> 재무 건전성
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <InfoRow label="보유현금" value={fmtBigNum(summary.totalCash)} />
                  <InfoRow label="주당 현금" value={fmtPrice(summary.totalCashPerShare)} />
                  <InfoRow label="총 부채" value={fmtBigNum(summary.totalDebt)} />
                  <InfoRow label="부채비율 (D/E)" value={fmt(summary.debtToEquity)} />
                  <InfoRow label="유동비율" value={fmt(summary.currentRatio)} />
                  <InfoRow label="당좌비율" value={fmt(summary.quickRatio)} />
                  <InfoRow label="영업현금흐름" value={fmtBigNum(summary.operatingCashflow)} />
                  <InfoRow label="잉여현금흐름" value={fmtBigNum(summary.freeCashflow)} />
                  <InfoRow label="ROA" value={pct(summary.returnOnAssets)} />
                  <InfoRow label="ROE" value={pct(summary.returnOnEquity)} />
                </CardContent>
              </Card>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">재무 정보를 불러올 수 없습니다</p>
          )}
        </TabsContent>

        {/* === 배당 탭 === */}
        <TabsContent value="dividend" className="space-y-4">
          {summaryLoading ? (
            <Skeleton className="h-48" />
          ) : summary ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <PiggyBank className="size-4" /> 배당 정보
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summary.dividendRate != null ? (
                  <div className="space-y-0">
                    <InfoRow label="연간 배당금" value={fmtPrice(summary.dividendRate)} />
                    <InfoRow label="배당수익률" value={pct(summary.dividendYield)} />
                    <InfoRow label="배당성향" value={pct(summary.payoutRatio)} />
                    <InfoRow label="5년 평균 배당률" value={summary.fiveYearAvgDividendYield != null ? summary.fiveYearAvgDividendYield.toFixed(2) + "%" : "-"} />
                    <InfoRow label="배당락일" value={fmtDate(summary.exDividendDate)} />
                    <InfoRow label="배당 지급일" value={fmtDate(summary.dividendDate)} />
                    {summary.earningsDate && (
                      <InfoRow label="실적 발표일" value={fmtDate(summary.earningsDate)} />
                    )}
                    {summary.lastSplitFactor && (
                      <InfoRow label="최근 액면분할" value={`${summary.lastSplitFactor} (${fmtDate(summary.lastSplitDate)})`} />
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">배당 정보가 없습니다</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <p className="text-muted-foreground text-center py-8">배당 정보를 불러올 수 없습니다</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
