"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkline } from "@/components/sparkline";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { MarketIndex, AptTrade } from "@/lib/types";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });
const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY || "";

/* ── 설정 ── */
const INDEX_SYMBOLS = [
  { symbol: "^KS11", label: "코스피" },
  { symbol: "^KQ11", label: "코스닥" },
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "^IXIC", label: "나스닥" },
];

const COMMODITY_SYMBOLS = [
  { symbol: "KRW=X", label: "USD/KRW" },
  { symbol: "GC=F", label: "금" },
  { symbol: "CL=F", label: "WTI유" },
  { symbol: "BTC-USD", label: "비트코인" },
];

const HIGHLIGHT_SYMBOLS = [
  "005930.KS",   // 삼성전자
  "000660.KS",   // SK하이닉스
  "373220.KS",   // LG에너지솔루션
  "035420.KS",   // NAVER
  "035720.KS",   // 카카오
  "051910.KS",   // LG화학
];

const GANGNAM_CODE = "11680"; // 강남구

const SHORTCUTS = [
  { href: "/market", icon: "📊", label: "시장개요", group: "증시" },
  { href: "/stock", icon: "📈", label: "종목차트", group: "증시" },
  { href: "/trend", icon: "📉", label: "시세추이", group: "부동산" },
  { href: "/recent", icon: "📋", label: "최근거래", group: "부동산" },
  { href: "/rank", icon: "🏆", label: "순위", group: "부동산" },
];

/* ── 유틸 ── */
const colorClass = (v: number) => (v >= 0 ? "text-[var(--color-up)]" : "text-[var(--color-down)]");
const colorValue = (v: number) => (v >= 0 ? "#ef4444" : "#3b82f6");
const sign = (v: number) => (v >= 0 ? "+" : "");
const fmt = (v: number, digits = 2) =>
  v.toLocaleString(undefined, { maximumFractionDigits: digits });

function dealYmd() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// 임시 Sparkline 데이터 생성 (실제로는 히스토리 API 필요)
function generateSparklineData(changePercent: number): number[] {
  const points = 20;
  const data: number[] = [];
  const trend = changePercent > 0 ? 1 : -1;
  
  for (let i = 0; i < points; i++) {
    const noise = (Math.random() - 0.5) * 4;  // 2 → 4로 변동폭 증가
    const trendValue = (i / points) * trend * 3;  // 트렌드 강조
    data.push(100 + trendValue + noise);
  }
  
  return data;
}

