import { DailyLogForm } from "@/components/daily-log-form"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { today } from "@/lib/dates"
import { getT } from "@/lib/i18n-server"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"
import type { Log } from "@/types/db"

type LogData = {
  note?: string
  top_action?: string
  ai_score?: number
  ai_reason?: string
}

function logSummary(log: Log): string {
  const data = (log.data ?? {}) as LogData
  return data.note || data.top_action || "—"
}

export default async function LogPage() {
  const supabase = createClient()
  const { d } = getT()
  const workspaces = await getWorkspaces()
  const active = resolveActiveWorkspace(workspaces)!

  const { data: todayLogs } = await supabase
    .from("logs")
    .select("*")
    .eq("date", today())
    .in("type", ["daily", "fitness", "learning"])
    .order("created_at", { ascending: false })

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">{d.log.title}</h1>
        <p className="text-sm text-muted-foreground">{d.log.subtitle}</p>
      </div>

      <DailyLogForm workspaceId={active.id} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{d.log.loggedToday}</CardTitle>
        </CardHeader>
        <CardContent>
          {!todayLogs || todayLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{d.log.nothingYet}</p>
          ) : (
            <ul className="divide-y divide-line">
              {todayLogs.map((log) => {
                const data = (log.data ?? {}) as LogData
                return (
                  <li key={log.id} className="space-y-1 py-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">
                        {
                          d.labels[
                            log.type as "daily" | "fitness" | "learning"
                          ]
                        }
                      </Badge>
                      {log.type === "daily" && log.score !== null && (
                        <span className="text-sm font-medium tabular-nums text-ink">
                          {log.score}
                        </span>
                      )}
                      <span className="min-w-0 truncate text-sm text-muted-foreground">
                        {logSummary(log)}
                      </span>
                      {typeof data.ai_score === "number" && (
                        <Badge className="ml-auto shrink-0 border-transparent bg-gradient-to-r from-indigo-500 to-fuchsia-500 tabular-nums text-white">
                          {d.dashboard.aiScore} {data.ai_score}/10
                        </Badge>
                      )}
                    </div>
                    {data.ai_reason && (
                      <p className="text-xs text-muted-foreground">
                        {data.ai_reason}
                      </p>
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
