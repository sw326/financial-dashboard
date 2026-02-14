"use client";

import { useState, useEffect } from "react";
import { AptTrade } from "@/lib/types";
import { getMonthsBack, periodToMonths, filterByArea, fetchTrades } from "@/lib/api";

export function useTrades(guCode: string, period: string, areaFilter: string) {
  const [trades, setTrades] = useState<AptTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const months = getMonthsBack(periodToMonths(period));
    fetchTrades(guCode, months)
      .then((data) => {
        if (!cancelled) {
          setTrades(filterByArea(data, areaFilter));
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [guCode, period, areaFilter]);

  return { trades, loading, error };
}
