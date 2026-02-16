"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useTrades } from "@/hooks/useTrades";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount } from "@/lib/utils";
import { AptTrade } from "@/lib/types";
import { chartTooltipStyle } from "@/components/chart-tooltip";

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

export default function Charts() {
  const searchParams = useSearchParams();
  const region = searchParams.get("region") || "11680";
  const area = searchParams.get("area") || "all";
  const period = searchParams.get("period") || "6m";

  const { trades, loading, error } = useTrades(region, period, area);
  const chartData = useMemo(() => aggregateByMonth(trades), [trades]);

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
    <div className="space-y-6">
      <div className="bg-card rounded-lg border p-4">
        <h3 className="text-sm font-medium mb-4">평균 거래가 추이</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" fontSize={12} />
            <YAxis tickFormatter={formatAmount} fontSize={12} />
            <Tooltip
              formatter={(v) => [formatAmount(Number(v)), "평균 거래가"]}
              {...chartTooltipStyle}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="avgPrice"
              name="평균 거래가(만원)"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2.5}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-lg border p-4">
        <h3 className="text-sm font-medium mb-4">월별 거래량</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip
              formatter={(v) => [`${v}건`, "거래량"]}
              {...chartTooltipStyle}
            />
            <Bar
              dataKey="count"
              name="거래 건수"
              fill="hsl(var(--chart-2))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
