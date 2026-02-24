"use client";

import { useQuery } from "@tanstack/react-query";
import { ChartData } from "@/features/stock/types";

export function useChart(symbol: string, period: string, interval?: string) {
  return useQuery<ChartData[]>({
    queryKey: ["chart", symbol, period, interval],
    queryFn: async () => {
      const params = new URLSearchParams({ symbol, period });
      if (interval) params.set("interval", interval);
      const res = await fetch(`/api/finance/chart?${params}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
  });
}
