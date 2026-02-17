"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BarChart3 } from "lucide-react";
import { useQuotes } from "@/hooks/use-quotes";
import { useTrending } from "@/hooks/use-trending";
import StockList from "@/components/stock-list";
import MarketHeatmap from "@/components/market-heatmap";
import type { MarketIndex } from "@/lib/types";

const INDICES = [
  { symbol: "^KS11", name: "코스피" },
  { symbol: "^KQ11", name: "코스닥" },
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^IXIC", name: "나스닥" },
  { symbol: "^DJI", name: "다우존스" },
  { symbol: "KRW=X", name: "USD/KRW" },
  { symbol: "GC=F", name: "금" },
  { symbol: "BTC-USD", name: "비트코인" },
];

// 작은 카드 4개씩 캐로셀
function IndexCarousel({ indices }: { indices: MarketIndex[] }) {
  const [offset, setOffset] = useState(0);
  const itemsPerView = 4;

  useEffect(() => {
    if (indices.length === 0) return;
    const timer = setInterval(() => {
      setOffset((prev) => (prev + itemsPerView) % indices.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [indices.length]);

  const color = (v: number) => (v >= 0 ? "text-[var(--color-up)]" : "text-[var(--color-down)]");
  const sign = (v: number) => (v >= 0 ? "+" : "");

  const visible: MarketIndex[] = [];
  for (let i = 0; i < itemsPerView && i < indices.length; i++) {
    visible.push(indices[(offset + i) % indices.length]);
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {visible.map((idx) => (
        <div
          key={`${idx.symbol}-${offset}`}
          className="rounded-lg border bg-card p-2 text-center transition-all duration-500"
        >
          <div className="text-xs text-muted-foreground">{idx.name}</div>
          <div className="text-sm font-semibold tabular-nums">
            {idx.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className={`text-xs tabular-nums ${color(idx.changePercent)}`}>
            {sign(idx.changePercent)}{idx.changePercent.toFixed(2)}%
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MarketPage() {
  const [tab, setTab] = useState("hot");
  const [market, setMarket] = useState("all");
  const [krMarket, setKrMarket] = useState("all");
  const [page, setPage] = useState(1);
  const [heatmapMarket, setHeatmapMarket] = useState("kr");

  // 주요 지수 + 원자재 조회
  const allSymbols = useMemo(() => INDICES.map((i) => i.symbol), []);
  const { data: indicesData = [], isLoading: indicesLoading } = useQuotes(allSymbols);

  const indices = useMemo(() => {
    return indicesData.map((idx) => {
      const info = INDICES.find((i) => i.symbol === idx.symbol);
      return { ...idx, name: info?.name || idx.symbol };
    });
  }, [indicesData]);

  // 종목 리스트 조회
  const effectiveMarket = market === "kr" ? `kr:${krMarket}` : market;
  const { data: response, isLoading: stocksLoading } = useTrending(tab, effectiveMarket, page, 20);
  const stocks = response?.stocks || [];
  const total = response?.total || 0;
  const totalPages = Math.ceil(total / 20);

  const handleTabChange = (value: string) => {
    setTab(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <BarChart3 className="size-6 text-muted-foreground" />
        증시
      </h1>

      {/* 지수 캐로셀 - 8개 중 4개씩 순환 */}
      {indicesLoading ? (
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : (
        <IndexCarousel indices={indices} />
      )}

      {/* 시장 히트맵 */}
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base">시장 히트맵</CardTitle>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {[
              { value: "kr", label: "국장" },
              { value: "us", label: "미장" },
            ].map((m) => (
              <Button
                key={m.value}
                variant="ghost"
                size="sm"
                className={cn(
                  "rounded-md text-xs h-7",
                  heatmapMarket === m.value && "bg-background shadow-sm"
                )}
                onClick={() => setHeatmapMarket(m.value)}
              >
                {m.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <MarketHeatmap market={heatmapMarket} />
        </CardContent>
      </Card>

      {/* 탭 + 마켓 필터 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex gap-1 bg-muted rounded-lg p-1 flex-1">
          {[
            { value: "hot", label: "인기종목" },
            { value: "volume", label: "거래량 TOP" },
            { value: "gainers", label: "급등" },
            { value: "losers", label: "급락" },
          ].map((t) => (
            <Button
              key={t.value}
              variant="ghost"
              size="sm"
              className={cn(
                "rounded-md text-sm",
                tab === t.value && "bg-background shadow-sm"
              )}
              onClick={() => handleTabChange(t.value)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {[
            { value: "all", label: "전체" },
            { value: "kr", label: "국장" },
            { value: "us", label: "미장" },
          ].map((m) => (
            <Button
              key={m.value}
              variant="ghost"
              size="sm"
              className={cn(
                "rounded-md text-sm",
                market === m.value && "bg-background shadow-sm"
              )}
              onClick={() => { setMarket(m.value); setKrMarket("all"); setPage(1); }}
            >
              {m.label}
            </Button>
          ))}
        </div>

        {market === "kr" && (
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {[
              { value: "all", label: "전체" },
              { value: "kospi", label: "코스피" },
              { value: "kosdaq", label: "코스닥" },
            ].map((m) => (
              <Button
                key={m.value}
                variant="ghost"
                size="sm"
                className={cn(
                  "rounded-md text-sm",
                  krMarket === m.value && "bg-background shadow-sm"
                )}
                onClick={() => { setKrMarket(m.value); setPage(1); }}
              >
                {m.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* 종목 리스트 */}
      <div className="space-y-4">
        {stocksLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : (
          <StockList stocks={stocks} />
        )}

        {!stocksLoading && totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              이전
            </Button>
            <span className="text-sm text-muted-foreground flex items-center px-3">
              {page} / {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              다음
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
