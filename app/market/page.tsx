"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import { useQuotes } from "@/hooks/use-quotes";
import { useTrending } from "@/hooks/use-trending";
import StockList from "@/components/stock-list";
import MarketHeatmap from "@/components/market-heatmap";
import { useRouter } from "next/navigation";

const INDICES = [
  { symbol: "^KS11", name: "코스피" },
  { symbol: "^KQ11", name: "코스닥" },
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^IXIC", name: "나스닥" },
  { symbol: "^DJI", name: "다우존스" },
];

export default function MarketPage() {
  const router = useRouter();
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

      {/* 지수 카드 그리드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {indicesLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))
          : indices.map((idx) => {
              const isUp = idx.changePercent >= 0;
              return (
                <Card
                  key={idx.symbol}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/stock/${encodeURIComponent(idx.symbol)}`)}
                >
                  <CardContent className="p-3 space-y-1">
                    <div className="text-sm text-muted-foreground font-medium">{idx.name}</div>
                    <div className="text-lg font-bold tabular-nums">
                      {idx.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                    <div className={cn("flex items-center gap-1 text-sm tabular-nums", isUp ? "text-[var(--color-up)]" : "text-[var(--color-down)]")}>
                      {isUp ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                      <span>{isUp ? "+" : ""}{idx.change.toFixed(2)}</span>
                      <span>({isUp ? "+" : ""}{idx.changePercent.toFixed(2)}%)</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* 시장 히트맵 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">시장 히트맵</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <MarketHeatmap />
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
