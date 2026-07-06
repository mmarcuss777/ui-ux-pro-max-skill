import {
  ArrowDownIcon,
  ArrowUpIcon,
  DashIcon,
} from "@radix-ui/react-icons"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type Trend = "up" | "down" | "flat"

// Number + trend arrow + comparison to last week.
// tone colors the trend (an improving number can be a falling one, e.g. costs),
// so the caller decides what counts as good.
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
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums text-ink">
          {value}
        </p>
        <p
          className={cn(
            "mt-1 flex items-center gap-1 text-sm",
            tone === "ok" && "text-ok",
            tone === "danger" && "text-danger",
            tone === "neutral" && "text-muted-foreground"
          )}
        >
          <TrendIcon className="h-4 w-4 shrink-0" aria-hidden />
          <span>{trendLabel}</span>
        </p>
      </CardContent>
    </Card>
  )
}
