"use client";

import { useState, useRef, useEffect, memo } from "react";
import { SEOUL_GU, GYEONGGI_SI } from "@/lib/constants";
import { ChevronDown, MapPin } from "lucide-react";

interface RegionGroup {
  label: string;
  codes: string[];
}

const SEOUL_GROUPS: RegionGroup[] = [
  { label: "도심권", codes: ["11110", "11140", "11170"] },
  {
    label: "동북권",
    codes: ["11200", "11215", "11230", "11260", "11290", "11305", "11320", "11350"],
  },
  { label: "서북권", codes: ["11380", "11410", "11440"] },
  {
    label: "서남권",
    codes: ["11470", "11500", "11530", "11545", "11560", "11590", "11620"],
  },
  { label: "동남권(강남)", codes: ["11650", "11680", "11710", "11740"] },
];

const GYEONGGI_GROUPS: RegionGroup[] = [
  { label: "수원", codes: ["41111", "41113", "41115", "41117"] },
  { label: "성남", codes: ["41131", "41133", "41135"] },
  { label: "고양", codes: ["41281", "41285", "41287"] },
  { label: "용인", codes: ["41461", "41463", "41465"] },
  { label: "안양/안산", codes: ["41171", "41173", "41271", "41273"] },
  {
    label: "기타",
    codes: [
      "41150", "41190", "41210", "41220", "41250",
      "41290", "41310", "41360", "41370", "41390",
      "41410", "41430", "41450", "41480", "41500",
      "41550", "41570", "41590", "41610", "41630",
      "41650", "41670",
    ],
  },
];

const SEOUL_CODE_TO_NAME = Object.fromEntries(SEOUL_GU.map((g) => [g.code, g.name]));
const GYEONGGI_CODE_TO_NAME = Object.fromEntries(GYEONGGI_SI.map((g) => [g.code, g.name]));
const ALL_CODE_TO_NAME = { ...SEOUL_CODE_TO_NAME, ...GYEONGGI_CODE_TO_NAME };

interface RegionPickerProps {
  value: string;
  onValueChange: (code: string) => void;
}

function RegionPickerComponent({ value, onValueChange }: RegionPickerProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"seoul" | "gyeonggi">(
    value.startsWith("41") ? "gyeonggi" : "seoul"
  );
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const selectedName = ALL_CODE_TO_NAME[value] || "지역 선택";

  const renderGroups = (groups: RegionGroup[], codeToName: Record<string, string>) =>
    groups.map((group) => (
      <div key={group.label} className="mb-3 last:mb-0">
        <div className="text-xs font-semibold text-muted-foreground mb-1.5 px-1">
          {group.label}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {group.codes.map((code) => {
            const isSelected = code === value;
            return (
              <button
                key={code}
                type="button"
                onClick={() => {
                  onValueChange(code);
                  setOpen(false);
                }}
                className={`rounded-md px-2.5 py-1 text-sm transition-colors ${
                  isSelected
                    ? "bg-primary text-primary-foreground font-medium"
                    : "bg-muted hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {codeToName[code]}
              </button>
            );
          })}
        </div>
      </div>
    ));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-9 w-[160px] items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <span className="flex items-center gap-1.5 truncate">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {selectedName}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-[340px] max-h-[70vh] overflow-y-auto rounded-lg border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95 sm:w-[380px]">
          {/* 탭 헤더 */}
          <div className="flex border-b sticky top-0 bg-popover z-10">
            <button
              type="button"
              onClick={() => setTab("seoul")}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                tab === "seoul"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              서울
            </button>
            <button
              type="button"
              onClick={() => setTab("gyeonggi")}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                tab === "gyeonggi"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              경기도
            </button>
          </div>
          <div className="p-3">
            {tab === "seoul"
              ? renderGroups(SEOUL_GROUPS, SEOUL_CODE_TO_NAME)
              : renderGroups(GYEONGGI_GROUPS, GYEONGGI_CODE_TO_NAME)}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(RegionPickerComponent);
