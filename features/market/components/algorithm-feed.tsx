"use client";

/**
 * 알고리즘 피드 섹션 (CHM-295)
 * - 로그인 + interests 있음: 개인화 피드
 * - 로그인 + cold start: 트렌딩 + 채팅 넛지
 * - 비로그인: 렌더링 안 함 (useAuth로 제어)
 */
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { TrendingUp, TrendingDown, MessageSquare, Sparkles } from "lucide-react";
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

interface FeedResponse {
  type: "personalized" | "trending" | "guest";
  stocks: FeedStock[];
}

function FeedCard({ stock }: { stock: FeedStock }) {
  const up = stock.changePercent >= 0;
  const priceStr = stock.isKR
    ? `${stock.price.toLocaleString()}원`
    : `$${stock.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  return (
    <Link
      href={`/stock/${stock.symbol}`}
      className="flex-shrink-0 w-36 rounded-xl border bg-card hover:bg-accent/50 transition-colors p-3 space-y-1"
    >
      <p className="text-xs font-semibold truncate">{stock.name}</p>
      <p className="text-xs text-muted-foreground">{stock.symbol.replace(/\.(KS|KQ)$/, "")}</p>
      <p className="text-sm font-bold tabular-nums pt-1">{priceStr}</p>
      <p className={cn("flex items-center gap-0.5 text-xs font-medium tabular-nums",
        up ? "text-red-500" : "text-blue-500")}>
        {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {up ? "+" : ""}{stock.changePercent.toFixed(2)}%
      </p>
    </Link>
  );
}

interface Props {
  isLoggedIn: boolean;
}

export function AlgorithmFeed({ isLoggedIn }: Props) {
  const { data, isLoading } = useQuery<FeedResponse>({
    queryKey: ["algorithm-feed"],
    queryFn: async () => {
      const res = await fetch("/api/interests");
      return res.json();
    },
    enabled: isLoggedIn,
    staleTime: 3 * 60 * 1000,
  });

  if (!isLoggedIn) return null;

  const isPersonalized = data?.type === "personalized";
  const label = isPersonalized ? "내 관심 피드" : "지금 인기 종목";
  const Icon = isPersonalized ? Sparkles : TrendingUp;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold flex items-center gap-1.5">
          <Icon className="size-4 text-muted-foreground" />
          {isLoading ? <span className="w-20 h-4 bg-muted rounded animate-pulse inline-block" /> : label}
        </h2>
        {!isPersonalized && !isLoading && (
          <Link href="/chat" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <MessageSquare className="size-3" />
            대화하면 맞춤화돼요
          </Link>
        )}
      </div>

      {/* 가로 스크롤 카드 */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="flex-shrink-0 w-36 h-28 rounded-xl" />
            ))
          : data?.stocks.slice(0, 10).map((stock) => (
              <FeedCard key={stock.symbol} stock={stock} />
            ))}
      </div>
    </section>
  );
}
