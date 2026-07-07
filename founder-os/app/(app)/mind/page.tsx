import { DeleteEntry } from "@/components/delete-entry"
import { MindConnectRow } from "@/components/mind-connect"
import { MindFormDialog } from "@/components/mind-form-dialog"
import { ScreenTimeUploader } from "@/components/screen-time-uploader"
import { Card, CardContent } from "@/components/ui/card"
import { daysAgo, shortDate, today } from "@/lib/dates"
import { getT } from "@/lib/i18n-server"
import type { CloseDayData, MindData } from "@/lib/log-schema"
import { connectedPillars, scoreDay } from "@/lib/score"
import { MIND_TYPES, type MetricSlim } from "@/lib/stats"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"
import { cn } from "@/lib/utils"
import type { Log, Profile } from "@/types/db"

type ScreenData = {
  total_minutes?: number | null
  wasted_minutes?: number | null
  top_apps?: { name: string; minutes: number }[]
  analysis?: string
}

function formatMinutes(minutes: number | null | undefined): string {
  if (typeof minutes !== "number") return "—"
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return hours > 0 ? `${hours} h ${rest} min` : `${rest} min`
}

// Mind — "focus can't be talked around, lessons must not be lost".
// One pulling hero (today's focus vs the profile bar), an in-place
// connector row, the lesson echo (your own insight, returned), one
// numbers card, and the lesson history. Screen time folds away below.
export default async function MindPage() {
  const supabase = createClient()
  const { d, locale } = getT()
  const workspaces = await getWorkspaces()
  const active = resolveActiveWorkspace(workspaces)!
  const todayDate = today()

  const [
    { data: mindRows },
    { data: metricRows },
    { data: integrations },
    { data: profileRows },
    { data: screenLogs },
  ] = await Promise.all([
    supabase
      .from("logs")
      .select("*")
      .in("type", [...MIND_TYPES, "close_day"])
      .gte("date", daysAgo(90))
      .order("date", { ascending: false }),
    supabase
      .from("imported_metrics")
      .select("date,metric,value")
      .in("metric", ["focus_minutes", "productive_minutes"])
      .gte("date", daysAgo(27)),
    supabase.from("integrations").select("provider,status"),
    supabase.from("profiles").select("*").limit(1),
    supabase
      .from("logs")
      .select("*")
      .eq("type", "screen_time")
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  const allLogs: Log[] = mindRows ?? []
  const mindLogs = allLogs.filter((l) => MIND_TYPES.includes(l.type))
  const metrics: MetricSlim[] = metricRows ?? []
  const profile: Profile | null = profileRows?.[0] ?? null
  const target = profile?.focus_minutes_per_day ?? 25
  const mindConnected = (integrations ?? []).some(
    (i) =>
      ["toggl", "rescuetime"].includes(i.provider) &&
      i.status !== "disconnected"
  )

  // Today's Mind points, same engine as everywhere.
  const connected = connectedPillars(integrations ?? [])
  const mindToday = scoreDay(todayDate, allLogs, [], metrics, connected)
    .pillars.mind

  // Focus minutes per day: measurement wins once a source is connected;
  // until then, claimed learning minutes count (mirrors the score rule).
  const measuredOn = (date: string) =>
    Math.max(
      metrics.find((m) => m.date === date && m.metric === "focus_minutes")
        ?.value ?? 0,
      metrics.find((m) => m.date === date && m.metric === "productive_minutes")
        ?.value ?? 0
    )
  const claimedOn = (date: string) =>
    mindLogs
      .filter((l) => l.date === date)
      .reduce(
        (sum, l) => sum + ((l.data as MindData)?.learning_minutes ?? 0),
        0
      )
  const focusOn = (date: string) =>
    mindConnected
      ? measuredOn(date)
      : Math.max(measuredOn(date), claimedOn(date))

  const focusToday = Math.round(focusOn(todayDate))
  const pct = Math.min(100, Math.round((focusToday / target) * 100))
  const barHit = focusToday >= target
  const remaining = Math.max(0, target - focusToday)

  // Lesson pool: journal lessons + close-day lessons.
  type LessonRow = { date: string; text: string }
  const lessons: LessonRow[] = allLogs
    .map((log) => {
      const data = (log.data ?? {}) as MindData & CloseDayData
      const text = (data.lesson ?? "").trim()
      return text ? { date: log.date, text } : null
    })
    .filter((l): l is LessonRow => l !== null)

  // The echo: one of YOUR older lessons, chosen deterministically per
  // day — the system remembers what you learned until it sticks.
  const echoPool = lessons.filter((l) => l.date <= daysAgo(7))
  const dayNumber = Math.floor(new Date(todayDate).getTime() / 86_400_000)
  const echo =
    echoPool.length > 0 ? echoPool[dayNumber % echoPool.length] : null
  const echoDaysAgo = echo
    ? Math.round(
        (new Date(todayDate).getTime() - new Date(echo.date).getTime()) /
          86_400_000
      )
    : 0

  // Numbers: focus minutes + lessons, week vs week; best focus day.
  const range = (from: number, to: number) => {
    const dates: string[] = []
    for (let i = from; i <= to; i++) dates.push(daysAgo(i))
    return dates
  }
  const sumOver = (dates: string[], fn: (date: string) => number) =>
    dates.reduce((sum, date) => sum + fn(date), 0)
  const thisWeekDates = range(0, 6)
  const prevWeekDates = range(7, 13)
  const lessonsOn = (date: string) =>
    lessons.filter((l) => l.date === date).length
  const tiles = [
    {
      key: "focus",
      label: d.mind.tFocusMin,
      current: Math.round(sumOver(thisWeekDates, focusOn)),
      previous: Math.round(sumOver(prevWeekDates, focusOn)),
      delta: true,
    },
    {
      key: "lessons",
      label: d.mind.tLessons,
      current: sumOver(thisWeekDates, lessonsOn),
      previous: sumOver(prevWeekDates, lessonsOn),
      delta: true,
    },
    {
      key: "best",
      label: d.mind.tBest,
      current: Math.round(Math.max(...thisWeekDates.map(focusOn))),
      previous: 0,
      delta: false,
    },
  ]

  // Consistency: a day lights when a lesson landed or focus hit 25 min.
  const activeOn = (date: string) => lessonsOn(date) > 0 || focusOn(date) >= 25
  const gridDays = range(0, 27)
    .reverse()
    .map((date) => ({ date, active: activeOn(date) }))

  const history = mindLogs.slice(0, 6)
  const analyses: Log[] = screenLogs ?? []

  const todayLine =
    mindToday.points === 25
      ? d.mind.todayFull
      : mindToday.points === 15
        ? d.mind.todayProof
        : d.mind.todayNone

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{d.mind.title}</h1>
          <p className="text-sm text-muted-foreground">{d.mind.subtitle}</p>
        </div>
        <MindFormDialog workspaceId={active.id} />
      </div>

      {/* The hero: today's focus filling toward the bar. */}
      <div
        className={cn(
          "rounded-2xl bg-gradient-to-br from-gold-light via-gold/40 to-gold-dark/50 p-px shadow-lg shadow-gold/15",
          barHit && "animate-glow"
        )}
      >
        <div className="rounded-[calc(1rem-1px)] bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gold-dark">
            {d.mind.barTitle}
          </p>
          <div className="mt-3 flex items-center gap-4">
            <p className="shrink-0 text-4xl font-bold tabular-nums text-ink">
              {focusToday}
              <span className="text-xl text-muted-foreground">
                /{target} min
              </span>
            </p>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn("gold-fill h-full rounded-full", barHit && "animate-pop")}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <p className="mt-3 text-sm font-medium">
            {barHit ? (
              <span className="text-gold-dark">{d.mind.barHit}</span>
            ) : (
              <span className="text-ink">
                {remaining} {d.mind.barLeftMin}
              </span>
            )}
          </p>
          <p
            className={cn(
              "mt-1 text-xs",
              mindToday.points === 25
                ? "font-medium text-gold-dark"
                : "text-muted-foreground"
            )}
          >
            {todayLine}
          </p>
        </div>
      </div>

      {/* Toggl / RescueTime — one row, gone once connected. */}
      {!mindConnected && <MindConnectRow />}

      {/* The echo: your own lesson, returned until it sticks. */}
      <Card className="border-gold/25 bg-gold/[0.04]">
        <CardContent className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gold-dark">
            {d.mind.echoTitle}
          </p>
          {echo ? (
            <>
              <p className="mt-2 text-base font-semibold leading-snug text-ink">
                „{echo.text}“
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {d.mind.echoPre} {echoDaysAgo} {d.mind.echoPost}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              {d.mind.echoEmpty}
            </p>
          )}
        </CardContent>
      </Card>

      {/* One numbers card: three tiles + the 4-week grid. */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-3">
            {tiles.map((tile) => {
              const up = tile.current >= tile.previous
              const delta =
                !tile.delta || tile.previous === 0
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

      {/* Lesson history — short, deletable. */}
      {history.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <ul className="divide-y divide-line">
              {history.map((log) => {
                const data = (log.data ?? {}) as MindData
                const chips: string[] = []
                if (typeof data.focus === "number")
                  chips.push(`${data.focus}/5 ${d.mind.focusShort}`)
                if (typeof data.learning_minutes === "number")
                  chips.push(`${data.learning_minutes} ${d.mind.minutesShort}`)
                return (
                  <li key={log.id} className="flex items-center gap-3 py-2.5">
                    <span className="w-14 shrink-0 text-xs tabular-nums text-muted-foreground">
                      {log.date === todayDate
                        ? d.common.todayWord
                        : log.date === daysAgo(1)
                          ? d.common.yesterdayWord
                          : shortDate(log.date, locale)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">
                      {data.lesson || data.note || "—"}
                    </span>
                    {chips.length > 0 && (
                      <span className="shrink-0 rounded-full bg-gold/10 px-2 py-0.5 text-[11px] font-medium tabular-nums text-gold-dark">
                        {chips.join(" · ")}
                      </span>
                    )}
                    <DeleteEntry table="logs" id={log.id} />
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Screen time — folded away until wanted. */}
      <details className="group rounded-2xl border border-line bg-card">
        <summary className="cursor-pointer list-none px-4 py-3.5 text-sm font-medium text-ink transition-colors hover:bg-gold/[0.04]">
          {d.mind.screenRow}
          <span className="float-right text-muted-foreground transition-transform group-open:rotate-180">
            ⌄
          </span>
        </summary>
        <div className="space-y-4 border-t border-line p-4">
          <p className="text-xs text-muted-foreground">{d.screen.howTo}</p>
          <ScreenTimeUploader />
          {analyses.length > 0 && (
            <ul className="divide-y divide-line">
              {analyses.map((entry) => {
                const data = (entry.data ?? {}) as ScreenData
                return (
                  <li key={entry.id} className="space-y-2 py-3">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className="text-muted-foreground">
                        {entry.date}
                      </span>
                      <span>
                        {d.screen.total}:{" "}
                        <span className="font-semibold tabular-nums text-ink">
                          {formatMinutes(data.total_minutes)}
                        </span>
                      </span>
                      <span>
                        {d.screen.reclaimable}:{" "}
                        <span className="font-semibold tabular-nums text-gold-dark">
                          {formatMinutes(data.wasted_minutes)}
                        </span>
                      </span>
                    </div>
                    {data.analysis && (
                      <details>
                        <summary className="cursor-pointer text-xs font-medium text-gold-dark">
                          {d.screen.analyze}
                        </summary>
                        <pre className="mt-2 whitespace-pre-wrap font-sans text-xs text-muted-foreground">
                          {data.analysis}
                        </pre>
                      </details>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </details>
    </div>
  )
}
