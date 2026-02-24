"use client";

import { MapPin, ExternalLink } from "lucide-react";

export interface MapLinkData {
  name: string;       // 장소명 (예: 강남구, 잠실 롯데월드타워)
  lat: number;        // 위도 (WGS84)
  lng: number;        // 경도
  address?: string;   // 주소 (선택)
}

export function MapLink({ data }: { data: MapLinkData }) {
  const { name, lat, lng, address } = data;
  // 카카오맵 딥링크: /link/to/장소명,위도,경도
  const href = `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl border bg-card hover:bg-accent/50 transition-colors px-4 py-3 not-prose my-1 group"
    >
      <div className="flex-none w-9 h-9 rounded-lg bg-yellow-400/10 flex items-center justify-center">
        <MapPin className="w-5 h-5 text-yellow-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{name}</p>
        {address && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{address}</p>
        )}
      </div>
      <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
    </a>
  );
}
