import Link from "next/link"

import { CsvDialog } from "@/components/connect-actions"
import { DeleteEntry } from "@/components/delete-entry"
import { PrimaryCta } from "@/components/primary-cta"
import { Card, CardContent } from "@/components/ui/card"
import { daysAgo, shortDate, today } from "@/lib/dates"
import { getT } from "@/lib/i18n-server"
import { connectedPillars, scoreDay } from "@/lib/score"
import { BODY_TYPES, type MetricSlim } from "@/lib/stats"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"
import { cn } from "@/lib/utils"
import type { Log, Profile } from "@/types/db"

// Body — one hero that pulls (the week's bar as filling dots + today's
// state in a single line), one numbers card (volume + consistency), one
// history. Garmin is a single connect row until it's connected.
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

  // Today's Body points — folded into the hero as one line.
  const connected = connectedPillars(integrations ?? [])
  const bodyToday = scoreDay(todayDate, logs, [], metrics, connected).pillars
    .body

  // Merged daily picture (manual + measured, no double-counting).
  const manualDates = new Map<string, number>()
  for (const log of logs) {
    manualDates.set(log.date, (manualDates.get(log.date) ?? 0) + 1)
  }
  const metricOn = (date: string, name: string) =>
    metrics.find((m) => m.date === date && m.metric === name)?.value ?? 0
  const trainingsOn = (date: string) =>
    Math.max(manualDates.get(date) ?? 0, metricOn(date, "workouts"))

  const range = (from: number, to: number) => {
    const dates: string[] = []
    for (let i = from; i <= to; i++) dates.push(daysAgo(i))
    return dates
  }
  const sumOver = (dates: string[], fn: (date: string) => number) =>
    dates.reduce((sum, date) => sum + fn(date), 0)

  // The bar: training days in the current calendar week vs the profile.
  const weekdayIndex = (new Date().getDay() + 6) % 7 // Mon = 0
  const weekCount = sumOver(range(0, weekdayIndex), (date) =>
    trainingsOn(date) > 0 ? 1 : 0
  )
  const daysLeft = 6 - weekdayIndex
  const barHit = weekCount >= target
  const remaining = Math.max(0, target - weekCount)

  // Volume, rolling 7 days vs the 7 before — three numbers, no more.
  const thisWeekDates = range(0, 6)
  const prevWeekDates = range(7, 13)
  const volume = [
    {
      key: "trainings",
      label: d.body.tTrainings,
      current: sumOver(thisWeekDates, trainingsOn),
      previous: sumOver(prevWeekDates, trainingsOn),
    },
    {
      key: "minutes",
      label: d.body.tMinutes,
      current: sumOver(thisWeekDates, (date) => metricOn(date, "active_minutes")),
      previous: sumOver(prevWeekDates, (date) => metricOn(date, "active_minutes")),
    },
    {
      key: "km",
      label: d.body.tKm,
      current:
        Math.round(sumOver(thisWeekDates, (date) => metricOn(date, "distance")) * 10) / 10,
      previous:
        Math.round(sumOver(prevWeekDates, (date) => metricOn(date, "distance")) * 10) / 10,
    },
  ]

  // Merged history: manual entries (deletable) + measured days.
  type HistoryItem = {
    key: string
    date: string
    text: string
    logId: string | null
    measured: boolean
  }
  const items: HistoryItem[] = logs.slice(0, 10).map((log) => ({
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
    .slice(0, 6)

  // Consistency: last 28 days, oldest first.
  const gridDays = range(0, 27)
    .reverse()
    .map((date) => ({ date, active: trainingsOn(date) > 0 }))

  const todayLine =
    bodyToday.points === 25
      ? d.body.todayFull
      : bodyToday.points === 15
        ? d.body.todayProof
        : d.body.todayNone

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

      {/* The hero: the week's bar filling up, today's state in one line.
          This is the whole reason to open the section. */}
      <div
        className={cn(
          "rounded-2xl bg-gradient-to-br from-gold-light via-gold/40 to-gold-dark/50 p-px shadow-lg shadow-gold/15",
          barHit && "animate-glow"
        )}
      >
        <div className="rounded-[calc(1rem-1px)] bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gold-dark">
            {d.body.barTitle}
          </p>
          <div className="mt-3 flex items-center gap-4">
            <p className="text-4xl font-bold tabular-nums text-ink">
              {weekCount}
              <span className="text-xl text-muted-foreground">/{target}</span>
            </p>
            <div className="flex flex-1 gap-1.5">
              {Array.from({ length: target }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-3 flex-1 rounded-full transition-colors",
                    i < weekCount ? "gold-fill" : "bg-secondary",
                    i === weekCount - 1 && "animate-pop"
                  )}
                />
              ))}
            </div>
          </div>
          <p className="mt-3 text-sm font-medium">
            {barHit ? (
              <span className="text-gold-dark">{d.body.barHit}</span>
            ) : (
              <span className="text-ink">
                {remaining} {d.body.barToGo} · {daysLeft} {d.body.barLeft}
              </span>
            )}
          </p>
          <p
            className={cn(
              "mt-1 text-xs",
              bodyToday.points === 25
                ? "font-medium text-gold-dark"
                : "text-muted-foreground"
            )}
          >
            {todayLine}
          </p>
        </div>
      </div>

      {/* Garmin — one row, gone the moment it's connected. */}
      {!garminConnected && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-gold/25 bg-gold/[0.06] px-3.5 py-2.5">
          <p className="min-w-0 text-sm text-ink">{d.body.garminRow}</p>
          <CsvDialog workspaceId={active.id} kind="fitness" />
        </div>
      )}

      {/* One numbers card: three volume tiles + the 4-week dot grid. */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-3">
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
                  <p className="text-xl font-bold tabular-nums text-ink">
                    {tile.current}
                  </p>
                  {delta !== null && delta !== 0 && (
                    <p
                      className={
                        up
                          ? "text-xs font-medium text-ok"
                          : "text-xs font-medium text-danger"
                      }
                    >
                      {up ? "▲" : "▼"} {Math.abs(delta)} %
                    </p>
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-4 border-t border-line pt-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {d.body.consistency}
            </p>
            <div className="mt-2 grid grid-cols-7 gap-1.5">
              {gridDays.map((day) => (
                <span
                  key={day.date}
                  title={day.date}
                  className={cn(
                    "h-5 rounded-md",
                    day.active ? "gold-fill" : "bg-secondary",
                    day.date === todayDate && "ring-2 ring-gold/50"
                  )}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History — short, merged, honest. */}
      {history.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <ul className="divide-y divide-line">
              {history.map((item) => (
                <li key={item.key} className="flex items-center gap-3 py-2.5">
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
