"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface WatchlistItem {
  id: string;
  symbol: string;
  name?: string;
  market?: string;
  added_at: string;
}

async function fetchWatchlist(): Promise<WatchlistItem[]> {
  const res = await fetch("/api/watchlist");
  if (res.status === 401) return [];
  if (!res.ok) throw new Error("Failed to fetch watchlist");
  const data = await res.json();
  return data.items ?? [];
}

export function useWatchlist() {
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["watchlist"],
    queryFn: fetchWatchlist,
    staleTime: 60_000,
  });

  const symbolSet = new Set(items.map(i => i.symbol));

  const add = useMutation({
    mutationFn: async (payload: { symbol: string; name?: string; market?: string }) => {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to add");
    },
    onMutate: async ({ symbol, name, market }) => {
      await qc.cancelQueries({ queryKey: ["watchlist"] });
      const prev = qc.getQueryData<WatchlistItem[]>(["watchlist"]) ?? [];
      qc.setQueryData<WatchlistItem[]>(["watchlist"], [
        { id: "optimistic", symbol, name, market, added_at: new Date().toISOString() },
        ...prev,
      ]);
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["watchlist"], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["watchlist"] }),
  });

  const remove = useMutation({
    mutationFn: async (symbol: string) => {
      const res = await fetch(`/api/watchlist/${encodeURIComponent(symbol)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove");
    },
    onMutate: async (symbol) => {
      await qc.cancelQueries({ queryKey: ["watchlist"] });
      const prev = qc.getQueryData<WatchlistItem[]>(["watchlist"]) ?? [];
      qc.setQueryData<WatchlistItem[]>(["watchlist"], prev.filter(i => i.symbol !== symbol));
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["watchlist"], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["watchlist"] }),
  });

  const toggle = (symbol: string, name?: string, market?: string) => {
    if (symbolSet.has(symbol)) {
      remove.mutate(symbol);
    } else {
      add.mutate({ symbol, name, market });
    }
  };

  return { items, isLoading, symbolSet, toggle, add, remove };
}
