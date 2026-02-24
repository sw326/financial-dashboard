import { Suspense } from "react";
import { ClipboardList } from "lucide-react";
import TradeTable from "@/features/real-estate/components/TradeTable";
import FilterBar from "@/features/real-estate/components/FilterBar";

export default function RecentPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="size-6 text-muted-foreground" /> 최근 거래</h1>
      <Suspense>
        <FilterBar showPeriod={false} />
        <TradeTable />
      </Suspense>
    </div>
  );
}
