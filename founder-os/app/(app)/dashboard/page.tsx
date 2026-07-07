import Link from "next/link"
import {
  ArrowRightIcon,
  BarChartIcon,
  LightningBoltIcon,
  RocketIcon,
  TargetIcon,
} from "@radix-ui/react-icons"

import { RemindersCard } from "@/components/reminders-card"

import { CloseDayCard } from "@/components/close-day-card"
import { CurrentBuildCard } from "@/components/current-build-card"
import { MissionPanel } from "@/components/mission-panel"
import { OneMoveCard } from "@/components/one-move-card"
import { ScoreRing } from "@/components/score-ring"
import { Card, CardContent } from "@/components/ui/card"
import { daysAgo, today } from "@/lib/dates"
import { getT } from "@/lib/i18n-server"
import type {
  CloseDayData,
  MissionData,
  OneMoveData,
  WeeklyResetData,
} from "@/lib/log-schema"
import { daysLabel } from "@/lib/plural"
import {
  actionDates,
  dailyScore,
  dayStarted,
  pillarComplete,
  pillarEvidence,
  streak,
  type Pillar,
} from "@/lib/stats"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"
import { cn } from "@/lib/utils"
import type { Log } from "@/types/db"

const PILLAR_KEYS: Pillar[] = ["body", "mind", "build", "money"]

