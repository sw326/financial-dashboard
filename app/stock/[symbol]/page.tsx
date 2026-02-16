"use client";

import { use, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { StockQuote } from "@/lib/types";
import { useQuotes } from "@/hooks/use-quotes";
import { useChart } from "@/hooks/use-chart";
import { chartTooltipStyle } from "@/components/chart-tooltip";

const PERIODS = ["1mo", "3mo", "6mo", "1y", "5y"] as const;

interface Props {
  params: Promise<{ symbol: string }>;
}

export default function StockDetailPage({ params }: Props) {
  const [period, setPeriod] = useState<string>("6mo");
  
  // Next.js 16 - params는 Promise, use() hook으로 unwrap
  const resolvedParams = use(params);
  const symbol = decodeURIComponent(resolvedParams.symbol);

  return <StockDetailContent symbol={symbol} period={period} setPeriod={setPeriod} />;
}

function StockDetailContent({ symbol, period, setPeriod }: { symbol: string; period: string; setPeriod: (v: string) => void }) {
  // React Query hooks
  const { data: quoteData = [], isLoading: quoteLoading, error: quoteError } = useQuotes([symbol]);
  const { data: chart = [], isLoading: chartLoading } = useChart(symbol, period);

  const quote = quoteData.length > 0 ? (quoteData[0] as unknown as StockQuote) : null;
  const loading = quoteLoading || chartLoading;
  const error = quoteError ? "데이터 로딩 실패" : (!quote && !quoteLoading ? "종목을 찾을 수 없습니다" : "");

  const color = (v: number) => (v >= 0 ? "text-[var(--color-up)]" : "text-[var(--color-down)]");
  const colorValue = (v: number) => (v >= 0 ? "#ef4444" : "#3b82f6");
  const sign = (v: number) => (v >= 0 ? "+" : "");
  const fmt = (v?: number) => v != null ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "-";

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{symbol}</h1>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (loading) {
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

  return (
    <div className="space-y-6">
      {/* 기본 정보 */}
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div className="space-y-2">
            <CardDescription>{quote.symbol}</CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">{fmt(quote.price)}</CardTitle>
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

      {/* 탭: 차트 / 종목정보 */}
      <Tabs defaultValue="chart">
        <TabsList>
          <TabsTrigger value="chart">차트</TabsTrigger>
          <TabsTrigger value="info">종목정보</TabsTrigger>
        </TabsList>

        {/* 차트 탭 */}
        <TabsContent value="chart" className="space-y-4">
          {/* 기간 선택 */}
          <ToggleGroup type="single" value={period} onValueChange={(v) => v && setPeriod(v)}>
            {PERIODS.map((p) => (
              <ToggleGroupItem key={p} value={p} className="px-4">
                {p}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          {/* 가격 차트 */}
          {chart.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} tickFormatter={(v) => v.toLocaleString()} />
                    <Tooltip
                      formatter={(v) => [(v as number).toLocaleString(), "종가"]}
                      labelFormatter={(l) => l}
                      {...chartTooltipStyle}
                    />
                    <Line
                      type="monotone"
                      dataKey="close"
                      stroke={colorValue(quote.change)}
                      dot={false}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* 거래량 차트 */}
          {chart.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">거래량</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => (v / 1e6).toFixed(0) + "M"} />
                    <Tooltip
                      formatter={(v) => [(v as number).toLocaleString(), "거래량"]}
                      labelFormatter={(l) => l}
                      {...chartTooltipStyle}
                    />
                    <Bar dataKey="volume" fill="#94a3b8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 종목정보 탭 */}
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>종목 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">시가총액</div>
                    <div className="text-lg font-semibold tabular-nums">
                      {quote.marketCap ? (quote.marketCap / 1e8).toLocaleString(undefined, { maximumFractionDigits: 0 }) + "억" : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">PER (주가수익비율)</div>
                    <div className="text-lg font-semibold tabular-nums">{fmt(quote.per)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">PBR (주가순자산비율)</div>
                    <div className="text-lg font-semibold tabular-nums">{fmt(quote.pbr)}</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">52주 고가</div>
                    <div className="text-lg font-semibold tabular-nums">{fmt(quote.high52w)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">52주 저가</div>
                    <div className="text-lg font-semibold tabular-nums">{fmt(quote.low52w)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">배당률</div>
                    <div className="text-lg font-semibold tabular-nums">
                      {quote.dividendYield != null ? quote.dividendYield.toFixed(2) + "%" : "-"}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
