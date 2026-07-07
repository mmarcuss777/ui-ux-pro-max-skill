import Link from "next/link"
import {
  ArrowRightIcon,
  BarChartIcon,
  ChatBubbleIcon,
  LightningBoltIcon,
  RocketIcon,
  TargetIcon,
} from "@radix-ui/react-icons"

import { CloseDayCard } from "@/components/close-day-card"
import { Greeting } from "@/components/greeting"
import { MinimumDay } from "@/components/minimum-day"
import { OneMoveCard } from "@/components/one-move-card"
import { ScoreRing } from "@/components/score-ring"
import { Card, CardContent } from "@/components/ui/card"
import { daysAgo, today } from "@/lib/dates"
import { getT } from "@/lib/i18n-server"
import type { CloseDayData, OneMoveData } from "@/lib/log-schema"
import { daysLabel } from "@/lib/plural"
import {
  connectedPillars,
  scoreDay,
  scoreGaps,
  weekScore,
  type ScoreBand,
  scoreBand,
} from "@/lib/score"
import {
  actionDates,
  dayStarted,
  metricActionDates,
  streakWithShields,
  type Pillar,
} from "@/lib/stats"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"
import { cn } from "@/lib/utils"
import type { Log } from "@/types/db"

const PILLAR_KEYS: Pillar[] = ["body", "mind", "build", "money"]
const PILLAR_LINKS: Record<Pillar, string> = {
  body: "/body",
  mind: "/mind",
  build: "/build",
  money: "/money",
}

