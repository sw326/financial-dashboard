"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { MarketIndex, AptTrade } from "@/lib/types";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });
const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY || "";

/* ── 설정 ── */
const INDEX_SYMBOLS = [
  { symbol: "^KS11", label: "코스피" },
  { symbol: "^KQ11", label: "코스닥" },
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "KRW=X", label: "USD/KRW" },
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
const color = (v: number) => (v >= 0 ? "text-red-500" : "text-blue-500");
const sign = (v: number) => (v >= 0 ? "+" : "");
const fmt = (v: number, digits = 2) =>
  v.toLocaleString(undefined, { maximumFractionDigits: digits });

function dealYmd() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/* ── 페이지 ── */
export default function Home() {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [highlights, setHighlights] = useState<MarketIndex[]>([]);
  const [trades, setTrades] = useState<AptTrade[]>([]);
  const [loadIdx, setLoadIdx] = useState(true);
  const [loadHl, setLoadHl] = useState(true);
  const [loadTrade, setLoadTrade] = useState(true);

  useEffect(() => {
    // 주요 지수
    fetch(`/api/finance/quote?symbols=${INDEX_SYMBOLS.map((i) => i.symbol).join(",")}`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setIndices(d); })
      .catch(() => {})
      .finally(() => setLoadIdx(false));

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

  return (
    <div className="space-y-6">
      {/* ── 1. 주요 지수 요약 ── */}
      <section>
        <h2 className="text-lg font-semibold mb-3">📊 주요 지수</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {loadIdx
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)
            : INDEX_SYMBOLS.map(({ symbol, label }) => {
                const d = findIdx(symbol);
                if (!d) return null;
                return (
                  <Card key={symbol} className="py-0">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-lg font-bold">{fmt(d.price)}</p>
                      <Badge variant="outline" className={`text-xs ${color(d.changePercent)}`}>
                        {sign(d.changePercent)}{d.changePercent.toFixed(2)}%
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
        </div>
      </section>

      {/* ── 2. 증시 하이라이트 + 카카오맵 ── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 증시 하이라이트 */}
        <Card className="py-0">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-base">📈 증시 하이라이트</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {loadHl ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
              </div>
            ) : (
              <div className="divide-y">
                {highlights.map((s) => (
                  <Link
                    key={s.symbol}
                    href={`/stock?symbol=${encodeURIComponent(s.symbol)}`}
                    className="flex items-center justify-between py-2 hover:bg-muted/50 -mx-1 px-1 rounded transition-colors"
                  >
                    <span className="text-sm font-medium truncate">{s.name}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold">{fmt(s.price, 0)}</span>
                      <Badge variant="outline" className={`text-xs ${color(s.changePercent)}`}>
                        {sign(s.changePercent)}{s.changePercent.toFixed(2)}%
                      </Badge>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 맵 */}
        <Card className="py-0 overflow-hidden">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-base">🗺️ 서울 부동산 지도</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[320px]">
              <Map kakaoKey={KAKAO_KEY} />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── 3. 최근 부동산 거래 ── */}
      <section>
        <Card className="py-0">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-base flex items-center justify-between">
              <span>🏠 최근 부동산 거래 (강남구)</span>
              <Link href="/recent?region=11680" className="text-xs text-muted-foreground hover:text-foreground">
                더보기 →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {loadTrade ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
              </div>
            ) : trades.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">거래 데이터가 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="pb-2 font-medium">아파트</th>
                      <th className="pb-2 font-medium">동</th>
                      <th className="pb-2 font-medium text-right">면적(㎡)</th>
                      <th className="pb-2 font-medium text-right">층</th>
                      <th className="pb-2 font-medium text-right">거래가(만원)</th>
                      <th className="pb-2 font-medium text-right">날짜</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((t, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2 font-medium truncate max-w-[140px]">{t.aptName}</td>
                        <td className="py-2">{t.dong}</td>
                        <td className="py-2 text-right">{t.area.toFixed(1)}</td>
                        <td className="py-2 text-right">{t.floor}</td>
                        <td className="py-2 text-right font-bold">{t.dealAmount.toLocaleString()}</td>
                        <td className="py-2 text-right text-muted-foreground">
                          {t.dealMonth}/{t.dealDay}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── 4. 바로가기 ── */}
      <section>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {SHORTCUTS.map(({ href, icon, label }) => (
            <Link key={href} href={href}>
              <Card className="py-0 hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-3 text-center">
                  <span className="text-2xl">{icon}</span>
                  <p className="text-sm mt-1 font-medium">{label}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
