"use client";

import { useEffect, useRef, useState } from "react";
import { SEOUL_GU } from "@/lib/constants";

export default function Map({ kakaoKey }: { kakaoKey: string }) {
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

      const overlayContent = `
        <div style="
          padding: 14px 16px;
          min-width: 170px;
          font-family: 'Pretendard', -apple-system, sans-serif;
          font-size: 13px;
          line-height: 1.6;
          background: hsl(var(--card));
          color: hsl(var(--foreground));
          border: 1px solid hsl(var(--border));
          border-radius: 10px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          position: relative;
        ">
          <button 
            onclick="window.__closeOverlay()"
            style="
              position: absolute;
              top: 8px;
              right: 8px;
              background: transparent;
              border: none;
              font-size: 18px;
              cursor: pointer;
              color: hsl(var(--muted-foreground));
              line-height: 1;
              padding: 0;
              width: 20px;
              height: 20px;
            "
          >×</button>
          <strong style="font-size: 14px; display: block; margin-bottom: 10px; color: hsl(var(--foreground));">${gu.name}</strong>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <a href="/trend?region=${gu.code}" style="
              color: hsl(var(--primary));
              text-decoration: none;
              font-weight: 500;
              display: flex;
              align-items: center;
              gap: 6px;
              transition: opacity 0.2s;
            " onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">
              <span>📈</span> 시세 추이
            </a>
            <a href="/recent?region=${gu.code}" style="
              color: hsl(var(--foreground));
              text-decoration: none;
              font-weight: 500;
              display: flex;
              align-items: center;
              gap: 6px;
              opacity: 0.8;
              transition: opacity 0.2s;
            " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">
              <span>📋</span> 최근 거래
            </a>
            <a href="/rank?region=${gu.code}" style="
              color: hsl(var(--foreground));
              text-decoration: none;
              font-weight: 500;
              display: flex;
              align-items: center;
              gap: 6px;
              opacity: 0.8;
              transition: opacity 0.2s;
            " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">
              <span>🏆</span> 순위
            </a>
          </div>
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
      });
    });
  }, [loaded]);

  if (error) {
    return (
      <div className="w-full h-full min-h-[400px] bg-muted rounded-lg flex items-center justify-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[400px]">
      {!loaded && (
        <div className="absolute inset-0 bg-muted rounded-lg flex items-center justify-center z-10">
          <p className="text-muted-foreground">🗺️ 지도 로딩 중...</p>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full rounded-lg" />
    </div>
  );
}
