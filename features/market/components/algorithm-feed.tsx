"use client";

/**
 * 알고리즘 피드 — 무한 스크롤 (CHM-295 개선)
 * 개인화(score DESC) → 소진 시 trending 자동 블렌딩
 */
import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { TrendingUp, TrendingDown, MessageSquare, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface FeedStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  isKR?: boolean;
}

interface FeedPage {
  type: "personalized" | "trending" | "guest";
  stocks: FeedStock[];
  hasMore: boolean;
  page: number;
}

async function fetchFeedPage(page: number): Promise<FeedPage> {
  const res = await fetch(`/api/interests?page=${page}&limit=20`);
  if (!res.ok) throw new Error("피드 로드 실패");
  return res.json();
}

/* ── 세로 피드 카드 ── */
function FeedCard({ stock }: { stock: FeedStock }) {
  const up = stock.changePercent >= 0;
  const priceStr = stock.isKR
    ? `${stock.price.toLocaleString()}원`
    : `$${stock.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const changeStr = stock.isKR
    ? `${stock.change >= 0 ? "+" : ""}${stock.change.toLocaleString()}원`
    : `${stock.change >= 0 ? "+" : ""}${stock.change.toFixed(2)}`;

  return (
    <Link
      href={`/stock/${stock.symbol}`}
      className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors -mx-4 rounded-lg"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate">{stock.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {stock.symbol.replace(/\.(KS|KQ)$/, "")}
          <span className={cn("ml-2 text-[10px] px-1 py-0.5 rounded font-medium",
            stock.isKR ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                       : "bg-purple-500/10 text-purple-600 dark:text-purple-400")}>
            {stock.isKR ? "KR" : "US"}
          </span>
        </p>
      </div>
      <div className="text-right shrink-0 ml-4">
        <p className="text-sm font-bold tabular-nums">{priceStr}</p>
        <p className={cn("flex items-center justify-end gap-1 text-xs font-medium tabular-nums mt-0.5",
          up ? "text-red-500" : "text-blue-500")}>
          {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {changeStr} ({up ? "+" : ""}{stock.changePercent.toFixed(2)}%)
        </p>
      </div>
    </Link>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-4 py-3.5">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="space-y-2 text-right">
            <Skeleton className="h-4 w-20 ml-auto" />
            <Skeleton className="h-3 w-16 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface Props {
  isLoggedIn: boolean;
}

export function AlgorithmFeed({ isLoggedIn }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery<FeedPage>({
    queryKey: ["algorithm-feed", isLoggedIn],
    queryFn: ({ pageParam }) => fetchFeedPage(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last) => last.hasMore ? last.page + 1 : undefined,
    staleTime: 3 * 60 * 1000,
  });

  // intersection observer — 하단 도달 시 자동 로드
  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allStocks = data?.pages.flatMap((p) => p.stocks) ?? [];
  const feedType = data?.pages[0]?.type;
  const isPersonalized = feedType === "personalized";

  return (
    <section className="space-y-2">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold flex items-center gap-1.5">
          {isPersonalized
            ? <><Sparkles className="size-4 text-muted-foreground" />내 관심 피드</>
            : <><TrendingUp className="size-4 text-muted-foreground" />지금 인기 종목</>
          }
        </h2>
        {!isPersonalized && !isLoading && (
          <Link
            href={isLoggedIn ? "/chat" : "/auth/login"}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageSquare className="size-3" />
            {isLoggedIn ? "대화하면 맞춤화돼요" : "로그인하면 맞춤화돼요"}
          </Link>
        )}
      </div>

      {/* 피드 목록 */}
      <div className="divide-y divide-border/50">
        {isLoading ? (
          <FeedSkeleton />
        ) : allStocks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">데이터를 불러오는 중이에요</p>
        ) : (
          allStocks.map((stock, i) => <FeedCard key={`${stock.symbol}-${i}`} stock={stock} />)
        )}
      </div>

      {/* 무한 스크롤 트리거 */}
      <div ref={bottomRef} className="h-4" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </section>
  );
}
