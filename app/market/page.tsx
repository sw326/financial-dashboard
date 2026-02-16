"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import type { MarketIndex, ChartData } from "@/lib/types";

const INDICES = [
  { symbol: "^KS11", name: "코스피" },
  { symbol: "^KQ11", name: "코스닥" },
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^IXIC", name: "나스닥" },
  { symbol: "^DJI", name: "다우존스" },
];

const FX_SYMBOL = "KRW=X";

export default function MarketPage() {
  const router = useRouter();
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [fx, setFx] = useState<MarketIndex | null>(null);
  const [sparklines, setSparklines] = useState<Record<string, ChartData[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const allSymbols = [...INDICES.map((i) => i.symbol), FX_SYMBOL];
    fetch(`/api/finance/quote?symbols=${allSymbols.join(",")}`)
      .then((r) => r.json())
      .then((data: MarketIndex[]) => {
        if (!Array.isArray(data)) return;
        setIndices(data.filter((d) => d.symbol !== FX_SYMBOL));
        setFx(data.find((d) => d.symbol === FX_SYMBOL) ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // sparklines
    INDICES.forEach(({ symbol }) => {
      fetch(`/api/finance/chart?symbol=${encodeURIComponent(symbol)}&period=1mo`)
        .then((r) => r.json())
        .then((data: ChartData[]) => {
          if (Array.isArray(data)) {
            setSparklines((prev) => ({ ...prev, [symbol]: data }));
          }
        });
    });
  }, []);

  const color = (v: number) => (v >= 0 ? "text-[var(--color-up)]" : "text-[var(--color-down)]");
  const colorValue = (v: number) => (v >= 0 ? "#ef4444" : "#3b82f6");
  const sign = (v: number) => (v >= 0 ? "+" : "");

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">📊 시장 개요</h1>
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
      <h1 className="text-2xl font-bold">📊 시장 개요</h1>

      {/* 환율 */}
      {fx && (
        <Card>
          <CardContent className="py-3 flex items-center gap-4">
            <span className="font-medium">💱 USD/KRW</span>
            <span className="text-lg font-bold">{fx.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            <Badge variant="outline" className={color(fx.change)}>
              {sign(fx.change)}{fx.change.toFixed(2)} ({sign(fx.changePercent)}{fx.changePercent.toFixed(2)}%)
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* 주요 지수 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {INDICES.map(({ symbol, name }) => {
          const idx = indices.find((i) => i.symbol === symbol);
          const spark = sparklines[symbol];
          if (!idx) return null;
          return (
            <Card
              key={symbol}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/stock?symbol=${encodeURIComponent(symbol)}`)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex justify-between items-center">
                  <span>{name}</span>
                  <Badge variant="outline" className={color(idx.change)}>
                    {sign(idx.changePercent)}{idx.changePercent.toFixed(2)}%
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    {idx.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                  <span className={`text-sm ${color(idx.change)}`}>
                    {sign(idx.change)}{idx.change.toFixed(2)}
                  </span>
                </div>
                {spark && spark.length > 0 && (
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
            </Card>
          );
        })}
      </div>
    </div>
  );
}
