const JINA_API_URL = "https://api.jina.ai/v1/embeddings";
const JINA_MODEL   = "jina-embeddings-v3";
const DIMS         = 1024;
const BATCH_LIMIT  = 100; // Jina API 배치 최대

interface JinaResponse {
  data: { index: number; embedding: number[] }[];
}

async function callJina(texts: string[], task: string): Promise<number[][]> {
  const apiKey = process.env.JINA_API_KEY;
  if (!apiKey) throw new Error("JINA_API_KEY 환경변수 없음");

  const res = await fetch(JINA_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: JINA_MODEL, task, dimensions: DIMS, input: texts }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jina API 오류 ${res.status}: ${body}`);
  }
  const json = (await res.json()) as JinaResponse;
  // index 순서 보장
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

/** 단일 텍스트 임베딩 */
export async function embedText(text: string): Promise<number[]> {
  const results = await callJina([text], "retrieval.passage");
  return results[0];
}

/** 배치 임베딩 — [High] 100개 초과 시 자동 분할 호출 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_LIMIT) {
    const slice = texts.slice(i, i + BATCH_LIMIT);
    const embeddings = await callJina(slice, "retrieval.passage");
    results.push(...embeddings);
  }
  return results;
}

/** 쿼리 임베딩 (retrieval.query task) */
export async function embedQuery(text: string): Promise<number[]> {
  const results = await callJina([text], "retrieval.query");
  return results[0];
}

/** [Medium] Jina 실패 시 zero 벡터 fallback (문서 저장은 허용, 검색만 안 됨) */
export async function embedBatchWithFallback(texts: string[]): Promise<{ embeddings: number[][]; failed: boolean }> {
  try {
    const embeddings = await embedBatch(texts);
    return { embeddings, failed: false };
  } catch (e) {
    console.error("[jina-embeddings] 임베딩 실패, zero 벡터로 저장:", e);
    const zeros = Array.from({ length: texts.length }, () => Array(DIMS).fill(0) as number[]);
    return { embeddings: zeros, failed: true };
  }
}
