"use client";

import { useEffect, useRef, useState } from "react";
import { SEOUL_GU } from "@/lib/constants";

const KAKAO_SDK_URL = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JS_KEY}&autoload=false`;

export default function Map() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load SDK
  useEffect(() => {
    if (window.kakao?.maps) {
      setLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = KAKAO_SDK_URL;
    script.async = true;
    script.onload = () => {
      window.kakao.maps.load(() => setLoaded(true));
    };
    script.onerror = () => setError("카카오맵 로드 실패");
    document.head.appendChild(script);
  }, []);

  // Init map
  useEffect(() => {
    if (!loaded || !mapRef.current) return;

    const map = new window.kakao.maps.Map(mapRef.current, {
      center: new window.kakao.maps.LatLng(37.5665, 126.978),
      level: 8,
    });

    let openInfoWindow: kakao.maps.InfoWindow | null = null;

    SEOUL_GU.forEach((gu) => {
      const marker = new window.kakao.maps.Marker({
        position: new window.kakao.maps.LatLng(gu.lat, gu.lng),
        map,
      });

      const infoWindow = new window.kakao.maps.InfoWindow({
        content: `
          <div style="padding:12px;min-width:160px;font-size:14px;line-height:1.8">
            <strong style="font-size:15px">${gu.name}</strong>
            <div style="margin-top:6px;display:flex;flex-direction:column;gap:2px">
              <a href="/trend?region=${gu.code}" style="color:#2563eb;text-decoration:none">📈 시세 추이 보기</a>
              <a href="/recent?region=${gu.code}" style="color:#2563eb;text-decoration:none">📋 최근 거래 보기</a>
              <a href="/rank?region=${gu.code}" style="color:#2563eb;text-decoration:none">🏆 순위 보기</a>
            </div>
          </div>
        `,
        removable: true,
      });

      window.kakao.maps.event.addListener(marker, "click", () => {
        if (openInfoWindow) openInfoWindow.close();
        infoWindow.open(map, marker);
        openInfoWindow = infoWindow;
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
