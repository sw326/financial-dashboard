"use client";

import { useQuery } from "@tanstack/react-query";
import { MarketIndex } from "@/lib/types";

export function useQuotes(symbols: string[]) {
  return useQuery<MarketIndex[]>({
    queryKey: ["quotes", symbols.join(",")],
    queryFn: async () => {
      const res = await fetch(`/api/finance/quote?symbols=${symbols.join(",")}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 5 * 60 * 1000,  // 금융 데이터 5분 캐시
    enabled: symbols.length > 0,
  });
}
