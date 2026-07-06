import { NextResponse } from "next/server"

import { askAnalyst, languageInstruction } from "@/lib/ai"
import { daysAgo, today } from "@/lib/dates"
import { parseLocale } from "@/lib/i18n"
import { formatMoney } from "@/lib/money"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"
import type { Experiment, Log, Transaction } from "@/types/db"

const COACH_SYSTEM = `You are a hard, practical productivity coach for a solo
bootstrapped founder. You receive the founder's goals and priorities plus their
last 14 days: daily logs with AI productivity scores, fitness and learning
entries, business experiments, money movements, and phone screen-time analyses.

Diagnose where their time and effort are misallocated relative to the goals.
Be blunt, specific and actionable — no motivation, no flattery, no softening.
Reference their actual numbers. Output ONLY these sections, in order, each as a
short list of concrete points:

Business
Fitness
Learning
Time & focus
Top 3 moves this week

No introduction. No conclusion.`

type LogData = {
  energy?: number
  note?: string
  top_action?: string
  top_action_done?: boolean
  ai_score?: number
  ai_reason?: string
  total_minutes?: number
  wasted_minutes?: number
  analysis?: string
}

function summarizeLogs(logs: Log[]): string[] {
  const lines: string[] = []
  for (const log of logs) {
    const data = (log.data ?? {}) as LogData
    if (log.type === "screen_time") {
      lines.push(
        `- ${log.date} screen time: total ${data.total_minutes ?? "?"} min, wasted ~${data.wasted_minutes ?? "?"} min`
      )
      continue
    }
    const parts = [`${log.date} [${log.type}]`]
    if (log.score !== null) parts.push(`day score ${log.score}`)
    if (typeof data.ai_score === "number")
      parts.push(`AI productivity ${data.ai_score}/10`)
    if (data.top_action)
      parts.push(
        `top action "${data.top_action}" ${data.top_action_done ? "done" : "NOT done"}`
      )
    if (data.note) parts.push(`note: ${data.note}`)
    lines.push(`- ${parts.join(", ")}`)
  }
  return lines.length ? lines : ["- none"]
}

export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { locale?: string }
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const locale = parseLocale(body.locale)

  const workspaces = await getWorkspaces()
  const active = resolveActiveWorkspace(workspaces)
  if (!active) {
    return NextResponse.json({ error: "No workspace" }, { status: 400 })
  }

  const twoWeeksAgo = daysAgo(13)
  const [{ data: logs }, { data: experiments }, { data: transactions }] =
    await Promise.all([
      supabase.from("logs").select("*").gte("date", twoWeeksAgo).order("date"),
      supabase
        .from("experiments")
        .select("*")
        .eq("workspace_id", active.id)
        .order("created_at"),
      supabase
        .from("transactions")
        .select("*")
        .gte("date", twoWeeksAgo)
        .order("date"),
    ])

  const allLogs: Log[] = logs ?? []
  const allTx: Transaction[] = transactions ?? []
  const moneyIn = allTx
    .filter((t) => t.type === "in")
    .reduce((sum, t) => sum + t.amount, 0)
  const moneyOut = allTx
    .filter((t) => t.type === "out")
    .reduce((sum, t) => sum + t.amount, 0)

  const summary = [
    `Period: ${twoWeeksAgo} to ${today()}`,
    `Workspace: ${active.name} (${active.business_type})`,
    `Goals and priorities: ${active.goals?.trim() || "(not set)"}`,
    "",
    "Activity log:",
    ...summarizeLogs(allLogs),
    "",
    `Experiments (${(experiments ?? []).length}):`,
    ...((experiments ?? []).length
      ? (experiments ?? []).map(
          (e: Experiment) =>
            `- [${e.status}${e.decision ? `: ${e.decision}` : ""}] ${e.hypothesis}${e.deadline ? ` (deadline ${e.deadline})` : ""}`
        )
      : ["- none"]),
    "",
    `Money, 14 days: in ${formatMoney(moneyIn)}, out ${formatMoney(moneyOut)}, net ${formatMoney(moneyIn - moneyOut)}`,
  ].join("\n")

  try {
    const result = await askAnalyst(
      COACH_SYSTEM + languageInstruction(locale),
      summary,
      1500
    )
    return NextResponse.json({ result })
  } catch (error) {
    console.error("Coach failed:", error)
    return NextResponse.json(
      { error: "AI request failed. Check ANTHROPIC_API_KEY and try again." },
      { status: 502 }
    )
  }
}
