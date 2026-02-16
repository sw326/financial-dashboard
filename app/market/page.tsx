"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3 } from "lucide-react";
import { useQuotes } from "@/hooks/use-quotes";
import { useTrending } from "@/hooks/use-trending";
import StockList from "@/components/stock-list";

const INDICES = [
  { symbol: "^KS11", name: "코스피" },
  { symbol: "^KQ11", name: "코스닥" },
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^IXIC", name: "나스닥" },
  { symbol: "^DJI", name: "다우존스" },
];

export default function MarketPage() {
  const [tab, setTab] = useState("hot");

  // 주요 지수 조회
  const allSymbols = useMemo(() => INDICES.map((i) => i.symbol), []);
  const { data: indices = [], isLoading: indicesLoading } = useQuotes(allSymbols);

  // 종목 리스트 조회
  const { data: stocks = [], isLoading: stocksLoading } = useTrending(tab);

  const color = (v: number) => (v >= 0 ? "text-[var(--color-up)]" : "text-[var(--color-down)]");
  const sign = (v: number) => (v >= 0 ? "+" : "");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <BarChart3 className="size-6 text-muted-foreground" />
        증시
      </h1>

      {/* 주요 지수 한 줄 띠 */}
      <div className="flex gap-4 overflow-x-auto pb-2 border-b">
        {indicesLoading ? (
          <div className="flex gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-32 shrink-0" />
            ))}
          </div>
        ) : (
          <>
            {INDICES.map(({ symbol, name }) => {
              const idx = indices.find((i) => i.symbol === symbol);
              if (!idx) return null;
              return (
                <div key={symbol} className="flex items-center gap-2 shrink-0">
                  <span className="text-sm text-muted-foreground">{name}</span>
                  <span className="text-sm font-semibold tabular-nums">
                    {idx.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                  <Badge variant="outline" className={`text-xs ${color(idx.changePercent)}`}>
                    {sign(idx.changePercent)}{idx.changePercent.toFixed(2)}%
                  </Badge>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* 종목 리스트 + 서브탭 */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="hot">인기종목</TabsTrigger>
          <TabsTrigger value="volume">거래량 TOP</TabsTrigger>
          <TabsTrigger value="gainers">급등</TabsTrigger>
          <TabsTrigger value="losers">급락</TabsTrigger>
        </TabsList>

        <TabsContent value="hot" className="mt-4">
          {stocksLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <StockList stocks={stocks.slice(0, 20)} />
          )}
        </TabsContent>

        <TabsContent value="volume" className="mt-4">
          {stocksLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <StockList stocks={stocks.slice(0, 20)} />
          )}
        </TabsContent>

        <TabsContent value="gainers" className="mt-4">
          {stocksLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <StockList stocks={stocks.slice(0, 20)} />
          )}
        </TabsContent>

        <TabsContent value="losers" className="mt-4">
          {stocksLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <StockList stocks={stocks.slice(0, 20)} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
