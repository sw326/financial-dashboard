import { useQuery } from "@tanstack/react-query";
import type { MarketIndex } from "@/features/market/types";

interface TrendingResponse {
  stocks: MarketIndex[];
  total: number;
  page: number;
  size: number;
}

export function useTrending(tab: string, market: string, page: number, size: number = 20) {
  return useQuery({
    queryKey: ["trending", tab, market, page, size],
    queryFn: async () => {
      // 국장은 네이버 실시간 API 사용 (kr:all, kr:kospi, kr:kosdaq)
      if (market.startsWith("kr")) {
        const krSub = market.includes(":") ? market.split(":")[1] : "all";
        const res = await fetch(
          `/api/finance/kr-ranking?tab=${tab}&market=${krSub}&page=${page}&size=${size}`
        );
        if (!res.ok) throw new Error("Failed to fetch KR ranking");
        return res.json() as Promise<TrendingResponse>;
      }
      // 미장/전체는 기존 Yahoo Finance API
      const res = await fetch(
        `/api/finance/trending?tab=${tab}&market=${market}&page=${page}&size=${size}`
      );
      if (!res.ok) throw new Error("Failed to fetch trending stocks");
      return res.json() as Promise<TrendingResponse>;
    },
    staleTime: 1000 * 60, // 1분 (국장 실시간이므로 짧게)
    refetchInterval: 1000 * 60, // 1분마다 자동 갱신
  });
}