// The day in four blocks: where you stand (score), the one commitment
// (One Move), the points still on the table, and the evening close.
// Everything else lives in its own section — this page creates movement,
// it doesn't archive it.
export default async function TodayPage() {
  const supabase = createClient()
  const { locale, d } = getT()
  const todayDate = today()
  const monthAgo = daysAgo(29)

  const [
    workspaces,
    { data: todayRows },
    { data: monthFull },
    { data: recentSpecial },
    { data: txMonth },
    { data: allBuilds },
    { data: metricRows },
    { data: integrations },
  ] = await Promise.all([
    getWorkspaces(),
    supabase.from("logs").select("*").eq("date", todayDate),
    supabase.from("logs").select("date,type,data").gte("date", monthAgo),
    supabase
      .from("logs")
      .select("*")
      .in("type", ["close_day", "weekly_reset"])
      .gte("date", daysAgo(8))
      .order("date", { ascending: false }),
    supabase
      .from("transactions")
      .select("date,type,moved_forward")
      .gte("date", monthAgo),
    supabase
      .from("builds")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    supabase
      .from("imported_metrics")
      .select("date,metric,value")
      .gte("date", monthAgo),
    supabase.from("integrations").select("provider,status"),
  ])
  const active = resolveActiveWorkspace(workspaces)!

  const todayLogs: Log[] = todayRows ?? []
  const monthLogs = monthFull ?? []
  const specialLogs: Log[] = recentSpecial ?? []
  const transactions = txMonth ?? []
  const todayTx = transactions.filter((t) => t.date === todayDate)
  const metrics = metricRows ?? []
  const build =
    (allBuilds ?? []).find((b) => b.workspace_id === active.id) ?? null

  const oneMoveRow = todayLogs.find((l) => l.type === "one_move") ?? null
  const oneMove = oneMoveRow ? ((oneMoveRow.data ?? {}) as OneMoveData) : null
  const closeRow = todayLogs.find((l) => l.type === "close_day") ?? null
  const close = closeRow ? ((closeRow.data ?? {}) as CloseDayData) : null

  // Last night's "tomorrow's first move" becomes this morning's suggestion.
  const yesterdayClose = specialLogs.find(
    (l) => l.type === "close_day" && l.date === daysAgo(1)
  )
  const suggestion =
    (
      (yesterdayClose?.data as CloseDayData | undefined)
        ?.tomorrow_first_move ?? ""
    ).trim() || null

  // Operator Score: today, the week average and the 30-day record —
  // one honest engine for all three (see lib/score.ts).
  const connected = connectedPillars(integrations ?? [])
  const dayTotals: number[] = []
  for (let i = 0; i < 30; i++) {
    dayTotals.push(
      scoreDay(daysAgo(i), monthLogs, transactions, metrics, connected).total
    )
  }
  const todayScore = scoreDay(
    todayDate,
    monthLogs,
    transactions,
    metrics,
    connected
  )
  const score = todayScore.total
  const week = weekScore(dayTotals.slice(0, 7))
  const record = Math.max(...dayTotals)
  const band: ScoreBand = scoreBand(score)
  const gaps = scoreGaps(todayScore)
  const pillarsDone = PILLAR_KEYS.filter(
    (p) => todayScore.pillars[p].action
  ).length

  const started =
    dayStarted(todayLogs, todayTx) || score > 0
  const allDates = actionDates(monthLogs, transactions)
  metricActionDates(metrics).forEach((date) => allDates.add(date))
  const { streak: streakDays, shieldsLeft } = streakWithShields(allDates)
  const recentlyActive = [1, 2, 3, 4, 5, 6, 7].some((n) =>
    allDates.has(daysAgo(n))
  )
  const milestone = [100, 30, 7].find((m) => streakDays === m) ?? null

  // Insight for the close-day summary: which pillar lifts this user's
  // days the most (last 30 days) — a small variable reward.
  let insight: string | null = null
  let bestDelta = 0
  const pastDays = dayTotals
    .map((total, i) => ({
      total,
      date: daysAgo(i),
    }))
    .slice(1)
  for (const pillar of ["body", "mind", "build"] as const) {
    const hasPillar = (date: string) =>
      scoreDay(date, monthLogs, transactions, metrics, connected).pillars[
        pillar
      ].action
    const withPillar = pastDays.filter((day) => hasPillar(day.date))
    const withoutPillar = pastDays.filter((day) => !hasPillar(day.date))
    if (withPillar.length < 3 || withoutPillar.length < 3) continue
    const avg = (list: typeof pastDays) =>
      list.reduce((sum, day) => sum + day.total, 0) / list.length
    const delta = Math.round(avg(withPillar) - avg(withoutPillar))
    if (delta > bestDelta && delta >= 10) {
      bestDelta = delta
      insight = `${d.today.insightPre} ${d.pillars[pillar]} ${d.today.insightMid} ${delta} ${d.today.insightPost}`
    }
  }
  if (!insight) {
    const weekActive = [0, 1, 2, 3, 4, 5, 6].filter((n) =>
      allDates.has(daysAgo(n))
    ).length
    insight = `${d.today.insightFallback} ${weekActive}/7 ${d.review.daysActive}.`
  }

  const bandLabel: Record<ScoreBand, string> = {
    off: d.today.bandOff,
    solid: d.today.bandSolid,
    operator: d.today.bandOperator,
    elite: d.today.bandElite,
  }
  const gapHint = (pillar: Pillar, kind: "action" | "proof"): string => {
    const dict = d.today as unknown as Record<string, string>
    return dict[`gap_${pillar}_${kind}`] ?? ""
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{d.today.title}</h1>
          <p className="text-sm text-muted-foreground">
            <Greeting />
            {new Date().toLocaleDateString(
              locale === "sk" ? "sk-SK" : "en-GB",
              { weekday: "long", day: "numeric", month: "long" }
            )}
          </p>
        </div>
        {streakDays > 0 && (
          <span className="flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold-dark">
            <LightningBoltIcon className="h-3.5 w-3.5" />
            {daysLabel(streakDays, locale)}
            {shieldsLeft > 0 && (
              <span className="rounded-full bg-gold/20 px-1.5 text-[10px] font-bold tabular-nums">
                {shieldsLeft}× {d.today.shieldWord}
              </span>
            )}
          </span>
        )}
      </div>

      {/* One contextual banner at a time: risk beats fresh start beats
          milestone — the page never stacks alarms. */}
      {!started && streakDays > 0 ? (
        <div className="space-y-2.5 rounded-xl border border-danger/30 bg-danger/[0.06] px-3.5 py-2.5">
          <p className="text-sm font-medium text-danger">
            {d.today.streakRisk}
          </p>
          <MinimumDay workspaceId={active.id} />
        </div>
      ) : !started && recentlyActive ? (
        <div className="space-y-2.5 rounded-xl border border-gold/30 bg-gold/[0.07] px-3.5 py-2.5">
          <p className="text-sm font-medium text-ink">{d.today.freshStart}</p>
          <MinimumDay workspaceId={active.id} />
        </div>
      ) : started && milestone ? (
        <p className="animate-pop gold-fill rounded-xl px-3.5 py-2.5 text-sm font-semibold">
          {milestone === 100
            ? d.today.milestone100
            : milestone === 30
              ? d.today.milestone30
              : d.today.milestone7}
        </p>
      ) : null}

      {/* Operator Score — the one number of the app. */}
      <Card className={cn(score === 100 && "animate-glow border-gold/40")}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <ScoreRing value={score} size={104} label={d.today.dailyScore} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {d.today.dailyScore}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-sm font-semibold",
                  band === "elite" || score === 100
                    ? "text-gold-dark"
                    : "text-ink"
                )}
              >
                {score === 100 ? d.today.perfectDay : bandLabel[band]}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {d.today.weekAvg}: <span className="font-semibold tabular-nums text-ink">{week}</span>
                {" · "}
                {d.today.record30}: <span className="font-semibold tabular-nums text-ink">{record}</span>
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {PILLAR_KEYS.map((pillar) => {
              const p = todayScore.pillars[pillar]
              return (
                <Link
                  key={pillar}
                  href={PILLAR_LINKS[pillar]}
                  prefetch={true}
                  className={cn(
                    "rounded-xl px-2 py-2 text-center transition-all active:scale-95",
                    p.points === 25
                      ? "gold-fill shadow-sm shadow-gold/25"
                      : p.points > 0
                        ? "bg-gold/15 text-gold-dark"
                        : "bg-secondary text-muted-foreground"
                  )}
                >
                  <span className="block text-[11px] font-medium">
                    {d.pillars[pillar]}
                  </span>
                  <span className="block text-sm font-bold tabular-nums">
                    {p.points}
                  </span>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <OneMoveCard
        oneMoveId={oneMoveRow?.id ?? null}
        oneMove={oneMove}
        suggestion={suggestion}
        workspaceId={active.id}
      />

      {/* Points on the table — the reward menu. Every line is a reason
          to open a section right now. */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gold-dark">
            {d.today.missingTitle}
          </p>
          {gaps.length === 0 ? (
            <p className="mt-2 text-sm font-semibold text-gold-dark">
              {d.today.missingDone}
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {gaps.slice(0, 3).map((gap) => (
                <li key={`${gap.pillar}-${gap.kind}`}>
                  <Link
                    href={PILLAR_LINKS[gap.pillar]}
                    prefetch={true}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5 text-sm transition-colors hover:bg-gold/[0.04] active:scale-[0.99]"
                  >
                    <span className="min-w-0 flex-1 text-ink">
                      <span className="font-bold tabular-nums text-gold-dark">
                        +{gap.points}
                      </span>{" "}
                      {gapHint(gap.pillar, gap.kind)}
                    </span>
                    <ArrowRightIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <CloseDayCard
        closeId={closeRow?.id ?? null}
        close={close}
        score={score}
        streakDays={streakDays}
        pillarsDone={pillarsDone}
        workspaceId={active.id}
        insight={insight}
      />

      {/* Active project one-liner + the three header destinations. */}
      {build && (
        <Link
          href="/build"
          prefetch={true}
          className="surface flex items-center justify-between gap-3 px-4 py-3 active:scale-[0.99]"
        >
          <span className="flex min-w-0 items-center gap-2 text-sm">
            <RocketIcon className="h-4 w-4 shrink-0 text-gold-dark" />
            <span className="truncate font-semibold text-ink">
              {build.name}
            </span>
            {build.next_action && (
              <span className="hidden truncate text-muted-foreground sm:inline">
                · {build.next_action}
              </span>
            )}
          </span>
          <ArrowRightIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
      )}

      <div className="grid grid-cols-3 gap-2">
        {[
          { href: "/nexa", label: d.today.askNexa, icon: ChatBubbleIcon },
          { href: "/money", label: d.money.title, icon: BarChartIcon },
          { href: "/review", label: d.today.weeklyReview, icon: TargetIcon },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            prefetch={true}
            className="surface flex flex-col items-center gap-1.5 px-2 py-3.5 text-center active:scale-95"
          >
            <Icon className="h-5 w-5 text-gold-dark" />
            <span className="text-xs font-medium text-ink">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
