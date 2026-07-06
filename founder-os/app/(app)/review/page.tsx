import { ReviewGenerator } from "@/components/review-generator"
import { daysAgo, today } from "@/lib/dates"
import { getT } from "@/lib/i18n-server"
import { formatMoney } from "@/lib/money"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"
import type { Experiment, Log, Transaction } from "@/types/db"

type DailyData = {
  energy?: number
  note?: string
  top_action?: string
  top_action_done?: boolean
}

function buildSummary(
  workspaceName: string,
  businessType: string,
  logs: Log[],
  experiments: Experiment[],
  transactions: Transaction[]
): string {
  const lines: string[] = []
  lines.push(`Week: ${daysAgo(6)} to ${today()}`)
  lines.push(`Workspace: ${workspaceName} (${businessType})`)
  lines.push("")

  const daily = logs.filter((l) => l.type === "daily")
  const fitnessDays = new Set(
    logs.filter((l) => l.type === "fitness").map((l) => l.date)
  ).size
  const learningDays = new Set(
    logs.filter((l) => l.type === "learning").map((l) => l.date)
  ).size

  lines.push(`Daily logs (${daily.length} of 7 days):`)
  if (daily.length === 0) {
    lines.push("- none — no daily tracking this week")
  }
  for (const log of daily) {
    const data = (log.data ?? {}) as DailyData
    const parts = [`score ${log.score ?? "?"}`, `energy ${data.energy ?? "?"}`]
    if (data.top_action) {
      parts.push(
        `top action "${data.top_action}" ${data.top_action_done ? "done" : "NOT done"}`
      )
    }
    if (data.note) parts.push(`note: ${data.note}`)
    lines.push(`- ${log.date}: ${parts.join(", ")}`)
  }
  lines.push(`Fitness: ${fitnessDays} of 7 days. Learning: ${learningDays} of 7 days.`)
  lines.push("")

  lines.push(`Experiments (${experiments.length}):`)
  if (experiments.length === 0) {
    lines.push("- none — nothing is being tested")
  }
  for (const experiment of experiments) {
    const status =
      experiment.status === "decided"
        ? `decided: ${experiment.decision ?? "no decision set"}`
        : experiment.status
    const extras = [
      experiment.metric ? `metric: ${experiment.metric}` : null,
      experiment.deadline ? `deadline: ${experiment.deadline}` : null,
      experiment.result ? `result: ${experiment.result}` : null,
    ].filter(Boolean)
    lines.push(
      `- [${status}] ${experiment.hypothesis}${extras.length ? ` (${extras.join(", ")})` : ""}`
    )
  }
  lines.push("")

  const moneyIn = transactions
    .filter((t) => t.type === "in")
    .reduce((sum, t) => sum + t.amount, 0)
  const moneyOut = transactions
    .filter((t) => t.type === "out")
    .reduce((sum, t) => sum + t.amount, 0)
  lines.push(
    `Money (7 days): in ${formatMoney(moneyIn)}, out ${formatMoney(moneyOut)}, net ${formatMoney(moneyIn - moneyOut)}`
  )
  for (const t of transactions) {
    lines.push(
      `- ${t.date} ${t.type === "in" ? "+" : "-"}${formatMoney(t.amount)} ${t.category ?? ""} ${t.note ?? ""}`.trimEnd()
    )
  }

  return lines.join("\n")
}

export default async function ReviewPage() {
  const supabase = createClient()
  const { d } = getT()
  const workspaces = await getWorkspaces()
  const active = resolveActiveWorkspace(workspaces)!
  const weekAgo = daysAgo(6)

  const [{ data: logs }, { data: experiments }, { data: transactions }] =
    await Promise.all([
      supabase
        .from("logs")
        .select("*")
        .gte("date", weekAgo)
        .in("type", ["daily", "fitness", "learning"])
        .order("date"),
      supabase
        .from("experiments")
        .select("*")
        .eq("workspace_id", active.id)
        .order("created_at"),
      supabase
        .from("transactions")
        .select("*")
        .gte("date", weekAgo)
        .order("date"),
    ])

  const summary = buildSummary(
    active.name,
    active.business_type,
    logs ?? [],
    experiments ?? [],
    transactions ?? []
  )

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">{d.review.title}</h1>
        <p className="text-sm text-muted-foreground">{d.review.subtitle}</p>
      </div>

      <ReviewGenerator summary={summary} />

      <details className="rounded-xl border border-line p-4">
        <summary className="cursor-pointer text-sm font-medium text-ink">
          {d.review.dataSent}
        </summary>
        <pre className="mt-3 whitespace-pre-wrap font-sans text-xs text-muted-foreground">
          {summary}
        </pre>
      </details>
    </div>
  )
}
