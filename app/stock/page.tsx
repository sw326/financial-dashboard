"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
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
        <input
          className="flex-1 border rounded-md px-3 py-2 text-sm"
          placeholder="종목 심볼 입력 (예: 005930.KS, AAPL, ^KS11)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="px-4 py-2 bg-foreground text-background rounded-md text-sm font-medium">
          검색
        </button>
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
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-3">
                <span>{quote.name}</span>
                <span className="text-sm text-muted-foreground">{quote.symbol}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-3xl font-bold">{fmt(quote.price)}</span>
                <Badge variant="outline" className={color(quote.change)}>
                  {sign(quote.change)}{quote.change.toFixed(2)} ({sign(quote.changePercent)}{quote.changePercent.toFixed(2)}%)
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><span className="text-muted-foreground">시가총액</span><br />{quote.marketCap ? (quote.marketCap / 1e8).toLocaleString(undefined, { maximumFractionDigits: 0 }) + "억" : "-"}</div>
                <div><span className="text-muted-foreground">PER</span><br />{fmt(quote.per)}</div>
                <div><span className="text-muted-foreground">52주 고가</span><br />{fmt(quote.high52w)}</div>
                <div><span className="text-muted-foreground">52주 저가</span><br />{fmt(quote.low52w)}</div>
                <div><span className="text-muted-foreground">배당률</span><br />{quote.dividendYield != null ? quote.dividendYield.toFixed(2) + "%" : "-"}</div>
              </div>
            </CardContent>
          </Card>

          {/* 기간 선택 */}
          <div className="flex gap-2">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  period === p ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

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
