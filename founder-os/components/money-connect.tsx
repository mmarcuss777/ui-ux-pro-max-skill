"use client"

import { useRouter } from "next/navigation"

import { CsvDialog, KeyDialog } from "@/components/connect-actions"
import { useT } from "@/components/locale-provider"

// One-row in-place connect for the Money pillar: import a bank/statement
// CSV right here, or paste a Stripe key. Hidden once a live money source
// is connected (CSV stays available on the Connect page).
export function MoneyConnectRow({ workspaceId }: { workspaceId: string }) {
  const router = useRouter()
  const d = useT()

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/25 bg-gold/[0.06] px-3.5 py-2.5">
      <p className="min-w-0 text-sm text-ink">{d.money.connectRow}</p>
      <div className="flex shrink-0 gap-2">
        <CsvDialog workspaceId={workspaceId} kind="money" />
        <KeyDialog
          provider="stripe"
          label="Stripe"
          onDone={() => router.refresh()}
        />
      </div>
    </div>
  )
}
