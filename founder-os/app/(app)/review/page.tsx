import { ReviewGenerator } from "@/components/review-generator"
import { ScoreRing } from "@/components/score-ring"
import { ScoreTrend } from "@/components/score-trend"
import { ShareWeek } from "@/components/share-week"
import { WeeklyResetForm } from "@/components/weekly-reset-form"
import { Card, CardContent } from "@/components/ui/card"
import { daysAgo, isoDate, shortDate, today, weekStart } from "@/lib/dates"
import { getT } from "@/lib/i18n-server"
import type { WeeklyResetData } from "@/lib/log-schema"
import { formatMoney } from "@/lib/money"
import { pulseSummary, pulseTiles } from "@/lib/pulse"
import {
  connectedPillars,
  scoreBand,
  scoreDay,
  weekScore,
  type DayScore,
  type ScoreBand,
} from "@/lib/score"
import {
  ACTION_LOG_TYPES,
  BODY_TYPES,
  MIND_TYPES,
  actionDates,
  metricActionDates,
  metricPillars,
  streakWithShields,
  weekPillarScore,
  type MetricSlim,
  type Pillar,
} from "@/lib/stats"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"
import { cn } from "@/lib/utils"
import type { Build, Experiment, Log, Profile, Transaction } from "@/types/db"

type DailyData = {
  energy?: number
  mood?: number
  note?: string
  top_action?: string
  top_action_done?: boolean
  lesson?: string
}

