"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"

import { useT } from "@/components/locale-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Thirty gold bars — the month at a glance. Visible progress is the
// quietest but most durable reward in the app.
export function ScoreTrend({
  points,
}: {
  points: { date: string; score: number }[]
}) {
  const d = useT()

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground">
          {d.review.trendTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={points} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="date" hide />
              <YAxis domain={[0, 100]} hide />
              <Bar
                dataKey="score"
                fill="#C9A227"
                radius={[3, 3, 0, 0]}
                isAnimationActive
                animationDuration={700}
                background={{ fill: "rgba(28,23,16,0.04)", radius: 3 }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
