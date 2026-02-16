"use client";

import { useEffect, useRef, memo } from "react";
import { useTheme } from "next-themes";

interface TradingViewChartProps {
  symbol: string;
}

function TradingViewChartInner({ symbol }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  
  // symbol 변환: 005930.KS → KRX:005930, AAPL → NASDAQ:AAPL
  // yahoo symbol → TradingView symbol 매핑
  const tvSymbol = convertToTVSymbol(symbol);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // 기존 위젯 정리
    containerRef.current.innerHTML = "";
    
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: "D",
      timezone: "Asia/Seoul",
      theme: resolvedTheme === "dark" ? "dark" : "light",
      style: "1", // 캔들스틱
      locale: "kr",
      allow_symbol_change: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: "https://www.tradingview.com",
    });
    
    containerRef.current.appendChild(script);
  }, [tvSymbol, resolvedTheme]);
  
  return (
    <div className="tradingview-widget-container h-full" ref={containerRef}>
      <div className="tradingview-widget-container__widget h-full w-full" />
    </div>
  );
}

export const TradingViewChart = memo(TradingViewChartInner);

// Yahoo symbol → TradingView symbol 변환
function convertToTVSymbol(yahooSymbol: string): string {
  // 한국 주식: 005930.KS → KRX:005930
  if (yahooSymbol.endsWith(".KS")) {
    return "KRX:" + yahooSymbol.replace(".KS", "");
  }
  // 코스닥: 042700.KQ → KRX:042700
  if (yahooSymbol.endsWith(".KQ")) {
    return "KRX:" + yahooSymbol.replace(".KQ", "");
  }
  // 지수
  if (yahooSymbol === "^KS11") return "KRX:KOSPI";
  if (yahooSymbol === "^KQ11") return "KRX:KOSDAQ";
  if (yahooSymbol === "^GSPC") return "SP:SPX";
  if (yahooSymbol === "^IXIC") return "NASDAQ:IXIC";
  if (yahooSymbol === "^DJI") return "DJ:DJI";
  
  // 미국 주식: 그대로 (AAPL, MSFT 등)
  // TradingView는 NASDAQ:AAPL 형식이지만 심볼만 넣어도 자동 인식
  return yahooSymbol;
}
