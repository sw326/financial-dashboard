"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { MapPin } from "lucide-react";
import { SEOUL_GU } from "@/lib/constants";

export default function Map({ kakaoKey }: { kakaoKey: string }) {
  const { resolvedTheme } = useTheme();
  const mapRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(() =>
    typeof window !== "undefined" && !!window.kakao?.maps
  );
  const [error, setError] = useState<string | null>(
    !kakaoKey ? "카카오맵 API 키가 설정되지 않았습니다" : null
  );

  // Load SDK
  useEffect(() => {
    if (loaded || !kakaoKey) return;

    const script = document.createElement("script");
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}&autoload=false`;
    script.async = true;
    script.onload = () => {
      window.kakao.maps.load(() => setLoaded(true));
    };
    script.onerror = () => setError("카카오맵 로드 실패");
    document.head.appendChild(script);
  }, [kakaoKey, loaded]);

  // Init map
  useEffect(() => {
    if (!loaded || !mapRef.current) return;

    const map = new window.kakao.maps.Map(mapRef.current, {
      center: new window.kakao.maps.LatLng(37.5665, 126.978),
      level: 8,
    });

    const isDark = resolvedTheme === "dark";
    let openOverlay: kakao.maps.CustomOverlay | null = null;

    // 전역 닫기 함수
    window.__closeOverlay = () => {
      if (openOverlay) {
        openOverlay.setMap(null);
        openOverlay = null;
      }
    };

    SEOUL_GU.forEach((gu) => {
      const marker = new window.kakao.maps.Marker({
        position: new window.kakao.maps.LatLng(gu.lat, gu.lng),
        map,
      });

      const bg = isDark ? "#1a1a1a" : "#ffffff";
      const fg = isDark ? "#e5e5e5" : "#1a1a1a";
      const border = isDark ? "#333" : "#e5e5e5";
      const hoverBg = isDark ? "#2a2a2a" : "#f5f5f5";
      // Lucide-style inline SVG icons (16x16)
      const iconTrend = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${fg}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`;
      const iconList = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${fg}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h.01"/><path d="M7 12h.01"/><path d="M7 17h.01"/><path d="M12 7h5"/><path d="M12 12h5"/><path d="M12 17h5"/></svg>`;
      const iconTrophy = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${fg}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`;

      // 다크모드에서 맵에 invert 필터가 걸리므로 오버레이에 역반전 적용
      const counterFilter = isDark ? "filter: invert(1) hue-rotate(180deg);" : "";
      const overlayContent = `
        <div style="
          padding: 14px 16px;
          min-width: 170px;
          font-family: 'Pretendard', -apple-system, sans-serif;
          font-size: 13px;
          line-height: 1.6;
          background: ${bg};
          color: ${fg};
          ${counterFilter}
          border: 1px solid ${border};
          border-radius: 10px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
          position: relative;
        ">
          <button 
            onclick="window.__closeOverlay()"
            style="
              position: absolute;
              top: 6px;
              right: 8px;
              background: transparent;
              border: none;
              font-size: 18px;
              cursor: pointer;
              color: ${fg};
              opacity: 0.5;
              line-height: 1;
              padding: 2px;
            "
          >×</button>
          <strong style="font-size: 14px; display: block; margin-bottom: 10px; color: ${fg};">${gu.name}</strong>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <a href="/trend?region=${gu.code}" style="color:${fg};text-decoration:none;font-weight:500;display:flex;align-items:center;gap:8px;padding:4px 6px;border-radius:6px;" onmouseover="this.style.background='${hoverBg}'" onmouseout="this.style.background='transparent'">
              ${iconTrend} 시세 추이
            </a>
            <a href="/recent?region=${gu.code}" style="color:${fg};text-decoration:none;font-weight:500;display:flex;align-items:center;gap:8px;padding:4px 6px;border-radius:6px;" onmouseover="this.style.background='${hoverBg}'" onmouseout="this.style.background='transparent'">
              ${iconList} 최근 거래
            </a>
            <a href="/rank?region=${gu.code}" style="color:${fg};text-decoration:none;font-weight:500;display:flex;align-items:center;gap:8px;padding:4px 6px;border-radius:6px;" onmouseover="this.style.background='${hoverBg}'" onmouseout="this.style.background='transparent'">
              ${iconTrophy} 순위
            </a>
          </div>
          <div style="
            position: absolute;
            bottom: -8px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            border-top: 8px solid ${bg};
          "></div>
        </div>
      `;

      const overlay = new window.kakao.maps.CustomOverlay({
        content: overlayContent,
        position: new window.kakao.maps.LatLng(gu.lat, gu.lng),
        yAnchor: 1.3,
      });

      window.kakao.maps.event.addListener(marker, "click", () => {
        if (openOverlay) {
          openOverlay.setMap(null);
        }
        overlay.setMap(map);
        openOverlay = overlay;

        // 오버레이가 잘리지 않도록 마커 위치를 맵 중앙보다 아래로 패닝
        const proj = map.getProjection();
        const markerPoint = proj.containerPointFromCoords(
          new window.kakao.maps.LatLng(gu.lat, gu.lng)
        );
        const mapHeight = mapRef.current?.clientHeight || 400;
        // 마커가 상단 40% 안에 있으면 맵을 위로 올려서 오버레이 공간 확보
        if (markerPoint.y < mapHeight * 0.45) {
          const center = map.getCenter();
          const centerPoint = proj.containerPointFromCoords(center);
          const offset = mapHeight * 0.35 - markerPoint.y * 0.4;
          const newCenterPoint = new window.kakao.maps.Point(
            centerPoint.x,
            centerPoint.y - Math.max(offset, 60)
          );
          const newCenter = proj.coordsFromContainerPoint(newCenterPoint);
          map.panTo(newCenter);
        }
      });
    });
  }, [loaded, resolvedTheme]);

  if (error) {
    return (
      <div className="w-full h-full min-h-[400px] bg-muted rounded-lg flex items-center justify-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div className="relative w-full h-full min-h-[400px] overflow-visible">
      {!loaded && (
        <div className="absolute inset-0 bg-muted rounded-lg flex items-center justify-center z-10">
          <p className="text-muted-foreground flex items-center gap-2">
            <MapPin className="size-4" />
            지도 로딩 중...
          </p>
        </div>
      )}
      <div
        ref={mapRef}
        className="w-full h-full rounded-lg"
        style={isDark ? { filter: "invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9)" } : undefined}
      />
    </div>
  );
}
