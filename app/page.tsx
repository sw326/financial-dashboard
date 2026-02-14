"use client";

import dynamic from "next/dynamic";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY || "";

export default function Home() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex-1 min-h-0">
        <Map kakaoKey={KAKAO_KEY} />
      </div>
    </div>
  );
}
