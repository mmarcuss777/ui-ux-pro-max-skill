import Link from "next/link"

import { CashflowChart, type CashflowPoint } from "@/components/cashflow-chart"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { daysAgo, isoDate } from "@/lib/dates"
import { getT } from "@/lib/i18n-server"
import { formatMoney } from "@/lib/money"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"
import type { Contact, Experiment, Offer, Transaction } from "@/types/db"

function signed(t: Transaction): number {
  return t.type === "in" ? t.amount : -t.amount
}

function buildChartData(transactions: Transaction[]): CashflowPoint[] {
  const start = daysAgo(29)
  let balance = transactions
    .filter((t) => t.date < start)
    .reduce((sum, t) => sum + signed(t), 0)
  const byDate = new Map<string, number>()
  for (const t of transactions) {
    if (t.date >= start) byDate.set(t.date, (byDate.get(t.date) ?? 0) + signed(t))
  }
  const points: CashflowPoint[] = []
  const cursor = new Date()
  cursor.setDate(cursor.getDate() - 29)
  for (let i = 0; i < 30; i++) {
    const date = isoDate(cursor)
    balance += byDate.get(date) ?? 0
    points.push({ date, balance: Math.round(balance * 100) / 100 })
    cursor.setDate(cursor.getDate() + 1)
  }
  return points
}

export default async function BusinessPage() {
  const supabase = createClient()
  const { d } = getT()
  const workspaces = await getWorkspaces()
  const active = resolveActiveWorkspace(workspaces)!
  const weekAgo = daysAgo(6)
  const todayDate = isoDate(new Date())

  const [
    { data: transactions },
    { data: offers },
    { data: contacts },
    { data: experiments },
  ] = await Promise.all([
    supabase.from("transactions").select("*").order("date"),
    supabase.from("offers").select("*").eq("workspace_id", active.id),
    supabase.from("contacts").select("*").eq("workspace_id", active.id),
    supabase.from("experiments").select("*").eq("workspace_id", active.id),
  ])

  const allTx: Transaction[] = transactions ?? []
  const allOffers: Offer[] = offers ?? []
  const allContacts: Contact[] = contacts ?? []
  const allExperiments: Experiment[] = experiments ?? []

  const balance = allTx.reduce((sum, t) => sum + signed(t), 0)
  const week = allTx.filter((t) => t.date >= weekAgo)
  const in7 = week
    .filter((t) => t.type === "in")
    .reduce((sum, t) => sum + t.amount, 0)
  const out7 = week
    .filter((t) => t.type === "out")
    .reduce((sum, t) => sum + t.amount, 0)

  const activeOffers = allOffers.filter((o) => o.status === "active")
  const bestMargin = allOffers.reduce<Offer | null>(
    (best, offer) =>
      (offer.margin ?? 0) > (best?.margin ?? -Infinity) ? offer : best,
    null
  )

  const countBy = (type: string) =>
    allContacts.filter((c) => c.contact_type === type).length
  const withNextStep = allContacts.filter((c) => c.next_step).length

  const testing = allExperiments.filter((e) => e.status === "testing")
  const overdue = allExperiments.filter(
    (e) => e.status !== "decided" && e.deadline && e.deadline < todayDate
  )

  const recent = [...allTx]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 5)

  const stats = [
    { label: d.business.balance, value: formatMoney(balance), tone: balance },
    { label: d.business.net7, value: formatMoney(in7 - out7), tone: in7 - out7 },
    { label: d.business.in7, value: formatMoney(in7), tone: 1 },
    { label: d.business.out7, value: formatMoney(-out7), tone: -1 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">{d.business.title}</h1>
        <p className="text-sm text-muted-foreground">{d.business.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p
                className={
                  stat.tone >= 0
                    ? "mt-1 text-xl font-semibold tabular-nums text-ok"
                    : "mt-1 text-xl font-semibold tabular-nums text-danger"
                }
              >
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{d.business.trend}</CardTitle>
        </CardHeader>
        <CardContent>
          {allTx.length === 0 ? (
            <p className="text-sm text-muted-foreground">{d.business.noData}</p>
          ) : (
            <CashflowChart data={buildChartData(allTx)} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">
              {d.business.offersCard}
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/offers">{d.business.open}</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <p className="text-2xl font-semibold tabular-nums text-ink">
              {activeOffers.length}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {d.business.activeOffers}
              </span>
            </p>
            {bestMargin && (
              <p className="text-sm text-muted-foreground">
                {d.business.bestMargin}:{" "}
                <span className="font-medium text-ok">
                  {formatMoney(bestMargin.margin ?? 0)}
                </span>{" "}
                — {bestMargin.name}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">
              {d.business.pipelineCard}
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/offers">{d.business.open}</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <p>
              <span className="font-semibold tabular-nums text-ink">
                {countBy("lead")}
              </span>{" "}
              {d.business.leads} ·{" "}
              <span className="font-semibold tabular-nums text-ink">
                {countBy("client")}
              </span>{" "}
              {d.business.clients} ·{" "}
              <span className="font-semibold tabular-nums text-ink">
                {countBy("supplier")}
              </span>{" "}
              {d.business.suppliers}
            </p>
            <p className="text-muted-foreground">
              {withNextStep} {d.business.withNextStep}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">{d.business.labCard}</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/lab">{d.business.open}</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <p>
              <span className="font-semibold tabular-nums text-ink">
                {testing.length}
              </span>{" "}
              {d.business.testingNow}
            </p>
            {overdue.length > 0 && (
              <p className="font-medium text-danger">
                {overdue.length} {d.business.overdue}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">{d.business.recent}</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/money">{d.business.open}</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">{d.business.noData}</p>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm text-ink">
                      {t.note || t.category || "—"}
                    </span>
                    {t.category && (
                      <Badge variant="outline">{t.category}</Badge>
                    )}
                  </div>
                  <span
                    className={
                      t.type === "in"
                        ? "text-sm font-medium tabular-nums text-ok"
                        : "text-sm font-medium tabular-nums text-danger"
                    }
                  >
                    {t.type === "in" ? "+" : "−"}
                    {formatMoney(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
