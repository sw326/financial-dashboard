/** market 도메인 타입 (CHM-281) */

export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap?: number;
}

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap?: number;
  per?: number;
  pbr?: number;
  high52w?: number;
  low52w?: number;
  dividendYield?: number;
}
