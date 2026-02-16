"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { StockQuote, ChartData } from "@/lib/types";
import { chartTooltipStyle } from "@/components/chart-tooltip";

const PERIODS = ["1mo", "3mo", "6mo", "1y", "5y"] as const;

function StockContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const symbol = searchParams.get("symbol") ?? "";

  const [input, setInput] = useState(symbol);
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [chart, setChart] = useState<ChartData[]>([]);
  const [period, setPeriod] = useState<string>("6mo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(
    async (sym: string, p: string) => {
      if (!sym) return;
      setLoading(true);
      setError("");
      try {
        const [qRes, cRes] = await Promise.all([
          fetch(`/api/finance/quote?symbols=${encodeURIComponent(sym)}`),
          fetch(`/api/finance/chart?symbol=${encodeURIComponent(sym)}&period=${p}`),
        ]);
        const qData = await qRes.json();
        const cData = await cRes.json();
        if (Array.isArray(qData) && qData.length > 0) setQuote(qData[0]);
        else setError("종목을 찾을 수 없습니다");
        if (Array.isArray(cData)) setChart(cData);
      } catch {
        setError("데이터 로딩 실패");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (symbol) {
      setInput(symbol);
      fetchData(symbol, period);
    }
  }, [symbol, period, fetchData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      router.push(`/stock?symbol=${encodeURIComponent(input.trim())}`);
    }
  };

  const color = (v: number) => (v >= 0 ? "text-[var(--color-up)]" : "text-[var(--color-down)]");
  const colorValue = (v: number) => (v >= 0 ? "#ef4444" : "#3b82f6");
  const sign = (v: number) => (v >= 0 ? "+" : "");
  const fmt = (v?: number) => v != null ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "-";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📈 종목 차트</h1>

      {/* 검색 */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          className="flex-1"
          placeholder="종목 심볼 입력 (예: 005930.KS, AAPL, ^KS11)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button type="submit">검색</Button>
      </form>

      {error && <p className="text-red-500">{error}</p>}

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      )}

      {!loading && quote && (
        <>
          {/* 기본 정보 */}
          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div className="space-y-2">
                <CardDescription>{quote.symbol}</CardDescription>
                <CardTitle className="text-3xl font-semibold tabular-nums">{fmt(quote.price)}</CardTitle>
                <div className="text-lg font-medium">{quote.name}</div>
              </div>
              <CardAction>
                <Badge variant="outline" className={`text-sm ${color(quote.change)}`}>
                  {quote.change >= 0 ? <TrendingUp className="size-4 mr-1" /> : <TrendingDown className="size-4 mr-1" />}
                  {sign(quote.change)}{quote.change.toFixed(2)} ({sign(quote.changePercent)}{quote.changePercent.toFixed(2)}%)
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">시가총액</div>
                  <div className="font-medium tabular-nums">{quote.marketCap ? (quote.marketCap / 1e8).toLocaleString(undefined, { maximumFractionDigits: 0 }) + "억" : "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">PER</div>
                  <div className="font-medium tabular-nums">{fmt(quote.per)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">52주 고가</div>
                  <div className="font-medium tabular-nums">{fmt(quote.high52w)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">52주 저가</div>
                  <div className="font-medium tabular-nums">{fmt(quote.low52w)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">배당률</div>
                  <div className="font-medium tabular-nums">{quote.dividendYield != null ? quote.dividendYield.toFixed(2) + "%" : "-"}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 기간 선택 */}
          <ToggleGroup type="single" value={period} onValueChange={(v) => v && setPeriod(v)}>
            {PERIODS.map((p) => (
              <ToggleGroupItem key={p} value={p} className="px-4">
                {p}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          {/* 가격 차트 */}
          {chart.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} tickFormatter={(v) => v.toLocaleString()} />
                    <Tooltip
                      formatter={(v) => [(v as number).toLocaleString(), "종가"]}
                      labelFormatter={(l) => `📅 ${l}`}
                      {...chartTooltipStyle}
                    />
                    <Line
                      type="monotone"
                      dataKey="close"
                      stroke={colorValue(quote.change)}
                      dot={false}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* 거래량 차트 */}
          {chart.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">거래량</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => (v / 1e6).toFixed(0) + "M"} />
                    <Tooltip
                      formatter={(v) => [(v as number).toLocaleString(), "거래량"]}
                      labelFormatter={(l) => `📅 ${l}`}
                      {...chartTooltipStyle}
                    />
                    <Bar dataKey="volume" fill="#94a3b8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!loading && !quote && !error && !symbol && (
        <p className="text-muted-foreground text-center py-12">심볼을 입력하여 종목 정보를 조회하세요</p>
      )}
    </div>
  );
}

export default function StockPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <StockContent />
    </Suspense>
  );
}
