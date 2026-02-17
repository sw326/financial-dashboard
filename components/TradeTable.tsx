"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrades } from "@/hooks/useTrades";
import { formatAmount } from "@/lib/utils";
import { AptDetailModal } from "@/components/apt-detail-modal";

type SortKey = "amount" | "date";

export default function TradeTable({ region: propRegion }: { region?: string } = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const region = propRegion || searchParams.get("region") || "11680";
  const area = searchParams.get("area") || "all";

  const { trades, loading, error } = useTrades(region, "3m", area);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedApt, setSelectedApt] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const arr = [...trades];
    arr.sort((a, b) => {
      if (sortKey === "amount") {
        return sortAsc ? a.dealAmount - b.dealAmount : b.dealAmount - a.dealAmount;
      }
      const dateA = a.dealYear * 10000 + a.dealMonth * 100 + a.dealDay;
      const dateB = b.dealYear * 10000 + b.dealMonth * 100 + b.dealDay;
      return sortAsc ? dateA - dateB : dateB - dateA;
    });
    return arr;
  }, [trades, sortKey, sortAsc]);

  // 선택된 아파트의 전체 거래 내역 (기간 제한 없이 trades 전체에서 필터)
  const aptTrades = useMemo(() => {
    if (!selectedApt) return [];
    return trades.filter((t) => t.aptName === selectedApt);
  }, [trades, selectedApt]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="w-full h-10 rounded" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive rounded-lg p-8 text-center">
        데이터 로딩 실패: {error}
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="bg-muted rounded-lg p-8 text-center text-muted-foreground">
        해당 조건의 거래 데이터가 없습니다.
      </div>
    );
  }

  return (
    <>
      <div className="bg-card rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>아파트명</TableHead>
              <TableHead>법정동</TableHead>
              <TableHead className="text-right">전용면적(㎡)</TableHead>
              <TableHead className="text-right">층</TableHead>
              <TableHead
                className="text-right cursor-pointer hover:text-foreground"
                onClick={() => toggleSort("amount")}
              >
                거래금액 {sortKey === "amount" ? (sortAsc ? "↑" : "↓") : ""}
              </TableHead>
              <TableHead
                className="text-right cursor-pointer hover:text-foreground"
                onClick={() => toggleSort("date")}
              >
                거래일 {sortKey === "date" ? (sortAsc ? "↑" : "↓") : ""}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.slice(0, 100).map((t, i) => (
              <TableRow
                key={i}
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => router.push(`/real-estate/${region}`)}
              >
                <TableCell
                  className="font-medium text-primary hover:underline cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedApt(t.aptName);
                  }}
                >
                  {t.aptName}
                </TableCell>
                <TableCell>{t.dong}</TableCell>
                <TableCell className="text-right tabular-nums">{t.area.toFixed(1)}</TableCell>
                <TableCell className="text-right tabular-nums">{t.floor}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatAmount(t.dealAmount)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {t.dealYear}.{String(t.dealMonth).padStart(2, "0")}.{String(t.dealDay).padStart(2, "0")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {sorted.length > 100 && (
          <div className="text-center text-sm text-muted-foreground py-3 border-t">
            총 {sorted.length}건 중 100건 표시
          </div>
        )}
      </div>

      {selectedApt && (
        <AptDetailModal
          open={!!selectedApt}
          onClose={() => setSelectedApt(null)}
          aptName={selectedApt}
          trades={aptTrades}
        />
      )}
    </>
  );
}
