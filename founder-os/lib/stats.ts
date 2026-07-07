import { daysAgo, isoDate, today } from "@/lib/dates"
import type { CloseDayData, MissionData, Pillar } from "@/lib/log-schema"
import type { Log } from "@/types/db"

// All scores in Nexa are computed in plain code — AI never runs for these.

// Log shapes live in lib/log-schema.ts; re-exported here so existing
// imports (`from "@/lib/stats"`) keep working.
export type { MissionData, MissionEntry, Pillar } from "@/lib/log-schema"

export const BODY_TYPES = ["body", "fitness"]
export const MIND_TYPES = ["mind", "learning"]

// Log types that count as *doing something* — planning rows (mission,
// one_move) don't start the day; an actual entry does.
export const ACTION_LOG_TYPES = [
  ...BODY_TYPES,
  ...MIND_TYPES,
  "daily",
  "build",
  "close_day",
]

// Minimal row shapes: streak/evidence math only needs dates and types, so
// pages can fetch slim `select("date,type")` payloads instead of full rows
// (a month of jsonb data was the heaviest part of the dashboard load).
type DatedRow = { date: string }
type TypedRow = { date: string; type: string }

// Rows with data are needed wherever jsonb flags matter (top_action_done,
// close-day lesson); Log satisfies this shape.
type DataRow = { date: string; type: string; data: unknown }

// Evidence for a given date: what that day's raw data proves, mission aside.
export function pillarEvidenceFor(
  date: string,
  logs: DataRow[],
  transactions: DatedRow[]
): Record<Pillar, boolean> {
  const days = logs.filter((l) => l.date === date)
  const dailyDone = days.some(
    (l) =>
      l.type === "daily" &&
      (l.data as { top_action_done?: boolean })?.top_action_done === true
  )
  // Closing the day with a written lesson is mind work — reward it.
  const closeLesson = days.some(
    (l) =>
      l.type === "close_day" &&
      ((l.data as CloseDayData)?.lesson ?? "").trim() !== ""
  )
  return {
    body: days.some((l) => BODY_TYPES.includes(l.type)),
    mind: days.some((l) => MIND_TYPES.includes(l.type)) || closeLesson,
    build: days.some((l) => l.type === "build") || dailyDone,
    money: transactions.some((t) => t.date === date),
  }
}

// Evidence: what today's raw data already proves, mission aside.
export function pillarEvidence(
  logs: Log[],
  transactions: DatedRow[]
): Record<Pillar, boolean> {
  return pillarEvidenceFor(today(), logs, transactions)
}

export function pillarComplete(
  mission: MissionData | null,
  evidence: Record<Pillar, boolean>
): Record<Pillar, boolean> {
  const result = {} as Record<Pillar, boolean>
  for (const pillar of ["body", "mind", "build", "money"] as Pillar[]) {
    result[pillar] = mission?.[pillar]?.done === true || evidence[pillar]
  }
  return result
}

export function dailyScore(complete: Record<Pillar, boolean>): number {
  return Object.values(complete).filter(Boolean).length * 25
}

// Every date on which the user actually did something (log or money).
export function actionDates(
  logs: TypedRow[],
  transactions: DatedRow[]
): Set<string> {
  const dates = new Set<string>()
  for (const log of logs)
    if (ACTION_LOG_TYPES.includes(log.type)) dates.add(log.date)
  for (const tx of transactions) dates.add(tx.date)
  return dates
}

// "Not started yet" state: true once the first real action lands today.
export function dayStarted(
  logs: TypedRow[],
  transactions: DatedRow[]
): boolean {
  return actionDates(logs, transactions).has(today())
}

// Consecutive days (ending today, or yesterday if today is still empty)
// on which `dates` contains an entry.
export function streak(dates: Set<string>): number {
  let count = 0
  const offset = dates.has(today()) ? 0 : 1
  for (;;) {
    const date = daysAgo(offset + count)
    if (dates.has(date)) count++
    else break
  }
  return count
}

