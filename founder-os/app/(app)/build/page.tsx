import Link from "next/link"

import {
  ActivateBuildButton,
  BuildFormDialog,
} from "@/components/build-form-dialog"
import { BriefingCard } from "@/components/briefing-card"
import { BuildConnectRow } from "@/components/build-connect"
import { BuildMenu } from "@/components/build-menu"
import { DeleteEntry } from "@/components/delete-entry"
import { RealityCheckPanel } from "@/components/reality-check-panel"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { daysAgo, today } from "@/lib/dates"
import { getT } from "@/lib/i18n-server"
import type { BriefingData, BuildStepData } from "@/lib/log-schema"
import { formatMoney } from "@/lib/money"
import { pulseDelta, pulseTiles } from "@/lib/pulse"
import { connectedPillars, scoreDay } from "@/lib/score"
import type { MetricSlim } from "@/lib/stats"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"
import { cn } from "@/lib/utils"
import type { Build, Experiment } from "@/types/db"

type LabelKey =
  | "ecommerce" | "resell" | "service" | "content" | "digital"
  | "b2b" | "local" | "fitness_brand" | "custom"
  | "idea" | "validation" | "building" | "selling" | "scaling"

const BUILD_SOURCES = ["shopify", "plausible", "github", "mailchimp"]

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
    `Live numbers (this week vs last): ${pulse}`,
    steps.length
      ? `Recently completed actions:\n${steps.join("\n")}`
      : "Recently completed actions: none.",
    lastVerdict ? `Previous audit verdict:\n${lastVerdict}` : "",
    build.notes ? `Notes: ${build.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

// Business — the AI operator's room. The project is context the founder
// fully controls (edit / delete, always one tap away); the value is the
// live pulse, the daily briefing (strong model when data flows) and the
// audit with memory. Tracking happens in the connected tools, not here.
export default async function BuildPage() {
  const supabase = createClient()
  const { d } = getT()
  const workspaces = await getWorkspaces()
  const active = resolveActiveWorkspace(workspaces)!
  const todayDate = today()

  const [
    { data: buildRows },
    { data: metricRows },
    { data: logRows },
    { data: experiments },
    { data: integrations },
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
      .select("id,type,date,data,created_at")
      .in("type", ["build", "daily", "briefing", "reality_check"])
      .gte("date", daysAgo(29))
      .order("created_at", { ascending: false }),
    supabase.from("experiments").select("*").eq("workspace_id", active.id),
    supabase.from("integrations").select("provider,status"),
  ])

  const builds: Build[] = buildRows ?? []
  const build = builds.find((b) => b.status === "active") ?? null
  const others = builds.filter((b) => b.status !== "active")
  const logs = logRows ?? []
  const metrics: MetricSlim[] = metricRows ?? []

  const buildConnected = (integrations ?? []).some(
    (i) => BUILD_SOURCES.includes(i.provider) && i.status !== "disconnected"
  )
  const tiles = pulseTiles(metrics, todayDate).slice(0, 3)
  const hasData = tiles.length > 0

  // Today's Business points — same engine as everywhere.
  const connected = connectedPillars(integrations ?? [])
  const buildToday = scoreDay(todayDate, logs, [], metrics, connected).pillars
    .build
  const todayLine =
    buildToday.points === 25
      ? d.buildPage.todayFull
      : buildToday.points === 15
        ? d.buildPage.todayProof
        : d.buildPage.todayNone

  // AI rows from `logs`: today's briefing + the last audit + recent actions.
  const briefingRow = logs.find(
    (l) => l.type === "briefing" && l.date === todayDate
  )
  const briefing = (briefingRow?.data as BriefingData) ?? null
  const recentActions = logs
    .filter((l) => l.type === "build")
    .slice(0, 7)
    .map(
      (l) =>
        `${l.date}: ${(((l.data as BuildStepData)?.action ?? (l.data as { note?: string })?.note) ?? "").slice(0, 120)}`
    )
    .filter((line) => !line.endsWith(": "))
  const lastCheck = logs.find((l) => l.type === "reality_check")
  const lastVerdict = lastCheck
    ? {
        content: ((lastCheck.data as { content?: string })?.content ?? "").trim(),
        date: lastCheck.date,
      }
    : null

  // Status strip: what's being tested and what's overdue.
  const allExperiments: Experiment[] = experiments ?? []
  const testing = allExperiments.filter((e) => e.status === "testing").length
  const overdue = allExperiments.filter(
    (e) => e.status !== "decided" && e.deadline && e.deadline < todayDate
  ).length

  const metricLabel = (key: string): string => {
    const dict = d.connect as unknown as Record<string, string>
    return dict[`m_${key}`] ?? key
  }
  const moneyMetric = (key: string) => key === "revenue" || key === "net_cashflow"
  const label = (value: string): string =>
    d.labels[value as LabelKey] ?? value

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{d.buildPage.title}</h1>
          <p className="text-sm text-muted-foreground">
            {d.buildPage.subtitle}
          </p>
        </div>
        {!build && (
          <BuildFormDialog workspaceId={active.id} hasActive={false} />
        )}
      </div>

      {/* The hero: project + live pulse + today's points, with full
          control (edit / delete / wipe AI) one tap away. */}
      {build ? (
        <div className="rounded-2xl bg-gradient-to-br from-gold-light via-gold/40 to-gold-dark/50 p-px shadow-lg shadow-gold/15">
          <div className="rounded-[calc(1rem-1px)] bg-card p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-ink">{build.name}</h2>
                  <Badge variant="secondary">{label(build.stage)}</Badge>
                </div>
                {build.week_goal && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    <span className="font-medium text-gold-dark">
                      {d.currentBuild.weekGoal}:
                    </span>{" "}
                    <span className="text-ink">{build.week_goal}</span>
                  </p>
                )}
              </div>
              <BuildMenu build={build} workspaceId={active.id} />
            </div>

            {hasData ? (
              <div className="mt-4 grid grid-cols-3 gap-3">
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
              <p className="mt-4 text-sm text-muted-foreground">
                {d.buildPage.noPulse}{" "}
                <Link
                  href="/connect"
                  className="font-medium text-gold-dark underline-offset-2 hover:underline"
                >
                  {d.buildPage.connectCta}
                </Link>
              </p>
            )}

            <p
              className={cn(
                "mt-3 text-xs",
                buildToday.points === 25
                  ? "font-medium text-gold-dark"
                  : "text-muted-foreground"
              )}
            >
              {todayLine}
            </p>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">
              {d.currentBuild.empty}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Shopify / Plausible / GitHub — one row, gone once connected. */}
      {!buildConnected && <BuildConnectRow />}

      <BriefingCard
        briefingId={briefingRow?.id ?? null}
        briefing={briefing}
        workspaceId={active.id}
        fullAi={hasData}
      />

      {build && (
        <RealityCheckPanel
          context={buildContext(
            build,
            active.goals,
            tiles
              .map((t) => `${t.metric} ${t.current} (prev ${t.previous})`)
              .join(", ") || "none",
            recentActions,
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
            href="/offers"
            className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-gold/[0.04]"
          >
            <span className="text-ink">{d.buildPage.offersCard}</span>
            <span className="text-muted-foreground">{d.common.open}</span>
          </Link>
        </CardContent>
      </Card>

      {/* Other projects: switch or delete, both always available. */}
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
                      {label(other.stage)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <ActivateBuildButton
                      buildId={other.id}
                      workspaceId={active.id}
                    />
                    <DeleteEntry table="builds" id={other.id} />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
