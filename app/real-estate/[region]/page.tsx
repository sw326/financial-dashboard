"use client";

import { use, Suspense } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SEOUL_GU } from "@/lib/constants";
import Charts from "@/components/Charts";
import TradeTable from "@/components/TradeTable";

const RankChart = dynamic(() => import("@/components/RankChart"), {
  loading: () => <Skeleton className="h-[400px]" />,
});

const Map = dynamic(() => import("@/components/Map"), {
  loading: () => <Skeleton className="h-[400px]" />,
  ssr: false,
});

export default function RegionDetailPage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const { region } = use(params);

  // SEOUL_GU에서 지역명 찾기
  const guInfo = SEOUL_GU.find((g) => g.code === region);
  const guName = guInfo?.name || region;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href="/real-estate"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold">{guName}</h1>
      </div>

      <Suspense fallback={<Skeleton className="h-96" />}>
        <RegionDetail region={region} />
      </Suspense>
    </div>
  );
}

function RegionDetail({ region }: { region: string }) {
  // 카카오 API 키 가져오기 (환경변수)
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY || "";

  return (
    <Tabs defaultValue="trend" className="space-y-4">
      <TabsList>
        <TabsTrigger value="trend">시세추이</TabsTrigger>
        <TabsTrigger value="trades">거래내역</TabsTrigger>
        <TabsTrigger value="rank">단지정보</TabsTrigger>
        <TabsTrigger value="map">지도</TabsTrigger>
      </TabsList>

      <TabsContent value="trend">
        <Charts region={region} />
      </TabsContent>

      <TabsContent value="trades">
        <TradeTable region={region} />
      </TabsContent>

      <TabsContent value="rank">
        <RankChart region={region} />
      </TabsContent>

      <TabsContent value="map">
        <div className="h-[600px]">
          <Map kakaoKey={kakaoKey} region={region} />
        </div>
      </TabsContent>
    </Tabs>
  );
}
