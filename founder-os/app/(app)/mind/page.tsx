import { MindFormDialog } from "@/components/mind-form-dialog"
import { ScreenTimeUploader } from "@/components/screen-time-uploader"
import { WeekGrid } from "@/components/week-grid"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { daysAgo } from "@/lib/dates"
import { getT } from "@/lib/i18n-server"
import type { MindData } from "@/lib/log-schema"
import { MIND_TYPES, streak, weekGrid } from "@/lib/stats"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"
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

export default async function MindPage() {
  const supabase = createClient()
  const { d } = getT()
  const workspaces = await getWorkspaces()
  const active = resolveActiveWorkspace(workspaces)!

  const [{ data: mindLogs }, { data: screenLogs }] = await Promise.all([
    supabase
      .from("logs")
      .select("*")
      .in("type", MIND_TYPES)
      .gte("date", daysAgo(90))
      .order("date", { ascending: false }),
    supabase
      .from("logs")
      .select("*")
      .eq("type", "screen_time")
      .order("created_at", { ascending: false })
      .limit(10),
  ])

  const logs: Log[] = mindLogs ?? []
  const dates = new Set(logs.map((l) => l.date))
  const currentStreak = streak(dates)
  const grid = weekGrid(dates)
  const recent = logs.slice(0, 10)
  const analyses: Log[] = screenLogs ?? []

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{d.mind.title}</h1>
          <p className="text-sm text-muted-foreground">{d.mind.subtitle}</p>
        </div>
        <MindFormDialog workspaceId={active.id} />
      </div>

      <Tabs defaultValue="journal">
        <TabsList className="grid h-11 w-full max-w-xs grid-cols-2">
          <TabsTrigger value="journal" className="h-9">
            {d.mind.journalTab}
          </TabsTrigger>
          <TabsTrigger value="focus" className="h-9">
            {d.mind.focusTab}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="journal" className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="relative overflow-hidden">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-gold-light via-gold to-transparent"
              />
              <CardContent className="p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {d.mind.streak}
                </p>
                <p className="mt-2 text-4xl font-bold tabular-nums text-ink">
                  {currentStreak}
                  <span className="ml-2 text-base font-normal text-muted-foreground">
                    {d.common.days}
                  </span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {d.mind.thisWeek}
                </p>
                <div className="mt-3">
                  <WeekGrid days={grid} />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{d.mind.recent}</CardTitle>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">{d.mind.empty}</p>
              ) : (
                <ul className="divide-y divide-line">
                  {recent.map((log) => {
                    const data = (log.data ?? {}) as MindData
                    const chips: string[] = []
                    if (typeof data.focus === "number")
                      chips.push(`${data.focus}/5 ${d.mind.focusShort}`)
                    if (typeof data.learning_minutes === "number")
                      chips.push(
                        `${data.learning_minutes} ${d.mind.minutesShort}`
                      )
                    return (
                      <li key={log.id} className="space-y-1 py-3">
                        <div className="flex items-center gap-3">
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {log.date}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm text-ink">
                            {data.lesson || data.note || "—"}
                          </span>
                          {chips.length > 0 && (
                            <span className="shrink-0 rounded-full bg-gold/10 px-2 py-0.5 text-[11px] font-medium tabular-nums text-gold-dark">
                              {chips.join(" · ")}
                            </span>
                          )}
                        </div>
                        {(data.tomorrow || data.note) && data.lesson && (
                          <p className="pl-[4.5rem] text-xs text-muted-foreground">
                            {data.tomorrow || data.note}
                          </p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="focus" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">{d.screen.subtitle}</p>
          <p className="text-xs text-muted-foreground">{d.screen.howTo}</p>

          <ScreenTimeUploader />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{d.screen.history}</CardTitle>
            </CardHeader>
            <CardContent>
              {analyses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {d.screen.noHistory}
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {analyses.map((entry) => {
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
                            <span className="font-semibold tabular-nums text-gold-dark">
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
                            <summary className="cursor-pointer text-xs font-medium text-gold-dark">
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
