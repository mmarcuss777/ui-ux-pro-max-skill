import type { SupabaseClient } from "@supabase/supabase-js"

import { daysAgo, today } from "@/lib/dates"
import type { Database } from "@/types/db"

// AI cost control: every AI call is recorded as a `logs` row of type
// 'ai_call'; limits are enforced by counting those rows.
//   ask_nexa       — max 10 per day
//   reality_check  — max 1 per day
//   weekly_review  — max 1 per week
//   screen_time    — max 2 per day (vision, most expensive)

export type AiKind = "ask_nexa" | "reality_check" | "weekly_review" | "screen_time"

const LIMITS: Record<AiKind, { max: number; sinceDays: number }> = {
  ask_nexa: { max: 10, sinceDays: 0 },
  reality_check: { max: 1, sinceDays: 0 },
  weekly_review: { max: 1, sinceDays: 6 },
  screen_time: { max: 2, sinceDays: 0 },
}

export async function checkAiLimit(
  supabase: SupabaseClient<Database>,
  kind: AiKind
): Promise<boolean> {
  const limit = LIMITS[kind]
  const since = limit.sinceDays === 0 ? today() : daysAgo(limit.sinceDays)
  const { count } = await supabase
    .from("logs")
    .select("id", { count: "exact", head: true })
    .eq("type", "ai_call")
    .gte("date", since)
    .filter("data->>kind", "eq", kind)
  return (count ?? 0) < limit.max
}

export async function recordAiCall(
  supabase: SupabaseClient<Database>,
  userId: string,
  kind: AiKind
): Promise<void> {
  await supabase.from("logs").insert({
    user_id: userId,
    type: "ai_call",
    data: { kind },
  })
}
