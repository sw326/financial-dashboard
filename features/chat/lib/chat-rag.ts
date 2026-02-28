/**
 * chat-rag.ts — 채팅 실시간 데이터 컨텍스트 주입 (RAG 패턴)
 * MCP/Tool Calling 없이 단일 모델 호출로 실시간 데이터 활용
 * CHM-271
 */

import YahooFinance from "yahoo-finance2";
import { KR_STOCK_NAMES } from "@/lib/kr-stock-names";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// ── 지수 별칭 → 심볼 ──
const INDEX_ALIASES: Record<string, string> = {
  코스피: "^KS11", KOSPI: "^KS11",
  코스닥: "^KQ11", KOSDAQ: "^KQ11",
  나스닥: "^IXIC", NASDAQ: "^IXIC",
  "S&P": "^GSPC", "S&P500": "^GSPC", "S&P 500": "^GSPC", SP500: "^GSPC",
  다우: "^DJI", "다우존스": "^DJI", DOW: "^DJI",
  "닛케이": "^N225", NIKKEI: "^N225",
  "항셍": "^HSI", HSI: "^HSI",
  VIX: "^VIX",
  "달러인덱스": "DX-Y.NYB",
};

// ── 한국어 종목명 → 심볼 역방향 매핑 ──
const KR_NAME_TO_SYMBOL = new Map<string, string>(
  Object.entries(KR_STOCK_NAMES).map(([sym, name]) => [name, sym])
);

// Medium fix: 매 요청마다 재정렬 방지 → 모듈 초기화 시 1회 정렬
const KR_SORTED_NAMES = Array.from(KR_NAME_TO_SYMBOL.keys()).sort((a, b) => b.length - a.length);

// ── 미국 주요 종목 별칭 ──
const US_ALIASES: Record<string, string> = {
  애플: "AAPL", Apple: "AAPL",
  마이크로소프트: "MSFT", Microsoft: "MSFT",
  구글: "GOOGL", 알파벳: "GOOGL",
  아마존: "AMZN", Amazon: "AMZN",
  엔비디아: "NVDA",
  테슬라: "TSLA", Tesla: "TSLA",
  메타: "META",
  넷플릭스: "NFLX", Netflix: "NFLX",
  버크셔: "BRK-B",
};

/**
 * 메시지에서 금융 심볼 추출
 * 1) 미국 ticker 정규식 (2~5 대문자)
 * 2) 한국 종목코드 정규식 (6자리+.KS/.KQ)
 * 3) 한국어 종목명 역방향 조회
 * 4) 지수 별칭
 * 5) 미국 종목 별칭
 */
export function extractSymbols(message: string): string[] {
  const found = new Set<string>();

  // 1. 미국 ticker: NVDA, AAPL, BRK-B 등 (2~5자 대문자)
  // 한글 바로 앞 대문자(SK하이닉스, LG화학 등)는 한국 기업명 일부 → 제외
  const stopWords = new Set(["THE","FOR","AND","OR","NOT","ALL","NEW","OLD","TOP","BIG","AI","IT","US","KS","KQ","CO","LTD","SK","LG","GS","KT"]);
  const usTicker = /\b([A-Z]{2,5}(?:-[A-Z])?)\b(?![가-힣])/g;
  for (const m of message.matchAll(usTicker)) {
    const sym = m[1];
    if (!stopWords.has(sym)) found.add(sym);
  }

  // 2. 한국 종목코드
  const krCode = /\b(\d{6})\b/g;
  for (const m of message.matchAll(krCode)) {
    const code = m[1];
    // .KS 먼저 시도, 없으면 .KQ
    if (KR_STOCK_NAMES[`${code}.KS`]) found.add(`${code}.KS`);
    else if (KR_STOCK_NAMES[`${code}.KQ`]) found.add(`${code}.KQ`);
  }

  // 3. 한국어 종목명 (긴 이름 우선 — 모듈 초기화 시 캐싱됨)
  for (const name of KR_SORTED_NAMES) {
    if (message.includes(name)) {
      found.add(KR_NAME_TO_SYMBOL.get(name)!);
    }
  }

  // 4. 지수 별칭
  for (const [alias, sym] of Object.entries(INDEX_ALIASES)) {
    if (message.includes(alias)) found.add(sym);
  }

  // 5. 미국 종목 별칭
  for (const [alias, sym] of Object.entries(US_ALIASES)) {
    if (message.includes(alias)) found.add(sym);
  }

  return Array.from(found).slice(0, 8); // 최대 8개 (API 부하 방지)
}

