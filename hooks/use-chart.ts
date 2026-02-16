"use client";

import { useQuery } from "@tanstack/react-query";
import { ChartData } from "@/lib/types";

export function useChart(symbol: string, period: string) {
  return useQuery<ChartData[]>({
    queryKey: ["chart", symbol, period],
    queryFn: async () => {
      const res = await fetch(`/api/finance/chart?symbol=${encodeURIComponent(symbol)}&period=${period}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
  });
}
