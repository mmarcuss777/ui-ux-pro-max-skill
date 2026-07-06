import { ScreenTimeUploader } from "@/components/screen-time-uploader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getT } from "@/lib/i18n-server"
import { createClient } from "@/lib/supabase/server"
import type { Log } from "@/types/db"

type ScreenData = {
  total_minutes?: number | null
  wasted_minutes?: number | null
  top_apps?: { name: string; minutes: number }[]
  analysis?: string
}

function formatMinutes(minutes: number | null | undefined): string {
  if (typeof minutes !== "number") return "—"
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return hours > 0 ? `${hours} h ${rest} min` : `${rest} min`
}

export default async function ScreenPage() {
  const supabase = createClient()
  const { d } = getT()

  const { data: analyses } = await supabase
    .from("logs")
    .select("*")
    .eq("type", "screen_time")
    .order("created_at", { ascending: false })
    .limit(10)

  const history: Log[] = analyses ?? []

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">{d.screen.title}</h1>
        <p className="text-sm text-muted-foreground">{d.screen.subtitle}</p>
        <p className="mt-2 text-xs text-muted-foreground">{d.screen.howTo}</p>
      </div>

      <ScreenTimeUploader />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{d.screen.history}</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {d.screen.noHistory}
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {history.map((entry) => {
                const data = (entry.data ?? {}) as ScreenData
                return (
                  <li key={entry.id} className="space-y-2 py-4">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className="text-muted-foreground">
                        {entry.date}
                      </span>
                      <span>
                        {d.screen.total}:{" "}
                        <span className="font-semibold tabular-nums text-ink">
                          {formatMinutes(data.total_minutes)}
                        </span>
                      </span>
                      <span>
                        {d.screen.reclaimable}:{" "}
                        <span className="font-semibold tabular-nums text-ok">
                          {formatMinutes(data.wasted_minutes)}
                        </span>
                      </span>
                    </div>
                    {data.top_apps && data.top_apps.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {data.top_apps
                          .map((app) => `${app.name} ${app.minutes} min`)
                          .join(" · ")}
                      </p>
                    )}
                    {data.analysis && (
                      <details>
                        <summary className="cursor-pointer text-xs font-medium text-ink">
                          {d.screen.analyze}
                        </summary>
                        <pre className="mt-2 whitespace-pre-wrap font-sans text-xs text-muted-foreground">
                          {data.analysis}
                        </pre>
                      </details>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
