/**
 * GET /api/interests — 알고리즘 피드 데이터 (CHM-295)
 * 로그인: user_interests score DESC → Yahoo Finance 시세 조회
 * Cold start (interests = 0): trending 상위 종목 fallback
 */
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseServer } from "@/lib/supabase/admin";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
const LIMIT = 10;

interface FeedStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  isKR: boolean;
}

async function fetchQuotes(symbols: string[]): Promise<FeedStock[]> {
  const results = await Promise.allSettled(
    symbols.map(async (sym): Promise<FeedStock> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const q: any = await yf.quote(sym);
      const isKR = sym.endsWith(".KS") || sym.endsWith(".KQ");
      return {
        symbol: sym,
        name:   q.shortName ?? q.longName ?? sym,
        price:  q.regularMarketPrice ?? 0,
        change: q.regularMarketChange ?? 0,
        changePercent: q.regularMarketChangePercent ?? 0,
        isKR,
      };
    })
  );
  return results
    .filter((r): r is PromiseFulfilledResult<FeedStock> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((q) => q.price > 0);
}

export async function GET() {
  // 인증 확인
  let userId: string | null = null;
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) userId = user.id;
  } catch { /* 비로그인 */ }

  if (!userId) {
    return NextResponse.json({ type: "guest", stocks: [] });
  }

  // 관심사 조회 (score DESC)
  const { data: interests } = await supabaseServer
    .from("user_interests")
    .select("symbol, name, is_kr, score")
    .eq("user_id", userId)
    .order("score", { ascending: false })
    .limit(LIMIT);

  // Cold start: interests 없으면 trending fallback
  if (!interests?.length) {
    const trendRes = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/finance/trending?market=kr&limit=10`,
      { next: { revalidate: 300 } }
    ).catch(() => null);

    if (trendRes?.ok) {
      const trendData = await trendRes.json();
      const trendStocks = (trendData?.stocks ?? []).slice(0, LIMIT);
      return NextResponse.json({ type: "trending", stocks: trendStocks });
    }
    return NextResponse.json({ type: "trending", stocks: [] });
  }

  // 실시간 시세 조회
  const symbols = interests.map((i) => i.symbol).filter((s): s is string => !!s);
  const quotes = await fetchQuotes(symbols);

  // 관심사 순서 유지 (score DESC)
  const symbolOrder = new Map(
    interests.filter((i) => i.symbol).map((i, idx) => [i.symbol as string, idx])
  );
  quotes.sort((a, b) => (symbolOrder.get(a.symbol) ?? 99) - (symbolOrder.get(b.symbol) ?? 99));

  return NextResponse.json({ type: "personalized", stocks: quotes });
}
