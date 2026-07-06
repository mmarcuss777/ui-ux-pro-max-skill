"use client"

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { formatMoney } from "@/lib/money"

export type CashflowPoint = {
  date: string // YYYY-MM-DD
  balance: number
}

// Single-series trend on the porcelain surface: gold gradient line,
// recessive grid, no legend (the card title names the series).
export function CashflowChart({ data }: { data: CashflowPoint[] }) {
  return (
    <div className="h-56 w-full" role="img" aria-label="Running balance trend">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="nexaLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#E3C55C" />
              <stop offset="100%" stopColor="#8F6E14" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#EDE9DE" strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => value.slice(5)}
            tick={{ fontSize: 12, fill: "#8A8474" }}
            tickLine={false}
            axisLine={{ stroke: "#E7E2D6" }}
            minTickGap={32}
          />
          <YAxis
            tickFormatter={(value: number) => formatMoney(value)}
            tick={{ fontSize: 12, fill: "#8A8474" }}
            tickLine={false}
            axisLine={false}
            width={70}
          />
          <Tooltip
            formatter={(value) => [formatMoney(Number(value)), "Balance"]}
            labelStyle={{ color: "#8A8474", fontSize: 12 }}
            itemStyle={{ color: "#1C1710" }}
            contentStyle={{
              backgroundColor: "#FFFFFF",
              borderColor: "#E7E2D6",
              borderRadius: 12,
              fontSize: 13,
            }}
          />
          <Line
            type="monotone"
            dataKey="balance"
            stroke="url(#nexaLine)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: "#C9A227", stroke: "#FFFFFF" }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
