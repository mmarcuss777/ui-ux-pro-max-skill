import type { SyncFn, ValidateKeyFn } from "@/lib/connectors/types"

// Toggl Track — tracked deep-work minutes per day feed the Mind pillar.
// Plain API token from Profile settings, instant.

const API = "https://api.track.toggl.com/api/v9"

function auth(key: string): string {
  return `Basic ${Buffer.from(`${key}:api_token`).toString("base64")}`
}

export const togglValidate: ValidateKeyFn = async (key) => {
  const response = await fetch(`${API}/me`, {
    headers: { Authorization: auth(key) },
  })
  if (!response.ok) throw new Error("Toggl rejected the token — copy the API token from Profile settings.")
  const data = (await response.json()) as { fullname?: string; email?: string }
  return data.fullname ?? data.email ?? "Toggl"
}

type TimeEntry = { start: string; duration: number }

export const togglSync: SyncFn = async (credentials, sinceDate) => {
  const key = credentials.accessToken
  if (!key) throw new Error("Missing Toggl token")

  const end = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
  const response = await fetch(
    `${API}/me/time_entries?start_date=${sinceDate}&end_date=${end}`,
    { headers: { Authorization: auth(key) } }
  )
  if (!response.ok) throw new Error(`Toggl sync failed (${response.status})`)
  const entries: TimeEntry[] = await response.json()

  const byDay = new Map<string, number>()
  for (const entry of entries) {
    if (entry.duration <= 0) continue // negative = still running
    const date = entry.start.slice(0, 10)
    byDay.set(date, (byDay.get(date) ?? 0) + entry.duration)
  }

  const rows = Array.from(byDay.entries()).map(([date, seconds]) => ({
    metric: "focus_minutes",
    date,
    value: Math.round(seconds / 60),
  }))
  return { rows }
}