interface QuoteResult {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high52: number | null;
  low52: number | null;
  isKR: boolean;
}

/** 심볼 배열 → 실시간 시세 조회 */
async function fetchQuotes(symbols: string[]): Promise<QuoteResult[]> {
  const results = await Promise.allSettled(
    symbols.map(async (sym): Promise<QuoteResult> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const q: any = await yf.quote(sym);
      const isKR = sym.endsWith(".KS") || sym.endsWith(".KQ");
      return {
        symbol: sym,
        name: KR_STOCK_NAMES[sym] ?? q.shortName ?? q.longName ?? sym,
        price: q.regularMarketPrice ?? 0,
        change: q.regularMarketChange ?? 0,
        changePercent: q.regularMarketChangePercent ?? 0,
        high52: q.fiftyTwoWeekHigh ?? null,
        low52: q.fiftyTwoWeekLow ?? null,
        isKR,
      };
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<QuoteResult> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((r) => r.price > 0);
}

/** 시세 데이터 → 주입용 문자열 포맷 */
function formatQuotes(quotes: QuoteResult[], timestamp: string): string {
  const lines = [
    `[실시간 시장 데이터 | ${timestamp}]`,
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  ];

  for (const q of quotes) {
    const up = q.changePercent >= 0;
    const arrow = up ? "▲" : "▼";
    const pct = `${up ? "+" : ""}${q.changePercent.toFixed(2)}%`;
    const priceStr = q.isKR
      ? `${q.price.toLocaleString()}원`
      : `$${q.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    const rangeStr = q.high52 != null && q.low52 != null
      ? ` | 52주 ${q.isKR ? q.low52.toLocaleString() + "~" + q.high52.toLocaleString() + "원" : "$" + q.low52.toFixed(0) + "~$" + q.high52.toFixed(0)}`
      : "";

    lines.push(`${q.name} (${q.symbol.replace(/\.(KS|KQ)$/, "")})  ${priceStr}  ${arrow}${pct}${rangeStr}`);
  }

  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("※ 위 데이터를 학습 지식보다 우선 사용하세요. 데이터가 없는 종목은 '실시간 조회 불가'로 안내하세요.");

  return lines.join("\n");
}

/**
 * 메시지 분석 → 실시간 데이터 컨텍스트 반환
 * 관련 종목 없으면 null 반환 (컨텍스트 주입 생략)
 */
export async function buildRagContext(message: string): Promise<string | null> {
  const symbols = extractSymbols(message);
  if (symbols.length === 0) return null;

  const quotes = await fetchQuotes(symbols);
  if (quotes.length === 0) return null;

  const timestamp = new Date().toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });

  return formatQuotes(quotes, timestamp);
}

/**
 * 유저 문서 검색 (pgvector 코사인 유사도)
 * Jina AI v3 임베딩으로 관련 청크 top 3 반환
 */
export async function searchUserDocuments(query: string, userId: string): Promise<string | null> {
  try {
    const { embedQuery } = await import("@/lib/jina-embeddings");
    const { supabaseServer } = await import("@/lib/supabase/admin");

    const queryEmbedding = await embedQuery(query);

    // pgvector 코사인 유사도 검색
    const { data: chunks } = await supabaseServer.rpc("search_document_chunks", {
      p_user_id:  userId,
      p_embedding: JSON.stringify(queryEmbedding),
      p_limit:    3,
      p_threshold: 0.5,
    });

    if (!chunks || chunks.length === 0) return null;

    const lines = (chunks as { content: string; document_name: string }[]).map(
      (c) => `[${c.document_name}]\n${c.content}`
    );

    return `## 관련 문서 컨텍스트\n${lines.join("\n\n---\n\n")}`;
  } catch (e) {
    console.error("문서 검색 오류:", e);
    return null;
  }
}
