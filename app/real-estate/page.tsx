"use client";

import { Suspense } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Building2, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FilterBar from "@/features/real-estate/components/FilterBar";
import TradeTable from "@/features/real-estate/components/TradeTable";
import { SEOUL_GU } from "@/lib/constants";

const RankChart = dynamic(() => import("@/features/real-estate/components/RankChart"), {
  loading: () => <Skeleton className="h-[300px]" />,
});

export default function RealEstatePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Building2 className="size-6 text-muted-foreground" />
        부동산
      </h1>

      <Suspense>
        <Tabs defaultValue="regions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="regions">지역별</TabsTrigger>
            <TabsTrigger value="recent">최근거래</TabsTrigger>
            <TabsTrigger value="rank">순위</TabsTrigger>
          </TabsList>

          <TabsContent value="regions">
            <div className="divide-y border rounded-lg">
              {SEOUL_GU.map((gu) => (
                <Link
                  key={gu.code}
                  href={`/real-estate/${gu.code}`}
                  className="flex items-center justify-between py-3 px-4 hover:bg-muted/50 rounded transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{gu.name}</span>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="recent" className="space-y-4">
            <FilterBar showPeriod={false} />
            <TradeTable />
          </TabsContent>

          <TabsContent value="rank" className="space-y-4">
            <FilterBar />
            <RankChart />
          </TabsContent>
        </Tabs>
      </Suspense>
    </div>
  );
}
