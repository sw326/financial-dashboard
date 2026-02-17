"use client";

import { useTrending } from "@/hooks/use-trending";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

function getHeatmapColor(changePercent: number): string {
  if (changePercent >= 3) return "#dc2626";
  if (changePercent >= 1) return "#ef4444";
  if (changePercent >= 0) return "#fca5a5";
  if (changePercent >= -1) return "#93c5fd";
  if (changePercent >= -3) return "#3b82f6";
  return "#1d4ed8";
}

function getTextColor(changePercent: number): string {
  const abs = Math.abs(changePercent);
  return abs >= 1 ? "#ffffff" : "#1f2937";
}

export default function MarketHeatmap() {
  const { data: response, isLoading } = useTrending("hot", "all", 1, 30);
  const router = useRouter();
  const stocks = response?.stocks || [];

  if (isLoading) {
    return <Skeleton className="h-[200px] w-full" />;
  }

  if (stocks.length === 0) return null;

  // Calculate total market cap for proportions
  const totalMarketCap = stocks.reduce((sum, s) => sum + (s.marketCap || 0), 0);
  if (totalMarketCap === 0) return null;

  return (
    <div
      className="flex flex-wrap w-full"
      style={{ minHeight: 200 }}
    >
      {stocks.map((stock) => {
        const weight = ((stock.marketCap || 0) / totalMarketCap) * 100;
        if (weight < 0.5) return null;
        const bg = getHeatmapColor(stock.changePercent);
        const textColor = getTextColor(stock.changePercent);
        const isSmall = weight < 4;

        return (
          <div
            key={stock.symbol}
            onClick={() => router.push(`/stock/${encodeURIComponent(stock.symbol)}`)}
            className="cursor-pointer border border-black/10 dark:border-white/10 flex flex-col items-center justify-center overflow-hidden transition-opacity hover:opacity-80"
            style={{
              flexBasis: `${Math.max(weight, 3)}%`,
              flexGrow: 0,
              flexShrink: 0,
              minWidth: 60,
              minHeight: 50,
              backgroundColor: bg,
              color: textColor,
              padding: "4px",
            }}
          >
            <span className="text-xs font-medium truncate max-w-full leading-tight">
              {stock.name}
            </span>
            {!isSmall && (
              <span className="text-xs tabular-nums font-semibold leading-tight">
                {stock.changePercent >= 0 ? "+" : ""}
                {stock.changePercent.toFixed(2)}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
