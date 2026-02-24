/** stock 도메인 타입 (CHM-281) */

export interface ChartData {
  date: string;
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// @dependency: market — StockQuote는 증시/종목 양쪽에서 사용하는 공유 타입
// 원본: features/market/types.ts
export type { StockQuote } from "@/features/market/types";
