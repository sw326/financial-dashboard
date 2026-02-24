"use client";

import { useEffect, useState } from "react";
import type { MarketIndex } from "@/features/market/types";

interface IndexCarouselProps {
  indices: MarketIndex[];
  intervalMs?: number;
  itemsPerView?: number;
}

export function IndexCarousel({ indices, intervalMs = 3000, itemsPerView = 4 }: IndexCarouselProps) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (indices.length <= itemsPerView) return;
    const timer = setInterval(() => {
      setOffset((prev) => (prev + itemsPerView) % indices.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [indices.length, intervalMs, itemsPerView]);

  const color = (v: number) => (v >= 0 ? "text-[var(--color-up)]" : "text-[var(--color-down)]");
  const sign = (v: number) => (v >= 0 ? "+" : "");

  const visible: MarketIndex[] = [];
  for (let i = 0; i < itemsPerView && i < indices.length; i++) {
    visible.push(indices[(offset + i) % indices.length]);
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {visible.map((idx) => (
        <div
          key={idx.symbol}
          className="rounded-lg border bg-card p-2 text-center transition-all duration-500"
        >
          <div className="text-xs text-muted-foreground">{idx.name}</div>
          <div className="text-sm font-semibold tabular-nums">
            {idx.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className={`text-xs tabular-nums ${color(idx.changePercent)}`}>
            {sign(idx.changePercent)}{idx.changePercent.toFixed(2)}%
          </div>
        </div>
      ))}
    </div>
  );
}
