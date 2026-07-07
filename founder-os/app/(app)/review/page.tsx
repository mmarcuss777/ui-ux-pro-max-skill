import { ReviewGenerator } from "@/components/review-generator"
import { ScoreTrend } from "@/components/score-trend"
import { WeeklyResetForm } from "@/components/weekly-reset-form"
import { Card, CardContent } from "@/components/ui/card"
import { daysAgo, today, weekStart } from "@/lib/dates"
import { getT } from "@/lib/i18n-server"
import type { MissionData, WeeklyResetData } from "@/lib/log-schema"
import { formatMoney } from "@/lib/money"
import {
  BODY_TYPES,
  MIND_TYPES,
  dailyScore,
  pillarComplete,
  pillarEvidenceFor,
  weekPillarScore,
} from "@/lib/stats"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"
import type { Build, Experiment, Log, Transaction } from "@/types/db"

type DailyData = {
  energy?: number
  mood?: number
  note?: string
  top_action?: string
  top_action_done?: boolean
  lesson?: string
}

function activeDays(logs: Log[], types: string[]): number {
  return new Set(
    logs.filter((l) => types.includes(l.type)).map((l) => l.date)
  ).size
}

function buildSummary(
  workspaceName: string,
  goals: string | null,
  build: Build | null,
  logs: Log[],
  experiments: Experiment[],
  transactions: Transaction[],
  scores: { body: number; mind: number; buildScore: number; money: number }
): string {
  const lines: string[] = []
  lines.push(`Week: ${daysAgo(6)} to ${today()}`)
  lines.push(`Workspace: ${workspaceName}`)
  lines.push(`Goals and priorities: ${goals?.trim() || "(not set)"}`)
  lines.push(
    build
      ? `Current build: ${build.name} (${build.business_type}, stage ${build.stage}). Week goal: ${build.week_goal ?? "-"}. Next action: ${build.next_action ?? "-"}.`
      : "Current build: none."
  )
  lines.push(
    `Computed pillar activity (days of 7 → score of 10): body ${scores.body}/10, mind ${scores.mind}/10, build ${scores.buildScore}/10, money ${scores.money}/10`
  )
  lines.push("")

  const daily = logs.filter((l) => l.type === "daily")
  lines.push(`Daily logs (${daily.length} of 7 days):`)
  if (daily.length === 0) lines.push("- none — no daily tracking this week")
  for (const log of daily) {
    const data = (log.data ?? {}) as DailyData
    const parts = [
      `energy ${data.energy ?? "?"}`,
      `mood ${data.mood ?? "?"}`,
    ]
    if (data.top_action)
      parts.push(
        `top action "${data.top_action}" ${data.top_action_done ? "done" : "NOT done"}`
      )
    if (data.note) parts.push(`note: ${data.note}`)
    lines.push(`- ${log.date}: ${parts.join(", ")}`)
  }

  const lessons = logs
    .filter((l) => MIND_TYPES.includes(l.type))
    .map((l) => (l.data as DailyData)?.lesson)
    .filter(Boolean)
  if (lessons.length) {
    lines.push("")
    lines.push("Lessons of the week:")
    for (const lesson of lessons) lines.push(`- ${lesson}`)
  }

  lines.push("")
  lines.push(`Experiments (${experiments.length}):`)
  if (experiments.length === 0) lines.push("- none — nothing is being tested")
  for (const experiment of experiments) {
    const status =
      experiment.status === "decided"
        ? `decided: ${experiment.decision ?? "no decision set"}`
        : experiment.status
    lines.push(`- [${status}] ${experiment.hypothesis}`)
  }

  const moneyIn = transactions
    .filter((t) => t.type === "in")
    .reduce((sum, t) => sum + t.amount, 0)
  const moneyOut = transactions
    .filter((t) => t.type === "out")
    .reduce((sum, t) => sum + t.amount, 0)
  lines.push("")
  lines.push(
    `Money (7 days): in ${formatMoney(moneyIn)}, out ${formatMoney(moneyOut)}, net ${formatMoney(moneyIn - moneyOut)}`
  )

  return lines.join("\n")
}

