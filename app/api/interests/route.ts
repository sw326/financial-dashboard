/**
 * GET /api/interests?page=1&limit=20
 * 알고리즘 피드 페이지네이션 (CHM-295)
 *
 * 순서: 개인화(score DESC) → 소진되면 trending 블렌딩
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseServer } from "@/lib/supabase/admin";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

interface FeedStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  isKR: boolean;
}

async function fetchQuotes(symbols: string[]): Promise<FeedStock[]> {
  if (!symbols.length) return [];
  const results = await Promise.allSettled(
    symbols.map(async (sym): Promise<FeedStock> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const q: any = await yf.quote(sym);
      const isKR = sym.endsWith(".KS") || sym.endsWith(".KQ");
      return {
        symbol: sym,
        name: q.shortName ?? q.longName ?? sym,
        price: q.regularMarketPrice ?? 0,
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

export async function GET(req: NextRequest) {
  const page  = Math.max(1, parseInt(req.nextUrl.searchParams.get("page")  ?? "1"));
  const limit = Math.min(20, parseInt(req.nextUrl.searchParams.get("limit") ?? "20"));
  const offset = (page - 1) * limit;

  // 인증
  let userId: string | null = null;
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) userId = user.id;
  } catch { /* 비로그인 */ }

  // 비로그인
  if (!userId) return NextResponse.json({ type: "guest", stocks: [], hasMore: false });

  // ── 개인화 구간: user_interests score DESC ──
  const { data: interests, count: totalInterests } = await supabaseServer
    .from("user_interests")
    .select("symbol, name, is_kr, score", { count: "exact" })
    .eq("user_id", userId)
    .order("score", { ascending: false })
    .range(offset, offset + limit - 1);

  const personalCount = totalInterests ?? 0;
  const personalSymbols = (interests ?? [])
    .map((i) => i.symbol)
    .filter((s): s is string => !!s);

  if (personalSymbols.length === limit) {
    // 개인화 결과만으로 페이지 채워짐
    const quotes = await fetchQuotes(personalSymbols);
    const symbolOrder = new Map(personalSymbols.map((s, i) => [s, i]));
    quotes.sort((a, b) => (symbolOrder.get(a.symbol) ?? 99) - (symbolOrder.get(b.symbol) ?? 99));
    return NextResponse.json({
      type: "personalized",
      stocks: quotes,
      hasMore: offset + limit < personalCount,
      page,
    });
  }

  // ── 개인화 소진 → trending 블렌딩 ──
  const personalizedStocks = personalSymbols.length > 0
    ? await fetchQuotes(personalSymbols) : [];

  const trendNeeded = limit - personalizedStocks.length;
  const excludeSymbols = new Set(personalSymbols);

  // trending API 내부 직접 호출
  const trendingOffset = Math.max(0, offset - personalCount);
  const trendRes = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/finance/trending?market=kr&limit=${trendNeeded + trendingOffset}`,
    { next: { revalidate: 300 } }
  ).catch(() => null);

  let trendingStocks: FeedStock[] = [];
  if (trendRes?.ok) {
    const td = await trendRes.json();
    const allTrending: FeedStock[] = (td?.stocks ?? [])
      .filter((s: FeedStock) => !excludeSymbols.has(s.symbol))
      .slice(trendingOffset, trendingOffset + trendNeeded);
    trendingStocks = allTrending;
  }

  const combined = [...personalizedStocks, ...trendingStocks];
  const type = personalizedStocks.length > 0 ? "personalized" : "trending";

  return NextResponse.json({
    type,
    stocks: combined,
    hasMore: trendingStocks.length === trendNeeded, // trending이 더 있으면 계속
    page,
  });
}
