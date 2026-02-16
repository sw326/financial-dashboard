"use client";

import { useEffect, useRef, memo } from "react";
import { useTheme } from "next-themes";
import {
  createChart,
  IChartApi,
  CandlestickSeries,
  HistogramSeries,
  ColorType,
} from "lightweight-charts";

interface ChartData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface LightweightChartProps {
  data: ChartData[];
  loading?: boolean;
}

function LightweightChartInner({ data, loading }: LightweightChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    // 기존 차트 정리
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: isDark ? "#09090b" : "#ffffff" },
        textColor: isDark ? "#a1a1aa" : "#71717a",
      },
      grid: {
        vertLines: { color: isDark ? "#27272a" : "#e4e4e7" },
        horzLines: { color: isDark ? "#27272a" : "#e4e4e7" },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        timeVisible: false,
        borderColor: isDark ? "#27272a" : "#e4e4e7",
      },
      rightPriceScale: {
        borderColor: isDark ? "#27272a" : "#e4e4e7",
      },
      crosshair: {
        mode: 0, // Normal
      },
    });

    // 캔들스틱
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#ef4444", // 상승 = 빨강 (한국)
      downColor: "#3b82f6", // 하락 = 파랑
      borderUpColor: "#ef4444",
      borderDownColor: "#3b82f6",
      wickUpColor: "#ef4444",
      wickDownColor: "#3b82f6",
    });

    candleSeries.setData(
      data.map((d) => ({
        time: d.time as unknown as import("lightweight-charts").UTCTimestamp,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }))
    );

    // 거래량 (하단)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    volumeSeries.setData(
      data.map((d) => ({
        time: d.time as unknown as import("lightweight-charts").UTCTimestamp,
        value: d.volume,
        color:
          d.close >= d.open
            ? isDark
              ? "rgba(239,68,68,0.3)"
              : "rgba(239,68,68,0.5)"
            : isDark
              ? "rgba(59,130,246,0.3)"
              : "rgba(59,130,246,0.5)",
      }))
    );

    // 마지막 데이터로 스크롤
    chart.timeScale().fitContent();

    chartRef.current = chart;

    // 리사이즈 핸들러
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data, isDark]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        차트 로딩 중...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        차트 데이터가 없습니다
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div ref={chartContainerRef} className="h-full w-full" />
      <div className="absolute bottom-1 right-2 text-[10px] text-muted-foreground opacity-50">
        Powered by TradingView
      </div>
    </div>
  );
}

export const LightweightChart = memo(LightweightChartInner);
