import { DailyLogForm } from "@/components/daily-log-form"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { today } from "@/lib/dates"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"
import type { Log } from "@/types/db"

function logSummary(log: Log): string {
  const data = (log.data ?? {}) as { note?: string; top_action?: string }
  return data.note || data.top_action || "—"
}

export default async function LogPage() {
  const supabase = createClient()
  const workspaces = await getWorkspaces()
  const active = resolveActiveWorkspace(workspaces)!

  const { data: todayLogs } = await supabase
    .from("logs")
    .select("*")
    .eq("date", today())
    .order("created_at", { ascending: false })

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Daily Log</h1>
        <p className="text-sm text-muted-foreground">
          Under a minute. Then get back to work.
        </p>
      </div>

      <DailyLogForm workspaceId={active.id} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Logged today</CardTitle>
        </CardHeader>
        <CardContent>
          {!todayLogs || todayLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing yet today.</p>
          ) : (
            <ul className="divide-y divide-line">
              {todayLogs.map((log) => (
                <li key={log.id} className="flex items-center gap-3 py-3">
                  <Badge variant="outline" className="capitalize">
                    {log.type}
                  </Badge>
                  {log.type === "daily" && log.score !== null && (
                    <span className="text-sm font-medium tabular-nums text-ink">
                      {log.score}
                    </span>
                  )}
                  <span className="truncate text-sm text-muted-foreground">
                    {logSummary(log)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
