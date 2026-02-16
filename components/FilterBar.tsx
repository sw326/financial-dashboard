"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, memo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import RegionPicker from "@/components/RegionPicker";

const AREA_OPTIONS = [
  { value: "all", label: "전체 면적" },
  { value: "small", label: "59㎡ 이하" },
  { value: "medium", label: "59~85㎡" },
  { value: "large", label: "85㎡ 초과" },
];

const PERIOD_OPTIONS = [
  { value: "3m", label: "3개월" },
  { value: "6m", label: "6개월" },
  { value: "1y", label: "1년" },
  { value: "2y", label: "2년" },
  { value: "3y", label: "3년" },
];

interface FilterBarProps {
  showArea?: boolean;
  showPeriod?: boolean;
}

function FilterBarComponent({ showArea = true, showPeriod = true }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const region = searchParams.get("region") || "11680"; // 강남구 default
  const area = searchParams.get("area") || "all";
  const period = searchParams.get("period") || "6m";

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(key, value);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex flex-wrap gap-3 p-4 bg-muted/50 rounded-lg border">
      <RegionPicker value={region} onValueChange={(v) => updateParam("region", v)} />

      {showArea && (
        <Select value={area} onValueChange={(v) => updateParam("area", v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="면적" />
          </SelectTrigger>
          <SelectContent>
            {AREA_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {showPeriod && (
        <Select value={period} onValueChange={(v) => updateParam("period", v)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="기간" />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

export default memo(FilterBarComponent);