/* ── 페이지 ── */
export default function Home() {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [commodities, setCommodities] = useState<MarketIndex[]>([]);
  const [highlights, setHighlights] = useState<MarketIndex[]>([]);
  const [trades, setTrades] = useState<AptTrade[]>([]);
  const [loadIdx, setLoadIdx] = useState(true);
  const [loadCom, setLoadCom] = useState(true);
  const [loadHl, setLoadHl] = useState(true);
  const [loadTrade, setLoadTrade] = useState(true);

  useEffect(() => {
    // 주요 지수
    fetch(`/api/finance/quote?symbols=${INDEX_SYMBOLS.map((i) => i.symbol).join(",")}`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setIndices(d); })
      .catch(() => {})
      .finally(() => setLoadIdx(false));

    // 환율/원자재
    fetch(`/api/finance/quote?symbols=${COMMODITY_SYMBOLS.map((i) => i.symbol).join(",")}`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setCommodities(d); })
      .catch(() => {})
      .finally(() => setLoadCom(false));

    // 증시 하이라이트
    fetch(`/api/finance/quote?symbols=${HIGHLIGHT_SYMBOLS.join(",")}`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setHighlights(d); })
      .catch(() => {})
      .finally(() => setLoadHl(false));

    // 최근 부동산
    fetch(`/api/trade?lawdCd=${GANGNAM_CODE}&dealYmd=${dealYmd()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.trades) {
          const sorted = (d.trades as AptTrade[]).sort(
            (a, b) => b.dealDay - a.dealDay || b.dealAmount - a.dealAmount
          );
          setTrades(sorted.slice(0, 5));
        }
      })
      .catch(() => {})
      .finally(() => setLoadTrade(false));
  }, []);

  const findIdx = (sym: string) => indices.find((i) => i.symbol === sym);
  const findCom = (sym: string) => commodities.find((i) => i.symbol === sym);

  return (
    <div className="space-y-6">
      {/* ── 1. 주요 지수 (with Sparkline) ── */}
      <section>
        <h2 className="text-xl font-bold mb-4">📊 주요 지수</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {loadIdx
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)
            : INDEX_SYMBOLS.map(({ symbol, label }) => {
                const d = findIdx(symbol);
                if (!d) return null;
                const sparkData = generateSparklineData(d.changePercent);
                
                return (
                  <Card key={symbol} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex-row items-start justify-between space-y-0">
                      <div className="space-y-1">
                        <CardDescription>{label}</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums">{fmt(d.price)}</CardTitle>
                      </div>
                      <CardAction>
                        <Badge variant="outline" className={`text-sm font-semibold ${colorClass(d.changePercent)}`}>
                          {d.changePercent >= 0 ? <TrendingUp className="size-4 mr-1" /> : <TrendingDown className="size-4 mr-1" />}
                          {sign(d.changePercent)}{d.changePercent.toFixed(2)}%
                        </Badge>
                      </CardAction>
                    </CardHeader>
                    <CardContent>
                      <div className="h-12 -mx-2">
                        <Sparkline data={sparkData} color={colorValue(d.changePercent)} />
                      </div>
                    </CardContent>
                    <CardFooter className="flex-col items-start gap-1 text-sm">
                      <div className={`flex gap-2 font-medium ${colorClass(d.change)}`}>
                        {sign(d.change)}{fmt(d.change)}
                      </div>
                      <div className="text-muted-foreground">전일 대비</div>
                    </CardFooter>
                  </Card>
                );
              })}
        </div>
      </section>

      {/* ── 2. 환율/원자재 ── */}
      <section>
        <h2 className="text-lg font-semibold mb-3">💱 환율 · 원자재</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {loadCom
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
            : COMMODITY_SYMBOLS.map(({ symbol, label }) => {
                const d = findCom(symbol);
                if (!d) return null;
                return (
                  <Card key={symbol} className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
                      <div className="space-y-1">
                        <CardDescription>{label}</CardDescription>
                        <CardTitle className="text-xl font-semibold tabular-nums">{fmt(d.price)}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardFooter className="pt-2">
                      <Badge variant="outline" className={`text-xs ${colorClass(d.changePercent)}`}>
                        {d.changePercent >= 0 ? <TrendingUp className="size-3 mr-1" /> : <TrendingDown className="size-3 mr-1" />}
                        {sign(d.changePercent)}{d.changePercent.toFixed(2)}%
                      </Badge>
                    </CardFooter>
                  </Card>
                );
              })}
        </div>
      </section>

      {/* ── 3. 증시 하이라이트 + 부동산 최근 거래 ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* 증시 하이라이트 */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>📈 증시 하이라이트</span>
              <Link href="/market" className="text-xs text-muted-foreground hover:text-foreground">
                더보기 →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadHl ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : (
              <div className="divide-y">
                {highlights.map((s) => (
                  <Link
                    key={s.symbol}
                    href={`/stock?symbol=${encodeURIComponent(s.symbol)}`}
                    className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-2 px-2 rounded transition-colors"
                  >
                    <span className="text-sm font-medium truncate flex-1">{s.name}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold tabular-nums">{fmt(s.price, 0)}</span>
                      <Badge variant="outline" className={`text-xs ${colorClass(s.changePercent)} min-w-[68px] justify-center`}>
                        {s.changePercent >= 0 ? <TrendingUp className="size-3 mr-1" /> : <TrendingDown className="size-3 mr-1" />}
                        {sign(s.changePercent)}{s.changePercent.toFixed(2)}%
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 최근 부동산 거래 */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>🏠 최근 부동산 거래</span>
              <Link href="/recent?region=11680" className="text-xs text-muted-foreground hover:text-foreground">
                더보기 →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadTrade ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : trades.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">거래 데이터가 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {trades.map((t, i) => (
                  <div key={i} className="flex items-start justify-between pb-3 border-b last:border-0 hover:bg-muted/30 -mx-2 px-2 py-2 rounded transition-colors">
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{t.aptName}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t.dong} · <span className="tabular-nums">{t.area.toFixed(1)}㎡</span> · {t.floor}층
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums">{t.dealAmount.toLocaleString()}만원</p>
                      <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                        {t.dealMonth}/{t.dealDay}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── 4. 지도 ── */}
      <section>
        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>🗺️ 서울 부동산 지도</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[400px]">
              <Map kakaoKey={KAKAO_KEY} />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── 5. 바로가기 ── */}
      <section>
        <h2 className="text-lg font-semibold mb-3">🔗 바로가기</h2>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {SHORTCUTS.map(({ href, icon, label }) => (
            <Link key={href} href={href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 text-center">
                  <span className="text-3xl">{icon}</span>
                  <p className="text-sm mt-2 font-medium">{label}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
