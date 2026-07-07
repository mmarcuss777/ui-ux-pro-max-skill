import type { SyncFn, ValidateKeyFn } from "@/lib/connectors/types"

// Mailchimp — audience size feeds the Business pillar. The API key ends
// with the datacenter suffix ("-us21"), which picks the API host.

function apiBase(key: string): string {
  const dc = key.split("-").pop()
  if (!dc || !/^[a-z]+\d+$/.test(dc)) {
    throw new Error("Mailchimp key must end with the datacenter suffix, e.g. -us21.")
  }
  return `https://${dc}.api.mailchimp.com/3.0`
}

function auth(key: string): string {
  return `Basic ${Buffer.from(`anystring:${key}`).toString("base64")}`
}

export const mailchimpValidate: ValidateKeyFn = async (key) => {
  const response = await fetch(`${apiBase(key)}/ping`, {
    headers: { Authorization: auth(key) },
  })
  if (!response.ok) throw new Error("Mailchimp rejected the key — create one in Account → Extras → API keys.")
  return "Mailchimp"
}

type ListsResponse = {
  lists?: { stats?: { member_count?: number } }[]
}

export const mailchimpSync: SyncFn = async (credentials) => {
  const key = credentials.accessToken
  if (!key) throw new Error("Missing Mailchimp key")

  const response = await fetch(`${apiBase(key)}/lists?count=100`, {
    headers: { Authorization: auth(key) },
  })
  if (!response.ok) throw new Error(`Mailchimp sync failed (${response.status})`)
  const data = (await response.json()) as ListsResponse

  // Snapshot metric: total subscribers across audiences, stamped today.
  // Daily cron turns snapshots into a growth curve over time.
  const total = (data.lists ?? []).reduce(
    (sum, list) => sum + (list.stats?.member_count ?? 0),
    0
  )
  const today = new Date().toISOString().slice(0, 10)
  return { rows: [{ metric: "subscribers", date: today, value: total }] }
}
