"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useTheme } from "next-themes";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useTrades } from "@/features/real-estate/hooks/useTrades";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount } from "@/lib/utils";
import { AptTrade } from "@/lib/types";

function aggregateByMonth(trades: AptTrade[]) {
  const map = new Map<string, { sum: number; count: number }>();
  for (const t of trades) {
    const key = `${t.dealYear}-${String(t.dealMonth).padStart(2, "0")}`;
    const entry = map.get(key) || { sum: 0, count: 0 };
    entry.sum += t.dealAmount;
    entry.count += 1;
    map.set(key, entry);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { sum, count }]) => ({
      month,
      avgPrice: Math.round(sum / count),
      count,
    }));
}

export default function Charts({ region: propRegion }: { region?: string } = {}) {
  const searchParams = useSearchParams();
  const region = propRegion || searchParams.get("region") || "11680";
  const area = searchParams.get("area") || "all";
  const period = searchParams.get("period") || "6m";

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { trades, loading, error } = useTrades(region, period, area);
  const chartData = useMemo(() => aggregateByMonth(trades), [trades]);

  // Recharts SVG는 CSS 변수가 안 먹힐 수 있어서 직접 색상 지정
  const barFill = isDark ? "#e5e5e5" : "#1a1a1a";
  const axisStroke = isDark ? "#888" : "#666";
  const gridStroke = isDark ? "#333" : "#e5e5e5";

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="w-full h-[350px] rounded-lg" />
        <Skeleton className="w-full h-[200px] rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive rounded-lg p-8 text-center">
        데이터 로딩 실패: {error}
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-muted rounded-lg p-8 text-center text-muted-foreground">
        해당 조건의 거래 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">평균 거래가 추이</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="avgPriceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-up)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-up)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="month" fontSize={12} stroke={axisStroke} />
              <YAxis tickFormatter={formatAmount} fontSize={12} domain={["auto", "auto"]} stroke={axisStroke} />
              <Tooltip
                formatter={(v) => [formatAmount(Number(v)), "평균 거래가"]}
                contentStyle={{
                  backgroundColor: isDark ? "#1a1a1a" : "#fff",
                  border: `1px solid ${gridStroke}`,
                  borderRadius: "8px",
                  color: barFill,
                }}
                labelStyle={{ color: barFill }}
                itemStyle={{ color: barFill }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="avgPrice"
                name="평균 거래가(만원)"
                stroke="var(--color-up)"
                strokeWidth={2.5}
                fill="url(#avgPriceGradient)"
                dot={{ r: 4, fill: "var(--color-up)" }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">월별 거래량</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="month" fontSize={12} stroke={axisStroke} />
              <YAxis fontSize={12} stroke={axisStroke} />
              <Tooltip
                formatter={(v) => [`${v}건`, "거래량"]}
                contentStyle={{
                  backgroundColor: isDark ? "#1a1a1a" : "#fff",
                  border: `1px solid ${gridStroke}`,
                  borderRadius: "8px",
                  color: barFill,
                }}
                labelStyle={{ color: barFill }}
                itemStyle={{ color: barFill }}
              />
              <Bar
                dataKey="count"
                name="거래 건수"
                fill={barFill}
                radius={[4, 4, 0, 0]}
                activeBar={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
