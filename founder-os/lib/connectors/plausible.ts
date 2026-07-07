import type { SyncFn, ValidateKeyFn } from "@/lib/connectors/types"

// Plausible — key-paste connector for web analytics. Far simpler than
// GA4: one API key + the site domain, clean stats API, no Google review.

const API = "https://plausible.io/api/v1"

export const plausibleValidate: ValidateKeyFn = async (key, extra) => {
  if (!extra) throw new Error("Site domain is required (e.g. mystore.com)")
  const response = await fetch(
    `${API}/stats/aggregate?site_id=${encodeURIComponent(extra)}&period=day&metrics=visitors`,
    { headers: { Authorization: `Bearer ${key}` } }
  )
  if (!response.ok) throw new Error("Plausible rejected the key — check the API key and site domain.")
  return extra
}

export const plausibleSync: SyncFn = async (credentials, sinceDate) => {
  const key = credentials.accessToken
  const site = credentials.externalAccount
  if (!key || !site) throw new Error("Missing Plausible credentials")

  const today = new Date().toISOString().slice(0, 10)
  const params = new URLSearchParams({
    site_id: site,
    period: "custom",
    date: `${sinceDate},${today}`,
    metrics: "visitors,visits",
  })
  const response = await fetch(`${API}/stats/timeseries?${params}`, {
    headers: { Authorization: `Bearer ${key}` },
  })
  if (!response.ok) throw new Error(`Plausible sync failed (${response.status})`)
  const data = (await response.json()) as {
    results: { date: string; visitors: number; visits: number }[]
  }

  const rows = data.results.flatMap((r) => [
    { metric: "visitors", date: r.date, value: r.visitors ?? 0 },
    { metric: "sessions", date: r.date, value: r.visits ?? 0 },
  ])
  return { rows }
}
