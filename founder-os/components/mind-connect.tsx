"use client"

import { useRouter } from "next/navigation"

import { KeyDialog } from "@/components/connect-actions"
import { useT } from "@/components/locale-provider"

// One-row in-place connect for the Mind pillar's measured sources.
// Rendered only while neither source is connected — then it's gone and
// the pillar tightens (proof comes from measurement only).
export function MindConnectRow() {
  const router = useRouter()
  const d = useT()

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/25 bg-gold/[0.06] px-3.5 py-2.5">
      <p className="min-w-0 text-sm text-ink">{d.mind.connectRow}</p>
      <div className="flex shrink-0 gap-2">
        <KeyDialog
          provider="toggl"
          label="Toggl"
          onDone={() => router.refresh()}
        />
        <KeyDialog
          provider="rescuetime"
          label="RescueTime"
          onDone={() => router.refresh()}
        />
      </div>
    </div>
  )
}
