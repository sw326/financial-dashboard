"use client";

/**
 * 중간 화면(768-1023px)에서 사이드바를 자동으로 아이콘 모드로 전환
 * - mobile  (<768px):  shadcn Sheet 자동 처리 (미개입)
 * - tablet  (768-1023): 아이콘 모드 강제 (open=false)
 * - desktop (≥1024px): 전체 모드 복귀 (open=true)
 *
 * M-2: zone 첫 진입 시에만 setOpen 호출 → 이후 사용자 수동 조작 존중
 * M-3: 미사용 변수 제거
 * L-3: useLayoutEffect → paint 전에 실행하여 sidebar flash 방지
 */
import { useLayoutEffect, useRef } from "react";
import { useSidebar } from "@/components/ui/sidebar";

const TABLET_MIN = 768;
const DESKTOP_MIN = 1024;

type Zone = "mobile" | "tablet" | "desktop";

function getZone(w: number): Zone {
  if (w < TABLET_MIN)  return "mobile";
  if (w < DESKTOP_MIN) return "tablet";
  return "desktop";
}

export function SidebarBreakpointController() {
  const { setOpen } = useSidebar();
  const prevZone = useRef<Zone | null>(null);

  useLayoutEffect(() => {
    function handleResize() {
      const zone = getZone(window.innerWidth);

      // mobile은 shadcn Sheet이 담당 — 미개입
      if (zone === "mobile") {
        prevZone.current = "mobile";
        return;
      }

      // zone 첫 진입 시에만 setOpen 호출 (M-2: 같은 zone 내 resize는 무시)
      if (zone === prevZone.current) return;

      prevZone.current = zone;

      if (zone === "tablet")  setOpen(false); // 아이콘 모드
      if (zone === "desktop") setOpen(true);  // 전체 모드
    }

    handleResize(); // 초기 실행 (L-3: paint 전 적용)
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setOpen]);

  return null;
}
