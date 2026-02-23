"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

// ─── 고정 SVG 뷰포트 (이미지처럼 비율 유지, ResizeObserver 불필요) ───
const VP_W = 1200;
const VP_H = 675;
const SECTOR_GAP = 2;       // 섹터 간 간격 (px)
const HEADER_H = 24;         // 섹터 헤더 높이 (px)
const HEADER_MIN_W = 50;
const HEADER_MIN_H = 36;
const CARD_SPACE_RIGHT = 22; // 팝오버 우측 공간 최소 %
const CARD_SPACE_BELOW = 35; // 팝오버 하단 공간 최소 %

function color(pct: number): string {
  if (pct >= 3) return "#2d8c3c";
  if (pct >= 2) return "#245f30";
  if (pct >= 1) return "#1e4a2a";
  if (pct > 0)  return "#1a2e22";
  if (pct === 0) return "#27272a";
  if (pct > -1) return "#3a1e1e";
  if (pct > -2) return "#5a1e28";
  if (pct > -3) return "#6b2030";
  return "#8b1a2b";
}

const LEGEND = [
  { label: "-3%", color: "#8b1a2b" },
  { label: "-2%", color: "#6b2030" },
  { label: "-1%", color: "#5a1e28" },
  { label: "0%",  color: "#27272a" },
  { label: "+1%", color: "#1a2e22" },
  { label: "+2%", color: "#245f30" },
  { label: "+3%", color: "#2d8c3c" },
];

// ─── 타입 ───
interface HeatmapStock {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  marketCap: number;
  market: string;
  sector?: string;
}
interface WeightedItem { weight: number; }
type R<T> = { x: number; y: number; w: number; h: number; item: T };
interface SectorRect { x: number; y: number; w: number; h: number; name: string; }
type StockRect = { x: number; y: number; w: number; h: number; stock: HeatmapStock & { weight: number } };

// ─── Squarified Treemap (픽셀 좌표) ───
function squarify<T extends WeightedItem>(items: T[], x: number, y: number, w: number, h: number): R<T>[] {
  if (items.length === 0) return [];
  if (items.length === 1) return [{ x, y, w, h, item: items[0] }];

  const total = items.reduce((s, i) => s + i.weight, 0);
  if (total === 0) return [];

  let bestSplit = 1, bestDiff = Infinity, sum = 0;
  for (let i = 0; i < items.length - 1; i++) {
    sum += items[i].weight;
    const d = Math.abs(sum / total - 0.5);
    if (d < bestDiff) { bestDiff = d; bestSplit = i + 1; }
  }

  const left = items.slice(0, bestSplit);
  const right = items.slice(bestSplit);
  const ratio = left.reduce((s, i) => s + i.weight, 0) / total;

  if (w >= h) {
    const sx = w * ratio;
    return [...squarify(left, x, y, sx, h), ...squarify(right, x + sx, y, w - sx, h)];
  } else {
    const sy = h * ratio;
    return [...squarify(left, x, y, w, sy), ...squarify(right, x, y + sy, w, h - sy)];
  }
}

