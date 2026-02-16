import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import FilterBar from "@/components/FilterBar";

const Charts = dynamic(() => import("@/components/Charts"), {
  loading: () => <Skeleton className="h-[350px]" />,
});

export default function TrendPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">📈 시세 추이</h1>
      <Suspense>
        <FilterBar />
        <Charts />
      </Suspense>
    </div>
  );
}
