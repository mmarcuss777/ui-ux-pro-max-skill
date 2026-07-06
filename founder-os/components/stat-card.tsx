import { ArrowDownIcon, ArrowUpIcon, DashIcon } from "@radix-ui/react-icons"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type Trend = "up" | "down" | "flat"

// Number + trend arrow + comparison chip. tone colors the chip (an improving
// number can be a falling one, e.g. costs), so the caller decides what's good.
export function StatCard({
  label,
  value,
  trend,
  trendLabel,
  tone = "neutral",
}: {
  label: string
  value: string
  trend: Trend
  trendLabel: string
  tone?: "ok" | "danger" | "neutral"
}) {
  const TrendIcon =
    trend === "up" ? ArrowUpIcon : trend === "down" ? ArrowDownIcon : DashIcon

  return (
    <Card className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-cyan-400 via-violet-500 to-fuchsia-500"
      />
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-2 text-4xl font-bold tabular-nums text-ink">
          {value}
        </p>
        <span
          className={cn(
            "mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
            tone === "ok" && "bg-ok/15 text-ok",
            tone === "danger" && "bg-danger/15 text-danger",
            tone === "neutral" && "bg-secondary text-muted-foreground"
          )}
        >
          <TrendIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {trendLabel}
        </span>
      </CardContent>
    </Card>
  )
}
