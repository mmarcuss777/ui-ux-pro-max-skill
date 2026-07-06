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

// Single-series trend: ink line, recessive grid, no legend (the card
// title names the series).
export function CashflowChart({ data }: { data: CashflowPoint[] }) {
  return (
    <div className="h-56 w-full" role="img" aria-label="Running balance trend">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#E3E6EC" strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => value.slice(5)}
            tick={{ fontSize: 12, fill: "#5A6472" }}
            tickLine={false}
            axisLine={{ stroke: "#E3E6EC" }}
            minTickGap={32}
          />
          <YAxis
            tickFormatter={(value: number) => formatMoney(value)}
            tick={{ fontSize: 12, fill: "#5A6472" }}
            tickLine={false}
            axisLine={false}
            width={70}
          />
          <Tooltip
            formatter={(value) => [formatMoney(Number(value)), "Balance"]}
            labelStyle={{ color: "#5A6472", fontSize: 12 }}
            contentStyle={{
              borderColor: "#E3E6EC",
              borderRadius: 8,
              fontSize: 13,
            }}
          />
          <Line
            type="monotone"
            dataKey="balance"
            stroke="#1B2A4A"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
