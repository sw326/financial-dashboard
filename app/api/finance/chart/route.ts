import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
const cache = new Map<string, { data: unknown; ts: number }>();
const TTL = 5 * 60 * 1000;

// period → { range (for getStartDate), interval }
const PERIOD_CONFIG: Record<string, { range: string; interval: string }> = {
  "1m":  { range: "1d",  interval: "1m" },
  "3m":  { range: "1d",  interval: "5m" },   // yahoo doesn't support 3m, use 5m
  "5m":  { range: "5d",  interval: "5m" },
  "10m": { range: "5d",  interval: "5m" },   // yahoo doesn't support 10m, use 5m
  "15m": { range: "5d",  interval: "15m" },
  "30m": { range: "1mo", interval: "30m" },
  "60m": { range: "1mo", interval: "60m" },
  "1d":  { range: "1mo", interval: "1d" },
  "1wk": { range: "6mo", interval: "1wk" },
  "1mo": { range: "5y",  interval: "1mo" },
  "1y":  { range: "max", interval: "1mo" },
  // legacy periods
  "3mo": { range: "3mo", interval: "1d" },
  "6mo": { range: "6mo", interval: "1d" },
  "5y":  { range: "5y",  interval: "1wk" },
};

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  const period = req.nextUrl.searchParams.get("period") ?? "6mo";
  const intervalParam = req.nextUrl.searchParams.get("interval");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const config = PERIOD_CONFIG[period] ?? { range: "6mo", interval: "1d" };
  const effectiveInterval = intervalParam ?? config.interval;
  const key = `${symbol}:${period}:${effectiveInterval}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const isMinute = ["1m", "2m", "5m", "15m", "30m", "60m"].includes(effectiveInterval);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yf.chart(symbol, {
      period1: getStartDate(config.range),
      interval: effectiveInterval as "1d" | "1wk" | "1mo" | "1m" | "5m" | "15m" | "30m" | "60m",
    });

    const quotes = result.quotes ?? result.indicators?.quote?.[0] ?? [];
    const data = (Array.isArray(quotes) ? quotes : []).map((q: Record<string, unknown>) => ({
      date: new Date(q.date as string).toISOString().slice(0, isMinute ? 16 : 10),
      time: Math.floor(new Date(q.date as string).getTime() / 1000),
      open: (q.open as number) ?? 0,
      high: (q.high as number) ?? 0,
      low: (q.low as number) ?? 0,
      close: (q.close as number) ?? 0,
      volume: (q.volume as number) ?? 0,
    }));

    cache.set(key, { data, ts: Date.now() });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

function getStartDate(range: string): string {
  const d = new Date();
  switch (range) {
    case "1d": d.setDate(d.getDate() - 1); break;
    case "5d": d.setDate(d.getDate() - 5); break;
    case "1mo": d.setMonth(d.getMonth() - 1); break;
    case "3mo": d.setMonth(d.getMonth() - 3); break;
    case "6mo": d.setMonth(d.getMonth() - 6); break;
    case "1y": d.setFullYear(d.getFullYear() - 1); break;
    case "2y": d.setFullYear(d.getFullYear() - 2); break;
    case "5y": d.setFullYear(d.getFullYear() - 5); break;
    case "max": d.setFullYear(d.getFullYear() - 30); break;
  }
  return d.toISOString().slice(0, 10);
}
