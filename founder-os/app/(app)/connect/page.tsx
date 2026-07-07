import { CONNECTORS, type Provider } from "@/lib/connectors/registry"
import { ConnectActions } from "@/components/connect-actions"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { daysAgo } from "@/lib/dates"
import { getT } from "@/lib/i18n-server"
import {
  BODY_TYPES,
  metricActionDates,
  type MetricSlim,
} from "@/lib/stats"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"

const PROVIDER_NAMES: Record<Provider, string> = {
  csv: "CSV / Google Sheets",
  strava: "Strava",
  apple_health: "Apple Health",
  stripe: "Stripe",
  shopify: "Shopify",
  plausible: "Plausible",
  ga4: "Google Analytics",
  garmin: "Garmin",
}

// Connect Data: the single place where external sources live. Cards show
// state + exactly what gets imported; the top panel shows what Nexa
// UNDERSTOOD, never raw metric dumps.
export default async function ConnectPage() {
  const supabase = createClient()
  const { d, locale } = getT()
  const workspaces = await getWorkspaces()
  const active = resolveActiveWorkspace(workspaces)!
  const weekAgo = daysAgo(6)

  const [{ data }, { data: weekLogs }, { data: weekTx }, { data: weekMetrics }] =
    await Promise.all([
      supabase.from("integrations").select("*"),
      supabase.from("logs").select("date,type").gte("date", weekAgo),
      supabase.from("transactions").select("date").gte("date", weekAgo),
      supabase
        .from("imported_metrics")
        .select("date,metric,value")
        .gte("date", weekAgo),
    ])
  const rows = data ?? []
  const metrics: MetricSlim[] = weekMetrics ?? []

  // "Nexa learned this week" — three plain sentences, not fifty charts.
  const logs = weekLogs ?? []
  const metricDays = metricActionDates(metrics)
  const bodyDays = new Set([
    ...logs.filter((l) => BODY_TYPES.includes(l.type)).map((l) => l.date),
    ...metrics
      .filter((m) => m.metric === "workouts" && m.value > 0)
      .map((m) => m.date),
  ]).size
  const buildDays = new Set([
    ...logs.filter((l) => l.type === "build").map((l) => l.date),
    ...metrics
      .filter((m) => (m.metric === "orders" || m.metric === "revenue") && m.value > 0)
      .map((m) => m.date),
  ]).size
  const moneyDays = new Set((weekTx ?? []).map((t) => t.date)).size
  const hasAnything = rows.length > 0 || metrics.length > 0
  const learned = [
    `${d.pillars.body} · ${bodyDays}/7 ${d.review.daysActive}`,
    `${d.pillars.build} · ${buildDays}/7 ${d.review.daysActive}`,
    `${d.pillars.money} · ${moneyDays}/7 ${d.review.daysActive}`,
  ]

  const metricLabel = (key: string): string => {
    const dict = d.connect as unknown as Record<string, string>
    return dict[`m_${key}`] ?? key
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">{d.connect.title}</h1>
        <p className="text-sm text-muted-foreground">{d.connect.subtitle}</p>
      </div>

      <Card className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-gold-light via-gold to-transparent"
        />
        <CardContent className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gold-dark">
            {d.connect.learnedTitle}
          </p>
          {hasAnything ? (
            <ul className="mt-2 space-y-1 text-sm text-ink">
              {learned.map((line) => (
                <li key={line}>{line}</li>
              ))}
              {metricDays.size > 0 && (
                <li className="text-muted-foreground">
                  {d.connect.importsLabel}: {metricDays.size}/7{" "}
                  {d.review.daysActive}
                </li>
              )}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              {d.connect.learnedEmpty}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {CONNECTORS.map((connector) => {
          const row = rows.find((r) => r.provider === connector.provider)
          const isConnected = row?.status === "connected"
          const hasError = row?.status === "error"
          const isReady = ![
            "apple_health",
            "ga4",
          ].includes(connector.provider)
          return (
            <Card key={connector.provider}>
              <CardContent className="space-y-2.5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-semibold text-ink">
                      {PROVIDER_NAMES[connector.provider]}
                    </p>
                    <Badge
                      variant="outline"
                      className="shrink-0 border-gold/30 text-[10px] text-gold-dark"
                    >
                      {d.pillars[connector.pillar]}
                    </Badge>
                  </div>
                  <span
                    className={
                      isConnected
                        ? "shrink-0 text-xs font-semibold text-ok"
                        : hasError
                          ? "shrink-0 text-xs font-semibold text-danger"
                          : "shrink-0 text-xs text-muted-foreground"
                    }
                  >
                    {isConnected
                      ? `${d.connect.connected}${
                          row?.last_sync_at
                            ? ` · ${d.connect.lastSync} ${new Date(row.last_sync_at).toLocaleTimeString(locale === "sk" ? "sk-SK" : "en-GB", { hour: "2-digit", minute: "2-digit" })}`
                            : ""
                        }`
                      : hasError
                        ? (row?.error ?? d.common.error).slice(0, 60)
                        : isReady
                          ? d.connect.notConnected
                          : d.connect.comingSoon}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground">
                  {d.connect.importsLabel}:{" "}
                  {connector.metrics.map(metricLabel).join(" · ")}
                </p>

                {isReady && (
                  <ConnectActions
                    provider={connector.provider}
                    isConnected={isConnected || hasError}
                    workspaceId={active.id}
                  />
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground">{d.connect.principle}</p>
    </div>
  )
}
