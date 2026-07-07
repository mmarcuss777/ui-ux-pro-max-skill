import Link from "next/link"

import { AddTransactionDialog } from "@/components/add-transaction-dialog"
import { CashflowChart, type CashflowPoint } from "@/components/cashflow-chart"
import { DeleteEntry } from "@/components/delete-entry"
import { MoneyConnectRow } from "@/components/money-connect"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { daysAgo, isoDate, today } from "@/lib/dates"
import { getT } from "@/lib/i18n-server"
import { formatMoney } from "@/lib/money"
import { connectedPillars, scoreDay } from "@/lib/score"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"
import { cn } from "@/lib/utils"
import type { Profile, Transaction } from "@/types/db"

const LIST_LIMIT = 8

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

// Money — "discipline is measured monthly". One hero (this month's net +
// the waste bar against the profile limit), an in-place connect row,
// month numbers, the balance trend, and a short honest history.
export default async function MoneyPage() {
  const supabase = createClient()
  const { d } = getT()
  const workspaces = await getWorkspaces()
  const active = resolveActiveWorkspace(workspaces)!
  const todayDate = today()

  const [{ data }, { data: integrations }, { data: profileRows }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase.from("integrations").select("provider,status"),
      supabase.from("profiles").select("*").limit(1),
    ])

  const transactions: Transaction[] = data ?? []
  const profile: Profile | null = profileRows?.[0] ?? null
  const wasteLimit = profile?.waste_limit_month ?? null
  const moneyConnected = (integrations ?? []).some(
    (i) =>
      ["csv", "stripe", "lemonsqueezy"].includes(i.provider) &&
      i.status !== "disconnected"
  )

  // Calendar months: this one vs the previous one.
  const monthStart = todayDate.slice(0, 8) + "01"
  const prevCursor = new Date(monthStart)
  prevCursor.setDate(0) // last day of previous month
  const prevMonthEnd = isoDate(prevCursor)
  prevCursor.setDate(1)
  const prevMonthStart = isoDate(prevCursor)

  const inRange = (t: Transaction, from: string, to: string) =>
    t.date >= from && t.date <= to
  const sumBy = (from: string, to: string, type: "in" | "out") =>
    transactions
      .filter((t) => inRange(t, from, to) && t.type === type)
      .reduce((sum, t) => sum + t.amount, 0)

  const incomeNow = sumBy(monthStart, todayDate, "in")
  const outNow = sumBy(monthStart, todayDate, "out")
  const netNow = incomeNow - outNow
  const incomePrev = sumBy(prevMonthStart, prevMonthEnd, "in")
  const outPrev = sumBy(prevMonthStart, prevMonthEnd, "out")
  const savedNow = incomeNow > 0 ? Math.round((netNow / incomeNow) * 100) : null
  const savedPrev =
    incomePrev > 0
      ? Math.round(((incomePrev - outPrev) / incomePrev) * 100)
      : null

  // Waste this month vs the profile limit — the discipline bar.
  const wasteNow = transactions
    .filter(
      (t) =>
        inRange(t, monthStart, todayDate) &&
        t.type === "out" &&
        t.category === "waste"
    )
    .reduce((sum, t) => sum + t.amount, 0)
  const wastePct =
    wasteLimit && wasteLimit > 0
      ? Math.min(100, Math.round((wasteNow / wasteLimit) * 100))
      : null
  const wasteOver = wasteLimit !== null && wasteNow > wasteLimit

  // Today's Money points — same engine as everywhere.
  const connected = connectedPillars(integrations ?? [])
  const moneyToday = scoreDay(todayDate, [], transactions, [], connected)
    .pillars.money
  const todayLine =
    moneyToday.points === 25
      ? d.money.todayFull
      : moneyToday.points === 15
        ? d.money.todayProof
        : d.money.todayNone

  // Awareness grid: a day lights when its money was logged.
  const txDates = new Set(transactions.map((t) => t.date))
  const gridDays: { date: string; active: boolean }[] = []
  for (let i = 27; i >= 0; i--) {
    const date = daysAgo(i)
    gridDays.push({ date, active: txDates.has(date) })
  }

  const chartData = buildChartData(transactions)
  const totalBalance = transactions.reduce(
    (sum, t) => sum + signedAmount(t),
    0
  )
  const recent = transactions.slice(-LIST_LIMIT).reverse()

  type Tile = {
    key: string
    label: string
    current: number | null
    previous: number | null
    money: boolean
    invert?: boolean
  }
  const tiles: Tile[] = [
    {
      key: "in",
      label: d.money.tIncome,
      current: incomeNow,
      previous: incomePrev,
      money: true,
    },
    {
      key: "out",
      label: d.money.tExpenses,
      current: outNow,
      previous: outPrev,
      money: true,
      invert: true,
    },
    {
      key: "saved",
      label: d.money.tSaved,
      current: savedNow,
      previous: savedPrev,
      money: false,
    },
  ]

  const categoryLabel: Record<string, string> = {
    business: d.money.catBusiness,
    body: d.money.catBody,
    learning: d.money.catLearning,
    lifestyle: d.money.catLifestyle,
    waste: d.money.catWaste,
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
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

      {/* The hero: this month's net + the waste discipline bar. The frame
          turns red the moment waste crosses the limit — it should sting. */}
      <div
        className={cn(
          "rounded-2xl p-px shadow-lg",
          wasteOver
            ? "bg-gradient-to-br from-danger/60 via-danger/30 to-transparent shadow-danger/10"
            : "bg-gradient-to-br from-gold-light via-gold/40 to-gold-dark/50 shadow-gold/15"
        )}
      >
        <div className="rounded-[calc(1rem-1px)] bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gold-dark">
            {d.money.monthTitle}
          </p>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <p
              className={cn(
                "text-4xl font-bold tabular-nums",
                netNow >= 0 ? "text-ink" : "text-danger"
              )}
            >
              {netNow >= 0 ? "+" : ""}
              {formatMoney(netNow)}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="tabular-nums text-ok">
                ↑ {formatMoney(incomeNow)}
              </span>{" "}
              ·{" "}
              <span className="tabular-nums text-danger">
                ↓ {formatMoney(outNow)}
              </span>
            </p>
          </div>

          {wasteLimit !== null && wasteLimit > 0 ? (
            <div className="mt-4">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-muted-foreground">
                  {d.money.catWaste}: {formatMoney(wasteNow)} {d.money.wasteOf}{" "}
                  {formatMoney(wasteLimit)}
                </span>
                {wasteOver && (
                  <span className="font-semibold text-danger">
                    {d.money.wasteOver}
                  </span>
                )}
              </div>
              <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    "h-full rounded-full",
                    wasteOver ? "bg-danger" : "gold-fill"
                  )}
                  style={{ width: `${wastePct ?? 0}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="mt-4 text-xs">
              <Link
                href="/profile"
                className="font-medium text-gold-dark underline-offset-2 hover:underline"
              >
                {d.money.wasteNoLimit}
              </Link>
            </p>
          )}

          <p
            className={cn(
              "mt-3 text-xs",
              moneyToday.points === 25
                ? "font-medium text-gold-dark"
                : "text-muted-foreground"
            )}
          >
            {todayLine}
          </p>
        </div>
      </div>

      {/* CSV / Stripe — one row, gone once a live source is connected. */}
      {!moneyConnected && <MoneyConnectRow workspaceId={active.id} />}

      {/* Month numbers + days-logged grid in one card. */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold-dark">
              {d.money.numbersTitle}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {d.money.vsLastMonth}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {tiles.map((tile) => {
              if (tile.current === null) {
                return (
                  <div key={tile.key}>
                    <p className="text-xs text-muted-foreground">
                      {tile.label}
                    </p>
                    <p className="text-xl font-bold text-muted-foreground">
                      —
                    </p>
                  </div>
                )
              }
              const previous = tile.previous ?? 0
              const up = tile.current >= previous
              const good = tile.invert ? !up : up
              return (
                <div key={tile.key}>
                  <p className="text-xs text-muted-foreground">{tile.label}</p>
                  <p className="text-xl font-bold tabular-nums text-ink">
                    {tile.money
                      ? formatMoney(tile.current)
                      : `${tile.current} %`}
                  </p>
                  {tile.previous !== null && previous !== 0 && (
                    <p
                      className={
                        good
                          ? "text-xs font-medium text-ok"
                          : "text-xs font-medium text-danger"
                      }
                    >
                      {up ? "▲" : "▼"}{" "}
                      {tile.money
                        ? formatMoney(Math.abs(tile.current - previous))
                        : `${Math.abs(tile.current - previous)} p.b.`}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-4 border-t border-line pt-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {d.money.daysLogged}
            </p>
            <div className="mt-2 grid grid-cols-7 gap-1.5">
              {gridDays.map((day) => (
                <span
                  key={day.date}
                  title={day.date}
                  className={cn(
                    "h-5 rounded-md",
                    day.active ? "gold-fill" : "bg-secondary",
                    day.date === todayDate && "ring-2 ring-gold/50"
                  )}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance trend — the one chart money deserves. */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{d.money.trend}</CardTitle>
          </CardHeader>
          <CardContent>
            <CashflowChart data={chartData} />
          </CardContent>
        </Card>
      )}

      {/* History — short, categorized, waste stings. */}
      {recent.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <ul className="divide-y divide-line">
              {recent.map((transaction) => (
                <li
                  key={transaction.id}
                  className="flex items-center gap-3 py-2.5"
                >
                  <span
                    className={cn(
                      "w-20 shrink-0 text-sm font-semibold tabular-nums",
                      transaction.type === "in" ? "text-ok" : "text-ink"
                    )}
                  >
                    {transaction.type === "in" ? "+" : "−"}
                    {formatMoney(transaction.amount)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                    {transaction.note || transaction.date}
                  </span>
                  {transaction.category && (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                        transaction.category === "waste"
                          ? "bg-danger/10 text-danger"
                          : "bg-gold/10 text-gold-dark"
                      )}
                    >
                      {categoryLabel[transaction.category] ??
                        transaction.category}
                    </span>
                  )}
                  <DeleteEntry table="transactions" id={transaction.id} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
