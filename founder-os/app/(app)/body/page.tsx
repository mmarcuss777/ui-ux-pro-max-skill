import Link from "next/link"

import { CsvDialog } from "@/components/connect-actions"
import { DeleteEntry } from "@/components/delete-entry"
import { PrimaryCta } from "@/components/primary-cta"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { daysAgo, shortDate, today } from "@/lib/dates"
import { getT } from "@/lib/i18n-server"
import { connectedPillars, scoreDay } from "@/lib/score"
import { BODY_TYPES, type MetricSlim } from "@/lib/stats"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"
import { cn } from "@/lib/utils"
import type { Log, Profile } from "@/types/db"

// Body — "training can't be talked around". Weekly volume from measured
// (Garmin) + manual entries merged into one picture, the bar from the
// profile, and a 4-week consistency grid. Garmin connects right here;
// the connect card disappears the moment it's done.
export default async function BodyPage() {
  const supabase = createClient()
  const { d, locale } = getT()
  const workspaces = await getWorkspaces()
  const active = resolveActiveWorkspace(workspaces)!
  const todayDate = today()

  const [
    { data },
    { data: metricRows },
    { data: integrations },
    { data: profileRows },
  ] = await Promise.all([
    supabase
      .from("logs")
      .select("*")
      .in("type", BODY_TYPES)
      .gte("date", daysAgo(90))
      .order("date", { ascending: false }),
    supabase
      .from("imported_metrics")
      .select("date,metric,value")
      .in("metric", ["workouts", "active_minutes", "distance", "steps"])
      .gte("date", daysAgo(27)),
    supabase.from("integrations").select("provider,status"),
    supabase.from("profiles").select("*").limit(1),
  ])

  const logs: Log[] = data ?? []
  const metrics: MetricSlim[] = metricRows ?? []
  const profile: Profile | null = profileRows?.[0] ?? null
  const target = profile?.training_per_week ?? 4
  const garminConnected = (integrations ?? []).some(
    (i) => i.provider === "garmin" && i.status !== "disconnected"
  )

  // Today's Body points + what's missing — the score, explained locally.
  const connected = connectedPillars(integrations ?? [])
  const bodyToday = scoreDay(todayDate, logs, [], metrics, connected).pillars
    .body

  // Daily helpers over the merged picture (manual + measured, no
  // double-counting: a day's trainings = the larger of the two).
  const manualDates = new Map<string, number>()
  for (const log of logs) {
    manualDates.set(log.date, (manualDates.get(log.date) ?? 0) + 1)
  }
  const metricOn = (date: string, name: string) =>
    metrics.find((m) => m.date === date && m.metric === name)?.value ?? 0
  const trainingsOn = (date: string) =>
    Math.max(manualDates.get(date) ?? 0, metricOn(date, "workouts"))

  // Weekly volume: rolling 7 days vs the 7 before.
  const range = (from: number, to: number) => {
    const dates: string[] = []
    for (let i = from; i <= to; i++) dates.push(daysAgo(i))
    return dates
  }
  const sumOver = (dates: string[], fn: (date: string) => number) =>
    dates.reduce((sum, date) => sum + fn(date), 0)
  const thisWeekDates = range(0, 6)
  const prevWeekDates = range(7, 13)

  const volume = [
    {
      key: "trainings",
      label: d.body.tTrainings,
      current: sumOver(thisWeekDates, trainingsOn),
      previous: sumOver(prevWeekDates, trainingsOn),
      always: true,
    },
    {
      key: "minutes",
      label: d.body.tMinutes,
      current: sumOver(thisWeekDates, (date) => metricOn(date, "active_minutes")),
      previous: sumOver(prevWeekDates, (date) => metricOn(date, "active_minutes")),
      always: false,
    },
    {
      key: "km",
      label: d.body.tKm,
      current:
        Math.round(sumOver(thisWeekDates, (date) => metricOn(date, "distance")) * 10) / 10,
      previous:
        Math.round(sumOver(prevWeekDates, (date) => metricOn(date, "distance")) * 10) / 10,
      always: false,
    },
    {
      key: "steps",
      label: d.body.tSteps,
      current: Math.round(sumOver(thisWeekDates, (date) => metricOn(date, "steps")) / 7),
      previous: Math.round(sumOver(prevWeekDates, (date) => metricOn(date, "steps")) / 7),
      always: false,
    },
  ].filter((tile) => tile.always || tile.current > 0 || tile.previous > 0)

  // The bar: trainings in the current calendar week (Mon–Sun) vs the
  // target from the profile.
  const now = new Date()
  const weekdayIndex = (now.getDay() + 6) % 7 // Mon = 0
  const weekDates = range(0, weekdayIndex)
  const weekCount = sumOver(weekDates, (date) => (trainingsOn(date) > 0 ? 1 : 0))
  const daysLeft = 6 - weekdayIndex
  const barHit = weekCount >= target

  // Merged history: manual entries (deletable) + measured days.
  type HistoryItem = {
    key: string
    date: string
    text: string
    logId: string | null
    measured: boolean
  }
  const items: HistoryItem[] = logs.slice(0, 14).map((log) => ({
    key: log.id,
    date: log.date,
    text: (log.data as { note?: string })?.note || "—",
    logId: log.id,
    measured: false,
  }))
  const measuredDays = new Set(
    metrics.filter((m) => m.metric === "workouts" && m.value > 0).map((m) => m.date)
  )
  for (const date of Array.from(measuredDays)) {
    const minutes = metricOn(date, "active_minutes")
    const km = metricOn(date, "distance")
    const parts = [
      `${metricOn(date, "workouts")}× ${d.body.tTrainings}`,
      minutes > 0 ? `${Math.round(minutes)} min` : null,
      km > 0 ? `${Math.round(km * 10) / 10} km` : null,
    ].filter(Boolean)
    items.push({
      key: `m-${date}`,
      date,
      text: parts.join(" · "),
      logId: null,
      measured: true,
    })
  }
  const history = items
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 10)

  // Consistency: last 28 days, oldest first.
  const gridDays = range(0, 27)
    .reverse()
    .map((date) => ({ date, active: trainingsOn(date) > 0 }))

  const measuredToday = metricOn(todayDate, "workouts") > 0

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{d.body.title}</h1>
          <p className="text-sm text-muted-foreground">{d.body.subtitle}</p>
        </div>
        <PrimaryCta asChild>
          <Link href="/log">{d.body.cta}</Link>
        </PrimaryCta>
      </div>

      {/* Today's points — the score explained where the action happens. */}
      <Card className={cn(bodyToday.points === 25 && "animate-glow border-gold/40")}>
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {d.body.pointsToday}
            </p>
            <p className="mt-0.5 text-sm text-ink">
              {bodyToday.points === 25
                ? d.body.pointsFull
                : bodyToday.points === 15
                  ? d.today.gap_body_proof
                  : d.today.gap_body_action}
            </p>
          </div>
          <p
            className={cn(
              "shrink-0 text-2xl font-bold tabular-nums",
              bodyToday.points === 25 ? "text-gold-dark" : "text-ink"
            )}
          >
            {bodyToday.points}
            <span className="text-sm font-normal text-muted-foreground">/25</span>
          </p>
        </CardContent>
      </Card>

      {/* The bar — target from the profile, celebrated when cleared. */}
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5",
          barHit
            ? "gold-fill animate-pop border-transparent shadow-md shadow-gold/25"
            : "border-gold/25 bg-gold/[0.07]"
        )}
      >
        <p className="text-sm font-medium">
          {barHit ? (
            d.body.barHit
          ) : (
            <>
              <span className="text-muted-foreground">{d.body.barTitle}: </span>
              <span className="font-bold tabular-nums text-ink">
                {weekCount}/{target}
              </span>
              <span className="text-muted-foreground">
                {" "}· {daysLeft} {d.body.barLeft}
              </span>
            </>
          )}
        </p>
        {!barHit && (
          <Link
            href="/profile"
            className="shrink-0 text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            {d.common.edit}
          </Link>
        )}
      </div>

      {/* Garmin, right here — gone the moment it's connected. */}
      {!garminConnected && (
        <Card className="border-gold/25">
          <CardContent className="space-y-2.5 p-4">
            <p className="text-sm font-semibold text-ink">
              {d.body.garminTitle}
            </p>
            <p className="text-xs text-muted-foreground">
              {d.body.garminText}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <CsvDialog workspaceId={active.id} kind="fitness" />
              <Link
                href="/connect"
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                {d.body.garminMore}
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly volume — what a productive person knows about themselves. */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold-dark">
              {d.body.volumeTitle}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {d.buildPage.vsLastWeek}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {volume.map((tile) => {
              const up = tile.current >= tile.previous
              const delta =
                tile.previous === 0
                  ? null
                  : Math.round(
                      ((tile.current - tile.previous) / tile.previous) * 100
                    )
              return (
                <div key={tile.key}>
                  <p className="text-xs text-muted-foreground">{tile.label}</p>
                  <p className="text-lg font-bold tabular-nums text-ink">
                    {tile.current}
                  </p>
                  <p
                    className={
                      delta === null || delta === 0
                        ? "text-xs text-muted-foreground"
                        : up
                          ? "text-xs font-medium text-ok"
                          : "text-xs font-medium text-danger"
                    }
                  >
                    {delta === null
                      ? d.buildPage.newSignal
                      : `${up ? "▲" : "▼"} ${Math.abs(delta)} %`}
                  </p>
                </div>
              )
            })}
          </div>
          {measuredToday && (
            <p className="mt-3 text-xs font-medium text-gold-dark">
              {d.body.measuredToday}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Consistency — 4 weeks of dots. No heroic Mondays, no dead days. */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {d.body.consistency}
          </p>
          <div className="mt-3 grid grid-cols-7 gap-1.5">
            {gridDays.map((day) => (
              <span
                key={day.date}
                title={day.date}
                className={cn(
                  "h-6 rounded-md",
                  day.active ? "gold-fill" : "bg-secondary",
                  day.date === todayDate && "ring-2 ring-gold/50"
                )}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{d.body.recent}</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">{d.body.empty}</p>
          ) : (
            <ul className="divide-y divide-line">
              {history.map((item) => (
                <li key={item.key} className="flex items-center gap-3 py-3">
                  <span className="w-14 shrink-0 text-xs tabular-nums text-muted-foreground">
                    {item.date === todayDate
                      ? d.common.todayWord
                      : item.date === daysAgo(1)
                        ? d.common.yesterdayWord
                        : shortDate(item.date, locale)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">
                    {item.text}
                  </span>
                  {item.measured ? (
                    <span className="shrink-0 rounded-full border border-gold/30 px-2 py-0.5 text-[10px] font-medium text-gold-dark">
                      {d.body.measuredTag}
                    </span>
                  ) : (
                    item.logId && <DeleteEntry table="logs" id={item.logId} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
