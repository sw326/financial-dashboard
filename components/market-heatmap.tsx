"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

// 미국장 컨벤션: 초록=상승, 빨강=하락
function getHeatmapColor(pct: number): string {
  if (pct >= 3) return "#15803d";   // green-700
  if (pct >= 2) return "#16a34a";   // green-600
  if (pct >= 1) return "#22c55e";   // green-500
  if (pct >= 0.5) return "#4ade80"; // green-400
  if (pct > 0) return "#86efac";    // green-300
  if (pct === 0) return "#6b7280";  // gray-500
  if (pct > -0.5) return "#fca5a5"; // red-300
  if (pct > -1) return "#f87171";   // red-400
  if (pct > -2) return "#ef4444";   // red-500
  if (pct > -3) return "#dc2626";   // red-600
  return "#b91c1c";                  // red-700
}

function getTextColor(pct: number): string {
  return Math.abs(pct) >= 0.5 ? "#ffffff" : "#e5e7eb";
}

interface HeatmapStock {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  marketCap: number;
  market: string;
}

// Squarified treemap algorithm
interface TreemapRect {
  x: number;
  y: number;
  w: number;
  h: number;
  stock: HeatmapStock & { weight: number };
}

function squarify(
  items: (HeatmapStock & { weight: number })[],
  x: number,
  y: number,
  w: number,
  h: number
): TreemapRect[] {
  if (items.length === 0) return [];
  if (items.length === 1) {
    return [{ x, y, w, h, stock: items[0] }];
  }

  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  if (totalWeight === 0) return [];

  // Split into two groups trying to balance weights
  let bestSplit = 1;
  let bestDiff = Infinity;
  let runningSum = 0;

  for (let i = 0; i < items.length - 1; i++) {
    runningSum += items[i].weight;
    const diff = Math.abs(runningSum / totalWeight - 0.5);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestSplit = i + 1;
    }
  }

  const left = items.slice(0, bestSplit);
  const right = items.slice(bestSplit);
  const leftWeight = left.reduce((s, i) => s + i.weight, 0);
  const ratio = leftWeight / totalWeight;

  // Split along the longer axis
  if (w >= h) {
    const splitX = w * ratio;
    return [
      ...squarify(left, x, y, splitX, h),
      ...squarify(right, x + splitX, y, w - splitX, h),
    ];
  } else {
    const splitY = h * ratio;
    return [
      ...squarify(left, x, y, w, splitY),
      ...squarify(right, x, y + splitY, w, h - splitY),
    ];
  }
}

export default function MarketHeatmap() {
  const { data: response, isLoading } = useQuery({
    queryKey: ["heatmap"],
    queryFn: async () => {
      const res = await fetch("/api/finance/heatmap?market=all");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ stocks: HeatmapStock[]; total: number }>;
    },
    staleTime: 1000 * 60 * 5, // 5분
  });
  const router = useRouter();
  const stocks = response?.stocks || [];

  const rects = useMemo(() => {
    if (stocks.length === 0) return [];
    const totalMcap = stocks.reduce((s, st) => s + (st.marketCap || 0), 0);
    if (totalMcap === 0) return [];

    const weighted = stocks
      .filter((s) => (s.marketCap || 0) > 0)
      .map((s) => ({
        ...s,
        weight: (s.marketCap || 0) / totalMcap,
      }))
      .sort((a, b) => b.weight - a.weight);

    return squarify(weighted, 0, 0, 100, 100);
  }, [stocks]);

  if (isLoading) {
    return <Skeleton className="h-[350px] w-full rounded-lg" />;
  }

  if (rects.length === 0) return null;

  return (
    <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
      {rects.map((rect) => {
        const pct = rect.stock.changePercent;
        const bg = getHeatmapColor(pct);
        const txtColor = getTextColor(pct);
        // 블록이 충분히 큰지 (퍼센트 표시 여부)
        const area = rect.w * rect.h;
        const showPercent = area > 80;
        const showName = area > 20;

        return (
          <div
            key={rect.stock.symbol}
            onClick={() => router.push(`/stock/${encodeURIComponent(rect.stock.symbol)}`)}
            className="absolute cursor-pointer flex flex-col items-center justify-center overflow-hidden border-[0.5px] border-black/20 dark:border-white/10 hover:brightness-110 transition-all"
            style={{
              left: `${rect.x}%`,
              top: `${rect.y}%`,
              width: `${rect.w}%`,
              height: `${rect.h}%`,
              backgroundColor: bg,
              color: txtColor,
            }}
          >
            {showName && (
              <span className="text-[10px] sm:text-xs font-bold truncate max-w-[95%] leading-tight">
                {rect.stock.name}
              </span>
            )}
            {showPercent && (
              <span className="text-[9px] sm:text-xs tabular-nums font-semibold leading-tight opacity-90">
                {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
