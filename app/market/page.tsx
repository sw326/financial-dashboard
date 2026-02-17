"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BarChart3 } from "lucide-react";
import { useQuotes } from "@/hooks/use-quotes";
import { useTrending } from "@/hooks/use-trending";
import StockList from "@/components/stock-list";
import type { MarketIndex } from "@/lib/types";

const INDICES = [
  { symbol: "^KS11", name: "코스피" },
  { symbol: "^KQ11", name: "코스닥" },
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^IXIC", name: "나스닥" },
  { symbol: "^DJI", name: "다우존스" },
];

// 지수 띠 컴포넌트 - 4개씩 순환
function IndexTicker({ indices }: { indices: MarketIndex[] }) {
  const [offset, setOffset] = useState(0);
  const itemsPerView = 4;

  useEffect(() => {
    if (indices.length === 0) return;
    const timer = setInterval(() => {
      setOffset((prev) => (prev + itemsPerView) % indices.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [indices.length]);

  const color = (v: number) => (v >= 0 ? "text-[var(--color-up)]" : "text-[var(--color-down)]");
  const sign = (v: number) => (v >= 0 ? "+" : "");

  // 현재 보여줄 4개
  const visible: MarketIndex[] = [];
  for (let i = 0; i < itemsPerView && i < indices.length; i++) {
    visible.push(indices[(offset + i) % indices.length]);
  }

  return (
    <div className="flex gap-4 items-center overflow-hidden">
      {visible.map((idx) => (
        <div
          key={idx.symbol}
          className="flex items-center gap-2 shrink-0 transition-all duration-500"
        >
          <span className="text-sm text-muted-foreground">{idx.name}</span>
          <span className="text-sm font-semibold tabular-nums">
            {idx.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
          <Badge variant="outline" className={`text-xs ${color(idx.changePercent)}`}>
            {sign(idx.changePercent)}
            {idx.changePercent.toFixed(2)}%
          </Badge>
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

  // 주요 지수 조회
  const allSymbols = useMemo(() => INDICES.map((i) => i.symbol), []);
  const { data: indicesData = [], isLoading: indicesLoading } = useQuotes(allSymbols);

  // 지수 데이터에 이름 추가
  const indices = useMemo(() => {
    return indicesData.map((idx) => {
      const info = INDICES.find((i) => i.symbol === idx.symbol);
      return { ...idx, name: info?.name || idx.symbol };
    });
  }, [indicesData]);

  // 종목 리스트 조회 (국장은 krMarket 서브필터 전달)
  const effectiveMarket = market === "kr" ? `kr:${krMarket}` : market;
  const { data: response, isLoading: stocksLoading } = useTrending(tab, effectiveMarket, page, 20);
  const stocks = response?.stocks || [];
  const total = response?.total || 0;
  const totalPages = Math.ceil(total / 20);

  // 탭/마켓 변경 핸들러 - 페이지 1로 리셋
  const handleTabChange = (value: string) => {
    setTab(value);
    setPage(1);
  };

  const handleMarketChange = (value: string) => {
    if (value) {
      setMarket(value);
      setKrMarket("all");
      setPage(1);
    }
  };

  const handleKrMarketChange = (value: string) => {
    if (value) {
      setKrMarket(value);
      setPage(1);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <BarChart3 className="size-6 text-muted-foreground" />
        증시
      </h1>

      {/* 주요 지수 띠 - 4개씩 순환 */}
      <div className="border-b pb-2">
        {indicesLoading ? (
          <div className="flex gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-32 shrink-0" />
            ))}
          </div>
        ) : (
          <IndexTicker indices={indices} />
        )}
      </div>

      {/* 탭 + 마켓 필터 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <ToggleGroup type="single" value={tab} onValueChange={(v) => v && handleTabChange(v)} className="flex-1">
          <ToggleGroupItem value="hot">인기종목</ToggleGroupItem>
          <ToggleGroupItem value="volume">거래량 TOP</ToggleGroupItem>
          <ToggleGroupItem value="gainers">급등</ToggleGroupItem>
          <ToggleGroupItem value="losers">급락</ToggleGroupItem>
        </ToggleGroup>

        <ToggleGroup type="single" value={market} onValueChange={handleMarketChange}>
          <ToggleGroupItem value="all">전체</ToggleGroupItem>
          <ToggleGroupItem value="kr">국장</ToggleGroupItem>
          <ToggleGroupItem value="us">미장</ToggleGroupItem>
        </ToggleGroup>

        {/* 국장 서브필터: 코스피/코스닥 */}
        {market === "kr" && (
          <ToggleGroup type="single" value={krMarket} onValueChange={handleKrMarketChange}>
            <ToggleGroupItem value="all">전체</ToggleGroupItem>
            <ToggleGroupItem value="kospi">코스피</ToggleGroupItem>
            <ToggleGroupItem value="kosdaq">코스닥</ToggleGroupItem>
          </ToggleGroup>
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

        {/* 페이지네이션 */}
        {!stocksLoading && totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              이전
            </Button>
            <span className="text-sm text-muted-foreground flex items-center px-3">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              다음
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
