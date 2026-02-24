/**
 * chat-interests.ts — 채팅 관심사 upsert (CHM-294)
 * RAG에서 추출된 심볼 → user_interests 테이블 score 누적
 *
 * half-life 14일: score = mention_count * exp(-0.0495 * days_since_last)
 */
import "server-only";
import { supabaseServer } from "@/lib/supabase/admin";
import { KR_STOCK_NAMES } from "@/lib/kr-stock-names";

/**
 * 심볼 배열을 user_interests에 upsert
 * - 기존 행: mention_count++ + last_mentioned_at = now() + score 재계산
 * - 신규 행: mention_count=1, score=1.0
 *
 * fire-and-forget — await 없이 호출 (응답 속도 영향 없음)
 */
export async function upsertInterests(
  userId: string,
  symbols: string[]
): Promise<void> {
  if (!userId || !symbols.length) return;

  const rows = symbols.map((symbol) => {
    const isKR = symbol.endsWith(".KS") || symbol.endsWith(".KQ");
    const name = KR_STOCK_NAMES[symbol] ?? symbol.replace(/\.(KS|KQ)$/, "");
    return { user_id: userId, symbol, name, is_kr: isKR };
  });

  try {
    // 병렬 upsert — 이미 있으면 mention_count++, last_mentioned_at/score 갱신
    await Promise.allSettled(
      rows.map((row) =>
        supabaseServer.rpc("upsert_user_interest", {
          p_user_id: row.user_id,
          p_symbol:  row.symbol,
          p_name:    row.name,
          p_is_kr:   row.is_kr,
        })
      )
    );
  } catch (err) {
    // fire-and-forget — 실패해도 채팅에 영향 없음
    console.warn("[chat-interests] upsert failed:", err);
  }
}
