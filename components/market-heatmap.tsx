"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
  { label: "0%",  color: "#2a2a2e" },
  { label: "+1%", color: "#1e3a28" },
  { label: "+2%", color: "#245f30" },
  { label: "+3%", color: "#2d8c3c" },
];

const TEXT_COLOR = "#ffffff";

const fmtPrice = (v: number, isKR: boolean) => {
  if (isKR) return v.toLocaleString();
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

// 섹터 헤더 높이 (컨테이너 전체 height 기준 %)
const HEADER_PCT = 2.2;

// 팝오버 카드 배치 기준: 우측/하단 여유 공간 최소값 (% of container)
const CARD_MIN_SPACE_RIGHT = 22; // 카드 최소 너비 ~22%
const CARD_MIN_SPACE_BELOW = 35; // 카드 최대 높이 ~35%

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

// Squarified treemap — 큰 항목이 좌상단부터 배치
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

  // 가로가 넓으면 좌우 분할, 세로가 길면 상하 분할
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

interface SectorRect {
  x: number;
  y: number;
  w: number;
  h: number;
  name: string;
  headerH: number; // 이 섹터의 헤더 높이(% of container)
}

// ─────────────────────────────────────────────────────────────
// SectorHoverCard — 섹터 내 종목 리스트 팝오버
// ─────────────────────────────────────────────────────────────
function SectorHoverCard({
  sectorName,
  stocks,
  position,
  onNavigate,
  onMouseEnter,
  onMouseLeave,
}: {
  sectorName: string;
  stocks: HeatmapStock[];
  position: { x: number; y: number; side: "right" | "left"; vSide: "down" | "up" };
  onNavigate: (symbol: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const sorted = [...stocks].sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
  const display = sorted.slice(0, 15);
  const remaining = sorted.length - display.length;

  return (
    <div
      className="absolute z-50 pointer-events-auto bg-popover border border-border rounded-lg shadow-xl p-3 min-w-[260px] max-w-[300px]"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: `${position.side === "left" ? "translateX(-100%)" : ""} ${position.vSide === "up" ? "translateY(-100%)" : ""}`.trim() || undefined,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
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

// ─────────────────────────────────────────────────────────────
// MarketHeatmap
// ─────────────────────────────────────────────────────────────
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
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  const [hoveredSector, setHoveredSector] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0, side: "right" as "right" | "left", vSide: "down" as "down" | "up" });

  // 마우스 leave 딜레이 — 카드로 이동할 시간 확보
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLeaveTimer = useCallback(() => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
  }, []);

  const scheduleHide = useCallback(() => {
    leaveTimerRef.current = setTimeout(() => setHoveredSector(null), 350);
  }, []);

  // 섹터 rect 옆에 카드 배치 (% 좌표 — 컨테이너 기준 absolute)
  const sectorRectsRef = useRef<typeof sectorRects>([]);
  // hoveredSector ref — handleStockMouseEnter의 stale closure 방지
  const hoveredSectorRef = useRef<string | null>(null);
  hoveredSectorRef.current = hoveredSector;

  const positionCardBySector = useCallback((sectorName: string) => {
    const sr = sectorRectsRef.current.find((r) => r.name === sectorName);
    if (!sr) return;

    // 우측/하단 공간 체크
    const spaceRight = 100 - (sr.x + sr.w);
    const goRight = spaceRight > CARD_MIN_SPACE_RIGHT;
    const spaceBelow = 100 - (sr.y + sr.h);
    const goDown = spaceBelow > CARD_MIN_SPACE_BELOW;

    const x = goRight ? sr.x + sr.w : sr.x;
    const y = goDown ? sr.y : sr.y + sr.h; // 하단: 섹터 상단부터, 상단: 섹터 하단부터 (위로)

    setPopoverPos({ x, y, side: goRight ? "right" : "left", vSide: goDown ? "down" : "up" });
  }, []);

  const handleStockMouseEnter = useCallback((stock: HeatmapStock, e: React.MouseEvent) => {
    void e;
    clearLeaveTimer();
    const sec = stock.sector || stock.market || null;
    if (sec) positionCardBySector(sec);
    // hoveredSectorRef로 최신값 참조 → hoveredSector 의존성 제거, 불필요한 재생성 방지
    if (sec !== hoveredSectorRef.current) {
      setHoveredSector(sec);
    }
  }, [clearLeaveTimer, positionCardBySector]);

  const handleStockMouseLeave = useCallback(() => {
    scheduleHide();
  }, [scheduleHide]);

  // 섹터 헤더 hover 핸들러
  const handleSectorHeaderEnter = useCallback((sectorName: string) => {
    clearLeaveTimer();
    positionCardBySector(sectorName);
    setHoveredSector(sectorName);
  }, [clearLeaveTimer, positionCardBySector]);

  const handleSectorHeaderLeave = useCallback(() => {
    scheduleHide();
  }, [scheduleHide]);

  const handleNavigate = useCallback((symbol: string) => {
    setHoveredSector(null);
    router.push(`/stock/${encodeURIComponent(symbol)}`);
  }, [router]);

  // sector → stocks 맵 (팝오버용)
  const sectorStocksMap = useMemo(() => {
    const map = new Map<string, HeatmapStock[]>();
    for (const s of stocks) {
      const sec = s.sector || s.market || "기타";
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec)!.push(s);
    }
    return map;
  }, [stocks]);

  // Treemap 계산
  const { sectorRects, stockRects } = useMemo(() => {
    if (stocks.length === 0) return { sectorRects: [] as SectorRect[], stockRects: [] as { x: number; y: number; w: number; h: number; stock: HeatmapStock & { weight: number } }[] };

    const hasSectors = stocks.some((s) => s.sector);

    // 섹터 정보 없으면 flat treemap
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
        stockRects: rects.map((r) => ({ x: r.x, y: r.y, w: r.w, h: r.h, stock: r.item })),
      };
    }

    // 섹터 그룹 구성
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
          .sort((a, b) => b.weight - a.weight), // 큰 종목 먼저
        totalMcap: sectorTotalMcap,
        weight: sectorTotalMcap / totalMcap,
      });
    }
    // 큰 섹터가 좌상단에 오도록 내림차순 정렬하되, "기타"는 항상 맨 뒤로
    sectorGroups.sort((a, b) => {
      const aIsOther = a.name === "기타" || a.name === "Other";
      const bIsOther = b.name === "기타" || b.name === "Other";
      if (aIsOther && !bIsOther) return 1;  // "기타"가 뒤로
      if (!aIsOther && bIsOther) return -1;
      return b.weight - a.weight;
    });

    // Level 1: 섹터 레이아웃 (큰 섹터부터 좌상단에 배치)
    const sectorLayout = squarify(sectorGroups, 0, 0, 100, 100);

    const SECTOR_PAD = 0.2; // 섹터 간 간격 (%)
    const finalSectorRects: SectorRect[] = [];
    const finalStockRects: { x: number; y: number; w: number; h: number; stock: HeatmapStock & { weight: number } }[] = [];

    for (const sr of sectorLayout) {
      const sg = sr.item;
      const px = sr.x + SECTOR_PAD;
      const py = sr.y + SECTOR_PAD;
      const pw = sr.w - SECTOR_PAD * 2;
      const ph = sr.h - SECTOR_PAD * 2;

      // 헤더 높이: 섹터가 충분히 크면 HEADER_PCT, 너무 작으면 섹터 높이의 20% (최소 0)
      const headerH = ph > HEADER_PCT * 2 ? Math.min(HEADER_PCT, ph * 0.25) : 0;

      finalSectorRects.push({ x: px, y: py, w: pw, h: ph, name: sg.name, headerH });

      // Level 2: 종목은 헤더 아래 영역에서만 배치
      const stockAreaY = py + headerH;
      const stockAreaH = ph - headerH;

      if (stockAreaH <= 0 || sg.stocks.length === 0) continue;

      const sectorTotal = sg.stocks.reduce((s, st) => s + st.weight, 0);
      const normalized = sg.stocks.map((s) => ({ ...s, weight: s.weight / sectorTotal }));
      const stockLayout = squarify(normalized, px, stockAreaY, pw, stockAreaH);

      for (const stk of stockLayout) {
        finalStockRects.push({
          x: stk.x, y: stk.y, w: stk.w, h: stk.h,
          stock: stk.item,
        });
      }
    }

    return { sectorRects: finalSectorRects, stockRects: finalStockRects };
  }, [stocks]);

  sectorRectsRef.current = sectorRects;

  // Track actual pixel size of the heatmap container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setContainerSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (isLoading) return <Skeleton className="h-[350px] w-full rounded-lg" />;
  if (stockRects.length === 0) return null;

  return (
    <>
      <div ref={containerRef} className="relative w-full bg-zinc-900 overflow-visible" style={{ aspectRatio: "16/9" }}>

        {/* ── 섹터 border 프레임 (pointer-events: none) ── */}
        {sectorRects.map((sr) => {
          const isHovered = hoveredSector === sr.name;
          return (
            <div
              key={`border-${sr.name}`}
              className={cn(
                "absolute border-2 transition-colors duration-150",
                isHovered ? "border-amber-400/90" : "border-zinc-700/60"
              )}
              style={{
                left: `${sr.x}%`,
                top: `${sr.y}%`,
                width: `${sr.w}%`,
                height: `${sr.h}%`,
                zIndex: 20,
                pointerEvents: "none",
              }}
            />
          );
        })}

        {/* ── 섹터 헤더 바 (종목 타일 위, 별도 바) ── */}
        {sectorRects.map((sr) => {
          if (sr.headerH <= 0) return null;
          const isHovered = hoveredSector === sr.name;
          const area = sr.w * sr.h;
          if (area < 8) return null; // 너무 작은 섹터는 헤더 생략

          return (
            <div
              key={`header-${sr.name}`}
              className="absolute flex items-center px-1.5 truncate cursor-default select-none"
              style={{
                left: `${sr.x}%`,
                top: `${sr.y}%`,
                width: `${sr.w}%`,
                height: `${sr.headerH}%`,
                backgroundColor: isHovered
                  ? "rgba(30,30,34,1)"
                  : "rgba(24,24,27,0.88)",
                borderBottom: `1px solid ${isHovered ? "rgba(251,191,36,0.5)" : "rgba(63,63,70,0.6)"}`,
                zIndex: 25,
                transition: "background-color 0.15s",
              }}
              onMouseEnter={() => handleSectorHeaderEnter(sr.name)}
              onMouseLeave={handleSectorHeaderLeave}
            >
              <span
                className={cn(
                  "font-medium leading-none truncate",
                  (sr.w / 100) * (containerSize.w || 1200) < 60 ? "text-[7px]" : (sr.w / 100) * (containerSize.w || 1200) < 100 ? "text-[9px]" : "text-[11px]",
                  isHovered ? "text-amber-300" : "text-zinc-300"
                )}
              >
                {sr.name}
              </span>
            </div>
          );
        })}

        {/* ── 종목 셀 ── */}
        {stockRects.map((rect) => {
          const pct = rect.stock.changePercent;
          const bg = getHeatmapColor(pct);
          const isSectorHovered = hoveredSector === (rect.stock.sector || rect.stock.market);

          const isUS = !rect.stock.symbol.endsWith(".KS") && !rect.stock.symbol.endsWith(".KQ");
          const displayName = isUS
            ? rect.stock.symbol.replace(/\^/, "")
            : rect.stock.name;

          // Responsive: use actual pixel width/height of the cell
          const cw = containerSize.w || 1200;
          const ch = containerSize.h || 675;
          const pxW = (rect.w / 100) * cw;
          const pxH = (rect.h / 100) * ch;

          let nameFontSize: string;
          let pctFontSize = "";
          let showName = true;
          let showPercent = true;

          // Mobile: much more aggressive hiding
          const isMobile = cw < 640;
          const wThresh = isMobile ? 1.8 : 1;
          const hThresh = isMobile ? 1.8 : 1;

          // Width/height determines what text can fit without overflow
          if (pxW >= 160 * wThresh && pxH >= 60 * hThresh) {
            nameFontSize = "text-base";
            pctFontSize = "text-sm";
          } else if (pxW >= 120 * wThresh && pxH >= 48 * hThresh) {
            nameFontSize = "text-sm";
            pctFontSize = "text-xs";
          } else if (pxW >= 90 * wThresh && pxH >= 40 * hThresh) {
            nameFontSize = "text-xs";
            pctFontSize = "text-[10px]";
          } else if (pxW >= 65 * wThresh && pxH >= 30 * hThresh) {
            // Name only, no percent
            nameFontSize = "text-xs";
            showPercent = false;
          } else if (pxW >= 45 * wThresh && pxH >= 20 * hThresh) {
            nameFontSize = "text-[10px]";
            showPercent = false;
          } else if (pxW >= 30 * wThresh && pxH >= 14 * hThresh) {
            nameFontSize = "text-[8px]";
            showPercent = false;
          } else {
            // Too small: blank
            showName = false;
            showPercent = false;
            nameFontSize = "";
          }

          return (
            <div
              key={rect.stock.symbol}
              onClick={() => handleNavigate(rect.stock.symbol)}
              onMouseEnter={(e) => handleStockMouseEnter(rect.stock, e)}
              onMouseLeave={handleStockMouseLeave}
              className="absolute cursor-pointer flex flex-col items-center justify-center overflow-hidden border border-black/30 dark:border-black/50 transition-all"
              style={{
                left: `${rect.x}%`,
                top: `${rect.y}%`,
                width: `${rect.w}%`,
                height: `${rect.h}%`,
                backgroundColor: bg,
                color: TEXT_COLOR,
                filter: isSectorHovered ? "brightness(1.15)" : undefined,
                zIndex: isSectorHovered ? 10 : undefined,
              }}
            >
              {showName && (
                <span
                  className={`${nameFontSize} font-bold leading-tight overflow-hidden whitespace-nowrap max-w-[95%]`}
                  style={{
                    textOverflow: "clip",
                    textShadow: "1px 1px 2px rgba(0,0,0,0.6), 0 0 4px rgba(0,0,0,0.3)",
                  }}
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

        {/* 섹터 팝오버 카드 — 컨테이너 내부 absolute 배치 */}
        {hoveredSector && sectorStocksMap.has(hoveredSector) && (
          <SectorHoverCard
            sectorName={hoveredSector}
            stocks={sectorStocksMap.get(hoveredSector)!}
            position={popoverPos}
            onNavigate={handleNavigate}
            onMouseEnter={clearLeaveTimer}
            onMouseLeave={() => setHoveredSector(null)}
          />
        )}
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

    </>
  );
}
