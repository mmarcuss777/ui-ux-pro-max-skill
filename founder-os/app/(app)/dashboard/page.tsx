import Link from "next/link"
import { LightningBoltIcon } from "@radix-ui/react-icons"

import { CloseDayCard } from "@/components/close-day-card"
import { CurrentBuildCard } from "@/components/current-build-card"
import { MissionPanel } from "@/components/mission-panel"
import { OneMoveCard } from "@/components/one-move-card"
import { ScoreRing } from "@/components/score-ring"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { daysAgo, today } from "@/lib/dates"
import { getT } from "@/lib/i18n-server"
import type {
  CloseDayData,
  MissionData,
  OneMoveData,
} from "@/lib/log-schema"
import {
  actionDates,
  dailyScore,
  dayStarted,
  pillarComplete,
  pillarEvidence,
  streak,
  type Pillar,
} from "@/lib/stats"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"
import { cn } from "@/lib/utils"
import type { Log, Transaction } from "@/types/db"

const PILLAR_KEYS: Pillar[] = ["body", "mind", "build", "money"]

export default async function TodayPage() {
  const supabase = createClient()
  const { locale, d } = getT()
  const workspaces = await getWorkspaces()
  const active = resolveActiveWorkspace(workspaces)!
  const todayDate = today()
  // A month of history feeds the streak; today's slice feeds the score.
  const monthAgo = daysAgo(29)

  const [{ data: logs }, { data: transactions }, { data: builds }] =
    await Promise.all([
      supabase.from("logs").select("*").gte("date", monthAgo),
      supabase.from("transactions").select("*").gte("date", monthAgo),
      supabase
        .from("builds")
        .select("*")
        .eq("workspace_id", active.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1),
    ])

  const recentLogs: Log[] = logs ?? []
  const recentTx: Transaction[] = transactions ?? []
  const todayLogs = recentLogs.filter((l) => l.date === todayDate)
  const todayTx = recentTx.filter((t) => t.date === todayDate)
  const build = builds?.[0] ?? null

  const missionRow = todayLogs.find((l) => l.type === "mission") ?? null
  const mission = missionRow ? ((missionRow.data ?? {}) as MissionData) : null
  const oneMoveRow = todayLogs.find((l) => l.type === "one_move") ?? null
  const oneMove = oneMoveRow ? ((oneMoveRow.data ?? {}) as OneMoveData) : null
  const closeRow = todayLogs.find((l) => l.type === "close_day") ?? null
  const close = closeRow ? ((closeRow.data ?? {}) as CloseDayData) : null

  // Last night's "tomorrow's first move" becomes this morning's suggestion.
  const yesterdayClose = recentLogs.find(
    (l) => l.type === "close_day" && l.date === daysAgo(1)
  )
  const suggestion =
    (
      (yesterdayClose?.data as CloseDayData | undefined)
        ?.tomorrow_first_move ?? ""
    ).trim() || null

  const evidence = pillarEvidence(todayLogs, todayTx)
  const complete = pillarComplete(mission, evidence)
  const score = dailyScore(complete)
  const pillarsDone = Object.values(complete).filter(Boolean).length
  const started = dayStarted(todayLogs, todayTx)
  const streakDays = streak(actionDates(recentLogs, recentTx))

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{d.today.title}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString(
              locale === "sk" ? "sk-SK" : "en-GB",
              { weekday: "long", day: "numeric", month: "long" }
            )}
          </p>
        </div>
        {streakDays > 0 && (
          <span className="flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold-dark">
            <LightningBoltIcon className="h-3.5 w-3.5" />
            {d.today.streak}: {streakDays} {d.common.days}
          </span>
        )}
      </div>

      <OneMoveCard
        oneMoveId={oneMoveRow?.id ?? null}
        oneMove={oneMove}
        suggestion={suggestion}
        workspaceId={active.id}
      />

      <MissionPanel
        missionId={missionRow?.id ?? null}
        mission={mission}
        complete={complete}
        workspaceId={active.id}
      />

      <CurrentBuildCard build={build} showOpen />

      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          {started ? (
            <ScoreRing value={score} size={84} label={d.today.dailyScore} />
          ) : (
            <div
              aria-hidden
              className="flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-full border-2 border-dashed border-line text-xl font-semibold text-muted-foreground"
            >
              —
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {d.today.dailyScore}
            </p>
            {started ? (
              <>
                <p className="mt-0.5 text-sm text-ink">
                  {pillarsDone}/4 {d.today.pillarsOf}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PILLAR_KEYS.map((pillar) => (
                    <span
                      key={pillar}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-medium",
                        complete[pillar]
                          ? "bg-gold/15 text-gold-dark"
                          : "bg-secondary text-muted-foreground"
                      )}
                    >
                      {d.pillars[pillar]}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="mt-0.5 text-sm font-medium text-ink">
                  {d.today.notStarted}
                </p>
                <p className="text-xs text-muted-foreground">
                  {d.today.notStartedHint}
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <CloseDayCard
        closeId={closeRow?.id ?? null}
        close={close}
        score={score}
        streakDays={streakDays}
        pillarsDone={pillarsDone}
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
