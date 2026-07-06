import { NextResponse } from "next/server"

import { askAnalyst } from "@/lib/ai"
import { parseLocale } from "@/lib/i18n"
import { createClient } from "@/lib/supabase/server"
import type { Log } from "@/types/db"

const SCORE_SYSTEM = `You are a productivity scoring engine for a solo founder.
Score how much a single logged activity actually moved the founder toward their
stated goals and priorities.

Rules:
- Score is an integer from 0 to 10.
- Alignment with the founder's goals and priorities matters most.
- Apply diminishing returns: a repeated similar activity on the same day scores
  notably lower than its first occurrence (a second gym session brings less than
  the first; spending that time on the business instead would score higher).
- Fitness and learning matter, but business execution usually compounds most
  unless the goals say otherwise.
- Be strict. 9-10 is rare.

Respond with ONLY a JSON object on one line:
{"score": <integer 0-10>, "reason": "<one blunt sentence>"}`

type LogData = Record<string, unknown>

function describeLog(log: Log): string {
  const data = (log.data ?? {}) as LogData
  const parts: string[] = [`type: ${log.type}`]
  if (log.score !== null) parts.push(`self-reported day score: ${log.score}`)
  if (typeof data.energy === "number") parts.push(`energy: ${data.energy}/5`)
  if (typeof data.top_action === "string" && data.top_action)
    parts.push(
      `top action: "${data.top_action}" (${data.top_action_done ? "done" : "not done"})`
    )
  if (typeof data.note === "string" && data.note)
    parts.push(`note: "${data.note}"`)
  if (typeof data.ai_score === "number")
    parts.push(`already scored: ${data.ai_score}/10`)
  return parts.join(", ")
}

export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { logId?: string; locale?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  if (!body.logId) {
    return NextResponse.json({ error: "logId is required" }, { status: 400 })
  }
  const locale = parseLocale(body.locale)

  const { data: log } = await supabase
    .from("logs")
    .select("*")
    .eq("id", body.logId)
    .single()
  if (!log || !["daily", "fitness", "learning"].includes(log.type)) {
    return NextResponse.json({ error: "Log not found" }, { status: 404 })
  }

  const [{ data: sameDay }, workspaceResult] = await Promise.all([
    supabase
      .from("logs")
      .select("*")
      .eq("date", log.date)
      .neq("id", log.id)
      .order("created_at"),
    log.workspace_id
      ? supabase
          .from("workspaces")
          .select("goals, business_type")
          .eq("id", log.workspace_id)
          .single()
      : Promise.resolve({ data: null }),
  ])

  const goals = workspaceResult.data?.goals?.trim()
  const others = (sameDay ?? []).filter((entry: Log) =>
    ["daily", "fitness", "learning"].includes(entry.type)
  )

  const prompt = [
    `Founder's goals and priorities: ${goals || "(not set — assume a solo founder growing a small service business while staying fit and learning)"}`,
    "",
    `Other activities already logged today (${others.length}):`,
    ...(others.length
      ? others.map((entry: Log) => `- ${describeLog(entry)}`)
      : ["- none"]),
    "",
    `Activity to score now: ${describeLog(log as Log)}`,
    locale === "sk" ? "\nWrite the reason in Slovak (informal 'ty')." : "",
  ].join("\n")

  try {
    const raw = await askAnalyst(SCORE_SYSTEM, prompt, 300)
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error("No JSON in AI reply")
    const parsed = JSON.parse(match[0]) as { score?: number; reason?: string }
    const score = Math.max(0, Math.min(10, Math.round(Number(parsed.score))))
    if (Number.isNaN(score)) throw new Error("No score in AI reply")
    const reason = String(parsed.reason ?? "").slice(0, 300)

    const mergedData = {
      ...((log.data ?? {}) as LogData),
      ai_score: score,
      ai_reason: reason,
    }
    await supabase.from("logs").update({ data: mergedData }).eq("id", log.id)

    return NextResponse.json({ score, reason })
  } catch (error) {
    console.error("Productivity scoring failed:", error)
    return NextResponse.json(
      { error: "Scoring failed. Check ANTHROPIC_API_KEY and try again." },
      { status: 502 }
    )
  }
}