function buildSummary(
  workspaceName: string,
  goals: string | null,
  build: Build | null,
  logs: Log[],
  experiments: Experiment[],
  transactions: Transaction[],
  scores: { body: number; mind: number; buildScore: number; money: number },
  scoreBlock: string
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
  lines.push(scoreBlock)
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
  const { d, locale } = getT()
  const workspaces = await getWorkspaces()
  const active = resolveActiveWorkspace(workspaces)!
  const weekAgo = daysAgo(6)

  const monthAgo = daysAgo(29)
  const halfYearAgo = daysAgo(179)
  const [
    { data: logs },
    { data: experiments },
    { data: transactions },
    { data: builds },
    { data: resets },
    { data: monthRows },
    { data: monthTx },
    { data: historyRows },
    { data: historyTx },
    { data: monthMetricRows },
    { data: integrations },
    { data: profileRows },
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
    supabase
      .from("transactions")
      .select("date,type,amount,category,moved_forward")
      .gte("date", monthAgo),
    // Half a year of bare date+type pairs: identity evidence, rank and
    // perfect-week trophies live on long memory, not one month.
    supabase.from("logs").select("date,type").gte("date", halfYearAgo),
    supabase.from("transactions").select("date").gte("date", halfYearAgo),
    supabase
      .from("imported_metrics")
      .select("date,metric,value")
      .gte("date", monthAgo),
    supabase.from("integrations").select("provider,status"),
    supabase.from("profiles").select("*").limit(1),
  ])

  const weekLogs: Log[] = logs ?? []
  const weekTx: Transaction[] = transactions ?? []
  const build = builds?.[0] ?? null
  const resetRow = resets?.[0] ?? null
  const reset = resetRow
    ? ((resetRow.data ?? {}) as WeeklyResetData)
    : null

  // Imported metrics count toward weekly pillar days like manual logs.
  const monthMetrics: MetricSlim[] = monthMetricRows ?? []
  const weekMetrics = monthMetrics.filter((m) => m.date >= weekAgo)
  const metricDays = (pillar: "body" | "build" | "money") =>
    new Set(
      weekMetrics
        .filter((m) => metricPillars(weekMetrics, m.date)[pillar] === true)
        .map((m) => m.date)
    )

  const bodyDays = new Set([
    ...weekLogs.filter((l) => BODY_TYPES.includes(l.type)).map((l) => l.date),
    ...Array.from(metricDays("body")),
  ]).size
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
  const buildDays = new Set([
    ...weekLogs
      .filter(
        (l) =>
          l.type === "build" ||
          (l.type === "daily" &&
            (l.data as DailyData)?.top_action_done === true)
      )
      .map((l) => l.date),
    ...Array.from(metricDays("build")),
  ]).size
  const moneyDays = new Set([
    ...weekTx.map((t) => t.date),
    ...Array.from(metricDays("money")),
  ]).size

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

  // 30-day trend + week hero: one honest engine (Operator Score).
  const trendRows = (monthRows ?? []) as {
    date: string
    type: string
    data: unknown
  }[]
  const trendTx = monthTx ?? []
  const connected = connectedPillars(integrations ?? [])
  const profile: Profile | null = profileRows?.[0] ?? null
  const dayScores: { date: string; day: DayScore }[] = []
  for (let i = 29; i >= 0; i--) {
    const date = daysAgo(i)
    dayScores.push({
      date,
      day: scoreDay(date, trendRows, trendTx, monthMetrics, connected),
    })
  }
  const trendPoints = dayScores.map(({ date, day }) => ({
    date,
    score: day.total,
  }))
  const lastSevenScores = dayScores.slice(-7)
  const weekAvg = weekScore(lastSevenScores.map(({ day }) => day.total))
  const prevWeekAvg = weekScore(
    dayScores.slice(-14, -7).map(({ day }) => day.total)
  )
  const band: ScoreBand = scoreBand(weekAvg)
  const PILLAR_KEYS: Pillar[] = ["body", "mind", "build", "money"]
  const pillarWeekPts = PILLAR_KEYS.map((pillar) => ({
    pillar,
    points: Math.round(
      lastSevenScores.reduce(
        (sum, { day }) => sum + day.pillars[pillar].points,
        0
      ) / 7
    ),
  }))

  // The block the AI verdict is anchored on: day-by-day Operator Score,
  // live connector pulse, and the founder's own bars from the profile.
  const wasteMonth = trendTx
    .filter(
      (t) =>
        t.date >= today().slice(0, 8) + "01" &&
        t.type === "out" &&
        t.category === "waste"
    )
    .reduce((sum, t) => sum + (t.amount ?? 0), 0)
  const scoreBlock = [
    `Operator Score, last 7 days (0-100; 4 pillars x 25 = 15 action + 10 proof):`,
    ...lastSevenScores.map(
      ({ date, day }) =>
        `- ${date}: ${day.total} (body ${day.pillars.body.points}, mind ${day.pillars.mind.points}, business ${day.pillars.build.points}, money ${day.pillars.money.points})`
    ),
    `Week average: ${weekAvg}/100 (previous week ${prevWeekAvg}/100). 80+ is elite.`,
    "",
    "Connected data, this week vs the week before:",
    pulseSummary(pulseTiles(monthMetrics, today())),
    "",
    `Founder's bars: trainings ${profile?.training_per_week ?? 4}/week, focus ${profile?.focus_minutes_per_day ?? 25} min/day, monthly waste limit ${profile?.waste_limit_month != null ? formatMoney(profile.waste_limit_month) : "not set"} (waste spent this month: ${formatMoney(wasteMonth)}). Judge the week against these bars.`,
  ].join("\n")

  // Identity block: long-memory numbers that survive any broken streak.
  const history = historyRows ?? []
  const historyDates = actionDates(history, historyTx ?? [])
  metricActionDates(monthMetrics).forEach((date) => historyDates.add(date))
  const evidenceCount = history.filter((r) =>
    ACTION_LOG_TYPES.includes(r.type)
  ).length
  const activeDaysTotal = historyDates.size
  const RANKS = [7, 21, 50, 100, 200]
  const rankLevel = RANKS.filter((t) => activeDaysTotal >= t).length
  const rankLabel =
    rankLevel > 0 ? `Operator ${["I", "II", "III", "IV", "V"][rankLevel - 1]}` : null

  // Perfect-week trophies over the last 12 completed weeks.
  const trophyWeeks: string[] = []
  const thisMonday = new Date()
  thisMonday.setDate(thisMonday.getDate() - ((thisMonday.getDay() + 6) % 7))
  for (let week = 1; week <= 12; week++) {
    const monday = new Date(thisMonday)
    monday.setDate(monday.getDate() - 7 * week)
    let full = true
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday)
      day.setDate(day.getDate() + i)
      if (!historyDates.has(isoDate(day))) {
        full = false
        break
      }
    }
    if (full) {
      const sunday = new Date(monday)
      sunday.setDate(sunday.getDate() + 6)
      trophyWeeks.push(
        `${shortDate(isoDate(monday), locale)}–${shortDate(isoDate(sunday), locale)}`
      )
    }
  }

  // Best day this week (peak-end rule: the week is remembered by its peak).
  const lastSeven = trendPoints.slice(-7)
  const best = lastSeven.reduce(
    (top, p) => (p.score > top.score ? p : top),
    lastSeven[0]
  )
  const bestDayLabel =
    best && best.score > 0
      ? `${new Date(best.date).toLocaleDateString(
          locale === "sk" ? "sk-SK" : "en-GB",
          { weekday: "long" }
        )} · ${best.score}/100`
      : null

  const { streak: streakDays } = streakWithShields(historyDates)

  const summary = buildSummary(
    active.name,
    active.goals,
    build,
    weekLogs,
    experiments ?? [],
    weekTx,
    scores,
    scoreBlock
  )

  const bandLabel: Record<ScoreBand, string> = {
    off: d.today.bandOff,
    solid: d.today.bandSolid,
    operator: d.today.bandOperator,
    elite: d.today.bandElite,
  }
  const weekDelta = weekAvg - prevWeekAvg

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">{d.review.title}</h1>
        <p className="text-sm text-muted-foreground">{d.review.subtitle}</p>
      </div>

      {/* The week's verdict, in one number — the same engine as every
          day: Operator Score averaged over the last seven days. */}
      <div
        className={cn(
          "rounded-2xl bg-gradient-to-br from-gold-light via-gold/40 to-gold-dark/50 p-px shadow-lg shadow-gold/15",
          band === "elite" && "animate-glow"
        )}
      >
        <div className="rounded-[calc(1rem-1px)] bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gold-dark">
            {d.review.weekScoreTitle}
          </p>
          <div className="mt-3 flex items-center gap-4">
            <ScoreRing value={weekAvg} size={104} label={d.review.weekScoreTitle} />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-semibold",
                  band === "elite" ? "text-gold-dark" : "text-ink"
                )}
              >
                {bandLabel[band]}
              </p>
              {prevWeekAvg > 0 && weekDelta !== 0 && (
                <p
                  className={cn(
                    "mt-0.5 text-xs font-medium",
                    weekDelta > 0 ? "text-ok" : "text-danger"
                  )}
                >
                  {weekDelta > 0 ? "▲" : "▼"} {Math.abs(weekDelta)}{" "}
                  {d.review.vsPrevWeek}
                </p>
              )}
              {bestDayLabel && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {d.review.bestDay}:{" "}
                  <span className="font-medium capitalize text-ink">
                    {bestDayLabel}
                  </span>
                </p>
              )}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {pillarWeekPts.map(({ pillar, points }) => (
              <div
                key={pillar}
                className={cn(
                  "rounded-xl px-2 py-2 text-center",
                  points >= 20
                    ? "gold-fill shadow-sm shadow-gold/25"
                    : points > 0
                      ? "bg-gold/15 text-gold-dark"
                      : "bg-secondary text-muted-foreground"
                )}
              >
                <span className="block text-[11px] font-medium">
                  {d.pillars[pillar]}
                </span>
                <span className="block text-sm font-bold tabular-nums">
                  {points}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ScoreTrend points={trendPoints} />

      {/* Identity block: numbers that survive any broken streak. */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="text-sm text-ink">
            <span className="text-xl font-bold tabular-nums text-gold-dark">
              {evidenceCount}
            </span>{" "}
            {d.review.evidenceLine}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {rankLabel && (
              <span className="gold-fill rounded-full px-3 py-1.5 text-xs font-bold">
                {rankLabel}
              </span>
            )}
            <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium tabular-nums text-muted-foreground">
              {activeDaysTotal} {d.review.daysActive}
            </span>
            {trophyWeeks.map((label) => (
              <span
                key={label}
                title={d.review.trophies}
                className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-semibold tabular-nums text-gold-dark"
              >
                ★ {label}
              </span>
            ))}
          </div>
          <ShareWeek
            scores={scoreCards.map(({ label, score }) => ({ label, score }))}
            streakDays={streakDays}
            focus={(reset?.focus ?? "").trim() || null}
          />
        </CardContent>
      </Card>

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
