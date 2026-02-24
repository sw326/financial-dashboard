"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from "recharts";
import { useChart } from "@/features/stock/hooks/use-chart";
import { cn } from "@/lib/utils";

export interface MiniChartData {
  symbol: string;
  name: string;
  isKR?: boolean;
}

const PERIODS = [
  { label: "1M", value: "1d" },   // 1mo range, 1d interval
  { label: "3M", value: "3mo" },
  { label: "6M", value: "6mo" },
] as const;

// 심플 툴팁
function ChartTooltip({ active, payload }: { active?: boolean; payload?: { value: number }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background/90 border rounded-md px-2 py-1 text-xs shadow-md">
      {payload[0].value.toLocaleString()}
    </div>
  );
}

export function MiniChart({ data }: { data: MiniChartData }) {
  const { symbol, name, isKR } = data;
  const [period, setPeriod] = useState<string>("1d");

  const { data: chartData = [], isLoading } = useChart(symbol, period);

  const first = chartData[0]?.close ?? 0;
  const last = chartData[chartData.length - 1]?.close ?? 0;
  const isUp = last >= first;
  const changePct = first > 0 ? ((last - first) / first) * 100 : 0;
  const color = isUp ? "#ef4444" : "#3b82f6"; // KR 컨벤션: 빨강=상승, 파랑=하락

  const priceStr = isKR
    ? `${last.toLocaleString()}원`
    : `$${last.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  const href = `/stock/${symbol}`;
  const displaySymbol = symbol.replace(/\.(KS|KQ)$/, "");

  return (
    <div className="rounded-xl border bg-card not-prose my-1 overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <Link href={href} className="hover:underline min-w-0">
          <p className="font-semibold text-sm truncate">{name}</p>
          <p className="text-xs text-muted-foreground">{displaySymbol}</p>
        </Link>
        <div className="text-right shrink-0 ml-2">
          <p className="font-bold text-sm tabular-nums">{isLoading ? "—" : priceStr}</p>
          <p className={cn("text-xs font-medium tabular-nums",
            isUp ? "text-red-500" : "text-blue-500")}>
            {isLoading ? "—" : `${isUp ? "+" : ""}${changePct.toFixed(2)}%`}
          </p>
        </div>
      </div>

      {/* 차트 */}
      <div className="h-[100px] w-full px-0">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex gap-1">
              {[0, 150, 300].map((d) => (
                <span key={d} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce"
                  style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis domain={["auto", "auto"]} hide />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="close"
                stroke={color}
                strokeWidth={1.5}
                fill={`url(#grad-${symbol})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            데이터 없음
          </div>
        )}
      </div>

      {/* 기간 탭 */}
      <div className="flex gap-1 px-4 pb-3 pt-1">
        {PERIODS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setPeriod(value)}
            className={cn(
              "text-xs px-2 py-0.5 rounded-md font-medium transition-colors",
              period === value
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
