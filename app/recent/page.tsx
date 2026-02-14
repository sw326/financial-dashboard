import TradeTable from "@/components/TradeTable";
import FilterBar from "@/components/FilterBar";

export default function RecentPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">🕐 최근 거래</h1>
      <FilterBar />
      <TradeTable />
    </div>
  );
}
