"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount } from "@/lib/utils";
import { AptTrade } from "@/lib/types";
import { AptDetailModal } from "@/components/apt-detail-modal";

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

// 순위에 따라 opacity로 차이를 주는 단색 바
function getBarFill(index: number, total: number, isDark: boolean): string {
  const opacity = 1 - (index / total) * 0.6; // 1위: 100%, 마지막: 40%
  const base = isDark ? "255,255,255" : "0,0,0";
  return `rgba(${base},${opacity})`;
}

// Custom Y axis tick with click handler
interface CustomTickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
  textFill: string;
  onAptClick: (name: string) => void;
  rankData: ReturnType<typeof aggregateByApt>;
}

function CustomYAxisTick({ x = 0, y = 0, payload, textFill, onAptClick, rankData }: CustomTickProps) {
  if (!payload) return null;
  const item = rankData.find((d) => d.name === payload.value);
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={-4}
        y={0}
        dy={4}
        textAnchor="end"
        fontSize={11}
        fill="#3b82f6"
        style={{ cursor: "pointer", textDecoration: "underline" }}
        onClick={() => item && onAptClick(item.fullName)}
      >
        {payload.value}
      </text>
    </g>
  );
}

export default function RankChart({ region: propRegion }: { region?: string } = {}) {
  const searchParams = useSearchParams();
  const region = propRegion || searchParams.get("region") || "11680";
  const area = searchParams.get("area") || "all";
  const period = searchParams.get("period") || "1y";

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { trades, loading, error } = useTrades(region, period, area);
  const rankData = useMemo(() => aggregateByApt(trades), [trades]);

  const [selectedApt, setSelectedApt] = useState<string | null>(null);

  // 선택된 아파트의 거래 내역
  const aptTrades = useMemo(() => {
    if (!selectedApt) return [];
    return trades.filter((t) => t.aptName === selectedApt);
  }, [trades, selectedApt]);

  const axisStroke = isDark ? "#888" : "#666";
  const gridStroke = isDark ? "#333" : "#e5e5e5";
  const textFill = isDark ? "#e5e5e5" : "#1a1a1a";

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
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">아파트별 평균 거래가 Top 20</CardTitle>
          <p className="text-xs text-muted-foreground">아파트명 클릭 시 상세 거래 내역을 확인할 수 있습니다.</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={Math.max(400, rankData.length * 36)}>
            <BarChart data={rankData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis type="number" tickFormatter={formatAmount} fontSize={12} stroke={axisStroke} tick={{ fill: textFill }} />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                fontSize={11}
                stroke={axisStroke}
                tick={
                  <CustomYAxisTick
                    textFill={textFill}
                    onAptClick={setSelectedApt}
                    rankData={rankData}
                  />
                }
              />
              <Tooltip
                formatter={(v) => [formatAmount(Number(v)), "평균 거래가"]}
                labelFormatter={(label) => {
                  const item = rankData.find((d) => d.name === label);
                  return `${item?.fullName ?? label} (${item?.count ?? 0}건)`;
                }}
                contentStyle={{
                  backgroundColor: isDark ? "#1a1a1a" : "#fff",
                  border: `1px solid ${isDark ? "#333" : "#e5e5e5"}`,
                  borderRadius: "8px",
                  color: textFill,
                }}
                labelStyle={{ color: textFill }}
                itemStyle={{ color: textFill }}
              />
              <Bar dataKey="avgPrice" name="평균 거래가" radius={[0, 4, 4, 0]} activeBar={false}>
                {rankData.map((_, i) => (
                  <Cell key={i} fill={getBarFill(i, rankData.length, isDark)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {selectedApt && (
        <AptDetailModal
          open={!!selectedApt}
          onClose={() => setSelectedApt(null)}
          aptName={selectedApt}
          trades={aptTrades}
        />
      )}
    </>
  );
}
