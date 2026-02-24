/**
 * GET /api/interests?page=1&limit=20
 * 알고리즘 피드 (CHM-295, CHM-296)
 *
 * 비로그인 → trending 100%
 * 로그인 interests=0 → trending 100%
 * interests 1~3  → trending 60% + personal 40%
 * interests 4~9  → trending 30% + personal 70%
 * interests ≥10  → personal 100%
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseServer } from "@/lib/supabase/admin";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
const PAGE_SIZE = 20;

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

async function getTrending(exclude: Set<string>, limit: number, offset: number): Promise<FeedStock[]> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const res = await fetch(
    `${siteUrl}/api/finance/trending?market=kr&limit=${limit + offset}`,
    { next: { revalidate: 300 } }
  ).catch(() => null);
  if (!res?.ok) return [];
  const td = await res.json();
  return (td?.stocks ?? [] as FeedStock[])
    .filter((s: FeedStock) => !exclude.has(s.symbol))
    .slice(offset, offset + limit);
}

// interests 수 → 블렌딩 비율 (CHM-296)
function getBlendRatio(interestCount: number): { personal: number; trending: number } {
  if (interestCount === 0)  return { personal: 0,   trending: 1 };
  if (interestCount < 4)    return { personal: 0.4, trending: 0.6 };
  if (interestCount < 10)   return { personal: 0.7, trending: 0.3 };
  return                           { personal: 1,   trending: 0 };
}

export async function GET(req: NextRequest) {
  const page   = Math.max(1, parseInt(req.nextUrl.searchParams.get("page")  ?? "1"));
  const limit  = Math.min(20, parseInt(req.nextUrl.searchParams.get("limit") ?? "20"));
  const offset = (page - 1) * limit;

  // 인증 (실패해도 비로그인으로 계속)
  let userId: string | null = null;
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) userId = user.id;
  } catch { /* 비로그인 */ }

  // ── 비로그인: trending만 ──
  if (!userId) {
    const stocks = await getTrending(new Set(), limit, offset);
    return NextResponse.json({ type: "trending", stocks, hasMore: stocks.length === limit, page });
  }

  // ── 전체 interests 수 파악 ──
  const { count: totalInterests } = await supabaseServer
    .from("user_interests")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const interestCount = totalInterests ?? 0;
  const { personal: pRatio, trending: tRatio } = getBlendRatio(interestCount);

  const personalLimit  = Math.round(limit * pRatio);
  const trendingLimit  = limit - personalLimit;

  // ── 개인화 구간 ──
  let personalStocks: FeedStock[] = [];
  let personalHasMore = false;

  if (personalLimit > 0) {
    const personalOffset = offset; // personal은 score DESC 전체 기준
    const { data: interests } = await supabaseServer
      .from("user_interests")
      .select("symbol, name, is_kr")
      .eq("user_id", userId)
      .order("score", { ascending: false })
      .range(personalOffset, personalOffset + personalLimit - 1);

    const symbols = (interests ?? []).map((i) => i.symbol).filter((s): s is string => !!s);
    if (symbols.length > 0) {
      personalStocks = await fetchQuotes(symbols);
      personalHasMore = symbols.length === personalLimit;
    }
  }

  // ── 트렌딩 구간 ──
  let trendingStocks: FeedStock[] = [];
  const excludeSet = new Set(personalStocks.map((s) => s.symbol));

  if (trendingLimit > 0) {
    const trendOffset = Math.max(0, offset - Math.round(offset * pRatio));
    trendingStocks = await getTrending(excludeSet, trendingLimit, trendOffset);
  }

  const stocks = [...personalStocks, ...trendingStocks];
  const type = personalStocks.length > 0 ? "personalized" : "trending";
  const hasMore = personalHasMore || trendingStocks.length === trendingLimit;

  return NextResponse.json({ type, stocks, hasMore, page, interestCount });
}
