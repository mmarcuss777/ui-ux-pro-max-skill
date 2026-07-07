import type { SyncFn, ValidateKeyFn } from "@/lib/connectors/types"

// Lemon Squeezy — revenue and orders feed the Money pillar. Popular with
// solo founders selling digital products; plain API key, instant.

const API = "https://api.lemonsqueezy.com/v1"

function headers(key: string): Record<string, string> {
  return {
    Authorization: `Bearer ${key}`,
    Accept: "application/vnd.api+json",
  }
}

export const lemonsqueezyValidate: ValidateKeyFn = async (key) => {
  const response = await fetch(`${API}/users/me`, { headers: headers(key) })
  if (!response.ok) throw new Error("Lemon Squeezy rejected the key — create one in Settings → API.")
  const data = (await response.json()) as {
    data?: { attributes?: { name?: string; email?: string } }
  }
  return data.data?.attributes?.name ?? data.data?.attributes?.email ?? "Lemon Squeezy"
}

type Order = {
  attributes: {
    created_at: string
    total: number // cents
    status: string
  }
}

export const lemonsqueezySync: SyncFn = async (credentials, sinceDate) => {
  const key = credentials.accessToken
  if (!key) throw new Error("Missing Lemon Squeezy key")

  // Newest first, one page of 100 — plenty for a daily sync window.
  const response = await fetch(
    `${API}/orders?page[size]=100&sort=-createdAt`,
    { headers: headers(key) }
  )
  if (!response.ok) throw new Error(`Lemon Squeezy sync failed (${response.status})`)
  const data = (await response.json()) as { data?: Order[] }

  const revenueByDay = new Map<string, number>()
  const ordersByDay = new Map<string, number>()
  for (const order of data.data ?? []) {
    if (order.attributes.status === "refunded") continue
    const date = order.attributes.created_at.slice(0, 10)
    if (date < sinceDate) continue
    revenueByDay.set(
      date,
      (revenueByDay.get(date) ?? 0) + order.attributes.total / 100
    )
    ordersByDay.set(date, (ordersByDay.get(date) ?? 0) + 1)
  }

  const rows = [
    ...Array.from(revenueByDay.entries()).map(([date, value]) => ({
      metric: "revenue",
      date,
      value: Math.round(value * 100) / 100,
    })),
    ...Array.from(ordersByDay.entries()).map(([date, value]) => ({
      metric: "orders",
      date,
      value,
    })),
  ]
  return { rows }
}
