"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useTrades } from "@/hooks/useTrades";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount } from "@/lib/utils";
import { AptTrade } from "@/lib/types";

function aggregateByApt(trades: AptTrade[]) {
  const map = new Map<string, { sum: number; count: number }>();
  for (const t of trades) {
    const entry = map.get(t.aptName) || { sum: 0, count: 0 };
    entry.sum += t.dealAmount;
    entry.count += 1;
    map.set(t.aptName, entry);
  }
  return Array.from(map.entries())
    .map(([name, { sum, count }]) => ({
      name: name.length > 12 ? name.slice(0, 12) + "…" : name,
      fullName: name,
      avgPrice: Math.round(sum / count),
      count,
    }))
    .sort((a, b) => b.avgPrice - a.avgPrice)
    .slice(0, 20);
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function RankChart() {
  const searchParams = useSearchParams();
  const region = searchParams.get("region") || "11680";
  const area = searchParams.get("area") || "all";
  const period = searchParams.get("period") || "1y";

  const { trades, loading, error } = useTrades(region, period, area);
  const rankData = useMemo(() => aggregateByApt(trades), [trades]);

  if (loading) {
    return <Skeleton className="w-full h-[600px] rounded-lg" />;
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive rounded-lg p-8 text-center">
        데이터 로딩 실패: {error}
      </div>
    );
  }

  if (rankData.length === 0) {
    return (
      <div className="bg-muted rounded-lg p-8 text-center text-muted-foreground">
        해당 조건의 거래 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border p-4">
      <h3 className="text-sm font-medium mb-4">아파트별 평균 거래가 Top 20</h3>
      <ResponsiveContainer width="100%" height={Math.max(400, rankData.length * 36)}>
        <BarChart data={rankData} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tickFormatter={formatAmount} fontSize={12} />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            fontSize={11}
            tick={{ fill: "hsl(var(--foreground))" }}
          />
          <Tooltip
            formatter={(v) => [formatAmount(Number(v)), "평균 거래가"]}
            labelFormatter={(label) => {
              const item = rankData.find((d) => d.name === label);
              return `${item?.fullName ?? label} (${item?.count ?? 0}건)`;
            }}
          />
          <Bar dataKey="avgPrice" name="평균 거래가" radius={[0, 4, 4, 0]}>
            {rankData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
