import { CONNECTORS, type Provider } from "@/lib/connectors/registry"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getT } from "@/lib/i18n-server"
import { createClient } from "@/lib/supabase/server"

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

  // Tolerates a missing table (pre-migration) — everything renders as
  // not connected until 0006 runs.
  const { data } = await supabase.from("integrations").select("*")
  const rows = data ?? []

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
          <p className="mt-2 text-sm text-muted-foreground">
            {d.connect.learnedEmpty}
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {CONNECTORS.map((connector) => {
          const row = rows.find((r) => r.provider === connector.provider)
          const isConnected = row?.status === "connected"
          const isReady = connector.availability === "ready"
          return (
            <Card key={connector.provider}>
              <CardContent className="space-y-2.5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-semibold text-ink">
                      {PROVIDER_NAMES[connector.provider]}
                    </p>
                    <Badge variant="outline" className="shrink-0 border-gold/30 text-[10px] text-gold-dark">
                      {d.pillars[connector.pillar]}
                    </Badge>
                  </div>
                  <span
                    className={
                      isConnected
                        ? "shrink-0 text-xs font-semibold text-ok"
                        : "shrink-0 text-xs text-muted-foreground"
                    }
                  >
                    {isConnected
                      ? `${d.connect.connected}${
                          row?.last_sync_at
                            ? ` · ${d.connect.lastSync} ${new Date(row.last_sync_at).toLocaleTimeString(locale === "sk" ? "sk-SK" : "en-GB", { hour: "2-digit", minute: "2-digit" })}`
                            : ""
                        }`
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
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button variant="outline" size="sm" className="h-9" disabled>
                      {connector.provider === "csv"
                        ? d.connect.importCta
                        : d.connect.connectCta}
                    </Button>
                    {isConnected && (
                      <>
                        <Button variant="ghost" size="sm" className="h-9">
                          {d.connect.disconnect}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 text-danger hover:text-danger"
                        >
                          {d.connect.deleteData}
                        </Button>
                      </>
                    )}
                  </div>
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
