import Link from "next/link"

import { CurrentBuildCard } from "@/components/current-build-card"
import { MissionPanel } from "@/components/mission-panel"
import { ScoreRing } from "@/components/score-ring"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { today } from "@/lib/dates"
import { getT } from "@/lib/i18n-server"
import {
  dailyScore,
  pillarComplete,
  pillarEvidence,
  type MissionData,
} from "@/lib/stats"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"
import type { Log, Transaction } from "@/types/db"

export default async function TodayPage() {
  const supabase = createClient()
  const { locale, d } = getT()
  const workspaces = await getWorkspaces()
  const active = resolveActiveWorkspace(workspaces)!
  const todayDate = today()

  const [{ data: logs }, { data: transactions }, { data: builds }] =
    await Promise.all([
      supabase.from("logs").select("*").eq("date", todayDate),
      supabase.from("transactions").select("*").eq("date", todayDate),
      supabase
        .from("builds")
        .select("*")
        .eq("workspace_id", active.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1),
    ])

  const todayLogs: Log[] = logs ?? []
  const todayTx: Transaction[] = transactions ?? []
  const build = builds?.[0] ?? null

  const missionRow = todayLogs.find((l) => l.type === "mission") ?? null
  const mission = missionRow ? ((missionRow.data ?? {}) as MissionData) : null
  const evidence = pillarEvidence(todayLogs, todayTx)
  const complete = pillarComplete(mission, evidence)
  const score = dailyScore(complete)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">{d.today.title}</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString(locale === "sk" ? "sk-SK" : "en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card className="flex flex-col items-center justify-center py-6">
          <CardContent className="flex flex-col items-center gap-3 p-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {d.today.dailyScore}
            </p>
            <ScoreRing value={score} label={d.today.dailyScore} />
            <p className="max-w-[220px] text-center text-xs text-muted-foreground">
              {d.today.scoreHint}
            </p>
          </CardContent>
        </Card>

        <CurrentBuildCard build={build} showOpen />
      </div>

      <MissionPanel
        missionId={missionRow?.id ?? null}
        mission={mission}
        complete={complete}
        workspaceId={active.id}
      />

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/log">{d.today.addLog}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/nexa">{d.today.askNexa}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/review">{d.today.weeklyReview}</Link>
        </Button>
      </div>
    </div>
  )
}
