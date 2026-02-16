"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,      // 5분간 fresh
        gcTime: 30 * 60 * 1000,         // 30분간 캐시 유지 (was cacheTime)
        refetchOnWindowFocus: false,     // 탭 전환 시 리페칭 안 함
        retry: 1,                        // 1회 재시도
      },
    },
  }));
  
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
