import Link from "next/link"

import { BodyGoalsCard } from "@/components/body-goals-card"
import { WeekGrid } from "@/components/week-grid"
import { PrimaryCta } from "@/components/primary-cta"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { daysAgo } from "@/lib/dates"
import { getT } from "@/lib/i18n-server"
import type { BodyGoalData } from "@/lib/log-schema"
import { dayWord } from "@/lib/plural"
import { BODY_TYPES, streak, weekGrid } from "@/lib/stats"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"
import type { Log } from "@/types/db"

export default async function BodyPage() {
  const supabase = createClient()
  const { d, locale } = getT()
  const workspaces = await getWorkspaces()
  const active = resolveActiveWorkspace(workspaces)!

  const [{ data }, { data: goalRows }] = await Promise.all([
    supabase
      .from("logs")
      .select("*")
      .in("type", BODY_TYPES)
      .gte("date", daysAgo(90))
      .order("date", { ascending: false }),
    supabase
      .from("logs")
      .select("*")
      .eq("type", "body_goal")
      .eq("workspace_id", active.id)
      .order("created_at", { ascending: false })
      .limit(1),
  ])

  const logs: Log[] = data ?? []
  const goalRow = goalRows?.[0] ?? null
  const goals = goalRow ? ((goalRow.data ?? {}) as BodyGoalData) : null
  const dates = new Set(logs.map((l) => l.date))
  const currentStreak = streak(dates)
  const grid = weekGrid(dates)
  const recent = logs.slice(0, 10)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{d.body.title}</h1>
          <p className="text-sm text-muted-foreground">{d.body.subtitle}</p>
        </div>
        <PrimaryCta asChild>
          <Link href="/log">{d.body.cta}</Link>
        </PrimaryCta>
      </div>

      <BodyGoalsCard
        goalId={goalRow?.id ?? null}
        goals={goals}
        workspaceId={active.id}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-gold-light via-gold to-transparent"
          />
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {d.body.streak}
            </p>
            <p className="mt-2 text-4xl font-bold tabular-nums text-ink">
              {currentStreak}
              <span className="ml-2 text-base font-normal text-muted-foreground">
                {dayWord(currentStreak, locale)}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {d.body.thisWeek}
            </p>
            <div className="mt-3">
              <WeekGrid days={grid} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{d.body.recent}</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">{d.body.empty}</p>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((log) => (
                <li key={log.id} className="flex items-center gap-3 py-3">
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {log.date}
                  </span>
                  <span className="min-w-0 truncate text-sm text-ink">
                    {(log.data as { note?: string })?.note || "—"}
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
