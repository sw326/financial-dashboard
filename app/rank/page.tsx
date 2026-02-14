import { Suspense } from "react";
import RankChart from "@/components/RankChart";
import FilterBar from "@/components/FilterBar";

export default function RankPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">🏆 순위</h1>
      <Suspense>
        <FilterBar />
        <RankChart />
      </Suspense>
    </div>
  );
}
