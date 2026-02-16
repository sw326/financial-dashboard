import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
const cache = new Map<string, { data: unknown; ts: number }>();
const TTL = 5 * 60 * 1000;

const PERIOD_MAP: Record<string, string> = {
  "1mo": "1mo",
  "3mo": "3mo",
  "6mo": "6mo",
  "1y": "1y",
  "5y": "5y",
  "1d": "1d",
};

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  const period = req.nextUrl.searchParams.get("period") ?? "6mo";
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const key = `${symbol}:${period}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const p1 = PERIOD_MAP[period] ?? "6mo";
    const interval = ["5y"].includes(p1) ? "1wk" : "1d";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yf.chart(symbol, {
      period1: getStartDate(p1),
      interval: interval as "1d" | "1wk",
    });

    const quotes = result.quotes ?? result.indicators?.quote?.[0] ?? [];
    const data = (Array.isArray(quotes) ? quotes : []).map((q: Record<string, unknown>) => ({
      date: new Date(q.date as string).toISOString().slice(0, 10),
      close: (q.close as number) ?? 0,
      volume: (q.volume as number) ?? 0,
    }));

    cache.set(key, { data, ts: Date.now() });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

function getStartDate(period: string): string {
  const d = new Date();
  switch (period) {
    case "1d": d.setDate(d.getDate() - 1); break;
    case "1mo": d.setMonth(d.getMonth() - 1); break;
    case "3mo": d.setMonth(d.getMonth() - 3); break;
    case "6mo": d.setMonth(d.getMonth() - 6); break;
    case "1y": d.setFullYear(d.getFullYear() - 1); break;
    case "5y": d.setFullYear(d.getFullYear() - 5); break;
  }
  return d.toISOString().slice(0, 10);
}
