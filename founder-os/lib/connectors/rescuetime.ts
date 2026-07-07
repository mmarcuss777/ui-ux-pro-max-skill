import type { SyncFn, ValidateKeyFn } from "@/lib/connectors/types"

// RescueTime — automatically tracked productive minutes per day feed the
// Mind pillar. Plain API key from rescuetime.com/anapi/manage, instant.

const API = "https://www.rescuetime.com/anapi"

export const rescuetimeValidate: ValidateKeyFn = async (key) => {
  const url = `${API}/data?key=${encodeURIComponent(key)}&format=json&perspective=interval&restrict_kind=productivity&resolution_time=day`
  const response = await fetch(url)
  if (!response.ok) throw new Error("RescueTime rejected the key — create one at rescuetime.com/anapi/manage.")
  return "RescueTime"
}

type DataResponse = {
  rows: [string, number, number, number][] // [date, seconds, people, productivity]
}

export const rescuetimeSync: SyncFn = async (credentials, sinceDate) => {
  const key = credentials.accessToken
  if (!key) throw new Error("Missing RescueTime key")

  const end = new Date().toISOString().slice(0, 10)
  const url = `${API}/data?key=${encodeURIComponent(key)}&format=json&perspective=interval&restrict_kind=productivity&resolution_time=day&restrict_begin=${sinceDate}&restrict_end=${end}`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`RescueTime sync failed (${response.status})`)
  const data = (await response.json()) as DataResponse

  // Productivity scale is -2..2; count time at 1 or 2 as productive.
  const byDay = new Map<string, number>()
  for (const [date, seconds, , productivity] of data.rows ?? []) {
    if (productivity <= 0) continue
    const day = date.slice(0, 10)
    byDay.set(day, (byDay.get(day) ?? 0) + seconds)
  }

  const rows = Array.from(byDay.entries()).map(([date, seconds]) => ({
    metric: "productive_minutes",
    date,
    value: Math.round(seconds / 60),
  }))
  return { rows }
}
