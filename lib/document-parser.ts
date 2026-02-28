/**
 * 문서 파서 + 텍스트 청킹
 * PDF, TXT, URL 지원
 */

/** PDF 버퍼 → 텍스트 */
export async function parsePdf(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
  const result = await pdfParse(buffer);
  return result.text.trim();
}

/** URL → 텍스트 (뉴스/리포트 크롤링) */
export async function parseUrl(url: string): Promise<string> {
  const { JSDOM } = await import("jsdom");
  const { Readability } = await import("@mozilla/readability");

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`URL 접근 실패: ${res.status}`);

  const html = await res.text();
  const dom  = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();

  if (!article?.textContent) throw new Error("본문 추출 실패");
  return article.textContent.trim();
}

/** 텍스트 → 청크 배열 (약 512 토큰, overlap 50토큰) */
export function chunkText(text: string, chunkChars = 2000, overlapChars = 200): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= chunkChars) return [cleaned];

  const chunks: string[] = [];
  let start = 0;

  while (start < cleaned.length) {
    const end = Math.min(start + chunkChars, cleaned.length);
    // 단어 경계에서 자르기
    const slice = cleaned.slice(start, end);
    const lastSpace = end < cleaned.length ? slice.lastIndexOf(" ") : slice.length;
    const chunk = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
    chunks.push(chunk.trim());
    start += chunk.length - overlapChars;
    if (start < 0) start = 0;
  }

  return chunks.filter(Boolean);
}
