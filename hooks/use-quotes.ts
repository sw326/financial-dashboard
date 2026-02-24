"use client";

import { useQuery } from "@tanstack/react-query";
import { MarketIndex } from "@/features/market/types";
import { isAnyMarketOpen } from "@/lib/market-hours";

export function useQuotes(symbols: string[]) {
  return useQuery<MarketIndex[]>({
    queryKey: ["quotes", symbols.join(",")],
    queryFn: async () => {
      const res = await fetch(`/api/finance/quote?symbols=${symbols.join(",")}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: symbols.length > 0,
    refetchInterval: isAnyMarketOpen() ? 30_000 : false,
  });
}
