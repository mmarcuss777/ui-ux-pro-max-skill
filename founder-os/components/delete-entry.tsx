"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { useT } from "@/components/locale-provider"
import { createClient } from "@/lib/supabase/client"

// Minimalist gold trash button for a single entry. The WHOLE row fades
// and slides out the instant it's tapped (optimistic), the delete and
// refresh run behind the animation — removal never feels like a hard cut.
export function DeleteEntry({
  table,
  id,
}: {
  table: "logs" | "transactions"
  id: string
}) {
  const router = useRouter()
  const d = useT()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [busy, setBusy] = useState(false)

  function rowElement(): HTMLElement | null {
    return buttonRef.current?.closest("li") ?? null
  }

  async function remove() {
    setBusy(true)
    // Optimistic exit: collapse the row visually right away.
    const row = rowElement()
    if (row) {
      row.style.transition =
        "opacity 0.18s ease-out, transform 0.18s ease-out, max-height 0.22s ease-out 0.1s, padding 0.22s ease-out 0.1s"
      row.style.maxHeight = `${row.offsetHeight}px`
      row.style.overflow = "hidden"
      requestAnimationFrame(() => {
        row.style.opacity = "0"
        row.style.transform = "translateX(8px)"
        row.style.maxHeight = "0"
        row.style.paddingTop = "0"
        row.style.paddingBottom = "0"
      })
    }

    const supabase = createClient()
    const { error } =
      table === "logs"
        ? await supabase.from("logs").delete().eq("id", id)
        : await supabase.from("transactions").delete().eq("id", id)
    if (error) {
      // Roll the animation back — the row is still real.
      if (row) {
        row.style.opacity = "1"
        row.style.transform = ""
        row.style.maxHeight = ""
        row.style.paddingTop = ""
        row.style.paddingBottom = ""
      }
      setBusy(false)
      return
    }
    router.refresh()
    router.prefetch("/dashboard")
  }

  return (
    <button
      ref={buttonRef}
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
