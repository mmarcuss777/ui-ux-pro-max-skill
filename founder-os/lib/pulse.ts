import type { MetricSlim } from "@/lib/stats"

// Business pulse: this week's imported numbers vs the week before —
// pure code, no AI. The same aggregation feeds the pulse tiles on the
// Business page and the text summary the briefing AI reads (the AI only
// ever sees these aggregates, never raw rows).

export type PulseTile = {
  metric: string
  current: number
  previous: number
}

// Business-relevant metrics in display order; body/mind metrics stay out.
const PULSE_METRICS = [
  "revenue",
  "orders",
  "sessions",
  "visitors",
  "subscribers",
  "commits",
  "net_cashflow",
]

function daysBefore(base: string, days: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

export function pulseTiles(metrics: MetricSlim[], today: string): PulseTile[] {
  const weekStart = daysBefore(today, 6)
  const prevStart = daysBefore(today, 13)

  return PULSE_METRICS.flatMap((metric) => {
    const rows = metrics.filter((m) => m.metric === metric)
    if (rows.length === 0) return []
    const current = rows
      .filter((m) => m.date >= weekStart)
      .reduce((sum, m) => sum + m.value, 0)
    const previous = rows
      .filter((m) => m.date >= prevStart && m.date < weekStart)
      .reduce((sum, m) => sum + m.value, 0)
    return [{ metric, current, previous }]
  })
}

export function pulseDelta(tile: PulseTile): number | null {
  if (tile.previous === 0) return tile.current > 0 ? null : 0
  return Math.round(((tile.current - tile.previous) / tile.previous) * 100)
}

// Text form for the AI prompt: one line per metric, both weeks.
export function pulseSummary(tiles: PulseTile[]): string {
  if (tiles.length === 0) return "No connected business data yet."
  return tiles
    .map(
      (t) =>
        `${t.metric}: ${Math.round(t.current * 100) / 100} this week, ${Math.round(t.previous * 100) / 100} the week before`
    )
    .join("\n")
}
