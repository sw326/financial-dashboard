"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FilterBar from "@/components/FilterBar";
import TradeTable from "@/components/TradeTable";

const RankChart = dynamic(() => import("@/components/RankChart"), {
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
        <Tabs defaultValue="recent" className="space-y-4">
          <TabsList>
            <TabsTrigger value="recent">최근거래</TabsTrigger>
            <TabsTrigger value="rank">순위</TabsTrigger>
          </TabsList>

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
