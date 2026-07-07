import { NextResponse } from "next/server"

import { askAnalyst, languageInstruction } from "@/lib/ai"
import { checkAiLimit, recordAiCall } from "@/lib/ai-usage"
import { daysAgo, today } from "@/lib/dates"
import { parseLocale } from "@/lib/i18n"
import type { BriefingData, BuildStepData } from "@/lib/log-schema"
import { pulseSummary, pulseTiles } from "@/lib/pulse"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// The operator brief: reads the founder's live numbers and answers with
// one conclusion and one move. Everything the model sees is assembled
// server-side from aggregates — never raw rows, never client input.
const BRIEFING_SYSTEM = `You are Nexa, the AI operator for a solo bootstrapped
founder. You receive aggregates from the founder's connected business data
(orders, revenue, traffic, commits, subscribers), the current project, the
week goal, recently completed steps and your previous verdicts. Read the
numbers like an operator, not a cheerleader. Be blunt. Never motivate.
Output ONLY these sections, in order:

Signal — 2-3 short bullets: what the numbers actually say (trend, break, anomaly)
Conclusion — one hard sentence
Risk — one line

Then end with exactly one line in this machine-readable format (keep the
literal English prefix "MOVE:" even when answering in another language):
MOVE: <one concrete action for today — cheap, finishable today, measurable>

If there is no connected data yet, say so in Signal and base the move on
the project and week goal instead. No introduction. No pep talk.`

function splitMove(raw: string): { content: string; move: string | null } {
  const match = raw.match(/^MOVE:\s*(.+)$/m)
  if (!match) return { content: raw.trim(), move: null }
  return {
    content: raw.replace(/^MOVE:.*$/m, "").trim(),
    move: match[1].trim(),
  }
}

export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { locale?: string; force?: boolean }
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const locale = parseLocale(body.locale)
  const todayDate = today()

  // One briefing per day: return the stored one unless a regenerate is
  // explicitly requested (the second and last allowed call of the day).
  const { data: existingRows } = await supabase
    .from("logs")
    .select("id,data")
    .eq("type", "briefing")
    .eq("date", todayDate)
    .limit(1)
  const existing = existingRows?.[0] ?? null
  if (existing && !body.force) {
    return NextResponse.json({ ...(existing.data as BriefingData), cached: true })
  }

  if (!(await checkAiLimit(supabase, "briefing"))) {
    return NextResponse.json({ error: "limit" }, { status: 429 })
  }

  // Assemble the operator's view server-side.
  const twoWeeksAgo = daysAgo(13)
  const [
    { data: workspaces },
    { data: metrics },
    { data: recentLogs },
    { data: profileRows },
  ] = await Promise.all([
      supabase.from("workspaces").select("id,name,goals,is_primary,status"),
      supabase
        .from("imported_metrics")
        .select("date,metric,value")
        .gte("date", twoWeeksAgo),
      supabase
        .from("logs")
        .select("type,date,data")
        .in("type", ["build", "reality_check", "briefing", "weekly_reset"])
        .gte("date", twoWeeksAgo)
        .order("date", { ascending: false }),
      supabase.from("profiles").select("main_goal").limit(1),
    ])

  const active =
    workspaces?.find((w) => w.is_primary && w.status === "active") ??
    workspaces?.find((w) => w.status === "active") ??
    workspaces?.[0]
  const { data: builds } = active
    ? await supabase
        .from("builds")
        .select("name,business_type,stage,week_goal,next_action")
        .eq("workspace_id", active.id)
        .eq("status", "active")
        .limit(1)
    : { data: null }
  const build = builds?.[0] ?? null

  const logs = recentLogs ?? []
  const steps = logs
    .filter((l) => l.type === "build")
    .slice(0, 7)
    .map((l) => `${l.date}: ${((l.data as BuildStepData)?.action ?? "").slice(0, 120)}`)
  const lastReality = logs.find((l) => l.type === "reality_check")
  const lastBriefing = logs.find(
    (l) => l.type === "briefing" && l.date !== todayDate
  )
  const focus = logs.find((l) => l.type === "weekly_reset")

  const mainGoal =
    profileRows?.[0]?.main_goal?.trim() ||
    (workspaces?.find((w) => w.id === active?.id)?.goals ?? "").trim() ||
    "-"

  const tiles = pulseTiles(metrics ?? [], todayDate)
  const prompt = [
    `Founder's main goal: ${mainGoal}`,
    `Project: ${build?.name ?? "(none set)"} — type ${build?.business_type ?? "-"}, stage ${build?.stage ?? "-"}`,
    `Week goal: ${build?.week_goal ?? "-"}`,
    `Founder's planned next step: ${build?.next_action ?? "-"}`,
    focus
      ? `Week focus (from weekly reset): ${((focus.data as { focus?: string })?.focus ?? "-").slice(0, 160)}`
      : "",
    "",
    "Connected data, this week vs the week before:",
    pulseSummary(tiles),
    "",
    steps.length
      ? `Steps completed recently:\n${steps.join("\n")}`
      : "Steps completed recently: none recorded.",
    lastReality
      ? `\nYour previous audit verdict (${lastReality.date}):\n${((lastReality.data as { content?: string })?.content ?? "").slice(0, 700)}`
      : "",
    lastBriefing
      ? `\nYour previous briefing (${lastBriefing.date}):\n${((lastBriefing.data as BriefingData)?.content ?? "").slice(0, 500)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n")

  await recordAiCall(supabase, user.id, "briefing")

  let content: string
  let move: string | null
  try {
    const raw = await askAnalyst(
      BRIEFING_SYSTEM + languageInstruction(locale),
      prompt,
      700
    )
    const split = splitMove(raw)
    content = split.content
    move = split.move
  } catch (error) {
    console.error("Briefing failed:", error)
    content =
      locale === "sk"
        ? "AI je teraz nedostupná. Pozri si pulz vyššie sám: čo hovoria čísla oproti minulému týždňu a aký je najlacnejší ťah, ktorý dnes stihneš?"
        : "The AI is unavailable right now. Read the pulse above yourself: what do the numbers say vs last week, and what is the cheapest move you can finish today?"
    move = null
  }

  const data: BriefingData = { content, move: move ?? undefined, move_done: false }
  if (existing) {
    await supabase.from("logs").update({ data }).eq("id", existing.id)
  } else {
    await supabase.from("logs").insert({
      user_id: user.id,
      workspace_id: active?.id ?? null,
      type: "briefing",
      date: todayDate,
      data,
    })
  }

  return NextResponse.json(data)
}
