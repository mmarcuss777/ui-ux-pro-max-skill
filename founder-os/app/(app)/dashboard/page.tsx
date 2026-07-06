import Link from "next/link"

import { StatCard } from "@/components/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { daysAgo, today } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import { createClient } from "@/lib/supabase/server"
import type { Log, Transaction } from "@/types/db"

type DailyData = {
  energy?: number
  note?: string
  top_action?: string
  top_action_done?: boolean
}

function trendOf(delta: number): "up" | "down" | "flat" {
  if (delta > 0) return "up"
  if (delta < 0) return "down"
  return "flat"
}

function netCashflow(transactions: Transaction[]): number {
  return transactions.reduce(
    (sum, t) => sum + (t.type === "in" ? t.amount : -t.amount),
    0
  )
}

export default async function DashboardPage() {
  const supabase = createClient()
  const todayDate = today()
  const weekAgo = daysAgo(6)
  const twoWeeksAgo = daysAgo(13)

  const [{ data: logs }, { data: transactions }] = await Promise.all([
    supabase.from("logs").select("*").gte("date", twoWeeksAgo),
    supabase.from("transactions").select("*").gte("date", twoWeeksAgo),
  ])

  const allLogs: Log[] = logs ?? []
  const allTransactions: Transaction[] = transactions ?? []

  // Daily score: today's entry vs the average of the 7 days before today
  const todayDaily = allLogs.find(
    (l) => l.type === "daily" && l.date === todayDate
  )
  const previousScores = allLogs
    .filter(
      (l) => l.type === "daily" && l.date < todayDate && l.score !== null
    )
    .map((l) => l.score as number)
  const previousAvg =
    previousScores.length > 0
      ? Math.round(
          previousScores.reduce((a, b) => a + b, 0) / previousScores.length
        )
      : null

  const score = todayDaily?.score ?? null
  const scoreDelta =
    score !== null && previousAvg !== null ? score - previousAvg : null

  // Cashflow: last 7 days vs the 7 days before that
  const thisWeek = allTransactions.filter((t) => t.date >= weekAgo)
  const lastWeek = allTransactions.filter((t) => t.date < weekAgo)
  const net = netCashflow(thisWeek)
  const netDelta = net - netCashflow(lastWeek)

  const dailyData = (todayDaily?.data ?? {}) as DailyData
  const trainingDone = allLogs.some(
    (l) => l.type === "fitness" && l.date === todayDate
  )
  const learningDone = allLogs.some(
    (l) => l.type === "learning" && l.date === todayDate
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Today</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Daily score"
          value={score !== null ? String(score) : "—"}
          trend={scoreDelta !== null ? trendOf(scoreDelta) : "flat"}
          trendLabel={
            scoreDelta !== null
              ? `${scoreDelta > 0 ? "+" : ""}${scoreDelta} vs 7-day avg`
              : "no history yet"
          }
          tone={
            scoreDelta === null || scoreDelta === 0
              ? "neutral"
              : scoreDelta > 0
                ? "ok"
                : "danger"
          }
        />
        <StatCard
          label="Cashflow, 7 days"
          value={formatMoney(net)}
          trend={trendOf(netDelta)}
          trendLabel={`${netDelta > 0 ? "+" : ""}${formatMoney(netDelta)} vs last week`}
          tone={netDelta === 0 ? "neutral" : netDelta > 0 ? "ok" : "danger"}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Business action of the day</CardTitle>
        </CardHeader>
        <CardContent>
          {todayDaily ? (
            dailyData.top_action ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-medium text-ink">
                  {dailyData.top_action}
                </p>
                {dailyData.top_action_done ? (
                  <Badge className="bg-ok hover:bg-ok">Done</Badge>
                ) : (
                  <Badge variant="outline">Not done yet</Badge>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No top action set in today&apos;s log.
              </p>
            )
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">
                No daily log yet.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/log">Go to Daily Log</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <p className="text-sm text-muted-foreground">Training today</p>
            <p
              className={
                trainingDone
                  ? "text-sm font-medium text-ok"
                  : "text-sm text-muted-foreground"
              }
            >
              {trainingDone ? "Done" : "Not yet"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <p className="text-sm text-muted-foreground">Learning today</p>
            <p
              className={
                learningDone
                  ? "text-sm font-medium text-ok"
                  : "text-sm text-muted-foreground"
              }
            >
              {learningDone ? "Done" : "Not yet"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
