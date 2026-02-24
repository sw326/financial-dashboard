"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StockCardData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  isKR?: boolean;
}

function PriceDisplay({ data }: { data: StockCardData }) {
  const { price, change, changePercent, isKR } = data;
  const up = changePercent > 0;
  const down = changePercent < 0;

  const priceStr = isKR
    ? `${price.toLocaleString()}원`
    : `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  const changeStr = isKR
    ? `${change >= 0 ? "+" : ""}${change.toLocaleString()}원`
    : `${change >= 0 ? "+" : ""}${change.toFixed(2)}`;

  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;

  return (
    <div className="flex items-end justify-between mt-2">
      <span className="text-xl font-bold tabular-nums">{priceStr}</span>
      <span className={cn("flex items-center gap-1 text-sm font-medium tabular-nums",
        up ? "text-red-500" : down ? "text-blue-500" : "text-muted-foreground")}>
        <Icon className="w-3.5 h-3.5" />
        {changeStr} ({up ? "+" : ""}{changePercent.toFixed(2)}%)
      </span>
    </div>
  );
}

export function StockCard({ data }: { data: StockCardData }) {
  const { symbol, name, isKR } = data;
  const displaySymbol = symbol.replace(/\.(KS|KQ)$/, "");
  const href = isKR ? `/stock/${symbol}` : `/stock/${symbol}`;

  return (
    <Link href={href}
      className="block rounded-xl border bg-card hover:bg-accent/50 transition-colors px-4 py-3 not-prose">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{displaySymbol}</p>
        </div>
        <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium shrink-0",
          isKR ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
               : "bg-purple-500/10 text-purple-600 dark:text-purple-400")}>
          {isKR ? "KR" : "US"}
        </span>
      </div>
      <PriceDisplay data={data} />
    </Link>
  );
}
