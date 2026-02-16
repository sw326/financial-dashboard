"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { TrendingUp, TrendingDown, BarChart3, ArrowLeftRight } from "lucide-react";
import { useQuotes } from "@/hooks/use-quotes";
import type { MarketIndex } from "@/lib/types";
import { useChart } from "@/hooks/use-chart";

const INDICES = [
  { symbol: "^KS11", name: "코스피" },
  { symbol: "^KQ11", name: "코스닥" },
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^IXIC", name: "나스닥" },
  { symbol: "^DJI", name: "다우존스" },
];

const FX_SYMBOL = "KRW=X";

// IndexCard 컴포넌트 - 각각 독립적으로 차트 데이터 조회
function IndexCard({
  symbol,
  name,
  idx,
  color,
  colorValue,
  sign,
  onNavigate,
}: {
  symbol: string;
  name: string;
  idx: MarketIndex;
  color: (v: number) => string;
  colorValue: (v: number) => string;
  sign: (v: number) => string;
  onNavigate: () => void;
}) {
  const { data: spark = [] } = useChart(symbol, "1mo");

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onNavigate}
    >
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardDescription>{name}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            {idx.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </CardTitle>
        </div>
        <CardAction>
          <Badge variant="outline" className={color(idx.change)}>
            {idx.change >= 0 ? <TrendingUp className="size-4 mr-1" /> : <TrendingDown className="size-4 mr-1" />}
            {sign(idx.changePercent)}{idx.changePercent.toFixed(2)}%
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {spark.length > 0 && (
          <ResponsiveContainer width="100%" height={40}>
            <LineChart data={spark}>
              <YAxis domain={["dataMin", "dataMax"]} hide />
              <Line
                type="monotone"
                dataKey="close"
                stroke={colorValue(idx.change)}
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
      <CardFooter className="flex-col items-start gap-1 text-sm">
        <div className={`flex gap-2 font-medium ${color(idx.change)}`}>
          {sign(idx.change)}{idx.change.toFixed(2)}
        </div>
        <div className="text-muted-foreground">전일 대비</div>
      </CardFooter>
    </Card>
  );
}

export default function MarketPage() {
  const router = useRouter();
  
  // React Query - 모든 지수 + 환율을 한 번에 조회
  const allSymbols = useMemo(() => [...INDICES.map((i) => i.symbol), FX_SYMBOL], []);
  const { data: allData = [], isLoading: loading } = useQuotes(allSymbols);
  
  // 지수와 환율 분리
  const indices = useMemo(() => allData.filter((d) => d.symbol !== FX_SYMBOL), [allData]);
  const fx = useMemo(() => allData.find((d) => d.symbol === FX_SYMBOL) ?? null, [allData]);

  const color = (v: number) => (v >= 0 ? "text-[var(--color-up)]" : "text-[var(--color-down)]");
  const colorValue = (v: number) => (v >= 0 ? "#ef4444" : "#3b82f6");
  const sign = (v: number) => (v >= 0 ? "+" : "");

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="size-6 text-muted-foreground" />
          시장 개요
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <BarChart3 className="size-6 text-muted-foreground" />
        시장 개요
      </h1>

      {/* 환율 */}
      {fx && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-baseline gap-4">
              <CardDescription className="flex items-center gap-2">
                <ArrowLeftRight className="size-4" />
                USD/KRW
              </CardDescription>
              <CardTitle className="text-xl font-semibold tabular-nums">{fx.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</CardTitle>
            </div>
            <Badge variant="outline" className={color(fx.change)}>
              {fx.change >= 0 ? <TrendingUp className="size-3 mr-1" /> : <TrendingDown className="size-3 mr-1" />}
              {sign(fx.change)}{fx.change.toFixed(2)} ({sign(fx.changePercent)}{fx.changePercent.toFixed(2)}%)
            </Badge>
          </CardHeader>
        </Card>
      )}

      {/* 주요 지수 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {INDICES.map(({ symbol, name }) => {
          const idx = indices.find((i) => i.symbol === symbol);
          if (!idx) return null;
          return (
            <IndexCard
              key={symbol}
              symbol={symbol}
              name={name}
              idx={idx}
              color={color}
              colorValue={colorValue}
              sign={sign}
              onNavigate={() => router.push(`/stock?symbol=${encodeURIComponent(symbol)}`)}
            />
          );
        })}
      </div>
    </div>
  );
}
