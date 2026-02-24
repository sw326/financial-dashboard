"use client";

import { StockCard, type StockCardData } from "./stock-card";

export interface MultiStockData {
  stocks: StockCardData[];
}

export function MultiStock({ data }: { data: MultiStockData }) {
  if (!data.stocks?.length) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 not-prose my-1">
      {data.stocks.map((stock) => (
        <StockCard key={stock.symbol} data={stock} />
      ))}
    </div>
  );
}
