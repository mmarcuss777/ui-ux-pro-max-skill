"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { useT } from "@/components/locale-provider"
import { createClient } from "@/lib/supabase/client"

// Minimalist gold trash button for a single entry. One tap removes the row
// (optimistically hidden, then refreshed). Small and edge-aligned so it
// stays quiet until wanted.
export function DeleteEntry({
  table,
  id,
}: {
  table: "logs" | "transactions"
  id: string
}) {
  const router = useRouter()
  const d = useT()
  const [gone, setGone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function remove() {
    setBusy(true)
    const supabase = createClient()
    const { error } =
      table === "logs"
        ? await supabase.from("logs").delete().eq("id", id)
        : await supabase.from("transactions").delete().eq("id", id)
    if (error) {
      setBusy(false)
      return
    }
    setGone(true)
    router.refresh()
  }

  if (gone) return null

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      aria-label={d.common.delete}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gold-dark/40 transition-all hover:bg-gold/10 hover:text-gold-dark active:scale-90 disabled:opacity-40"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
      </svg>
    </button>
  )
}
