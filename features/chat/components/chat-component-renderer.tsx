"use client";

import { StockCard, type StockCardData } from "./renderers/stock-card";
import { MultiStock, type MultiStockData } from "./renderers/multi-stock";
import { IndexSummary, type IndexSummaryData } from "./renderers/index-summary";
import { MiniChart, type MiniChartData } from "./renderers/mini-chart";

type ComponentPayload =
  | ({ type: "stock-card" } & StockCardData)
  | ({ type: "multi-stock" } & MultiStockData)
  | ({ type: "index-summary" } & IndexSummaryData)
  | ({ type: "mini-chart" } & MiniChartData);

interface Props {
  raw: string; // JSON 문자열
}

export function ChatComponentRenderer({ raw }: Props) {
  let payload: ComponentPayload;
  try {
    payload = JSON.parse(raw) as ComponentPayload;
  } catch {
    // JSON 파싱 실패 시 원문 그대로 표시
    return (
      <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto my-1">
        {raw}
      </pre>
    );
  }

  switch (payload.type) {
    case "stock-card":
      return <StockCard data={payload} />;
    case "multi-stock":
      return <MultiStock data={payload} />;
    case "index-summary":
      return <IndexSummary data={payload} />;
    case "mini-chart":
      return <MiniChart data={payload} />;
    default:
      return null;
  }
}