export default async function TodayPage() {
  const supabase = createClient()
  const { locale, d } = getT()
  const workspaces = await getWorkspaces()
  const active = resolveActiveWorkspace(workspaces)!
  const todayDate = today()
  // A month of history feeds the streak; today's slice feeds the score.
  const monthAgo = daysAgo(29)

  // Slim payloads: today's rows in full (the score needs their data), a
  // month of bare date+type pairs for the streak, and only the last week
  // of close/reset rows (suggestion + week focus). Fetching a month of
  // full jsonb rows was the heaviest part of this page.
  const [
    { data: todayRows },
    { data: monthMeta },
    { data: recentSpecial },
    { data: transactions },
    { data: builds },
    { data: overdueExperiments },
  ] = await Promise.all([
    supabase.from("logs").select("*").eq("date", todayDate),
    supabase.from("logs").select("date,type").gte("date", monthAgo),
    supabase
      .from("logs")
      .select("*")
      .in("type", ["close_day", "weekly_reset"])
      .gte("date", daysAgo(8))
      .order("date", { ascending: false }),
    supabase.from("transactions").select("date").gte("date", monthAgo),
    supabase
      .from("builds")
      .select("*")
      .eq("workspace_id", active.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("experiments")
      .select("id")
      .eq("workspace_id", active.id)
      .neq("status", "decided")
      .not("deadline", "is", null)
      .lt("deadline", todayDate),
  ])

  const todayLogs: Log[] = todayRows ?? []
  const monthLogs = monthMeta ?? []
  const specialLogs: Log[] = recentSpecial ?? []
  const txDates = transactions ?? []
  const todayTx = txDates.filter((t) => t.date === todayDate)
  const build = builds?.[0] ?? null

  const missionRow = todayLogs.find((l) => l.type === "mission") ?? null
  const mission = missionRow ? ((missionRow.data ?? {}) as MissionData) : null
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

  // The focus set at the last Weekly Reset follows the user all week.
  const lastReset = specialLogs.find((l) => l.type === "weekly_reset")
  const weekFocus =
    ((lastReset?.data as WeeklyResetData | undefined)?.focus ?? "").trim() ||
    null

  const evidence = pillarEvidence(todayLogs, todayTx)
  const complete = pillarComplete(mission, evidence)
  const score = dailyScore(complete)
  const pillarsDone = Object.values(complete).filter(Boolean).length
  const started = dayStarted(todayLogs, todayTx)
  const streakDays = streak(actionDates(monthLogs, txDates))
  const overdueCount = overdueExperiments?.length ?? 0
  // A streak milestone reached today deserves its own line.
  const milestone = [100, 30, 7].find((m) => streakDays === m) ?? null

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{d.today.title}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString(
              locale === "sk" ? "sk-SK" : "en-GB",
              { weekday: "long", day: "numeric", month: "long" }
            )}
          </p>
        </div>
        {streakDays > 0 && (
          <span className="flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold-dark">
            <LightningBoltIcon className="h-3.5 w-3.5" />
            {d.today.streak}: {daysLabel(streakDays, locale)}
          </span>
        )}
      </div>

      {/* Streak at risk: the loudest line on the page until the first
          action lands. Milestones: the payoff for keeping it. */}
      {!started && streakDays > 0 && (
        <p className="rounded-xl border border-danger/30 bg-danger/[0.06] px-3.5 py-2.5 text-sm font-medium text-danger">
          {d.today.streakRisk}
        </p>
      )}
      {started && milestone && (
        <p className="animate-pop gold-fill rounded-xl px-3.5 py-2.5 text-sm font-semibold">
          {milestone === 100
            ? d.today.milestone100
            : milestone === 30
              ? d.today.milestone30
              : d.today.milestone7}
        </p>
      )}

      {weekFocus && (
        <p className="flex items-center gap-2 rounded-xl border border-gold/25 bg-gold/[0.07] px-3.5 py-2.5 text-sm">
          <TargetIcon className="h-4 w-4 shrink-0 text-gold-dark" />
          <span className="shrink-0 font-medium text-muted-foreground">
            {d.review.weekFocus}:
          </span>
          <span className="min-w-0 truncate font-semibold text-ink">
            {weekFocus}
          </span>
        </p>
      )}

      <OneMoveCard
        oneMoveId={oneMoveRow?.id ?? null}
        oneMove={oneMove}
        suggestion={suggestion}
        workspaceId={active.id}
      />

      <MissionPanel
        missionId={missionRow?.id ?? null}
        mission={mission}
        complete={complete}
        workspaceId={active.id}
      />

      <CurrentBuildCard build={build} showOpen />

      {overdueCount > 0 && (
        <Link
          href="/lab"
          className="flex items-center justify-between rounded-xl border border-danger/25 bg-danger/[0.05] px-3.5 py-2.5 text-sm active:scale-[0.99]"
        >
          <span className="font-medium text-danger">
            {overdueCount} {d.today.overdueLab}
          </span>
          <ArrowRightIcon className="h-4 w-4 shrink-0 text-danger" />
        </Link>
      )}

      <Card className={cn(score === 100 && "animate-glow border-gold/40")}>
        <CardContent className="flex items-center gap-4 p-4">
          {started ? (
            <ScoreRing value={score} size={84} label={d.today.dailyScore} />
          ) : (
            <div
              aria-hidden
              className="flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-full border-2 border-dashed border-line text-xl font-semibold text-muted-foreground"
            >
              —
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {d.today.dailyScore}
            </p>
            {started ? (
              <>
                <p className="mt-0.5 text-sm text-ink">
                  {score === 100 ? (
                    <span className="font-semibold text-gold-dark">
                      {d.today.perfectDay}
                    </span>
                  ) : (
                    <>
                      {pillarsDone}/4 {d.today.pillarsOf}
                    </>
                  )}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PILLAR_KEYS.map((pillar) => (
                    <span
                      key={pillar}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-medium",
                        complete[pillar]
                          ? "bg-gold/15 text-gold-dark"
                          : "bg-secondary text-muted-foreground"
                      )}
                    >
                      {d.pillars[pillar]}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="mt-0.5 text-sm font-medium text-ink">
                  {d.today.notStarted}
                </p>
                <p className="text-xs text-muted-foreground">
                  {d.today.notStartedHint}
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <CloseDayCard
        closeId={closeRow?.id ?? null}
        close={close}
        score={score}
        streakDays={streakDays}
        pillarsDone={pillarsDone}
        workspaceId={active.id}
      />

      <RemindersCard />

      {/* Visible shortcuts to everything that isn't in the dock — nothing
          lives only behind the hamburger menu. */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { href: "/build", label: d.nav.build, icon: RocketIcon },
          { href: "/money", label: d.money.title, icon: BarChartIcon },
          { href: "/review", label: d.today.weeklyReview, icon: TargetIcon },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
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
