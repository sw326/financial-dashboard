"use client";

import dynamic from "next/dynamic";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function Home() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex-1 min-h-0">
        <Map />
      </div>
    </div>
  );
}
