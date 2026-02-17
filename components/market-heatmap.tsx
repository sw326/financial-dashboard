"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown } from "lucide-react";

function getHeatmapColor(pct: number): string {
  if (pct >= 3) return "#2d8c3c";
  if (pct >= 2) return "#245f30";
  if (pct >= 1) return "#1e3a28";
  if (pct > 0) return "#2a3a2e";
  if (pct === 0) return "#2a2a2e";
  if (pct > -1) return "#3a2a2a";
  if (pct > -2) return "#4a2028";
  if (pct > -3) return "#6b2030";
  return "#8b1a2b";
}

const LEGEND_COLORS = [
  { label: "-3%", color: "#8b1a2b" },
  { label: "-2%", color: "#6b2030" },
  { label: "-1%", color: "#4a2028" },
  { label: "0%", color: "#2a2a2e" },
  { label: "+1%", color: "#1e3a28" },
  { label: "+2%", color: "#245f30" },
  { label: "+3%", color: "#2d8c3c" },
];

function getTextColor(): string {
  return "#ffffff";
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
  sector?: string;
}

interface WeightedItem {
  weight: number;
}

interface TreemapRect<T extends WeightedItem> {
  x: number;
  y: number;
  w: number;
  h: number;
  item: T;
}

function squarify<T extends WeightedItem>(
  items: T[],
  x: number, y: number, w: number, h: number
): TreemapRect<T>[] {
  if (items.length === 0) return [];
  if (items.length === 1) return [{ x, y, w, h, item: items[0] }];

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

interface SectorGroup extends WeightedItem {
  name: string;
  stocks: (HeatmapStock & { weight: number })[];
  totalMcap: number;
}

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
      style={{ left: position.x, top: position.y }}
      onClick={(e) => { e.stopPropagation(); onNavigate(stock.symbol); }}
    >
      <div className="cursor-pointer hover:opacity-80 transition-opacity">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="font-semibold text-sm text-foreground truncate">{stock.name}</span>
          <span className="text-xs text-muted-foreground shrink-0">{stock.symbol}</span>
        </div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-lg font-bold tabular-nums text-foreground">
            {isKR ? stock.price.toLocaleString() : stock.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
          <div className={`flex items-center gap-1 text-sm font-semibold ${isUp ? "text-green-500" : "text-red-500"}`}>
            {isUp ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            <span className="tabular-nums">{isUp ? "+" : ""}{stock.changePercent.toFixed(2)}%</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>시총 {fmtKrw(stock.marketCap)}</span>
          <span className="px-1.5 py-0.5 rounded bg-muted text-[10px]">
            {stock.sector || stock.market}
          </span>
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

  const [hoveredStock, setHoveredStock] = useState<HeatmapStock | null>(null);
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 });
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback((stock: HeatmapStock, e: React.MouseEvent) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const popoverW = 240;
    const popoverH = 120;
    let x = rect.right + 8;
    let y = rect.top;
    if (x + popoverW > viewportW - 16) x = rect.left - popoverW - 8;
    if (y + popoverH > viewportH - 16) y = viewportH - popoverH - 16;
    if (y < 16) y = 16;
    setPopoverPos({ x, y });
    setHoveredStock(stock);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => setHoveredStock(null), 150);
  }, []);

  const handleNavigate = useCallback((symbol: string) => {
    setHoveredStock(null);
    router.push(`/stock/${encodeURIComponent(symbol)}`);
  }, [router]);

  // Build nested sector → stock treemap
  const { sectorRects, stockRects } = useMemo(() => {
    if (stocks.length === 0) return { sectorRects: [], stockRects: [] };

    const hasSectors = stocks.some((s) => s.sector);

    // If no sector info, fall back to flat treemap
    if (!hasSectors) {
      const totalMcap = stocks.reduce((s, st) => s + (st.marketCap || 0), 0);
      if (totalMcap === 0) return { sectorRects: [], stockRects: [] };
      const weighted = stocks
        .filter((s) => (s.marketCap || 0) > 0)
        .map((s) => ({ ...s, weight: (s.marketCap || 0) / totalMcap }))
        .sort((a, b) => b.weight - a.weight);
      const rects = squarify(weighted, 0, 0, 100, 100);
      return {
        sectorRects: [],
        stockRects: rects.map((r) => ({
          x: r.x, y: r.y, w: r.w, h: r.h,
          stock: r.item,
        })),
      };
    }

    // Group by sector
    const sectorMap = new Map<string, HeatmapStock[]>();
    for (const s of stocks) {
      const sec = s.sector || "기타";
      if (!sectorMap.has(sec)) sectorMap.set(sec, []);
      sectorMap.get(sec)!.push(s);
    }

    const totalMcap = stocks.reduce((s, st) => s + (st.marketCap || 0), 0);
    if (totalMcap === 0) return { sectorRects: [], stockRects: [] };

    const sectorGroups: SectorGroup[] = [];
    for (const [name, sectorStocks] of sectorMap) {
      const sectorTotalMcap = sectorStocks.reduce((s, st) => s + (st.marketCap || 0), 0);
      sectorGroups.push({
        name,
        stocks: sectorStocks
          .filter((s) => (s.marketCap || 0) > 0)
          .map((s) => ({ ...s, weight: s.marketCap || 0 }))
          .sort((a, b) => b.weight - a.weight),
        totalMcap: sectorTotalMcap,
        weight: sectorTotalMcap / totalMcap,
      });
    }
    sectorGroups.sort((a, b) => b.weight - a.weight);

    // Level 1: sector layout
    const sectorLayout = squarify(sectorGroups, 0, 0, 100, 100);

    const finalSectorRects: { x: number; y: number; w: number; h: number; name: string }[] = [];
    const finalStockRects: { x: number; y: number; w: number; h: number; stock: HeatmapStock & { weight: number } }[] = [];

    for (const sr of sectorLayout) {
      const sg = sr.item;
      finalSectorRects.push({ x: sr.x, y: sr.y, w: sr.w, h: sr.h, name: sg.name });

      // Level 2: stocks within sector
      // Normalize weights within sector
      const sectorTotal = sg.stocks.reduce((s, st) => s + st.weight, 0);
      const normalized = sg.stocks.map((s) => ({ ...s, weight: s.weight / sectorTotal }));
      const stockLayout = squarify(normalized, sr.x, sr.y, sr.w, sr.h);

      for (const stk of stockLayout) {
        finalStockRects.push({
          x: stk.x, y: stk.y, w: stk.w, h: stk.h,
          stock: stk.item,
        });
      }
    }

    return { sectorRects: finalSectorRects, stockRects: finalStockRects };
  }, [stocks]);

  if (isLoading) return <Skeleton className="h-[350px] w-full rounded-lg" />;
  if (stockRects.length === 0) return null;

  return (
    <>
      <div ref={containerRef} className="relative w-full" style={{ aspectRatio: "16/9" }}>
        {/* Sector borders & labels */}
        {sectorRects.map((sr) => {
          const area = sr.w * sr.h;
          const showLabel = area > 15;
          return (
            <div
              key={`sector-${sr.name}`}
              className="absolute pointer-events-none border-2 border-zinc-700/80 dark:border-zinc-600/80"
              style={{
                left: `${sr.x}%`,
                top: `${sr.y}%`,
                width: `${sr.w}%`,
                height: `${sr.h}%`,
                zIndex: 20,
              }}
            >
              {showLabel && (
                <div
                  className="absolute top-0 left-0 right-0 text-center text-[9px] sm:text-[11px] font-medium text-zinc-300 tracking-wide uppercase truncate"
                  style={{
                    zIndex: 25,
                    lineHeight: "16px",
                    backgroundColor: "rgba(24,24,27,0.75)",
                    borderBottom: "1px solid rgba(63,63,70,0.6)",
                  }}
                >
                  {sr.name}
                </div>
              )}
            </div>
          );
        })}

        {/* Stock cells */}
        {stockRects.map((rect) => {
          const pct = rect.stock.changePercent;
          const bg = getHeatmapColor(pct);
          const txtColor = getTextColor();
          const area = rect.w * rect.h;
          const isHovered = hoveredStock?.symbol === rect.stock.symbol;

          const isUS = !rect.stock.symbol.endsWith(".KS") && !rect.stock.symbol.endsWith(".KQ");
          const displayName = isUS
            ? rect.stock.symbol.replace(/\^/, "")
            : rect.stock.name;

          let nameFontSize: string;
          let pctFontSize: string = "";
          let showName = true;
          let showPercent = true;

          if (area > 500) {
            nameFontSize = "text-xl sm:text-2xl";
            pctFontSize = "text-base sm:text-lg";
          } else if (area > 300) {
            nameFontSize = "text-lg sm:text-xl";
            pctFontSize = "text-sm sm:text-base";
          } else if (area > 150) {
            nameFontSize = "text-sm sm:text-base";
            pctFontSize = "text-xs sm:text-sm";
          } else if (area > 80) {
            nameFontSize = "text-xs sm:text-sm";
            pctFontSize = "text-[10px] sm:text-xs";
          } else if (area > 30) {
            nameFontSize = "text-[10px] sm:text-xs";
            pctFontSize = "text-[9px] sm:text-[10px]";
          } else if (area > 10) {
            nameFontSize = "text-[8px] sm:text-[10px]";
            showPercent = false;
          } else {
            showName = false;
            showPercent = false;
            nameFontSize = "";
          }

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
                <span
                  className={`${nameFontSize} font-bold leading-tight overflow-hidden whitespace-nowrap max-w-[95%]`}
                  style={{ textOverflow: "clip", textShadow: "1px 1px 2px rgba(0,0,0,0.6), 0 0 4px rgba(0,0,0,0.3)" }}
                >
                  {displayName}
                </span>
              )}
              {showPercent && (
                <span
                  className={`${pctFontSize} tabular-nums font-semibold leading-tight whitespace-nowrap`}
                  style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.6), 0 0 4px rgba(0,0,0,0.3)" }}
                >
                  {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* 색상 범례 */}
      <div className="flex items-center justify-center gap-0 mt-2">
        {LEGEND_COLORS.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-center px-3 py-1 text-xs font-medium text-white tabular-nums"
            style={{
              backgroundColor: item.color,
              textShadow: "1px 1px 1px rgba(0,0,0,0.5)",
            }}
          >
            {item.label}
          </div>
        ))}
      </div>

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
