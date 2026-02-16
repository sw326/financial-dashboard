import { useQuery } from "@tanstack/react-query";
import type { MarketIndex } from "@/lib/types";

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
      const res = await fetch(
        `/api/finance/trending?tab=${tab}&market=${market}&page=${page}&size=${size}`
      );
      if (!res.ok) throw new Error("Failed to fetch trending stocks");
      return res.json() as Promise<TrendingResponse>;
    },
    staleTime: 1000 * 60 * 5, // 5분
    refetchInterval: 1000 * 60 * 5, // 5분마다 자동 갱신
  });
}
