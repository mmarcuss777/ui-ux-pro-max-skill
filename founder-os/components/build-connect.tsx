"use client"

import { useRouter } from "next/navigation"

import { KeyDialog } from "@/components/connect-actions"
import { useT } from "@/components/locale-provider"

// One-row in-place connect for the Business pillar's measured sources.
// Gone once any of them is connected — then the pulse fills itself and
// the briefing switches to the strong model.
export function BuildConnectRow() {
  const router = useRouter()
  const d = useT()

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/25 bg-gold/[0.06] px-3.5 py-2.5">
      <p className="min-w-0 text-sm text-ink">{d.buildPage.connectRow}</p>
      <div className="flex shrink-0 flex-wrap gap-2">
        <KeyDialog
          provider="shopify"
          label="Shopify"
          onDone={() => router.refresh()}
        />
        <KeyDialog
          provider="plausible"
          label="Plausible"
          onDone={() => router.refresh()}
        />
        <KeyDialog
          provider="github"
          label="GitHub"
          onDone={() => router.refresh()}
        />
      </div>
    </div>
  )
}
