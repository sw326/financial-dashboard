"use client";

import { keepPreviousData, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,      // 5분간 fresh
        gcTime: 30 * 60 * 1000,         // 30분간 캐시 유지
        refetchOnWindowFocus: false,     // 탭 전환 시 리페칭 안 함
        retry: 1,                        // 1회 재시도
        placeholderData: keepPreviousData, // 리페치 중 이전 데이터 표시 (로딩 스피너 제거)
      },
    },
  }));
  
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
