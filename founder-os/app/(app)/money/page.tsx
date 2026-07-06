import { AddTransactionDialog } from "@/components/add-transaction-dialog"
import { CashflowChart, type CashflowPoint } from "@/components/cashflow-chart"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { daysAgo, isoDate } from "@/lib/dates"
import { getT } from "@/lib/i18n-server"
import { formatMoney } from "@/lib/money"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"
import type { Transaction } from "@/types/db"

const LIST_LIMIT = 50

function signedAmount(transaction: Transaction): number {
  return transaction.type === "in" ? transaction.amount : -transaction.amount
}

// Balance carried forward for each of the last 30 days.
function buildChartData(transactions: Transaction[]): CashflowPoint[] {
  const start = daysAgo(29)
  let balance = transactions
    .filter((t) => t.date < start)
    .reduce((sum, t) => sum + signedAmount(t), 0)

  const byDate = new Map<string, number>()
  for (const t of transactions) {
    if (t.date >= start) {
      byDate.set(t.date, (byDate.get(t.date) ?? 0) + signedAmount(t))
    }
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

export default async function MoneyPage() {
  const supabase = createClient()
  const { d } = getT()
  const workspaces = await getWorkspaces()
  const active = resolveActiveWorkspace(workspaces)!

  const { data } = await supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: true })
    .order("created_at", { ascending: true })

  const transactions: Transaction[] = data ?? []
  const chartData = buildChartData(transactions)

  // Running balance per row, newest first for display
  let running = 0
  const withBalance = transactions.map((t) => {
    running += signedAmount(t)
    return { transaction: t, balance: running }
  })
  const recent = withBalance.slice(-LIST_LIMIT).reverse()
  const totalBalance = running

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{d.money.title}</h1>
          <p className="text-sm text-muted-foreground">
            {d.money.balance}{" "}
            <span
              className={
                totalBalance >= 0
                  ? "font-semibold tabular-nums text-ok"
                  : "font-semibold tabular-nums text-danger"
              }
            >
              {formatMoney(totalBalance)}
            </span>
          </p>
        </div>
        <AddTransactionDialog workspaceId={active.id} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{d.money.trend}</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{d.money.noTrend}</p>
          ) : (
            <CashflowChart data={chartData} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{d.money.transactions}</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {d.money.nothingYet}
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map(({ transaction, balance }) => (
                <li
                  key={transaction.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink">
                      {transaction.note || transaction.category || "—"}
                    </p>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      {transaction.date}
                      {transaction.category && (
                        <Badge variant="outline">{transaction.category}</Badge>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={
                        transaction.type === "in"
                          ? "text-sm font-medium tabular-nums text-ok"
                          : "text-sm font-medium tabular-nums text-danger"
                      }
                    >
                      {transaction.type === "in" ? "+" : "−"}
                      {formatMoney(transaction.amount)}
                    </p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {formatMoney(balance)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
