"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { MarketIndex } from "@/features/market/types";

interface StockListProps {
  stocks: MarketIndex[];
  offset?: number; // 페이지 기반 순위 오프셋 (기본 0)
}

export default function StockList({ stocks, offset = 0 }: StockListProps) {
  const color = (v: number) => (v >= 0 ? "text-[var(--color-up)]" : "text-[var(--color-down)]");
  const sign = (v: number) => (v >= 0 ? "+" : "");

  return (
    <div className="divide-y border rounded-lg">
      {stocks.map((s, i) => (
        <Link
          key={s.symbol}
          href={`/stock/${encodeURIComponent(s.symbol)}`}
          className="flex items-center justify-between py-3 px-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-6 tabular-nums text-right">{offset + i + 1}</span>
            <div>
              <p className="text-sm font-medium">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.symbol}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tabular-nums">{s.price.toLocaleString()}</span>
            <Badge variant="outline" className={`text-xs min-w-[70px] justify-center ${color(s.changePercent)}`}>
              {sign(s.changePercent)}{s.changePercent.toFixed(2)}%
            </Badge>
          </div>
        </Link>
      ))}
      {stocks.length === 0 && (
        <div className="py-8 text-center text-muted-foreground">데이터가 없습니다</div>
      )}
    </div>
  );
}
