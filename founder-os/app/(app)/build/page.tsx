import Link from "next/link"

import {
  ActivateBuildButton,
  BuildFormDialog,
} from "@/components/build-form-dialog"
import { CurrentBuildCard } from "@/components/current-build-card"
import { RealityCheckPanel } from "@/components/reality-check-panel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BUILD_TYPES, type BuildType } from "@/lib/build-types"
import { daysAgo, today } from "@/lib/dates"
import { getT } from "@/lib/i18n-server"
import { formatMoney } from "@/lib/money"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"
import type { Build, Contact, Experiment, Offer, Transaction } from "@/types/db"

function buildContext(build: Build, goals: string | null): string {
  const fields = (build.fields ?? {}) as Record<string, string>
  const filled = Object.entries(fields)
    .filter(([, value]) => value?.trim())
    .map(([key, value]) => `${key}: ${value}`)
  return [
    `Founder's goals: ${goals?.trim() || "(not set)"}`,
    `Project: ${build.name}`,
    `Business type: ${build.business_type}, stage: ${build.stage}, priority: ${build.priority}`,
    `Week goal: ${build.week_goal ?? "-"}`,
    `Next action: ${build.next_action ?? "-"}`,
    filled.length ? `Playbook:\n${filled.join("\n")}` : "Playbook: empty",
    build.notes ? `Notes: ${build.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

export default async function BuildPage() {
  const supabase = createClient()
  const { d } = getT()
  const workspaces = await getWorkspaces()
  const active = resolveActiveWorkspace(workspaces)!
  const weekAgo = daysAgo(6)
  const todayDate = today()

  const [
    { data: buildRows },
    { data: experiments },
    { data: offers },
    { data: contacts },
    { data: transactions },
  ] = await Promise.all([
    supabase
      .from("builds")
      .select("*")
      .eq("workspace_id", active.id)
      .order("created_at", { ascending: false }),
    supabase.from("experiments").select("*").eq("workspace_id", active.id),
    supabase.from("offers").select("*").eq("workspace_id", active.id),
    supabase.from("contacts").select("*").eq("workspace_id", active.id),
    supabase.from("transactions").select("*"),
  ])

  const builds: Build[] = buildRows ?? []
  const build = builds.find((b) => b.status === "active") ?? null
  const others = builds.filter((b) => b.status !== "active")

  const allExperiments: Experiment[] = experiments ?? []
  const allOffers: Offer[] = offers ?? []
  const allContacts: Contact[] = contacts ?? []
  const allTx: Transaction[] = transactions ?? []

  const testing = allExperiments.filter((e) => e.status === "testing").length
  const overdue = allExperiments.filter(
    (e) => e.status !== "decided" && e.deadline && e.deadline < todayDate
  ).length
  const activeOffers = allOffers.filter((o) => o.status === "active").length
  const bestMargin = allOffers.reduce<Offer | null>(
    (best, offer) =>
      (offer.margin ?? 0) > (best?.margin ?? -Infinity) ? offer : best,
    null
  )
  const leadCount = allContacts.filter((c) => c.contact_type === "lead").length
  const clientCount = allContacts.filter(
    (c) => c.contact_type === "client"
  ).length
  const balance = allTx.reduce(
    (sum, t) => sum + (t.type === "in" ? t.amount : -t.amount),
    0
  )
  const net7 = allTx
    .filter((t) => t.date >= weekAgo)
    .reduce((sum, t) => sum + (t.type === "in" ? t.amount : -t.amount), 0)

  const playbookFields = build
    ? BUILD_TYPES[(build.business_type as BuildType) ?? "custom"]?.fields ?? []
    : []
  const fieldValues = (build?.fields ?? {}) as Record<string, string>

  const subCards = [
    {
      title: d.buildPage.experimentsCard,
      href: "/lab",
      hasData: allExperiments.length > 0,
      empty: d.buildPage.experimentsEmpty,
      line1: `${testing} ${d.buildPage.testingNow}`,
      line2: overdue > 0 ? `${overdue} ${d.buildPage.overdue}` : null,
      danger: overdue > 0,
    },
    {
      title: d.buildPage.offersCard,
      href: "/offers",
      hasData: allOffers.length > 0,
      empty: d.buildPage.offersEmpty,
      line1: `${activeOffers} ${d.buildPage.activeOffers}`,
      line2: bestMargin
        ? `${d.buildPage.bestMargin}: ${formatMoney(bestMargin.margin ?? 0)}`
        : null,
      danger: false,
    },
    {
      title: d.buildPage.pipelineCard,
      href: "/offers",
      hasData: allContacts.length > 0,
      empty: d.buildPage.pipelineEmpty,
      line1: `${leadCount} ${d.buildPage.leads} · ${clientCount} ${d.buildPage.clients}`,
      line2: null,
      danger: false,
    },
    {
      title: d.buildPage.moneyCard,
      href: "/money",
      hasData: allTx.length > 0,
      empty: d.buildPage.moneyEmpty,
      line1: `${d.buildPage.balance}: ${formatMoney(balance)}`,
      line2: `${d.buildPage.net7}: ${formatMoney(net7)}`,
      danger: net7 < 0,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{d.buildPage.title}</h1>
          <p className="text-sm text-muted-foreground">
            {d.buildPage.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {build && (
            <BuildFormDialog
              workspaceId={active.id}
              build={build}
              hasActive
            />
          )}
          {!build && (
            <BuildFormDialog workspaceId={active.id} hasActive={false} />
          )}
        </div>
      </div>

      <CurrentBuildCard build={build} />

      {build && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gold-dark">
                {d.buildPage.playbook}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {d.buildPage.playbookHint}
              </p>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {playbookFields.map((key) => (
                  <div key={key}>
                    <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {d.buildFields[key]}
                    </dt>
                    <dd className="mt-0.5 text-sm text-ink">
                      {fieldValues[key]?.trim() || "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <RealityCheckPanel context={buildContext(build, active.goals)} />
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {subCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">{card.title}</CardTitle>
              <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                <Link href={card.href}>{d.common.open}</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {card.hasData ? (
                <>
                  <p className="text-ink">{card.line1}</p>
                  {card.line2 && (
                    <p
                      className={
                        card.danger
                          ? "font-medium text-danger"
                          : "text-muted-foreground"
                      }
                    >
                      {card.line2}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">{card.empty}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {others.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {d.buildPage.otherBuilds}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-line">
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
