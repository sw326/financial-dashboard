import { useQuery } from "@tanstack/react-query";
import type { MarketIndex } from "@/lib/types";

export function useTrending(tab: string) {
  return useQuery({
    queryKey: ["trending", tab],
    queryFn: async () => {
      const res = await fetch(`/api/finance/trending?tab=${tab}`);
      if (!res.ok) throw new Error("Failed to fetch trending stocks");
      return res.json() as Promise<MarketIndex[]>;
    },
    staleTime: 1000 * 60 * 5, // 5분
    refetchInterval: 1000 * 60 * 5, // 5분마다 자동 갱신
  });
}
