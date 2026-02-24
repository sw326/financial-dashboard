"use client";

import { useState, useRef, useEffect, memo } from "react";
import { SEOUL_GU } from "@/lib/constants";
import { ChevronDown, MapPin } from "lucide-react";

interface RegionGroup {
  label: string;
  codes: string[];
}

const REGION_GROUPS: RegionGroup[] = [
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

const codeToName = Object.fromEntries(SEOUL_GU.map((g) => [g.code, g.name]));

interface RegionPickerProps {
  value: string;
  onValueChange: (code: string) => void;
}

function RegionPickerComponent({ value, onValueChange }: RegionPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const selectedName = codeToName[value] || "지역 선택";

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
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-[340px] max-h-[70vh] overflow-y-auto rounded-lg border bg-popover p-3 shadow-lg animate-in fade-in-0 zoom-in-95 sm:w-[380px]">
          {REGION_GROUPS.map((group) => (
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
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(RegionPickerComponent);
