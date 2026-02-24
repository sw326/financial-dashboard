import { NextRequest, NextResponse } from "next/server";
import { fetchQuotesBatch, KR_STOCKS, US_STOCKS, type StockData } from "@/lib/market-stocks";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tab    = searchParams.get("tab")    || "hot";
    const market = searchParams.get("market") || "all";
    const page   = parseInt(searchParams.get("page") || "1",  10);
    const size   = parseInt(searchParams.get("size") || "20", 10);

    let allStocks: StockData[] = [];
    if (market === "us" || market === "all") {
      const us = await fetchQuotesBatch(US_STOCKS).catch(() => []);
      allStocks = allStocks.concat(us);
    }
    if (market === "kr" || market === "all") {
      const kr = await fetchQuotesBatch(KR_STOCKS).catch(() => []);
      allStocks = allStocks.concat(kr);
    }

    switch (tab) {
      case "volume":  allStocks.sort((a, b) => b.volume - a.volume); break;
      case "gainers": allStocks.sort((a, b) => b.changePercent - a.changePercent); break;
      case "losers":  allStocks.sort((a, b) => a.changePercent - b.changePercent); break;
      default:        allStocks.sort((a, b) => b.marketCap - a.marketCap); break;
    }

    const total    = allStocks.length;
    const startIdx = (page - 1) * size;
    const paged    = allStocks.slice(startIdx, startIdx + size);

    return NextResponse.json({ stocks: paged, total, page, size });
  } catch (error) {
    console.error("Trending API error:", error);
    return NextResponse.json({ error: "Failed to fetch trending stocks" }, { status: 500 });
  }
}
