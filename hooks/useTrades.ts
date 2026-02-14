"use client";

import { useState, useEffect, useTransition } from "react";
import { AptTrade } from "@/lib/types";
import { getMonthsBack, periodToMonths, filterByArea, fetchTrades } from "@/lib/api";

export function useTrades(guCode: string, period: string, areaFilter: string) {
  const [trades, setTrades] = useState<AptTrade[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const months = getMonthsBack(periodToMonths(period));

    startTransition(async () => {
      try {
        const data = await fetchTrades(guCode, months);
        if (!cancelled) {
          setTrades(filterByArea(data, areaFilter));
          setError(null);
          setInitialLoad(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setInitialLoad(false);
        }
      }
    });

    return () => { cancelled = true; };
  }, [guCode, period, areaFilter]);

  return { trades, loading: isPending || initialLoad, error };
}
