"use client"

import { useEffect, useState } from "react"

// Circular progress with a gold gradient stroke — the Daily Score
// centerpiece. Fills from zero with a spring sweep on mount.
export function ScoreRing({
  value,
  size = 168,
  label,
}: {
  value: number // 0-100
  size?: number
  label: string
}) {
  const stroke = 11
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, value))
  const [shown, setShown] = useState(0)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(clamped))
    return () => cancelAnimationFrame(frame)
  }, [clamped])

  const offset = circumference * (1 - shown / 100)

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${clamped}/100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ringGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F0D77B" />
            <stop offset="55%" stopColor="#C9A227" />
            <stop offset="100%" stopColor="#8F6E14" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#ECE7DA"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#ringGold)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            filter: "drop-shadow(0 2px 6px rgba(201,162,39,0.35))",
            transition: "stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tabular-nums text-ink">
          {clamped}
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          / 100
        </span>
      </div>
    </div>
  )
}
