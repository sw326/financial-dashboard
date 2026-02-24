"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface IndexData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface IndexSummaryData {
  indices: IndexData[];
}

function IndexCard({ idx }: { idx: IndexData }) {
  const up = idx.changePercent > 0;
  const down = idx.changePercent < 0;
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;

  return (
    <div className={cn("rounded-xl border px-4 py-3 flex-1 min-w-[110px]",
      up ? "border-red-500/20 bg-red-500/5" : down ? "border-blue-500/20 bg-blue-500/5" : "bg-card")}>
      <p className="text-xs font-medium text-muted-foreground truncate">{idx.name}</p>
      <p className="text-base font-bold tabular-nums mt-1">
        {idx.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </p>
      <p className={cn("flex items-center gap-1 text-xs font-medium tabular-nums mt-0.5",
        up ? "text-red-500" : down ? "text-blue-500" : "text-muted-foreground")}>
        <Icon className="w-3 h-3" />
        {up ? "+" : ""}{idx.changePercent.toFixed(2)}%
      </p>
    </div>
  );
}

export function IndexSummary({ data }: { data: IndexSummaryData }) {
  if (!data.indices?.length) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 not-prose my-1">
      {data.indices.map((idx) => (
        <IndexCard key={idx.symbol} idx={idx} />
      ))}
    </div>
  );
}
