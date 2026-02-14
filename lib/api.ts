import { AptTrade } from "./types";

/** 월을 YYYYMM 형식으로 되돌려 가는 함수 */
export function getMonthsBack(count: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push(ym);
  }
  return months;
}

/** 기간 라벨 → 월 수 */
export function periodToMonths(period: string): number {
  switch (period) {
    case "3m": return 3;
    case "6m": return 6;
    case "1y": return 12;
    case "2y": return 24;
    case "3y": return 36;
    default: return 6;
  }
}

/** 면적 필터 */
export function filterByArea(trades: AptTrade[], areaFilter: string): AptTrade[] {
  switch (areaFilter) {
    case "small": return trades.filter(t => t.area <= 59);
    case "medium": return trades.filter(t => t.area > 59 && t.area <= 85);
    case "large": return trades.filter(t => t.area > 85);
    default: return trades;
  }
}

/** API에서 거래 데이터 가져오기 */
export async function fetchTrades(guCode: string, months: string[]): Promise<AptTrade[]> {
  const results = await Promise.all(
    months.map(async (ym) => {
      const res = await fetch(`/api/trade?lawdCd=${guCode}&dealYmd=${ym}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.trades as AptTrade[];
    })
  );
  return results.flat();
}
