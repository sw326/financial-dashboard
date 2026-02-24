"use client";

/**
 * 중간 화면(768-1023px)에서 사이드바를 자동으로 아이콘 모드로 전환
 * - mobile  (<768px):  shadcn Sheet 자동 처리 (미개입)
 * - tablet  (768-1023): 아이콘 모드 (open=false)
 * - desktop (≥1024px): 전체 모드 (open=true)
 */
import { useEffect, useRef } from "react";
import { useSidebar } from "@/components/ui/sidebar";

const TABLET_MIN = 768;
const DESKTOP_MIN = 1024;

export function SidebarBreakpointController() {
  const { open, setOpen, isMobile } = useSidebar();
  const prevZone = useRef<"tablet" | "desktop" | null>(null);

  useEffect(() => {
    function getZone(w: number): "mobile" | "tablet" | "desktop" {
      if (w < TABLET_MIN)  return "mobile";
      if (w < DESKTOP_MIN) return "tablet";
      return "desktop";
    }

    function handleResize() {
      const zone = getZone(window.innerWidth);
      if (zone === "mobile") return; // shadcn Sheet이 담당

      if (zone === "tablet" && prevZone.current !== "tablet") {
        setOpen(false); // 아이콘 모드로 전환
        prevZone.current = "tablet";
      } else if (zone === "desktop" && prevZone.current !== "desktop") {
        setOpen(true);  // 전체 모드 복귀
        prevZone.current = "desktop";
      }
    }

    // 초기 실행
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setOpen]);

  return null;
}
