import Charts from "@/components/Charts";
import FilterBar from "@/components/FilterBar";

export default function TrendPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">📈 시세 추이</h1>
      <FilterBar />
      <Charts />
    </div>
  );
}
