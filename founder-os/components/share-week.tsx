"use client"

import { useState } from "react"
import { Share1Icon } from "@radix-ui/react-icons"

import { useLocale, useT } from "@/components/locale-provider"
import { Button } from "@/components/ui/button"

// Renders the week as a clean 1080×1350 image (canvas, brand colors) and
// hands it to the native share sheet — building in public with one tap,
// and every share quietly markets Nexa ("Running on Nexa").
export function ShareWeek({
  scores,
  streakDays,
  focus,
}: {
  scores: { label: string; score: number }[]
  streakDays: number
  focus: string | null
}) {
  const d = useT()
  const locale = useLocale()
  const [busy, setBusy] = useState(false)

  async function share() {
    setBusy(true)
    try {
      const W = 1080
      const H = 1350
      const canvas = document.createElement("canvas")
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext("2d")!

      // paper background + soft gold veil
      ctx.fillStyle = "#FCFBF7"
      ctx.fillRect(0, 0, W, H)
      const veil = ctx.createLinearGradient(0, 0, 0, 420)
      veil.addColorStop(0, "rgba(212,175,55,0.10)")
      veil.addColorStop(1, "rgba(212,175,55,0)")
      ctx.fillStyle = veil
      ctx.fillRect(0, 0, W, 420)

      // logo
      ctx.fillStyle = "#C9A227"
      ctx.font = "bold 64px Inter, sans-serif"
      ctx.fillText("Nexa.", 80, 140)

      // date range
      const now = new Date()
      ctx.fillStyle = "#8A8375"
      ctx.font = "36px Inter, sans-serif"
      ctx.fillText(
        `${d.review.weekWord} · ${now.toLocaleDateString(locale === "sk" ? "sk-SK" : "en-GB", { day: "numeric", month: "long" })}`,
        80,
        200
      )

      // streak — the hero number
      ctx.fillStyle = "#1C1710"
      ctx.font = "bold 220px Inter, sans-serif"
      ctx.fillText(String(streakDays), 80, 470)
      ctx.fillStyle = "#8F6E14"
      ctx.font = "600 44px Inter, sans-serif"
      ctx.fillText(
        `${d.today.streak.toLowerCase()} · ${d.common.days}`,
        80,
        540
      )

      // pillar bars
      const barTop = 660
      const barMaxWidth = W - 160 - 260
      scores.forEach((pillar, index) => {
        const y = barTop + index * 120
        ctx.fillStyle = "#1C1710"
        ctx.font = "600 40px Inter, sans-serif"
        ctx.fillText(pillar.label, 80, y + 14)
        // track
        ctx.fillStyle = "rgba(28,23,16,0.06)"
        ctx.beginPath()
        ctx.roundRect(320, y - 22, barMaxWidth, 44, 22)
        ctx.fill()
        // fill
        const width = Math.max(44, (pillar.score / 10) * barMaxWidth)
        const gold = ctx.createLinearGradient(320, 0, 320 + width, 0)
        gold.addColorStop(0, "#E5BE3E")
        gold.addColorStop(1, "#8F6E14")
        ctx.fillStyle = gold
        ctx.beginPath()
        ctx.roundRect(320, y - 22, width, 44, 22)
        ctx.fill()
        ctx.fillStyle = "#1C1710"
        ctx.font = "bold 40px Inter, sans-serif"
        ctx.fillText(`${pillar.score}/10`, 320 + barMaxWidth + 30, y + 14)
      })

      // week focus
      if (focus) {
        ctx.fillStyle = "#8F6E14"
        ctx.font = "600 34px Inter, sans-serif"
        ctx.fillText(d.review.weekFocus.toUpperCase(), 80, 1180)
        ctx.fillStyle = "#1C1710"
        ctx.font = "bold 48px Inter, sans-serif"
        ctx.fillText(
          focus.length > 42 ? focus.slice(0, 41) + "…" : focus,
          80,
          1240
        )
      }

      // signature
      ctx.fillStyle = "#8A8375"
      ctx.font = "36px Inter, sans-serif"
      ctx.fillText(d.review.shareSignature, 80, H - 60)

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      )
      if (!blob) return
      const file = new File([blob], "nexa-week.png", { type: "image/png" })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] }).catch(() => undefined)
      } else {
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = "nexa-week.png"
        link.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button variant="outline" onClick={share} disabled={busy}>
      <Share1Icon className="mr-2 h-4 w-4" />
      {busy ? d.review.sharing : d.review.share}
    </Button>
  )
}
