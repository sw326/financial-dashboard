import { NextRequest, NextResponse } from "next/server";

// Naver Mobile Stock API - real-time KR stock rankings
// Endpoints: up (상승), down (하락), marketValue (시총순)
// Params: sosok=0 (KOSPI), sosok=1 (KOSDAQ), page, pageSize

const NAVER_API = "https://m.stock.naver.com/api/stocks";

interface NaverStock {
  itemCode: string;
  stockName: string;
  closePrice: string;
  compareToPreviousClosePrice: string;
  compareToPreviousPrice: { code: string; text: string; name: string };
  fluctuationsRatio: string;
  accumulatedTradingVolume: string;
  accumulatedTradingValue: string;
  marketValue: string;
  marketValueHangeul: string;
  stockExchangeType: { name: string };
}

interface NaverResponse {
  stocks: NaverStock[];
  totalCount?: number;
}

function parseNumber(s: string | undefined): number {
  if (!s) return 0;
  return Number(s.replace(/,/g, "")) || 0;
}

function parseMarketValue(hangeul: string): number {
  // "136억원" → 13600000000, "12.5조원" → 12500000000000
  const m = hangeul.match(/([\d.]+)(억|조)원?/);
  if (!m) return 0;
  const num = parseFloat(m[1]);
  if (m[2] === "조") return num * 1e12;
  return num * 1e8;
}

// Tab → Naver endpoint mapping
const TAB_ENDPOINT: Record<string, string> = {
  gainers: "up",
  losers: "down",
  hot: "marketValue",
  volume: "marketValue", // no direct volume endpoint; fetch marketValue, sort by volume
};

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const tab = sp.get("tab") || "hot";
    const market = sp.get("market") || "all"; // all | kospi | kosdaq
    const page = parseInt(sp.get("page") || "1", 10);
    const size = parseInt(sp.get("size") || "20", 10);

    const endpoint = TAB_ENDPOINT[tab] || "marketValue";

    // Determine which markets to fetch
    const sosokList: number[] = [];
    if (market === "kospi" || market === "all") sosokList.push(0);
    if (market === "kosdaq" || market === "all") sosokList.push(1);

    // For volume tab, fetch more to sort properly
    const fetchSize = tab === "volume" ? 100 : size;
    const fetchPage = tab === "volume" ? 1 : page;

    const fetches = sosokList.map(async (sosok) => {
      const url = `${NAVER_API}/${endpoint}?sosok=${sosok}&page=${fetchPage}&pageSize=${fetchSize}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 60 }, // cache 1 min
      });
      if (!res.ok) return [];
      const data: NaverResponse = await res.json();
      return (data.stocks || []).map((s) => {
        // fluctuationsRatio already has correct sign from Naver
        const changePercent = parseFloat(s.fluctuationsRatio || "0");
        const isFalling = s.compareToPreviousPrice?.name === "FALLING" || s.compareToPreviousPrice?.name === "LOWER_LIMIT" || s.compareToPreviousPrice?.code === "5" || s.compareToPreviousPrice?.code === "2";
        const changeAbs = parseNumber(s.compareToPreviousClosePrice);
        return {
          symbol: `${s.itemCode}.${s.stockExchangeType?.name === "KOSDAQ" ? "KQ" : "KS"}`,
          code: s.itemCode,
          name: s.stockName,
          price: parseNumber(s.closePrice),
          change: isFalling ? -changeAbs : changeAbs,
          changePercent,
          volume: parseNumber(s.accumulatedTradingVolume),
          marketCap: parseMarketValue(s.marketValueHangeul || ""),
          market: s.stockExchangeType?.name === "KOSDAQ" ? "KOSDAQ" : "KOSPI",
        };
      });
    });

    const results = await Promise.all(fetches);
    let stocks = results.flat();

    // For volume tab, sort by volume descending
    if (tab === "volume") {
      stocks.sort((a, b) => b.volume - a.volume);
    }

    // Paginate (volume tab fetched all, others already paged by Naver)
    const total = stocks.length;
    if (tab === "volume") {
      const start = (page - 1) * size;
      stocks = stocks.slice(start, start + size);
    }

    return NextResponse.json({ stocks, total, page, size });
  } catch (error) {
    console.error("KR ranking API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch KR ranking" },
      { status: 500 }
    );
  }
}