// ─── 섹터 팝오버 ───
function SectorPopover({
  sectorName, stocks, cssX, cssY, side, vSide, onNavigate, onMouseEnter, onMouseLeave,
}: {
  sectorName: string; stocks: HeatmapStock[];
  cssX: number; cssY: number;
  side: "right" | "left"; vSide: "down" | "up";
  onNavigate: (sym: string) => void;
  onMouseEnter: () => void; onMouseLeave: () => void;
}) {
  const sorted = [...stocks].sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
  const display = sorted.slice(0, 15);
  const rest = sorted.length - display.length;

  return (
    <div
      className="absolute z-50 pointer-events-auto bg-popover border border-border rounded-lg shadow-xl p-3 min-w-[260px] max-w-[300px]"
      style={{
        left: `${cssX}%`,
        top: `${cssY}%`,
        transform: [side === "left" && "translateX(-100%)", vSide === "up" && "translateY(-100%)"]
          .filter(Boolean).join(" ") || undefined,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="font-semibold text-sm mb-2 pb-1.5 border-b border-border">
        {sectorName}
        <span className="text-xs text-muted-foreground ml-2">({stocks.length}종목)</span>
      </div>
      <div className="space-y-0.5 max-h-[320px] overflow-y-auto">
        {display.map(s => {
          const isKR = s.symbol.endsWith(".KS") || s.symbol.endsWith(".KQ");
          const up = s.changePercent >= 0;
          return (
            <div
              key={s.symbol}
              className="flex items-center justify-between gap-2 py-0.5 px-1 rounded hover:bg-muted/50 cursor-pointer text-xs"
              onClick={e => { e.stopPropagation(); onNavigate(s.symbol); }}
            >
              <span className="truncate font-medium flex-1 min-w-0">{s.name}</span>
              <span className="tabular-nums text-muted-foreground shrink-0">
                {isKR ? s.price.toLocaleString() : s.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              <span className={`tabular-nums font-semibold shrink-0 w-[52px] text-right ${up ? "text-red-400" : "text-blue-400"}`}>
                {up ? "+" : ""}{s.changePercent.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
      {rest > 0 && <p className="text-[10px] text-muted-foreground mt-1.5 text-center">외 {rest}개</p>}
    </div>
  );
}

// ─── 메인 컴포넌트 ───
export default function MarketHeatmap({ market = "all" }: { market?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["heatmap", market],
    queryFn: async () => {
      const r = await fetch(`/api/finance/heatmap?market=${market}`);
      if (!r.ok) throw new Error("Failed");
      return r.json() as Promise<{ stocks: HeatmapStock[]; total: number }>;
    },
    staleTime: 300_000,
  });

  const router = useRouter();
  const stocks = data?.stocks || [];

  const [hovered, setHovered] = useState<string | null>(null);
  const [popover, setPopover] = useState({ x: 0, y: 0, side: "right" as "right" | "left", vSide: "down" as "down" | "up" });
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectorRectsRef = useRef<SectorRect[]>([]);
  const hoveredRef = useRef<string | null>(null);
  hoveredRef.current = hovered;

  const clearTimer = useCallback(() => { if (leaveTimer.current) clearTimeout(leaveTimer.current); }, []);
  const scheduleHide = useCallback(() => { leaveTimer.current = setTimeout(() => setHovered(null), 350); }, []);

  const positionPopover = useCallback((name: string) => {
    const sr = sectorRectsRef.current.find(r => r.name === name);
    if (!sr) return;
    // SVG 픽셀 → CSS % 변환
    const sx = (sr.x / VP_W) * 100, sy = (sr.y / VP_H) * 100;
    const sw = (sr.w / VP_W) * 100, sh = (sr.h / VP_H) * 100;
    const goRight = 100 - (sx + sw) > CARD_SPACE_RIGHT;
    const goDown = 100 - (sy + sh) > CARD_SPACE_BELOW;
    setPopover({
      x: goRight ? sx + sw : sx,
      y: goDown ? sy : sy + sh,
      side: goRight ? "right" : "left",
      vSide: goDown ? "down" : "up",
    });
  }, []);

  const sectorStocksMap = useMemo(() => {
    const m = new Map<string, HeatmapStock[]>();
    for (const s of stocks) {
      const sec = s.sector || s.market || "기타";
      if (!m.has(sec)) m.set(sec, []);
      m.get(sec)!.push(s);
    }
    return m;
  }, [stocks]);

  const { sectorRects, stockRects } = useMemo((): { sectorRects: SectorRect[]; stockRects: StockRect[] } => {
    if (!stocks.length) return { sectorRects: [], stockRects: [] };

    const totalMcap = stocks.reduce((s, st) => s + (st.marketCap || 0), 0);
    if (!totalMcap) return { sectorRects: [], stockRects: [] };

    const hasSectors = stocks.some(s => s.sector);

    // 섹터 정보 없으면 flat treemap
    if (!hasSectors) {
      const ws = stocks.filter(s => s.marketCap > 0)
                       .map(s => ({ ...s, weight: s.marketCap / totalMcap }))
                       .sort((a, b) => b.weight - a.weight);
      return {
        sectorRects: [],
        stockRects: squarify(ws, 0, 0, VP_W, VP_H).map(r => ({ x: r.x, y: r.y, w: r.w, h: r.h, stock: r.item })),
      };
    }

    // 섹터 그룹핑
    const sectorMap = new Map<string, HeatmapStock[]>();
    for (const s of stocks) {
      const sec = s.sector || "기타";
      if (!sectorMap.has(sec)) sectorMap.set(sec, []);
      sectorMap.get(sec)!.push(s);
    }

    const groups = Array.from(sectorMap.entries()).map(([name, ss]) => ({
      name,
      stocks: ss.filter(s => s.marketCap > 0).map(s => ({ ...s, weight: s.marketCap })).sort((a, b) => b.weight - a.weight),
      weight: ss.reduce((s, st) => s + (st.marketCap || 0), 0) / totalMcap,
    })).sort((a, b) => {
      if (a.name === "기타") return 1;
      if (b.name === "기타") return -1;
      return b.weight - a.weight;
    });

    const layout = squarify(groups, 0, 0, VP_W, VP_H);
    const finalSectors: SectorRect[] = [];
    const finalStocks: StockRect[] = [];

    for (const sr of layout) {
      const g = sr.item;
      const px = sr.x + SECTOR_GAP, py = sr.y + SECTOR_GAP;
      const pw = sr.w - SECTOR_GAP * 2, ph = sr.h - SECTOR_GAP * 2;
      if (pw <= 0 || ph <= 0) continue;

      const showHeader = pw >= HEADER_MIN_W && ph >= HEADER_MIN_H;
      const hH = showHeader ? HEADER_H : 0;

      finalSectors.push({ x: px, y: py, w: pw, h: ph, name: g.name });

      const stockY = py + hH, stockH = ph - hH;
      if (stockH <= 0 || !g.stocks.length) continue;

      const tot = g.stocks.reduce((s, st) => s + st.weight, 0);
      const norm = g.stocks.map(s => ({ ...s, weight: s.weight / tot }));
      squarify(norm, px, stockY, pw, stockH).forEach(r =>
        finalStocks.push({ x: r.x, y: r.y, w: r.w, h: r.h, stock: r.item })
      );
    }

    return { sectorRects: finalSectors, stockRects: finalStocks };
  }, [stocks]);

  sectorRectsRef.current = sectorRects;

  const handleNavigate = useCallback((sym: string) => {
    setHovered(null);
    router.push(`/stock/${encodeURIComponent(sym)}`);
  }, [router]);

  if (isLoading) return <Skeleton className="h-[350px] w-full rounded-lg" />;
  if (!stockRects.length) return null;

  return (
    <div className="space-y-2">
      {/* SVG 뷰포트 고정 — 화면 축소 시 이미지처럼 비율 유지 */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${VP_W} ${VP_H}`}
          width="100%"
          style={{ display: "block" }}
          className="bg-zinc-900 rounded-lg"
        >
          <defs>
            {stockRects.map(r => (
              <clipPath key={`cp-${r.stock.symbol}`} id={`cp-${r.stock.symbol}`}>
                <rect x={r.x + 1} y={r.y + 1} width={r.w - 2} height={r.h - 2} />
              </clipPath>
            ))}
          </defs>

          {/* ── 종목 셀 ── */}
          {stockRects.map(rect => {
            const pct = rect.stock.changePercent;
            const bg = color(pct);
            const isUS = !rect.stock.symbol.endsWith(".KS") && !rect.stock.symbol.endsWith(".KQ");
            const label = isUS ? rect.stock.symbol.replace(/\^/, "") : rect.stock.name;
            const sec = rect.stock.sector || rect.stock.market;
            const isHovered = hovered === sec;

            // 셀 크기 기반 텍스트 크기 (SVG 픽셀 = 뷰포트 픽셀 → 스케일 무관)
            const namePx = Math.min(rect.w * 0.13, rect.h * 0.28, 18);
            const pctPx  = Math.min(namePx * 0.78, 13);
            const showName = namePx >= 9 && rect.w >= 38;
            const showPct  = pctPx >= 7 && rect.h >= 28 && rect.w >= 32;

            const cx = rect.x + rect.w / 2;
            const cy = rect.y + rect.h / 2;
            const nameY = (showName && showPct) ? cy - pctPx * 0.7 : cy;
            const pctY  = (showName && showPct) ? cy + namePx * 0.7 : cy;

            return (
              <g
                key={rect.stock.symbol}
                onClick={() => handleNavigate(rect.stock.symbol)}
                onMouseEnter={() => {
                  clearTimer();
                  if (sec && sec !== hoveredRef.current) { positionPopover(sec); setHovered(sec); }
                }}
                onMouseLeave={scheduleHide}
                style={{ cursor: "pointer" }}
              >
                <rect
                  x={rect.x} y={rect.y} width={rect.w} height={rect.h}
                  fill={bg}
                  stroke="#00000055" strokeWidth={0.5}
                  fillOpacity={isHovered ? 1 : 0.9}
                />
                {showName && (
                  <text
                    x={cx} y={nameY}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="white" fontSize={namePx} fontWeight="700"
                    clipPath={`url(#cp-${rect.stock.symbol})`}
                    style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }}
                  >
                    {label}
                  </text>
                )}
                {showPct && (
                  <text
                    x={cx} y={pctY}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="white" fontSize={pctPx} fontWeight="600"
                    clipPath={`url(#cp-${rect.stock.symbol})`}
                    style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.6))" }}
                  >
                    {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
                  </text>
                )}
              </g>
            );
          })}

          {/* ── 섹터 헤더 (Finviz 스타일: 진한 배경 + 굵은 텍스트) ── */}
          {sectorRects.map(sr => {
            const show = sr.w >= HEADER_MIN_W && sr.h >= HEADER_MIN_H;
            if (!show) return null;
            const isHov = hovered === sr.name;
            // 섹터 너비에 따라 폰트 크기 조절
            const fs = sr.w < 80 ? 9 : sr.w < 160 ? 12 : sr.w < 280 ? 14 : 16;
            return (
              <g
                key={`hdr-${sr.name}`}
                onMouseEnter={() => { clearTimer(); positionPopover(sr.name); setHovered(sr.name); }}
                onMouseLeave={scheduleHide}
                style={{ cursor: "default" }}
              >
                {/* 헤더 배경 */}
                <rect
                  x={sr.x} y={sr.y} width={sr.w} height={HEADER_H}
                  fill={isHov ? "#1c1c20" : "#131316"}
                />
                {/* 하단 구분선 */}
                <line
                  x1={sr.x} y1={sr.y + HEADER_H}
                  x2={sr.x + sr.w} y2={sr.y + HEADER_H}
                  stroke={isHov ? "#fbbf24" : "#3f3f46"}
                  strokeWidth={isHov ? 1.5 : 1}
                />
                {/* 섹터명 */}
                <text
                  x={sr.x + 7} y={sr.y + HEADER_H / 2}
                  dominantBaseline="middle"
                  fill={isHov ? "#fde68a" : "#e4e4e7"}
                  fontSize={fs} fontWeight="600"
                  letterSpacing="0.3"
                >
                  {sr.name}
                </text>
              </g>
            );
          })}

          {/* ── 섹터 외곽선 ── */}
          {sectorRects.map(sr => (
            <rect
              key={`bdr-${sr.name}`}
              x={sr.x} y={sr.y} width={sr.w} height={sr.h}
              fill="none"
              stroke={hovered === sr.name ? "#fbbf24" : "#52525b"}
              strokeWidth={hovered === sr.name ? 2 : 0.8}
              style={{ pointerEvents: "none" }}
            />
          ))}
        </svg>

        {/* ── 섹터 팝오버 (HTML 오버레이) ── */}
        {hovered && sectorStocksMap.has(hovered) && (
          <SectorPopover
            sectorName={hovered}
            stocks={sectorStocksMap.get(hovered)!}
            cssX={popover.x} cssY={popover.y}
            side={popover.side} vSide={popover.vSide}
            onNavigate={handleNavigate}
            onMouseEnter={clearTimer}
            onMouseLeave={() => setHovered(null)}
          />
        )}
      </div>

      {/* ── 색상 범례 ── */}
      <div className="flex items-center justify-center">
        {LEGEND.map(item => (
          <div
            key={item.label}
            className="px-3 py-1 text-xs font-medium text-white tabular-nums"
            style={{ backgroundColor: item.color, textShadow: "1px 1px 1px rgba(0,0,0,0.5)" }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
