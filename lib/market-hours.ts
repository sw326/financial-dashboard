// 한국 장: 평일 09:00~15:30 KST
export function isKrMarketOpen(): boolean {
  const now = new Date();
  const kr = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const day = kr.getDay();
  if (day === 0 || day === 6) return false;
  const hm = kr.getHours() * 100 + kr.getMinutes();
  return hm >= 900 && hm <= 1530;
}

// 미국 장: 평일 프리마켓 04:00 ~ 애프터마켓 20:00 ET
export function isUsMarketOpen(): boolean {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay();
  if (day === 0 || day === 6) return false;
  const hm = et.getHours() * 100 + et.getMinutes();
  return hm >= 400 && hm <= 2000;
}

export function isAnyMarketOpen(): boolean {
  return isKrMarketOpen() || isUsMarketOpen();
}
