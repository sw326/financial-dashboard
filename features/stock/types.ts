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

// StockQuote는 market 도메인과 공유
export type { StockQuote } from "@/features/market/types";
