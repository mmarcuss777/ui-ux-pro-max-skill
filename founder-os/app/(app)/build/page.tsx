import Link from "next/link"

import {
  ActivateBuildButton,
  BuildFormDialog,
} from "@/components/build-form-dialog"
import { BriefingCard } from "@/components/briefing-card"
import { CurrentBuildCard } from "@/components/current-build-card"
import { RealityCheckPanel } from "@/components/reality-check-panel"
import { StepChain, type StepHistoryItem } from "@/components/step-chain"
import { Card, CardContent } from "@/components/ui/card"
import { daysAgo, today } from "@/lib/dates"
import { getT } from "@/lib/i18n-server"
import type { BriefingData, BuildStepData } from "@/lib/log-schema"
import { formatMoney } from "@/lib/money"
import { pulseDelta, pulseTiles } from "@/lib/pulse"
import type { MetricSlim } from "@/lib/stats"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"
import type { Build, Experiment, Transaction } from "@/types/db"

function buildContext(
  build: Build,
  goals: string | null,
  pulse: string,
  steps: string[],
  lastVerdict: string | null
): string {
  return [
    `Founder's goals: ${goals?.trim() || "(not set)"}`,
    `Project: ${build.name}`,
    `Business type: ${build.business_type}, stage: ${build.stage}, priority: ${build.priority}`,
    `Week goal: ${build.week_goal ?? "-"}`,
    `Next action: ${build.next_action ?? "-"}`,
    `Live numbers (this week vs last): ${pulse}`,
    steps.length
      ? `Recently completed steps:\n${steps.join("\n")}`
      : "Recently completed steps: none.",
    lastVerdict ? `Previous audit verdict:\n${lastVerdict}` : "",
    build.notes ? `Notes: ${build.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

// Business: the AI operator's room. Live pulse from connected sources,
// one daily briefing (conclusion + move), a step chain that feeds the
// pillar/streak engine, and an audit with memory. Manual bookkeeping is
// gone — the founder confirms decisions, the data does the reporting.
export default async function BuildPage() {
  const supabase = createClient()
  const { d } = getT()
  const workspaces = await getWorkspaces()
  const active = resolveActiveWorkspace(workspaces)!
  const todayDate = today()
  const monthAgo = daysAgo(29)
  const weekAgo = daysAgo(6)

  const [
    { data: buildRows },
    { data: metricRows },
    { data: logRows },
    { data: experiments },
    { data: transactions },
  ] = await Promise.all([
    supabase
      .from("builds")
      .select("*")
      .eq("workspace_id", active.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("imported_metrics")
      .select("date,metric,value")
      .gte("date", daysAgo(13)),
    supabase
      .from("logs")
      .select("id,type,date,data,workspace_id,created_at")
      .in("type", ["build", "briefing", "reality_check"])
      .gte("date", monthAgo)
      .order("created_at", { ascending: false }),
    supabase.from("experiments").select("*").eq("workspace_id", active.id),
    supabase.from("transactions").select("*"),
  ])

  const builds: Build[] = buildRows ?? []
  const build = builds.find((b) => b.status === "active") ?? null
  const others = builds.filter((b) => b.status !== "active")
  const logs = logRows ?? []

  // Pulse: this week vs the one before, from imported metrics only.
  const metrics: MetricSlim[] = metricRows ?? []
  const tiles = pulseTiles(metrics, todayDate)

  // Today's briefing + step history + last audit, all from `logs`.
  const briefingRow = logs.find(
    (l) => l.type === "briefing" && l.date === todayDate
  )
  const briefing = (briefingRow?.data as BriefingData) ?? null
  const stepHistory: StepHistoryItem[] = logs
    .filter((l) => l.type === "build")
    .slice(0, 6)
    .map((l) => ({
      id: l.id,
      date: l.date,
      action: ((l.data as BuildStepData)?.action ?? "").trim(),
    }))
    .filter((s) => s.action !== "")
  const lastCheck = logs.find((l) => l.type === "reality_check")
  const lastVerdict = lastCheck
    ? {
        content: ((lastCheck.data as { content?: string })?.content ?? "").trim(),
        date: lastCheck.date,
      }
    : null

  // Compact status row (experiments / money) — context, not navigation.
  const allExperiments: Experiment[] = experiments ?? []
  const testing = allExperiments.filter((e) => e.status === "testing").length
  const overdue = allExperiments.filter(
    (e) => e.status !== "decided" && e.deadline && e.deadline < todayDate
  ).length
  const allTx: Transaction[] = transactions ?? []
  const net7 = allTx
    .filter((t) => t.date >= weekAgo)
    .reduce((sum, t) => sum + (t.type === "in" ? t.amount : -t.amount), 0)

  const metricLabel = (key: string): string => {
    const dict = d.connect as unknown as Record<string, string>
    return dict[`m_${key}`] ?? key
  }
  const moneyMetric = (key: string) => key === "revenue" || key === "net_cashflow"

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{d.buildPage.title}</h1>
          <p className="text-sm text-muted-foreground">
            {d.buildPage.subtitle}
          </p>
        </div>
        <BuildFormDialog
          workspaceId={active.id}
          build={build}
          hasActive={build !== null}
        />
      </div>

      <CurrentBuildCard build={build} />

      {/* Pulse: live numbers from connected sources, trend vs last week. */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold-dark">
              {d.buildPage.pulseTitle}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {d.buildPage.vsLastWeek}
            </p>
          </div>
          {tiles.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {tiles.map((tile) => {
                const delta = pulseDelta(tile)
                const up = tile.current >= tile.previous
                return (
                  <div key={tile.metric}>
                    <p className="text-xs text-muted-foreground">
                      {metricLabel(tile.metric)}
                    </p>
                    <p className="text-lg font-bold tabular-nums text-ink">
                      {moneyMetric(tile.metric)
                        ? formatMoney(tile.current)
                        : Math.round(tile.current * 100) / 100}
                    </p>
                    <p
                      className={
                        delta === 0
                          ? "text-xs text-muted-foreground"
                          : up
                            ? "text-xs font-medium text-ok"
                            : "text-xs font-medium text-danger"
                      }
                    >
                      {delta === null
                        ? d.buildPage.newSignal
                        : `${up ? "▲" : "▼"} ${Math.abs(delta)} %`}
                    </p>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              {d.buildPage.noPulse}{" "}
              <Link
                href="/connect"
                className="font-medium text-gold-dark underline-offset-2 hover:underline"
              >
                {d.buildPage.connectCta}
              </Link>
            </p>
          )}
        </CardContent>
      </Card>

      <BriefingCard
        briefingId={briefingRow?.id ?? null}
        briefing={briefing}
        workspaceId={active.id}
      />

      {build && (
        <StepChain
          buildId={build.id}
          nextAction={build.next_action}
          workspaceId={active.id}
          history={stepHistory}
        />
      )}

      {build && (
        <RealityCheckPanel
          context={buildContext(
            build,
            active.goals,
            tiles
              .map((t) => `${t.metric} ${t.current} (prev ${t.previous})`)
              .join(", ") || "none",
            stepHistory.map((s) => `${s.date}: ${s.action}`),
            lastVerdict?.content ?? null
          )}
          workspaceId={active.id}
          last={lastVerdict}
        />
      )}

      {/* Status strip: context that matters, one line each. */}
      <Card>
        <CardContent className="divide-y divide-line p-0">
          <Link
            href="/lab"
            className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-gold/[0.04]"
          >
            <span className="text-ink">{d.buildPage.experimentsCard}</span>
            <span
              className={
                overdue > 0
                  ? "font-medium text-danger"
                  : "text-muted-foreground"
              }
            >
              {testing} {d.buildPage.testingNow}
              {overdue > 0 ? ` · ${overdue} ${d.buildPage.overdue}` : ""}
            </span>
          </Link>
          <Link
            href="/money"
            className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-gold/[0.04]"
          >
            <span className="text-ink">{d.buildPage.moneyCard}</span>
            <span
              className={
                net7 < 0 ? "font-medium text-danger" : "text-muted-foreground"
              }
            >
              {d.buildPage.net7}: {formatMoney(net7)}
            </span>
          </Link>
          <Link
            href="/offers"
            className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-gold/[0.04]"
          >
            <span className="text-ink">{d.buildPage.offersCard}</span>
            <span className="text-muted-foreground">{d.common.open}</span>
          </Link>
        </CardContent>
      </Card>

      {others.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {d.buildPage.otherBuilds}
            </p>
            <ul className="mt-2 divide-y divide-line">
              {others.map((other) => (
                <li
                  key={other.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink">{other.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {other.status}
                    </p>
                  </div>
                  <ActivateBuildButton
                    buildId={other.id}
                    workspaceId={active.id}
                  />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
