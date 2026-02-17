"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Home as HomeIcon,
  Map as MapIcon,
  ExternalLink,
  LineChart,
  ClipboardList,
  Trophy,
} from "lucide-react";
import { useQuotes } from "@/hooks/use-quotes";
import { useRecentTrades } from "@/hooks/use-recent-trades";
import { IndexCarousel } from "@/components/index-carousel";
import MarketHeatmap from "@/components/market-heatmap";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });
const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY || "";

/* ── 설정 ── */
const CAROUSEL_SYMBOLS = [
  { symbol: "^KS11", label: "코스피" },
  { symbol: "^KQ11", label: "코스닥" },
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "^IXIC", label: "나스닥" },
  { symbol: "KRW=X", label: "USD/KRW" },
  { symbol: "GC=F", label: "금" },
  { symbol: "CL=F", label: "WTI유" },
  { symbol: "BTC-USD", label: "비트코인" },
];

const HIGHLIGHT_SYMBOLS = [
  "005930.KS",
  "000660.KS",
  "373220.KS",
  "035420.KS",
  "035720.KS",
  "051910.KS",
];

const GANGNAM_CODE = "11680";

const SHORTCUTS = [
  { href: "/market", icon: BarChart3, label: "시장개요", group: "증시" },
  { href: "/stock", icon: LineChart, label: "종목차트", group: "증시" },
  { href: "/trend", icon: TrendingDown, label: "시세추이", group: "부동산" },
  { href: "/recent", icon: ClipboardList, label: "최근거래", group: "부동산" },
  { href: "/rank", icon: Trophy, label: "순위", group: "부동산" },
];

/* ── 유틸 ── */
const colorClass = (v: number) => (v >= 0 ? "text-[var(--color-up)]" : "text-[var(--color-down)]");
const sign = (v: number) => (v >= 0 ? "+" : "");
const fmt = (v: number, digits = 2) =>
  v.toLocaleString(undefined, { maximumFractionDigits: digits });

function dealYmd() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/* ── 페이지 ── */
export default function Home() {
  const [heatmapMarket, setHeatmapMarket] = useState("kr");

  const allSymbols = useMemo(() => CAROUSEL_SYMBOLS.map((i) => i.symbol), []);
  const { data: carouselData = [], isLoading: loadCarousel } = useQuotes(allSymbols);
  const { data: highlights = [], isLoading: loadHl } = useQuotes(HIGHLIGHT_SYMBOLS);
  const { data: trades = [], isLoading: loadTrade } = useRecentTrades(GANGNAM_CODE, dealYmd(), 5);

  const carouselIndices = useMemo(() => {
    return carouselData.map((d) => {
      const info = CAROUSEL_SYMBOLS.find((i) => i.symbol === d.symbol);
      return { ...d, name: info?.label || d.name };
    });
  }, [carouselData]);

  return (
    <div className="space-y-6">
      {/* ── 1. 지수/원자재 캐로셀 ── */}
      <section>
        {loadCarousel ? (
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : (
          <IndexCarousel indices={carouselIndices} />
        )}
      </section>

      {/* ── 2. 시장 히트맵 ── */}
      <section>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">시장 히트맵</CardTitle>
            <CardAction>
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                {[
                  { value: "kr", label: "국장" },
                  { value: "us", label: "미장" },
                ].map((m) => (
                  <Button
                    key={m.value}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "rounded-md text-xs h-7",
                      heatmapMarket === m.value && "bg-background shadow-sm"
                    )}
                    onClick={() => setHeatmapMarket(m.value)}
                  >
                    {m.label}
                  </Button>
                ))}
              </div>
            </CardAction>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <MarketHeatmap market={heatmapMarket} />
          </CardContent>
        </Card>
      </section>

      {/* ── 3. 증시 하이라이트 + 부동산 최근 거래 ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="size-5 text-muted-foreground" />
                증시 하이라이트
              </span>
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

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <HomeIcon className="size-5 text-muted-foreground" />
                최근 부동산 거래
              </span>
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
            <CardTitle className="flex items-center gap-2">
              <MapIcon className="size-5 text-muted-foreground" />
              서울 부동산 지도
            </CardTitle>
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
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <ExternalLink className="size-5 text-muted-foreground" />
          바로가기
        </h2>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {SHORTCUTS.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 text-center">
                  <Icon className="size-8 mx-auto text-muted-foreground" />
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
