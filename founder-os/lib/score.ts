import { CONNECTORS } from "@/lib/connectors/registry"
import type { CloseDayData, DailyData, MindData } from "@/lib/log-schema"
import {
  BODY_TYPES,
  MIND_TYPES,
  type MetricSlim,
  type Pillar,
} from "@/lib/stats"

// Operator Score — the one number of the app. 4 pillars × 25 points:
// 15 for a real action, +10 for proof. Writing keeps you in the game
// (max 60), performance makes the day elite (100).
//
// The proof rule is adaptive: while a pillar has no connected data
// source, the app trusts the founder's own entry; once a source is
// connected, the +10 only comes from measured data. The app gets
// stricter as it gets smarter.

export const ACTION_POINTS = 15
export const PROOF_POINTS = 10

export type PillarScore = { action: boolean; proof: boolean; points: number }
export type DayScore = {
  total: number
  pillars: Record<Pillar, PillarScore>
}

export type ScoreLogRow = { date: string; type: string; data: unknown }
export type ScoreTxRow = {
  date: string
  type: string
  moved_forward?: boolean | null
}
export type IntegrationSlim = { provider: string; status: string }

// Which pillars have a live measured source (tightens the proof rule).
export function connectedPillars(
  integrations: IntegrationSlim[]
): Set<Pillar> {
  const set = new Set<Pillar>()
  for (const row of integrations) {
    if (row.status === "disconnected") continue
    const meta = CONNECTORS.find((c) => c.provider === row.provider)
    if (meta) set.add(meta.pillar)
  }
  return set
}

function pillarScore(action: boolean, proof: boolean): PillarScore {
  const points = (action ? ACTION_POINTS : 0) + (action && proof ? PROOF_POINTS : 0)
  return { action, proof: action && proof, points }
}

export function scoreDay(
  date: string,
  logs: ScoreLogRow[],
  transactions: ScoreTxRow[],
  metrics: MetricSlim[],
  connected: Set<Pillar>
): DayScore {
  const dayLogs = logs.filter((l) => l.date === date)
  const dayTx = transactions.filter((t) => t.date === date)
  const dayMetric = (name: string) =>
    metrics.find((m) => m.date === date && m.metric === name)?.value ?? 0

  // Body — action: training logged or imported; proof: the watch saw it.
  const bodyMeasured =
    dayMetric("workouts") > 0 ||
    dayMetric("steps") >= 8000 ||
    dayMetric("active_minutes") >= 30
  const bodyLogged = dayLogs.some((l) => BODY_TYPES.includes(l.type))
  const bodyAction = bodyLogged || bodyMeasured
  const bodyProof = connected.has("body")
    ? bodyMeasured
    : bodyMeasured || bodyLogged

  // Mind — action: a lesson written (journal or close-day); proof:
  // 25+ measured focus minutes, or self-claimed learning minutes while
  // no mind source is connected.
  const mindMeasured =
    dayMetric("focus_minutes") >= 25 || dayMetric("productive_minutes") >= 25
  const closeLesson = dayLogs.some(
    (l) =>
      l.type === "close_day" &&
      ((l.data as CloseDayData)?.lesson ?? "").trim() !== ""
  )
  const mindLogged = dayLogs.some((l) => MIND_TYPES.includes(l.type))
  const mindAction = mindLogged || closeLesson || mindMeasured
  const mindClaimed = dayLogs.some(
    (l) =>
      MIND_TYPES.includes(l.type) &&
      ((l.data as MindData)?.learning_minutes ?? 0) >= 25
  )
  const mindProof = connected.has("mind")
    ? mindMeasured
    : mindMeasured || mindClaimed

  // Business — action: a completed step / build log or the daily top
  // action; proof: the market saw it (commit, order, revenue).
  const buildMeasured =
    dayMetric("commits") > 0 ||
    dayMetric("orders") > 0 ||
    dayMetric("revenue") > 0
  const stepDone = dayLogs.some((l) => l.type === "build")
  const dailyDone = dayLogs.some(
    (l) =>
      l.type === "daily" &&
      (l.data as DailyData)?.top_action_done === true
  )
  const buildAction = stepDone || dailyDone || buildMeasured
  const buildProof = connected.has("build")
    ? buildMeasured
    : buildMeasured || stepDone

  // Money — action: awareness (the day's money is logged); proof:
  // discipline — every expense moved you forward, or a no-spend day
  // with income logged. No connector tightens this: discipline is a
  // judgement only the founder can make.
  const moneyAction = dayTx.length > 0
  const outTx = dayTx.filter((t) => t.type === "out")
  const moneyProof =
    moneyAction &&
    (outTx.length === 0 || outTx.every((t) => t.moved_forward === true))

  const pillars: Record<Pillar, PillarScore> = {
    body: pillarScore(bodyAction, bodyProof),
    mind: pillarScore(mindAction, mindProof),
    build: pillarScore(buildAction, buildProof),
    money: pillarScore(moneyAction, moneyProof),
  }
  const total =
    pillars.body.points +
    pillars.mind.points +
    pillars.build.points +
    pillars.money.points
  return { total, pillars }
}

// What's still on the table today — the reward menu for the dashboard.
export type ScoreGap = {
  pillar: Pillar
  points: number
  kind: "action" | "proof"
}

const PILLAR_ORDER: Pillar[] = ["body", "mind", "build", "money"]

export function scoreGaps(day: DayScore): ScoreGap[] {
  const gaps: ScoreGap[] = []
  for (const pillar of PILLAR_ORDER) {
    const p = day.pillars[pillar]
    if (!p.action) gaps.push({ pillar, points: ACTION_POINTS, kind: "action" })
    else if (!p.proof) gaps.push({ pillar, points: PROOF_POINTS, kind: "proof" })
  }
  return gaps
}

// Bands: 0-39 out of the game, 40-59 solid, 60-79 operator, 80+ elite.
export type ScoreBand = "off" | "solid" | "operator" | "elite"

export function scoreBand(total: number): ScoreBand {
  if (total >= 80) return "elite"
  if (total >= 60) return "operator"
  if (total >= 40) return "solid"
  return "off"
}

export function weekScore(dayTotals: number[]): number {
  if (dayTotals.length === 0) return 0
  return Math.round(
    dayTotals.reduce((sum, v) => sum + v, 0) / dayTotals.length
  )
}

// Longest consecutive run of active days — the streak record.
export function longestRun(dates: Set<string>): number {
  let best = 0
  for (const date of Array.from(dates)) {
    const previous = new Date(date)
    previous.setDate(previous.getDate() - 1)
    if (dates.has(previous.toISOString().slice(0, 10))) continue // not a run start
    let length = 1
    const cursor = new Date(date)
    for (;;) {
      cursor.setDate(cursor.getDate() + 1)
      if (!dates.has(cursor.toISOString().slice(0, 10))) break
      length++
    }
    if (length > best) best = length
  }
  return best
}

// Rank thresholds by lifetime active days (shared by review + profile).
export const RANK_THRESHOLDS = [7, 21, 50, 100, 200]

export function rankLevel(activeDays: number): number {
  return RANK_THRESHOLDS.filter((t) => activeDays >= t).length
}

export function rankLabel(level: number): string | null {
  return level > 0 ? `Operator ${["I", "II", "III", "IV", "V"][level - 1]}` : null
}
