"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AptTrade } from "@/features/real-estate/types";
import { formatAmount } from "@/lib/utils";

interface AptDetailModalProps {
  open: boolean;
  onClose: () => void;
  aptName: string;
  trades: AptTrade[];
}

export function AptDetailModal({
  open,
  onClose,
  aptName,
  trades,
}: AptDetailModalProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const axisStroke = isDark ? "#888" : "#666";
  const textFill = isDark ? "#e5e5e5" : "#1a1a1a";

  // 날짜순 정렬
  const sorted = useMemo(() => {
    return [...trades].sort((a, b) => {
      const da = a.dealYear * 10000 + a.dealMonth * 100 + a.dealDay;
      const db = b.dealYear * 10000 + b.dealMonth * 100 + b.dealDay;
      return da - db;
    });
  }, [trades]);

  // 시세 추이 차트 데이터
  const chartData = useMemo(() => {
    return sorted.map((t) => ({
      date: `${t.dealYear}.${String(t.dealMonth).padStart(2, "0")}`,
      price: t.dealAmount,
    }));
  }, [sorted]);

  // 최근 거래가 (가장 최신)
  const latest = sorted.length > 0 ? sorted[sorted.length - 1].dealAmount : 0;

  // 최신 → 오래된 순으로 테이블 표시
  const tableRows = useMemo(() => [...sorted].reverse(), [sorted]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{aptName}</DialogTitle>
        </DialogHeader>

        {/* 요약 정보 */}
        <div className="grid grid-cols-3 gap-4 mt-2">
          <div className="rounded-lg bg-muted/50 px-4 py-3">
            <div className="text-sm text-muted-foreground">최근 거래가</div>
            <div className="text-lg font-semibold tabular-nums">
              {formatAmount(latest)}
            </div>
          </div>
          <div className="rounded-lg bg-muted/50 px-4 py-3">
            <div className="text-sm text-muted-foreground">거래 건수</div>
            <div className="text-lg font-semibold tabular-nums">
              {trades.length}건
            </div>
          </div>
          <div className="rounded-lg bg-muted/50 px-4 py-3">
            <div className="text-sm text-muted-foreground">건축년도</div>
            <div className="text-lg font-semibold tabular-nums">
              {sorted[0]?.buildYear ?? "-"}년
            </div>
          </div>
        </div>

        {/* 시세 추이 차트 */}
        {chartData.length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">시세 추이</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart
                  data={chartData}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                >
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: textFill }}
                    stroke={axisStroke}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: textFill }}
                    stroke={axisStroke}
                    tickLine={false}
                    tickFormatter={(v) =>
                      v >= 10000 ? `${(v / 10000).toFixed(1)}억` : `${v}만`
                    }
                    width={52}
                  />
                  <Tooltip
                    formatter={(v) => [formatAmount(Number(v)), "거래가"]}
                    contentStyle={{
                      backgroundColor: isDark ? "#1a1a1a" : "#fff",
                      border: `1px solid ${isDark ? "#333" : "#e5e5e5"}`,
                      borderRadius: "8px",
                      color: textFill,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: textFill }}
                    itemStyle={{ color: textFill }}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#ef4444"
                    fill="rgba(239,68,68,0.1)"
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* 거래 내역 테이블 */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">거래일</th>
                <th className="px-3 py-2 text-right font-medium">
                  면적(㎡)
                </th>
                <th className="px-3 py-2 text-right font-medium">층</th>
                <th className="px-3 py-2 text-right font-medium">
                  거래가
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tableRows.map((t, i) => (
                <tr key={i} className="hover:bg-muted/30">
                  <td className="px-3 py-2 tabular-nums">
                    {t.dealYear}.{String(t.dealMonth).padStart(2, "0")}.
                    {String(t.dealDay).padStart(2, "0")}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {t.area.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {t.floor}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">
                    {formatAmount(t.dealAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
