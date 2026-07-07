import type { SyncFn, ValidateKeyFn } from "@/lib/connectors/types"

// Stripe — key-paste connector. The user creates a read-only restricted
// key (Balance transactions: read) and pastes it; no OAuth, no review.

const API = "https://api.stripe.com/v1"

export const stripeValidate: ValidateKeyFn = async (key) => {
  const response = await fetch(`${API}/balance`, {
    headers: { Authorization: `Bearer ${key}` },
  })
  if (!response.ok) throw new Error("Stripe rejected the key — check it is a restricted key with Balance read access.")
  return "Stripe account"
}

type BalanceTx = {
  created: number
  amount: number // cents, signed
  net: number
  type: string // charge | refund | payout | ...
}

export const stripeSync: SyncFn = async (credentials, sinceDate) => {
  const key = credentials.accessToken
  if (!key) throw new Error("Missing Stripe key")
  const since = Math.floor(new Date(sinceDate).getTime() / 1000)

  const rowsRaw: BalanceTx[] = []
  let startingAfter: string | undefined
  for (let page = 0; page < 10; page++) {
    const params = new URLSearchParams({ limit: "100", "created[gte]": String(since) })
    if (startingAfter) params.set("starting_after", startingAfter)
    const response = await fetch(`${API}/balance_transactions?${params}`, {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (!response.ok) throw new Error(`Stripe sync failed (${response.status})`)
    const data = (await response.json()) as {
      data: (BalanceTx & { id: string })[]
      has_more: boolean
    }
    rowsRaw.push(...data.data)
    if (!data.has_more) break
    startingAfter = data.data[data.data.length - 1]?.id
  }

  const byDay = new Map<string, { revenue: number; refunds: number; net: number }>()
  for (const tx of rowsRaw) {
    const date = new Date(tx.created * 1000).toISOString().slice(0, 10)
    const day = byDay.get(date) ?? { revenue: 0, refunds: 0, net: 0 }
    if (tx.type === "charge" || tx.type === "payment") day.revenue += tx.amount / 100
    if (tx.type === "refund") day.refunds += Math.abs(tx.amount) / 100
    day.net += tx.net / 100
    byDay.set(date, day)
  }

  const rows = Array.from(byDay.entries()).flatMap(([date, day]) => [
    { metric: "revenue", date, value: Math.round(day.revenue * 100) / 100 },
    { metric: "refunds", date, value: Math.round(day.refunds * 100) / 100 },
    { metric: "net_cashflow", date, value: Math.round(day.net * 100) / 100 },
  ])
  return { rows }
}
