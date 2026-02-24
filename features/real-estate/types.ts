/** real-estate 도메인 타입 (CHM-281) */

export interface AptTrade {
  dealAmount: number;
  buildYear: number;
  dealYear: number;
  dealMonth: number;
  dealDay: number;
  aptName: string;
  area: number;
  floor: number;
  dong: string;
  regionCode: string;
}

export interface FilterOptions {
  guCode: string;
  dong?: string;
  dealYm: string;
}

export interface Region {
  code: string;
  name: string;
  lat: number;
  lng: number;
}
