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

// Single-series trend on the dark surface: cyan→violet gradient line,
// recessive grid, no legend (the card title names the series).
export function CashflowChart({ data }: { data: CashflowPoint[] }) {
  return (
    <div className="h-56 w-full" role="img" aria-label="Running balance trend">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="nexaLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22D3EE" />
              <stop offset="100%" stopColor="#C084FC" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#242C4A" strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => value.slice(5)}
            tick={{ fontSize: 12, fill: "#8A94B8" }}
            tickLine={false}
            axisLine={{ stroke: "#242C4A" }}
            minTickGap={32}
          />
          <YAxis
            tickFormatter={(value: number) => formatMoney(value)}
            tick={{ fontSize: 12, fill: "#8A94B8" }}
            tickLine={false}
            axisLine={false}
            width={70}
          />
          <Tooltip
            formatter={(value) => [formatMoney(Number(value)), "Balance"]}
            labelStyle={{ color: "#8A94B8", fontSize: 12 }}
            itemStyle={{ color: "#EEF1FA" }}
            contentStyle={{
              backgroundColor: "#101736",
              borderColor: "#242C4A",
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
            activeDot={{ r: 4, fill: "#C084FC", stroke: "#0A0F1E" }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
