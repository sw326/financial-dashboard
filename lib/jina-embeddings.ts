/**
 * Jina AI v3 임베딩 유틸
 * 모델: jina-embeddings-v3 (1024차원, 한국어 우수)
 */

const JINA_API_URL = "https://api.jina.ai/v1/embeddings";
const JINA_MODEL   = "jina-embeddings-v3";

function getApiKey(): string {
  const key = process.env.JINA_API_KEY;
  if (!key) throw new Error("JINA_API_KEY 환경변수가 없습니다");
  return key;
}

/** 단일 텍스트 임베딩 */
export async function embedText(text: string): Promise<number[]> {
  const res = await embedBatch([text]);
  return res[0];
}

/** 배치 임베딩 (최대 100개) */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const res = await fetch(JINA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: JINA_MODEL,
      input: texts,
      task: "retrieval.passage",
      dimensions: 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Jina API 오류 ${res.status}: ${err}`);
  }

  const data = await res.json() as { data: { embedding: number[] }[] };
  return data.data.map((d) => d.embedding);
}

/** 쿼리 임베딩 (검색 시 task 다름) */
export async function embedQuery(query: string): Promise<number[]> {
  const res = await fetch(JINA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: JINA_MODEL,
      input: [query],
      task: "retrieval.query",
      dimensions: 1024,
    }),
  });

  if (!res.ok) throw new Error(`Jina API 오류 ${res.status}`);
  const data = await res.json() as { data: { embedding: number[] }[] };
  return data.data[0].embedding;
}
