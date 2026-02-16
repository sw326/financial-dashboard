import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import FilterBar from "@/components/FilterBar";

const RankChart = dynamic(() => import("@/components/RankChart"), {
  loading: () => <Skeleton className="h-[300px]" />,
});

export default function RankPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Trophy className="size-6 text-muted-foreground" /> 순위</h1>
      <Suspense>
        <FilterBar />
        <RankChart />
      </Suspense>
    </div>
  );
}
