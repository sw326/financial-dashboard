"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Star, TrendingUp, TrendingDown, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WatchlistButton } from "@/components/watchlist-button";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";

interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

type SortKey = "change" | "name" | "added";

export default function WatchlistPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { items, isLoading: wlLoading } = useWatchlist();
  const router = useRouter();
  const [sort, setSort] = useState<SortKey>("added");

  const symbols = items.map(i => i.symbol);

  const { data: quotes = [], isLoading: quotesLoading } = useQuery<Quote[]>({
    queryKey: ["watchlist-quotes", symbols.join(",")],
    queryFn: async () => {
      if (!symbols.length) return [];
      const res = await fetch(`/api/finance/quote?symbols=${symbols.join(",")}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: symbols.length > 0,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const quoteMap = useMemo(() =>
    new Map(quotes.map(q => [q.symbol, q])), [quotes]);

  const sorted = useMemo(() => {
    const list = items.map(item => ({
      ...item,
      quote: quoteMap.get(item.symbol),
    }));
    if (sort === "change") return list.sort((a, b) => (b.quote?.changePercent ?? 0) - (a.quote?.changePercent ?? 0));
    if (sort === "name")   return list.sort((a, b) => (a.name ?? a.symbol).localeCompare(b.name ?? b.symbol));
    return list; // added (기본, DB 내림차순)
  }, [items, quoteMap, sort]);

  const isLoading = authLoading || wlLoading;

  if (!authLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <Star className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">관심종목</h2>
        <p className="text-muted-foreground text-sm">로그인하면 관심종목을 저장하고 모아볼 수 있어요.</p>
        <Button asChild><Link href="/auth/login?next=/watchlist">로그인</Link></Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
          <h1 className="text-lg font-semibold">관심종목</h1>
          {!isLoading && <span className="text-sm text-muted-foreground">({items.length})</span>}
        </div>
        {/* 정렬 */}
        <div className="flex gap-1">
          {([["added", "추가순"], ["change", "등락순"], ["name", "이름순"]] as [SortKey, string][]).map(([key, label]) => (
            <Button
              key={key}
              variant={sort === key ? "secondary" : "ghost"}
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => setSort(key)}
            >
              <ArrowUpDown className="h-3 w-3 mr-1" />{label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <Star className="h-10 w-10" />
          <p className="text-sm">아직 추가된 관심종목이 없어요</p>
          <p className="text-xs">종목 상세 페이지에서 ⭐를 눌러 추가할 수 있어요.</p>
          <Button variant="outline" size="sm" asChild><Link href="/market">종목 보러가기</Link></Button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {sorted.map(({ symbol, name, market, quote }) => {
            const isKR = symbol.endsWith(".KS") || symbol.endsWith(".KQ");
            const up = (quote?.changePercent ?? 0) >= 0;
            const displayName = name ?? symbol;

            return (
              <div
                key={symbol}
                className="flex items-center justify-between p-3 rounded-lg bg-card hover:bg-muted/50 transition-colors cursor-pointer border border-border/50"
                onClick={() => router.push(`/stock/${encodeURIComponent(symbol)}`)}
              >
                {/* 종목 정보 */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{symbol.replace(/\.(KS|KQ)$/, "")} · {market === "kr" ? "국장" : "미장"}</p>
                  </div>
                </div>

                {/* 시세 */}
                <div className="flex items-center gap-3 shrink-0">
                  {quotesLoading ? (
                    <Skeleton className="h-5 w-20" />
                  ) : quote ? (
                    <>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums">
                          {isKR
                            ? quote.price.toLocaleString()
                            : quote.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </p>
                        <p className={`text-xs tabular-nums flex items-center justify-end gap-0.5 ${up ? "text-red-400" : "text-blue-400"}`}>
                          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {up ? "+" : ""}{quote.changePercent.toFixed(2)}%
                        </p>
                      </div>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                  {/* ⭐ 토글 */}
                  <WatchlistButton
                    symbol={symbol}
                    name={name}
                    market={market}
                    size="sm"
                    className="shrink-0"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
