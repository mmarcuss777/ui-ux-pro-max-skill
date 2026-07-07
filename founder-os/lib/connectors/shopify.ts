import type { SyncFn, ValidateKeyFn } from "@/lib/connectors/types"

// Shopify — key-paste connector. The user creates a custom app in their
// own store admin (read_orders scope) and pastes the Admin API token +
// shop domain. No public app review needed for your own store.

const VERSION = "2024-10"

function base(shop: string): string {
  const domain = shop.includes(".") ? shop : `${shop}.myshopify.com`
  return `https://${domain}/admin/api/${VERSION}`
}

export const shopifyValidate: ValidateKeyFn = async (key, extra) => {
  if (!extra) throw new Error("Shop domain is required (e.g. mystore.myshopify.com)")
  const response = await fetch(`${base(extra)}/shop.json`, {
    headers: { "X-Shopify-Access-Token": key },
  })
  if (!response.ok) throw new Error("Shopify rejected the token — check the shop domain and Admin API token (read_orders scope).")
  const data = (await response.json()) as { shop?: { name?: string } }
  return data.shop?.name ?? extra
}

type Order = { created_at: string; total_price: string }

export const shopifySync: SyncFn = async (credentials, sinceDate) => {
  const key = credentials.accessToken
  const shop = credentials.externalAccount
  if (!key || !shop) throw new Error("Missing Shopify credentials")

  const params = new URLSearchParams({
    status: "any",
    created_at_min: `${sinceDate}T00:00:00Z`,
    limit: "250",
    fields: "created_at,total_price",
  })
  const response = await fetch(`${base(shop)}/orders.json?${params}`, {
    headers: { "X-Shopify-Access-Token": key },
  })
  if (!response.ok) throw new Error(`Shopify sync failed (${response.status})`)
  const data = (await response.json()) as { orders: Order[] }

  const byDay = new Map<string, { orders: number; revenue: number }>()
  for (const order of data.orders) {
    const date = order.created_at.slice(0, 10)
    const day = byDay.get(date) ?? { orders: 0, revenue: 0 }
    day.orders += 1
    day.revenue += Number(order.total_price) || 0
    byDay.set(date, day)
  }

  const rows = Array.from(byDay.entries()).flatMap(([date, day]) => [
    { metric: "orders", date, value: day.orders },
    { metric: "revenue", date, value: Math.round(day.revenue * 100) / 100 },
  ])
  return { rows }
}
