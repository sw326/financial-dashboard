/**
 * 공유 타입 진입점 — 도메인별 types.ts의 barrel (CHM-281)
 * 기존 import 경로(`@/lib/types`) 하위 호환 유지
 *
 * 새 코드: 도메인 타입 직접 import 권장
 *   import type { AptTrade } from "@/features/real-estate/types"
 *   import type { MarketIndex, StockQuote } from "@/features/market/types"
 *   import type { ChartData } from "@/features/stock/types"
 */
export type { AptTrade, FilterOptions, Region } from "@/features/real-estate/types";
export type { MarketIndex, StockQuote } from "@/features/market/types";
export type { ChartData } from "@/features/stock/types";
