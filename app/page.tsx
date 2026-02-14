import Map from "@/components/Map";
import FilterBar from "@/components/FilterBar";

export default function Home() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">서울 아파트 실거래가 지도</h1>
      <FilterBar />
      <Map />
    </div>
  );
}
