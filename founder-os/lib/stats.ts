import { daysAgo, isoDate, today } from "@/lib/dates"
import type { Log, Transaction } from "@/types/db"

// All scores in Nexa are computed in plain code — AI never runs for these.

export const BODY_TYPES = ["body", "fitness"]
export const MIND_TYPES = ["mind", "learning"]

export type Pillar = "body" | "mind" | "build" | "money"

export type MissionEntry = { text?: string; done?: boolean }
export type MissionData = Partial<Record<Pillar, MissionEntry>>

// Evidence: what today's raw data already proves, mission aside.
export function pillarEvidence(
  logs: Log[],
  transactions: Transaction[]
): Record<Pillar, boolean> {
  const todayDate = today()
  const todays = logs.filter((l) => l.date === todayDate)
  const dailyDone = todays.some(
    (l) =>
      l.type === "daily" &&
      (l.data as { top_action_done?: boolean })?.top_action_done === true
  )
  return {
    body: todays.some((l) => BODY_TYPES.includes(l.type)),
    mind: todays.some((l) => MIND_TYPES.includes(l.type)),
    build: todays.some((l) => l.type === "build") || dailyDone,
    money: transactions.some((t) => t.date === todayDate),
  }
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

// Weekly pillar score: active days out of 7, expressed as 0-10.
export function weekPillarScore(activeDays: number): number {
  return Math.round((Math.min(activeDays, 7) / 7) * 10)
}