// Each fully active past week (Mon–Sun, 7/7 days) earns one streak
// shield, capped at two. Checked over the last four completed weeks.
export function earnedShields(dates: Set<string>): number {
  let count = 0
  const thisMonday = new Date()
  thisMonday.setDate(thisMonday.getDate() - ((thisMonday.getDay() + 6) % 7))
  for (let week = 1; week <= 4; week++) {
    let full = true
    for (let i = 0; i < 7; i++) {
      const day = new Date(thisMonday)
      day.setDate(day.getDate() - 7 * week + i)
      if (!dates.has(isoDate(day))) {
        full = false
        break
      }
    }
    if (full) count++
  }
  return Math.min(2, count)
}

// Streak with shields: a shield silently covers ONE missed day (never two
// in a row) so a single bad day can't kill the chain — Duolingo's
// streak-freeze insight: easier streaks retain longer. Pure function of
// history; nothing to store.
export function streakWithShields(dates: Set<string>): {
  streak: number
  shieldsLeft: number
} {
  let shieldsLeft = earnedShields(dates)
  let count = 0
  let index = dates.has(today()) ? 0 : 1
  for (;;) {
    const date = daysAgo(index)
    if (dates.has(date)) {
      count++
      index++
    } else if (shieldsLeft > 0 && dates.has(daysAgo(index + 1))) {
      // Gap of exactly one day with the chain continuing behind it —
      // consume a shield and keep counting.
      shieldsLeft--
      count++
      index++
    } else {
      break
    }
  }
  return { streak: count, shieldsLeft }
}

// The last 7 days, oldest first, marked active/inactive.
export function weekGrid(dates: Set<string>): { date: string; active: boolean }[] {
  const grid: { date: string; active: boolean }[] = []
  const cursor = new Date()
  cursor.setDate(cursor.getDate() - 6)
  for (let i = 0; i < 7; i++) {
    const date = isoDate(cursor)
    grid.push({ date, active: dates.has(date) })
    cursor.setDate(cursor.getDate() + 1)
  }
  return grid
}

// Distinct days in the last 7 on which a given pillar was active.
export function weekPillarDays(
  logs: TypedRow[],
  transactions: DatedRow[],
  pillar: Pillar
): number {
  const weekAgo = daysAgo(6)
  const dates = new Set<string>()
  if (pillar === "money") {
    for (const tx of transactions) if (tx.date >= weekAgo) dates.add(tx.date)
    return dates.size
  }
  const types =
    pillar === "body" ? BODY_TYPES : pillar === "mind" ? MIND_TYPES : ["build"]
  for (const log of logs)
    if (log.date >= weekAgo && types.includes(log.type)) dates.add(log.date)
  return dates.size
}

// ---- Imported metrics (integrations) ---------------------------------
// External data lights pillars the same way manual logs do, so the day
// counts even when nothing was typed by hand.

export type MetricSlim = { date: string; metric: string; value: number }

export function metricPillars(
  metrics: MetricSlim[],
  date: string
): Partial<Record<Pillar, boolean>> {
  const day = metrics.filter((m) => m.date === date)
  const value = (name: string) => day.find((m) => m.metric === name)?.value ?? 0
  return {
    body:
      value("workouts") > 0 ||
      value("steps") >= 8000 ||
      value("active_minutes") >= 30,
    mind:
      value("focus_minutes") >= 25 || value("productive_minutes") >= 25,
    build:
      value("orders") > 0 ||
      value("revenue") > 0 ||
      value("sessions") >= 25 ||
      value("commits") > 0,
    money: value("revenue") > 0 || Math.abs(value("net_cashflow")) > 0,
  }
}

// Days on which imported data alone proves real action (for streaks).
export function metricActionDates(metrics: MetricSlim[]): Set<string> {
  const dates = new Set<string>()
  for (const m of metrics) {
    if (
      (m.metric === "workouts" && m.value > 0) ||
      (m.metric === "steps" && m.value >= 8000) ||
      (m.metric === "orders" && m.value > 0) ||
      (m.metric === "revenue" && m.value > 0) ||
      (m.metric === "commits" && m.value > 0) ||
      (m.metric === "focus_minutes" && m.value >= 25) ||
      (m.metric === "productive_minutes" && m.value >= 25)
    ) {
      dates.add(m.date)
    }
  }
  return dates
}

// Weekly pillar score: active days out of 7, expressed as 0-10.
export function weekPillarScore(activeDays: number): number {
  return Math.round((Math.min(activeDays, 7) / 7) * 10)
}
