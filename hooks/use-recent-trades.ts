"use client";

import { useQuery } from "@tanstack/react-query";
import { AptTrade } from "@/lib/types";

export function useRecentTrades(lawdCd: string, dealYmd: string, limit: number = 5) {
  return useQuery<AptTrade[]>({
    queryKey: ["recent-trades", lawdCd, dealYmd, limit],
    queryFn: async () => {
      const res = await fetch(`/api/trade?lawdCd=${lawdCd}&dealYmd=${dealYmd}`);
      const data = await res.json();
      
      if (data?.trades && Array.isArray(data.trades)) {
        const sorted = (data.trades as AptTrade[]).sort(
          (a, b) => b.dealDay - a.dealDay || b.dealAmount - a.dealAmount
        );
        return sorted.slice(0, limit);
      }
      
      return [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!lawdCd && !!dealYmd,
  });
}
