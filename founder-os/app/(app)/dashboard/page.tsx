import Link from "next/link"

import { StatCard } from "@/components/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { daysAgo, today } from "@/lib/dates"
import { getT } from "@/lib/i18n-server"
import { formatMoney } from "@/lib/money"
import { createClient } from "@/lib/supabase/server"
import type { Log, Transaction } from "@/types/db"

type DailyData = {
  energy?: number
  note?: string
  top_action?: string
  top_action_done?: boolean
  ai_score?: number
  ai_reason?: string
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
  const { locale, d } = getT()
  const todayDate = today()
  const weekAgo = daysAgo(6)
  const twoWeeksAgo = daysAgo(13)

  const [{ data: logs }, { data: transactions }] = await Promise.all([
    supabase
      .from("logs")
      .select("*")
      .gte("date", twoWeeksAgo)
      .in("type", ["daily", "fitness", "learning"]),
    supabase.from("transactions").select("*").gte("date", twoWeeksAgo),
  ])

  const allLogs: Log[] = logs ?? []
  const allTransactions: Transaction[] = transactions ?? []

  // Daily score: today's entry vs the average of the 7 days before today
  const todayDaily = allLogs.find(
    (l) => l.type === "daily" && l.date === todayDate
  )
  const previousScores = allLogs
    .filter((l) => l.type === "daily" && l.date < todayDate && l.score !== null)
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
  const todayActivities = allLogs
    .filter((l) => l.date === todayDate)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">{d.dashboard.title}</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString(locale === "sk" ? "sk-SK" : "en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label={d.dashboard.dailyScore}
          value={score !== null ? String(score) : "—"}
          trend={scoreDelta !== null ? trendOf(scoreDelta) : "flat"}
          trendLabel={
            scoreDelta !== null
              ? `${scoreDelta > 0 ? "+" : ""}${scoreDelta} ${d.dashboard.vsAvg}`
              : d.dashboard.noHistory
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
          label={d.dashboard.cashflow}
          value={formatMoney(net)}
          trend={trendOf(netDelta)}
          trendLabel={`${netDelta > 0 ? "+" : ""}${formatMoney(netDelta)} ${d.dashboard.vsLastWeek}`}
          tone={netDelta === 0 ? "neutral" : netDelta > 0 ? "ok" : "danger"}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{d.dashboard.action}</CardTitle>
        </CardHeader>
        <CardContent>
          {todayDaily ? (
            dailyData.top_action ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-medium text-ink">
                  {dailyData.top_action}
                </p>
                {dailyData.top_action_done ? (
                  <Badge className="bg-ok hover:bg-ok">
                    {d.dashboard.done}
                  </Badge>
                ) : (
                  <Badge variant="outline">{d.dashboard.notDone}</Badge>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {d.dashboard.noTopAction}
              </p>
            )
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">
                {d.dashboard.noDailyLog}
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/log">{d.dashboard.goToLog}</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <p className="text-sm text-muted-foreground">
              {d.dashboard.training}
            </p>
            <p
              className={
                trainingDone
                  ? "text-sm font-medium text-ok"
                  : "text-sm text-muted-foreground"
              }
            >
              {trainingDone ? d.dashboard.done : d.dashboard.notYet}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <p className="text-sm text-muted-foreground">
              {d.dashboard.learning}
            </p>
            <p
              className={
                learningDone
                  ? "text-sm font-medium text-ok"
                  : "text-sm text-muted-foreground"
              }
            >
              {learningDone ? d.dashboard.done : d.dashboard.notYet}
            </p>
          </CardContent>
        </Card>
      </div>

      {todayActivities.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {d.dashboard.activities}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-line">
              {todayActivities.map((log) => {
                const data = (log.data ?? {}) as DailyData
                return (
                  <li key={log.id} className="flex items-center gap-3 py-2.5">
                    <Badge variant="outline">
                      {d.labels[log.type as "daily" | "fitness" | "learning"]}
                    </Badge>
                    <span className="min-w-0 truncate text-sm text-muted-foreground">
                      {data.top_action || data.note || "—"}
                    </span>
                    {typeof data.ai_score === "number" && (
                      <Badge className="ml-auto shrink-0 bg-ink tabular-nums hover:bg-ink">
                        {d.dashboard.aiScore} {data.ai_score}/10
                      </Badge>
                    )}
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
