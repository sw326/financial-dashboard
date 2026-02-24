"use client";

import { useQuery } from "@tanstack/react-query";
import { isKrMarketOpen, isUsMarketOpen } from "@/lib/market-hours";

export function useRealtime(symbol: string) {
  const isKr = symbol.endsWith(".KS") || symbol.endsWith(".KQ");
  const isOpen = isKr ? isKrMarketOpen() : isUsMarketOpen();

  return useQuery({
    queryKey: ["realtime", symbol],
    queryFn: async () => {
      const res = await fetch(`/api/finance/realtime?symbol=${encodeURIComponent(symbol)}`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ price: number; time: number; volume?: number }>;
    },
    enabled: !!symbol && isOpen,
    refetchInterval: isOpen ? 15_000 : false,
    staleTime: 10_000,
  });
}
