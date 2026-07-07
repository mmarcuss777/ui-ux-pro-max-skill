import { DeleteEntry } from "@/components/delete-entry"
import { LogForm } from "@/components/log-form"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { today } from "@/lib/dates"
import { getT } from "@/lib/i18n-server"
import { BODY_TYPES, MIND_TYPES } from "@/lib/stats"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"
import type { Log } from "@/types/db"

type LogData = {
  note?: string
  top_action?: string
  lesson?: string
  action?: string // completed business steps from the step chain / briefing
}

function logSummary(log: Log): string {
  const data = (log.data ?? {}) as LogData
  return data.lesson || data.note || data.action || data.top_action || "—"
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
    .in("type", ["daily", "body", "mind", "build", "fitness", "learning"])
    .order("created_at", { ascending: false })

  function tabLabel(type: string): string {
    if (type === "daily") return d.log.dailyTab
    if (BODY_TYPES.includes(type)) return d.log.bodyTab
    if (MIND_TYPES.includes(type)) return d.log.mindTab
    return d.log.buildTab
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">{d.log.title}</h1>
        <p className="text-sm text-muted-foreground">{d.log.subtitle}</p>
      </div>

      <LogForm workspaceId={active.id} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{d.log.loggedToday}</CardTitle>
        </CardHeader>
        <CardContent>
          {!todayLogs || todayLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{d.log.nothingYet}</p>
          ) : (
            <ul className="divide-y divide-line">
              {todayLogs.map((log) => (
                <li key={log.id} className="flex items-center gap-3 py-3">
                  <Badge variant="outline" className="border-gold/30 text-gold-dark">
                    {tabLabel(log.type)}
                  </Badge>
                  <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                    {logSummary(log)}
                  </span>
                  <DeleteEntry table="logs" id={log.id} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
