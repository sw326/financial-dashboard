"use client";

import { use } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { StockQuote } from "@/lib/types";
import { useQuotes } from "@/hooks/use-quotes";
import { TradingViewChart } from "@/components/tradingview-chart";

interface Props {
  params: Promise<{ symbol: string }>;
}

export default function StockDetailPage({ params }: Props) {
  // Next.js 16 - params는 Promise, use() hook으로 unwrap
  const resolvedParams = use(params);
  const symbol = decodeURIComponent(resolvedParams.symbol);

  return <StockDetailContent symbol={symbol} />;
}

function StockDetailContent({ symbol }: { symbol: string }) {
  // React Query hooks
  const { data: quoteData = [], isLoading: quoteLoading, error: quoteError } = useQuotes([symbol]);

  const quote = quoteData.length > 0 ? (quoteData[0] as unknown as StockQuote) : null;
  const loading = quoteLoading;
  const error = quoteError ? "데이터 로딩 실패" : (!quote && !quoteLoading ? "종목을 찾을 수 없습니다" : "");

  const color = (v: number) => (v >= 0 ? "text-[var(--color-up)]" : "text-[var(--color-down)]");
  const sign = (v: number) => (v >= 0 ? "+" : "");
  const fmt = (v?: number) => v != null ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "-";

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{symbol}</h1>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!quote) {
    return <p className="text-muted-foreground text-center py-12">종목 정보를 불러올 수 없습니다</p>;
  }

  return (
    <div className="space-y-6">
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
      </Card>

      {/* 탭: 차트 / 종목정보 */}
      <Tabs defaultValue="chart">
        <TabsList>
          <TabsTrigger value="chart">차트</TabsTrigger>
          <TabsTrigger value="info">종목정보</TabsTrigger>
        </TabsList>

        {/* 차트 탭 */}
        <TabsContent value="chart">
          <Card>
            <CardContent className="p-0 overflow-hidden rounded-b-lg">
              <div className="h-[450px] md:h-[600px]">
                <TradingViewChart symbol={symbol} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 종목정보 탭 */}
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>종목 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">시가총액</div>
                    <div className="text-lg font-semibold tabular-nums">
                      {quote.marketCap ? (quote.marketCap / 1e8).toLocaleString(undefined, { maximumFractionDigits: 0 }) + "억" : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">PER (주가수익비율)</div>
                    <div className="text-lg font-semibold tabular-nums">{fmt(quote.per)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">PBR (주가순자산비율)</div>
                    <div className="text-lg font-semibold tabular-nums">{fmt(quote.pbr)}</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">52주 고가</div>
                    <div className="text-lg font-semibold tabular-nums">{fmt(quote.high52w)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">52주 저가</div>
                    <div className="text-lg font-semibold tabular-nums">{fmt(quote.low52w)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">배당률</div>
                    <div className="text-lg font-semibold tabular-nums">
                      {quote.dividendYield != null ? quote.dividendYield.toFixed(2) + "%" : "-"}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
