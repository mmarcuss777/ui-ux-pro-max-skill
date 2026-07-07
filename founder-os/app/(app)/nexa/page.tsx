import { AskNexa } from "@/components/ask-nexa"
import { DeleteEntry } from "@/components/delete-entry"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { daysAgo, shortDate, today } from "@/lib/dates"
import { getT } from "@/lib/i18n-server"
import { createClient } from "@/lib/supabase/server"
import type { Log } from "@/types/db"

type NexaQa = { question?: string; answer?: string; mode?: string | null }

export default async function NexaPage() {
  const supabase = createClient()
  const { d, locale } = getT()

  // Recent answers give the page memory — a reason to come back even
  // without a new question.
  const { data } = await supabase
    .from("logs")
    .select("*")
    .eq("type", "nexa_qa")
    .order("created_at", { ascending: false })
    .limit(5)
  const history: Log[] = data ?? []

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          <span className="gold-text">{d.nexa.title}</span>
        </h1>
        <p className="text-sm text-muted-foreground">{d.nexa.subtitle}</p>
      </div>

      <AskNexa />

      {history.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{d.nexa.history}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-line">
              {history.map((row) => {
                const qa = (row.data ?? {}) as NexaQa
                return (
                  <li key={row.id} className="space-y-1.5 py-3">
                    <div className="flex items-baseline gap-2">
                      <p className="flex min-w-0 flex-1 items-baseline gap-2 text-sm font-medium text-ink">
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {row.date === today()
                            ? d.common.todayWord
                            : row.date === daysAgo(1)
                              ? d.common.yesterdayWord
                              : shortDate(row.date, locale)}
                        </span>
                        <span className="min-w-0">{qa.question || "—"}</span>
                      </p>
                      <DeleteEntry table="logs" id={row.id} />
                    </div>
                    <details>
                      <summary className="cursor-pointer text-xs font-medium text-gold-dark">
                        {d.common.open}
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-muted-foreground">
                        {qa.answer || "—"}
                      </pre>
                    </details>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
