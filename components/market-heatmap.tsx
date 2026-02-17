"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

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

const fmtPrice = (v: number, isKR: boolean) => {
  if (isKR) return v.toLocaleString();
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
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

// Sector hover card - shows list of stocks in that sector
function SectorHoverCard({
  sectorName,
  stocks,
  position,
  onNavigate,
}: {
  sectorName: string;
  stocks: HeatmapStock[];
  position: { x: number; y: number };
  onNavigate: (symbol: string) => void;
}) {
  const sorted = [...stocks].sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
  const display = sorted.slice(0, 15);
  const remaining = sorted.length - display.length;

  return (
    <div
      className="fixed z-50 pointer-events-auto bg-popover border border-border rounded-lg shadow-xl p-3 min-w-[260px] max-w-[340px]"
      style={{ left: position.x, top: position.y }}
    >
      <div className="font-semibold text-sm text-foreground mb-2 pb-1.5 border-b border-border">
        {sectorName}
        <span className="text-xs text-muted-foreground ml-2">({stocks.length}종목)</span>
      </div>
      <div className="space-y-0.5 max-h-[320px] overflow-y-auto">
        {display.map((stock) => {
          const isKR = stock.symbol.endsWith(".KS") || stock.symbol.endsWith(".KQ");
          const isUp = stock.changePercent >= 0;
          return (
            <div
              key={stock.symbol}
              className="flex items-center justify-between gap-2 py-0.5 px-1 rounded hover:bg-muted/50 cursor-pointer text-xs"
              onClick={(e) => { e.stopPropagation(); onNavigate(stock.symbol); }}
            >
              <span className="truncate text-foreground font-medium flex-1 min-w-0">
                {stock.name}
              </span>
              <span className="tabular-nums text-muted-foreground shrink-0">
                {fmtPrice(stock.price, isKR)}
              </span>
              <span className={`tabular-nums font-semibold shrink-0 w-[52px] text-right ${isUp ? "text-red-500" : "text-blue-500"}`}>
                {isUp ? "+" : ""}{stock.changePercent.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
      {remaining > 0 && (
        <div className="text-[10px] text-muted-foreground mt-1.5 text-center">
          외 {remaining}개
        </div>
      )}
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

  const [hoveredSector, setHoveredSector] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 });
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback((stock: HeatmapStock, e: React.MouseEvent) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const popoverW = 320;
    const popoverH = 300;
    let x = rect.right + 8;
    let y = rect.top;
    if (x + popoverW > viewportW - 16) x = rect.left - popoverW - 8;
    if (y + popoverH > viewportH - 16) y = viewportH - popoverH - 16;
    if (y < 16) y = 16;
    setPopoverPos({ x, y });
    setHoveredSector(stock.sector || stock.market || null);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => setHoveredSector(null), 150);
  }, []);

  const handleNavigate = useCallback((symbol: string) => {
    setHoveredSector(null);
    router.push(`/stock/${encodeURIComponent(symbol)}`);
  }, [router]);

  // Build sector → stock map for hover card
  const sectorStocksMap = useMemo(() => {
    const map = new Map<string, HeatmapStock[]>();
    for (const s of stocks) {
      const sec = s.sector || s.market || "기타";
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec)!.push(s);
    }
    return map;
  }, [stocks]);

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

    const SECTOR_PAD = 0.2; // 0.2% padding on each side for sector gaps
    const finalSectorRects: { x: number; y: number; w: number; h: number; name: string }[] = [];
    const finalStockRects: { x: number; y: number; w: number; h: number; stock: HeatmapStock & { weight: number } }[] = [];

    for (const sr of sectorLayout) {
      const sg = sr.item;
      // Inset sector rect for visual gap between sectors
      const px = sr.x + SECTOR_PAD;
      const py = sr.y + SECTOR_PAD;
      const pw = sr.w - SECTOR_PAD * 2;
      const ph = sr.h - SECTOR_PAD * 2;

      finalSectorRects.push({ x: px, y: py, w: pw, h: ph, name: sg.name });

      // Level 2: stocks within padded sector area
      const sectorTotal = sg.stocks.reduce((s, st) => s + st.weight, 0);
      const normalized = sg.stocks.map((s) => ({ ...s, weight: s.weight / sectorTotal }));
      const stockLayout = squarify(normalized, px, py, pw, ph);

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
      <div ref={containerRef} className="relative w-full bg-zinc-900" style={{ aspectRatio: "16/9" }}>
        {/* Sector borders & labels */}
        {sectorRects.map((sr) => {
          const area = sr.w * sr.h;
          const showLabel = area > 15;
          const isHovered = hoveredSector === sr.name;
          return (
            <div
              key={`sector-${sr.name}`}
              className={`absolute border-2 transition-colors duration-150 ${
                isHovered
                  ? "border-amber-400/90 dark:border-amber-400/80"
                  : "border-zinc-700/80 dark:border-zinc-600/60"
              }`}
              style={{
                left: `${sr.x}%`,
                top: `${sr.y}%`,
                width: `${sr.w}%`,
                height: `${sr.h}%`,
                zIndex: 20,
                pointerEvents: "none",
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
          const isSectorHovered = hoveredSector === (rect.stock.sector || rect.stock.market);

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
                filter: isSectorHovered ? "brightness(1.15)" : undefined,
                zIndex: isSectorHovered ? 10 : undefined,
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

      {hoveredSector && sectorStocksMap.has(hoveredSector) && (
        <SectorHoverCard
          sectorName={hoveredSector}
          stocks={sectorStocksMap.get(hoveredSector)!}
          position={popoverPos}
          onNavigate={handleNavigate}
        />
      )}
    </>
  );
}
