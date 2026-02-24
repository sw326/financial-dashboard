"use client";

import { useQuery } from "@tanstack/react-query";
import { AptTrade } from "@/features/real-estate/types";
import { getMonthsBack, periodToMonths, filterByArea, fetchTrades } from "@/lib/api";

export function useTrades(guCode: string, period: string, areaFilter: string) {
  const months = getMonthsBack(periodToMonths(period));
  
  const { data, isLoading, error: queryError } = useQuery<AptTrade[]>({
    queryKey: ["trades", guCode, period, areaFilter],
    queryFn: async () => {
      const data = await fetchTrades(guCode, months);
      return filterByArea(data, areaFilter);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!guCode,
  });

  return {
    trades: data || [],
    loading: isLoading,
    error: queryError ? (queryError instanceof Error ? queryError.message : "Unknown error") : null,
  };
}
