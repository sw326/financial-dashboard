/**
 * chat-memory.ts — 웹챗 개인화 메모리 시스템 (CHM-272)
 * OpenClaw MEMORY.md 구조를 Supabase DB로 이식
 */

import { supabaseServer } from "@/lib/supabase/admin";

export interface UserMemory {
  id: string;
  category: string;
  key: string;
  value: string;
  importance: number;
  source: string;
  updated_at: string;
}

// ── 메모리 읽기 (importance 높은 순, 최대 20개) ──
export async function loadUserMemories(userId: string): Promise<UserMemory[]> {
  const { data } = await supabaseServer
    .from("user_memories")
    .select("id, category, key, value, importance, source, updated_at")
    .eq("user_id", userId)
    .order("importance", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(20);
  return (data ?? []) as UserMemory[];
}

// ── 메모리 → instructions 주입용 텍스트 ──
export function formatMemoriesForContext(memories: UserMemory[]): string | null {
  if (!memories.length) return null;

  const byCategory: Record<string, UserMemory[]> = {};
  for (const m of memories) {
    (byCategory[m.category] ??= []).push(m);
  }

  const LABELS: Record<string, string> = {
    preference: "투자 성향/선호",
    pattern: "행동 패턴",
    goal: "투자 목표",
    note: "메모",
  };

  const lines = ["[사용자 메모리 — 이전 대화에서 학습한 개인화 정보]"];
  for (const [cat, items] of Object.entries(byCategory)) {
    lines.push(`\n• ${LABELS[cat] ?? cat}`);
    for (const m of items) lines.push(`  - ${m.value}`);
  }

  return lines.join("\n");
}

// ── 메모리 단건 upsert ──
export async function saveMemory(
  userId: string,
  key: string,
  value: string,
  options?: { category?: string; importance?: number; source?: string }
): Promise<void> {
  await supabaseServer.from("user_memories").upsert(
    {
      user_id: userId,
      key,
      value,
      category: options?.category ?? "note",
      importance: options?.importance ?? 3,
      source: options?.source ?? "auto",
    },
    { onConflict: "user_id,key" }
  );
}

// ── "기억해줘" 규칙 기반 감지 ──
export function detectMemoryRequest(message: string): string | null {
  const patterns = [
    /기억해(?:줘|줘요|주세요|둬)?[.!]?\s*(.+)/,
    /저장해(?:줘|줘요|주세요)?[.!]?\s*(.+)/,
    /메모해(?:줘|줘요)?[.!]?\s*(.+)/,
  ];
  for (const p of patterns) {
    const m = message.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

// ── Haiku로 대화에서 기억할 내용 추출 ──
const EXTRACT_PROMPT = `다음 대화에서 사용자에 대해 장기 기억할 내용을 추출하세요.
투자 성향, 관심 분야, 목표, 선호 스타일만 추출합니다.
없으면 빈 배열을 반환하세요.

JSON 배열 형식으로만 응답:
[{"key":"unique_key","value":"기억 내용","category":"preference|pattern|goal|note","importance":1-5}]

중요도 기준: 5=투자목표, 4=핵심성향, 3=일반선호, 2=패턴, 1=단순메모`;

export async function extractMemoriesWithHaiku(
  conversation: { role: string; content: string }[],
  gatewayUrl: string,
  gatewayToken: string
): Promise<{ key: string; value: string; category: string; importance: number }[]> {
  if (conversation.length < 2) return [];

  const convoText = conversation
    .map((m) => `${m.role === "user" ? "사용자" : "AI"}: ${m.content}`)
    .join("\n");

  try {
    const res = await fetch(`${gatewayUrl}/v1/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${gatewayToken}`,
      },
      body: JSON.stringify({
        model: "anthropic/claude-haiku-3-5",
        instructions: EXTRACT_PROMPT,
        input: `[대화 내용]\n${convoText}`,
        stream: false,
      }),
    });

    if (!res.ok) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    const text = data?.output?.[0]?.content?.[0]?.text ?? "";

    // JSON 파싱
    const match = text.match(/\[[\s\S]*?\]/); // non-greedy → 첫 번째 배열만
    if (!match) return [];

    // Medium fix: 추출 결과 엄격 검증 (프롬프트 인젝션 방지)
    const ALLOWED_CATEGORIES = new Set(["preference", "pattern", "goal", "note"]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any[] = JSON.parse(match[0]);
    return raw
      .filter(
        (item) =>
          typeof item.key === "string" &&
          typeof item.value === "string" &&
          item.key.length <= 80 &&           // key 길이 제한
          item.value.length <= 300 &&         // value 길이 제한
          ALLOWED_CATEGORIES.has(item.category) && // category 열거형
          Number.isInteger(item.importance) &&
          item.importance >= 1 &&
          item.importance <= 5             // importance 범위
      )
      .slice(0, 5); // 최대 5개
  } catch {
    return [];
  }
}
