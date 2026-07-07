"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { useT } from "@/components/locale-provider"
import { buzz } from "@/lib/haptics"
import { createClient } from "@/lib/supabase/client"

// "Minimum viable day": when the day is still empty, three one-tap logs
// keep the chain alive with the smallest honest action. Easier streaks
// retain longer — the bar to *start* must be on the floor.
export function MinimumDay({ workspaceId }: { workspaceId: string }) {
  const router = useRouter()
  const d = useT()
  const [saving, setSaving] = useState<string | null>(null)

  const options = [
    { type: "body", label: d.today.minBody },
    { type: "mind", label: d.today.minMind },
    { type: "build", label: d.today.minBuild },
  ] as const

  async function quickLog(type: string, label: string) {
    setSaving(type)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push("/login")
      return
    }
    const { error } = await supabase.from("logs").insert({
      user_id: user.id,
      workspace_id: workspaceId,
      type,
      data: type === "mind" ? { lesson: label } : { note: label },
    })
    setSaving(null)
    if (!error) {
      buzz()
      router.refresh()
    }
  }

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        {d.today.minimumTitle}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map(({ type, label }) => (
          <button
            key={type}
            type="button"
            disabled={saving !== null}
            onClick={() => quickLog(type, label)}
            className="rounded-full border border-gold/40 bg-gold/[0.06] px-3.5 py-2 text-xs font-medium text-gold-dark transition-all hover:bg-gold/10 active:scale-95 disabled:opacity-50"
          >
            {saving === type ? d.common.saving : label}
          </button>
        ))}
      </div>
    </div>
  )
}
