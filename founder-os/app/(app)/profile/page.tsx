import Link from "next/link"
import {
  ArrowRightIcon,
  LightningBoltIcon,
  Link2Icon,
} from "@radix-ui/react-icons"

import { LanguageToggle } from "@/components/language-toggle"
import { LogoutButton } from "@/components/logout-button"
import { ProfileForm } from "@/components/profile-form"
import { RemindersCard } from "@/components/reminders-card"
import { WorkspaceSwitcher } from "@/components/workspace-switcher"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { daysAgo } from "@/lib/dates"
import { getT } from "@/lib/i18n-server"
import { daysLabel } from "@/lib/plural"
import {
  connectedPillars,
  longestRun,
  rankLabel,
  rankLevel,
  RANK_THRESHOLDS,
  scoreDay,
  weekScore,
} from "@/lib/score"
import {
  ACTION_LOG_TYPES,
  actionDates,
  metricActionDates,
  streakWithShields,
  type MetricSlim,
} from "@/lib/stats"
import { createClient } from "@/lib/supabase/server"
import type { Profile } from "@/types/db"

// The operator's profile: who you are in this game (rank, records),
// what your bars are (the score engine reads them from here), and the
// app-level switches. Modeled on a sports profile, not a settings page.
export default async function ProfilePage() {
  const supabase = createClient()
  const { d, locale } = getT()
  const monthAgo = daysAgo(29)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const workspaces = await getWorkspaces()
  const activeWorkspace = resolveActiveWorkspace(workspaces)!

  const [
    { data: profileRows },
    { data: historyMeta },
    { data: monthFull },
    { data: txAll },
    { data: txMonth },
    { data: metricRows },
    { data: integrations },
  ] = await Promise.all([
    supabase.from("profiles").select("*").limit(1),
    supabase.from("logs").select("date,type"),
    supabase.from("logs").select("date,type,data").gte("date", monthAgo),
    supabase.from("transactions").select("date,type"),
    supabase
      .from("transactions")
      .select("date,type,moved_forward")
      .gte("date", monthAgo),
    supabase
      .from("imported_metrics")
      .select("date,metric,value")
      .gte("date", monthAgo),
    supabase.from("integrations").select("provider,status"),
  ])

  const profile: Profile | null = profileRows?.[0] ?? null
  const history = historyMeta ?? []
  const metrics: MetricSlim[] = metricRows ?? []

  // Identity numbers: lifetime action, current + record streak, rank.
  const allDates = actionDates(history, txAll ?? [])
  metricActionDates(metrics).forEach((date) => allDates.add(date))
  const { streak, shieldsLeft } = streakWithShields(allDates)
  const record = longestRun(allDates)
  const evidenceCount = history.filter((r) =>
    ACTION_LOG_TYPES.includes(r.type)
  ).length
  const activeDays = allDates.size
  const level = rankLevel(activeDays)
  const rank = rankLabel(level)
  const nextThreshold = RANK_THRESHOLDS[level] ?? null

  // Score records over the last 30 days.
  const connected = connectedPillars(integrations ?? [])
  const dayTotals: number[] = []
  for (let i = 0; i < 30; i++) {
    dayTotals.push(
      scoreDay(daysAgo(i), monthFull ?? [], txMonth ?? [], metrics, connected)
        .total
    )
  }
  const bestDay = Math.max(...dayTotals)
  const thisWeek = weekScore(dayTotals.slice(0, 7))

  const displayName =
    profile?.name?.trim() || user?.email?.split("@")[0] || "Operator"
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("")

  const records = [
    { label: d.profile.streakNow, value: daysLabel(streak, locale) },
    { label: d.profile.longestStreak, value: daysLabel(record, locale) },
    { label: d.profile.bestDay, value: `${bestDay}/100` },
    { label: d.profile.weekAvg, value: `${thisWeek}/100` },
  ]

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Identity — who you are in this game. */}
      <div className="rounded-2xl bg-gradient-to-br from-gold-light/70 via-gold/25 to-transparent p-px shadow-lg shadow-gold/10">
        <div className="rounded-[calc(1rem-1px)] bg-card p-5">
          <div className="flex items-center gap-4">
            <div
              aria-hidden
              className="gold-fill flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold shadow-md shadow-gold/25"
            >
              {initials || "N"}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold text-ink">
                {displayName}
              </h1>
              <p className="text-sm font-semibold text-gold-dark">
                {rank ?? d.profile.noRank}
              </p>
              <p className="text-xs text-muted-foreground">
                {evidenceCount} {d.profile.evidenceWord} ·{" "}
                {daysLabel(activeDays, locale)} {d.profile.activeWord}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {streak > 0 && (
              <span className="flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold-dark">
                <LightningBoltIcon className="h-3.5 w-3.5" />
                {d.today.streak}: {daysLabel(streak, locale)}
                {shieldsLeft > 0 && (
                  <span className="rounded-full bg-gold/20 px-1.5 text-[10px] font-bold tabular-nums">
                    {shieldsLeft}× {d.today.shieldWord}
                  </span>
                )}
              </span>
            )}
            {nextThreshold && (
              <span className="rounded-full bg-secondary px-3 py-1.5 text-xs text-muted-foreground">
                {nextThreshold - activeDays} {d.profile.toNextRank}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Records — the trophy shelf. */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-gold-dark">
            {d.profile.records}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {records.map((item) => (
              <div key={item.label} className="rounded-xl bg-gold/[0.06] p-3">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-lg font-bold tabular-nums text-ink">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bars — what the system holds you to. */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{d.profile.targets}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {d.profile.targetsHint}
          </p>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>

      {/* App & account. */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{d.profile.app}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <RemindersCard />
          <div className="flex items-center justify-between rounded-xl border border-line px-4 py-2.5">
            <span className="text-sm text-ink">{d.switcher.workspace}</span>
            <WorkspaceSwitcher
              workspaces={workspaces.map(({ id, name, status }) => ({
                id,
                name,
                status,
              }))}
              activeId={activeWorkspace.id}
            />
          </div>
          <Link
            href="/connect"
            className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm transition-colors hover:bg-gold/[0.04]"
          >
            <span className="flex items-center gap-2 text-ink">
              <Link2Icon className="h-4 w-4 text-gold-dark" />
              {d.profile.connectedSources}
            </span>
            <ArrowRightIcon className="h-4 w-4 text-muted-foreground" />
          </Link>
          <div className="flex items-center justify-between rounded-xl border border-line px-4 py-2.5">
            <span className="text-sm text-ink">{d.profile.language}</span>
            <LanguageToggle />
          </div>
          <div className="pt-1">
            <LogoutButton />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
