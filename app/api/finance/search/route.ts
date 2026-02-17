import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { getKrStockName } from "@/lib/kr-stock-names";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const ALLOWED_TYPES = new Set(["EQUITY", "INDEX", "ETF"]);

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    const data = await yf.search(q);
    const quotes = (data.quotes || [])
      .filter((quote): quote is Extract<typeof quote, { isYahooFinance: true }> =>
        "quoteType" in quote && ALLOWED_TYPES.has(String(quote.quoteType))
      )
      .slice(0, 10)
      .map((quote) => {
        const symbol = String(quote.symbol);
        const shortname = quote.shortname ? String(quote.shortname) : undefined;
        const longname = quote.longname ? String(quote.longname) : undefined;
        return {
          symbol,
          name: getKrStockName(symbol, shortname || longname || symbol),
          type: String(quote.quoteType),
          exchange: String(quote.exchange),
        };
      });

    return NextResponse.json({ results: quotes });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
