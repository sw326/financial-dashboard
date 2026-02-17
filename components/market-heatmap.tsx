"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown } from "lucide-react";

// 미국장 컨벤션: 초록=상승, 빨강=하락
function getHeatmapColor(pct: number): string {
  if (pct >= 3) return "#15803d";
  if (pct >= 2) return "#16a34a";
  if (pct >= 1) return "#22c55e";
  if (pct >= 0.5) return "#4ade80";
  if (pct > 0) return "#86efac";
  if (pct === 0) return "#6b7280";
  if (pct > -0.5) return "#fca5a5";
  if (pct > -1) return "#f87171";
  if (pct > -2) return "#ef4444";
  if (pct > -3) return "#dc2626";
  return "#b91c1c";
}

function getTextColor(pct: number): string {
  return Math.abs(pct) >= 0.5 ? "#ffffff" : "#e5e7eb";
}

const fmtKrw = (v: number) => {
  if (v >= 1e12) return (v / 1e12).toFixed(1) + "조";
  if (v >= 1e8) return (v / 1e8).toFixed(0) + "억";
  if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(1) + "K";
  return v.toFixed(0);
};

interface HeatmapStock {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  marketCap: number;
  market: string;
}

interface TreemapRect {
  x: number;
  y: number;
  w: number;
  h: number;
  stock: HeatmapStock & { weight: number };
}

function squarify(
  items: (HeatmapStock & { weight: number })[],
  x: number, y: number, w: number, h: number
): TreemapRect[] {
  if (items.length === 0) return [];
  if (items.length === 1) return [{ x, y, w, h, stock: items[0] }];

  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  if (totalWeight === 0) return [];

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

// 호버 팝오버
function HoverCard({
  stock,
  position,
  onNavigate,
}: {
  stock: HeatmapStock;
  position: { x: number; y: number };
  onNavigate: (symbol: string) => void;
}) {
  const isUp = stock.changePercent >= 0;
  const isKR = stock.symbol.endsWith(".KS") || stock.symbol.endsWith(".KQ");

  return (
    <div
      className="fixed z-50 pointer-events-auto bg-popover border border-border rounded-lg shadow-xl p-3 min-w-[200px] max-w-[260px]"
      style={{
        left: position.x,
        top: position.y,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onNavigate(stock.symbol);
      }}
    >
      <div className="cursor-pointer hover:opacity-80 transition-opacity">
        {/* 종목명 + 심볼 */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="font-semibold text-sm text-foreground truncate">{stock.name}</span>
          <span className="text-xs text-muted-foreground shrink-0">{stock.symbol}</span>
        </div>

        {/* 가격 + 등락 */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-lg font-bold tabular-nums text-foreground">
            {isKR ? stock.price.toLocaleString() : stock.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
          <div className={`flex items-center gap-1 text-sm font-semibold ${isUp ? "text-green-500" : "text-red-500"}`}>
            {isUp ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            <span className="tabular-nums">
              {isUp ? "+" : ""}{stock.changePercent.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* 시총 + 마켓 */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>시총 {fmtKrw(stock.marketCap)}</span>
          <span className="px-1.5 py-0.5 rounded bg-muted text-[10px]">{stock.market}</span>
        </div>
      </div>
    </div>
  );
}

export default function MarketHeatmap({ market = "all" }: { market?: string }) {
  const { data: response, isLoading } = useQuery({
    queryKey: ["heatmap", market],
    queryFn: async () => {
      const res = await fetch(`/api/finance/heatmap?market=${market}`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ stocks: HeatmapStock[]; total: number }>;
    },
    staleTime: 1000 * 60 * 5,
  });
  const router = useRouter();
  const stocks = response?.stocks || [];
  const containerRef = useRef<HTMLDivElement>(null);

  // 호버 상태
  const [hoveredStock, setHoveredStock] = useState<HeatmapStock | null>(null);
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 });
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback((stock: HeatmapStock, e: React.MouseEvent) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    
    // 팝오버 위치 계산 (뷰포트 기준)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const popoverW = 240;
    const popoverH = 120;

    let x = rect.right + 8;
    let y = rect.top;

    // 오른쪽 넘침 → 왼쪽에 표시
    if (x + popoverW > viewportW - 16) {
      x = rect.left - popoverW - 8;
    }
    // 아래 넘침 → 위로 올림
    if (y + popoverH > viewportH - 16) {
      y = viewportH - popoverH - 16;
    }
    // 위 넘침
    if (y < 16) y = 16;

    setPopoverPos({ x, y });
    setHoveredStock(stock);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredStock(null);
    }, 150);
  }, []);

  const handleNavigate = useCallback((symbol: string) => {
    setHoveredStock(null);
    router.push(`/stock/${encodeURIComponent(symbol)}`);
  }, [router]);

  const rects = useMemo(() => {
    if (stocks.length === 0) return [];
    const totalMcap = stocks.reduce((s, st) => s + (st.marketCap || 0), 0);
    if (totalMcap === 0) return [];

    const weighted = stocks
      .filter((s) => (s.marketCap || 0) > 0)
      .map((s) => ({ ...s, weight: (s.marketCap || 0) / totalMcap }))
      .sort((a, b) => b.weight - a.weight);

    return squarify(weighted, 0, 0, 100, 100);
  }, [stocks]);

  if (isLoading) return <Skeleton className="h-[350px] w-full rounded-lg" />;
  if (rects.length === 0) return null;

  return (
    <>
      <div ref={containerRef} className="relative w-full" style={{ aspectRatio: "16/9" }}>
        {rects.map((rect) => {
          const pct = rect.stock.changePercent;
          const bg = getHeatmapColor(pct);
          const txtColor = getTextColor(pct);
          const area = rect.w * rect.h;
          const showPercent = area > 80;
          const showName = area > 20;
          const isHovered = hoveredStock?.symbol === rect.stock.symbol;

          return (
            <div
              key={rect.stock.symbol}
              onClick={() => handleNavigate(rect.stock.symbol)}
              onMouseEnter={(e) => handleMouseEnter(rect.stock, e)}
              onMouseLeave={handleMouseLeave}
              className="absolute cursor-pointer flex flex-col items-center justify-center overflow-hidden border border-black/30 dark:border-black/50 transition-all"
              style={{
                left: `${rect.x}%`,
                top: `${rect.y}%`,
                width: `${rect.w}%`,
                height: `${rect.h}%`,
                backgroundColor: bg,
                color: txtColor,
                filter: isHovered ? "brightness(1.3)" : undefined,
                zIndex: isHovered ? 10 : undefined,
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

      {/* 호버 팝오버 */}
      {hoveredStock && (
        <HoverCard
          stock={hoveredStock}
          position={popoverPos}
          onNavigate={handleNavigate}
        />
      )}
    </>
  );
}
