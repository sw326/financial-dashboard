/** 아파트 실거래 데이터 */
export interface AptTrade {
  /** 거래금액 (만원) */
  dealAmount: number;
  /** 건축년도 */
  buildYear: number;
  /** 년 */
  dealYear: number;
  /** 월 */
  dealMonth: number;
  /** 일 */
  dealDay: number;
  /** 아파트명 */
  aptName: string;
  /** 전용면적 (㎡) */
  area: number;
  /** 층 */
  floor: number;
  /** 법정동 */
  dong: string;
  /** 지역코드 */
  regionCode: string;
}

/** 필터 옵션 */
export interface FilterOptions {
  /** 구 코드 */
  guCode: string;
  /** 동 이름 */
  dong?: string;
  /** 조회 년월 (YYYYMM) */
  dealYm: string;
}

/** 구/동 코드 */
export interface Region {
  code: string;
  name: string;
  lat: number;
  lng: number;
}

/* ── 증시 ── */

export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
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

export interface ChartData {
  date: string;
  close: number;
  volume: number;
}
