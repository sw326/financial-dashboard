"use client";

import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuotes } from "@/hooks/use-quotes";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { IndexCarousel } from "@/features/market/components/index-carousel";
import { AlgorithmFeed } from "@/features/market/components/algorithm-feed";

const CAROUSEL_SYMBOLS = [
  { symbol: "^KS11",   label: "코스피"   },
  { symbol: "^KQ11",   label: "코스닥"   },
  { symbol: "^GSPC",   label: "S&P 500"  },
  { symbol: "^IXIC",   label: "나스닥"   },
  { symbol: "KRW=X",   label: "USD/KRW"  },
  { symbol: "GC=F",    label: "금"       },
  { symbol: "CL=F",    label: "WTI유"    },
  { symbol: "BTC-USD", label: "비트코인" },
];

export default function FeedPage() {
  const { isLoggedIn } = useAuth();
  const allSymbols = useMemo(() => CAROUSEL_SYMBOLS.map((i) => i.symbol), []);
  const { data: carouselData = [], isLoading: loadCarousel } = useQuotes(allSymbols);

  const carouselIndices = useMemo(() =>
    carouselData.map((d) => {
      const info = CAROUSEL_SYMBOLS.find((i) => i.symbol === d.symbol);
      return { ...d, name: info?.label || d.name };
    }),
  [carouselData]);

  return (
    <div className="space-y-6">
      {/* 지수/원자재 캐로셀 */}
      {loadCarousel ? (
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : (
        <IndexCarousel indices={carouselIndices} />
      )}

      {/* 알고리즘 피드 (무한 스크롤) */}
      <AlgorithmFeed isLoggedIn={isLoggedIn} />

      {/* 비로그인 안내 */}
      {!isLoggedIn && (
        <div className="text-center py-16 space-y-3">
          <p className="text-4xl">🦞</p>
          <p className="text-lg font-semibold">로그인하면 맞춤 피드가 생겨요</p>
          <p className="text-sm text-muted-foreground">
            채팅에서 관심 종목을 물어보면 여기에 개인화된 피드가 표시돼요.
          </p>
        </div>
      )}
    </div>
  );
}