export default async function ReviewPage() {
  const supabase = createClient()
  const { d } = getT()
  const workspaces = await getWorkspaces()
  const active = resolveActiveWorkspace(workspaces)!
  const weekAgo = daysAgo(6)

  const monthAgo = daysAgo(29)
  const [
    { data: logs },
    { data: experiments },
    { data: transactions },
    { data: builds },
    { data: resets },
    { data: monthRows },
    { data: monthTx },
  ] = await Promise.all([
    supabase
      .from("logs")
      .select("*")
      .gte("date", weekAgo)
      .in("type", [
        "daily",
        "body",
        "mind",
        "build",
        "fitness",
        "learning",
        "close_day",
      ])
      .order("date"),
    supabase
      .from("experiments")
      .select("*")
      .eq("workspace_id", active.id)
      .order("created_at"),
    supabase.from("transactions").select("*").gte("date", weekAgo),
    supabase
      .from("builds")
      .select("*")
      .eq("workspace_id", active.id)
      .eq("status", "active")
      .limit(1),
    supabase
      .from("logs")
      .select("*")
      .eq("type", "weekly_reset")
      .gte("date", weekStart())
      .order("created_at", { ascending: false })
      .limit(1),
    // Slim month of rows for the trend chart (screen_time rows carry
    // large analysis blobs — excluded).
    supabase
      .from("logs")
      .select("date,type,data")
      .neq("type", "screen_time")
      .gte("date", monthAgo),
    supabase.from("transactions").select("date").gte("date", monthAgo),
  ])

  const weekLogs: Log[] = logs ?? []
  const weekTx: Transaction[] = transactions ?? []
  const build = builds?.[0] ?? null
  const resetRow = resets?.[0] ?? null
  const reset = resetRow
    ? ((resetRow.data ?? {}) as WeeklyResetData)
    : null

  const bodyDays = activeDays(weekLogs, BODY_TYPES)
  // Mind counts journal entries AND close-day rows with a written lesson —
  // the same rule the daily score uses.
  const mindDays = new Set(
    weekLogs
      .filter(
        (l) =>
          MIND_TYPES.includes(l.type) ||
          (l.type === "close_day" &&
            ((l.data as { lesson?: string })?.lesson ?? "").trim() !== "")
      )
      .map((l) => l.date)
  ).size
  const buildDays = new Set(
    weekLogs
      .filter(
        (l) =>
          l.type === "build" ||
          (l.type === "daily" &&
            (l.data as DailyData)?.top_action_done === true)
      )
      .map((l) => l.date)
  ).size
  const moneyDays = new Set(weekTx.map((t) => t.date)).size

  const scores = {
    body: weekPillarScore(bodyDays),
    mind: weekPillarScore(mindDays),
    buildScore: weekPillarScore(buildDays),
    money: weekPillarScore(moneyDays),
  }

  const scoreCards = [
    { label: d.pillars.body, score: scores.body, days: bodyDays },
    { label: d.pillars.mind, score: scores.mind, days: mindDays },
    { label: d.pillars.build, score: scores.buildScore, days: buildDays },
    { label: d.pillars.money, score: scores.money, days: moneyDays },
  ]

  // 30-day trend: real daily scores (evidence + mission dones per day).
  const trendRows = (monthRows ?? []) as {
    date: string
    type: string
    data: unknown
  }[]
  const trendTx = monthTx ?? []
  const trendPoints: { date: string; score: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const date = daysAgo(i)
    const missionRow = trendRows.find(
      (r) => r.date === date && r.type === "mission"
    )
    const mission = (missionRow?.data ?? null) as MissionData | null
    trendPoints.push({
      date,
      score: dailyScore(
        pillarComplete(mission, pillarEvidenceFor(date, trendRows, trendTx))
      ),
    })
  }

  const summary = buildSummary(
    active.name,
    active.goals,
    build,
    weekLogs,
    experiments ?? [],
    weekTx,
    scores
  )

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">{d.review.title}</h1>
        <p className="text-sm text-muted-foreground">{d.review.subtitle}</p>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {d.review.weekScores}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {scoreCards.map((card) => (
            <Card key={card.label} className="relative overflow-hidden">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-gold-light via-gold to-transparent"
              />
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-ink">
                  {card.score}
                  <span className="text-sm font-normal text-muted-foreground">
                    /10
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {card.days}/7 {d.review.daysActive}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <ScoreTrend points={trendPoints} />

      <WeeklyResetForm
        resetId={resetRow?.id ?? null}
        reset={reset}
        workspaceId={active.id}
        buildName={build?.name ?? null}
        aiSlot={<ReviewGenerator summary={summary} />}
      />

      <details className="rounded-xl border border-line p-4">
        <summary className="cursor-pointer text-sm font-medium text-ink">
          {d.review.dataSent}
        </summary>
        <pre className="mt-3 whitespace-pre-wrap font-sans text-xs text-muted-foreground">
          {summary}
        </pre>
      </details>
    </div>
  )
}
