"use client";

/**
 * 알고리즘 피드 — 무한 스크롤 (CHM-295 개선)
 * 개인화(score DESC) → 소진 시 trending 자동 블렌딩
 */
import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { TrendingUp, TrendingDown, MessageSquare, Sparkles, Loader2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useWatchlist } from "@/features/watchlist/hooks/use-watchlist";

interface FeedStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  isKR?: boolean;
  volume?: number;
  marketCap?: number;
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

/** 거래대금 포맷 (volume * price → 억 단위) */
function fmtVolAmt(volume?: number, price?: number): string | null {
  if (!volume || !price) return null;
  const amt = volume * price;
  if (amt >= 1_000_000_000_000) return `${(amt / 1_000_000_000_000).toFixed(1)}조`;
  if (amt >= 100_000_000)       return `${Math.round(amt / 100_000_000)}억`;
  return null;
}

/* ── 피드 카드 ── */
function FeedCard({
  stock, rank, isLoggedIn, symbolSet, onToggle,
}: {
  stock: FeedStock;
  rank: number;
  isLoggedIn: boolean;
  symbolSet: Set<string>;
  onToggle: (symbol: string, name: string) => void;
}) {
  const up = stock.changePercent >= 0;
  const priceStr = stock.isKR
    ? `${stock.price.toLocaleString()}원`
    : `$${stock.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const volAmt = fmtVolAmt(stock.volume, stock.price);
  const isWatched = symbolSet.has(stock.symbol);

  const handleStar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) return;
    onToggle(stock.symbol, stock.name);
  };

  return (
    <div className="flex items-center gap-2 py-2 hover:bg-muted/40 transition-colors -mx-2 px-2 rounded-lg group">
      {/* 순위 */}
      <span className="w-6 text-center text-xs text-muted-foreground/60 tabular-nums shrink-0">{rank}</span>

      {/* 즐겨찾기 */}
      {isLoggedIn && (
        <button onClick={handleStar} className="shrink-0 p-0.5 -ml-1">
          <Star className={cn("w-3.5 h-3.5 transition-colors",
            isWatched ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40 group-hover:text-muted-foreground")} />
        </button>
      )}

      {/* 종목명 */}
      <Link href={`/stock/${stock.symbol}`} className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{stock.name}</p>
        <p className="text-[11px] text-muted-foreground/60 tabular-nums">{stock.symbol.replace(/\.(KS|KQ)$/, "")}</p>
      </Link>

      {/* 거래대금 (데스크탑만) */}
      {volAmt && (
        <span className="hidden md:block text-xs text-muted-foreground tabular-nums w-16 text-right shrink-0">
          {volAmt}
        </span>
      )}

      {/* 등락률 뱃지 */}
      <span className={cn(
        "text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded shrink-0 w-[72px] text-center",
        up ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
      )}>
        {up ? "+" : ""}{stock.changePercent.toFixed(2)}%
      </span>

      {/* 현재가 */}
      <Link href={`/stock/${stock.symbol}`} className="text-right shrink-0 w-28">
        <p className="text-sm font-bold tabular-nums">{priceStr}</p>
        <p className={cn("text-[11px] tabular-nums",
          up ? "text-red-500" : "text-blue-500")}>
          {stock.change >= 0 ? "+" : ""}{stock.isKR ? stock.change.toLocaleString() + "원" : stock.change.toFixed(2)}
        </p>
      </Link>
    </div>
  );
}

/* ── 컬럼 헤더 ── */
function FeedHeader() {
  return (
    <div className="flex items-center gap-2 py-1.5 -mx-2 px-2 text-xs text-muted-foreground/60 border-b mb-1">
      <span className="w-6 shrink-0" />
      <span className="flex-1">종목</span>
      <span className="hidden md:block w-16 text-right shrink-0">거래대금</span>
      <span className="w-[72px] text-center shrink-0">등락률</span>
      <span className="w-28 text-right shrink-0">현재가</span>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-0.5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <Skeleton className="w-6 h-3 rounded" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-14" />
          </div>
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-3.5 w-24" />
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
  const { symbolSet, toggle } = useWatchlist();

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
      <div>
        {isLoading ? (
          <FeedSkeleton />
        ) : allStocks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">데이터를 불러오는 중이에요</p>
        ) : (
          <>
            <FeedHeader />
            {allStocks.map((stock, i) => (
              <FeedCard
                key={`${stock.symbol}-${i}`}
                stock={stock}
                rank={i + 1}
                isLoggedIn={isLoggedIn}
                symbolSet={symbolSet}
                onToggle={toggle}
              />
            ))}
          </>
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
