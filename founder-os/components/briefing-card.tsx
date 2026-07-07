"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckIcon, LightningBoltIcon } from "@radix-ui/react-icons"

import { useLocale, useT } from "@/components/locale-provider"
import { buzz } from "@/lib/haptics"
import type { BriefingData } from "@/lib/log-schema"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// Nexa's daily read of the business: signal → conclusion → one move.
// Completing the move writes a real 'build' log — pillar lights, streak
// holds — and marks the briefing as executed.
export function BriefingCard({
  briefingId,
  briefing,
  workspaceId,
  fullAi,
}: {
  briefingId: string | null
  briefing: BriefingData | null
  workspaceId: string
  // Live data present → the strong model runs (shown as a chip).
  fullAi: boolean
}) {
  const router = useRouter()
  const d = useT()
  const locale = useLocale()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [optimisticDone, setOptimisticDone] = useState<boolean | null>(null)
  const [justWon, setJustWon] = useState(false)

  async function generate(force: boolean) {
    setLoading(true)
    setError(null)
    const response = await fetch("/api/ai/briefing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, force }),
    })
    setLoading(false)
    if (response.status === 429) {
      setError(d.buildPage.limitReached)
      return
    }
    if (!response.ok) {
      setError(d.common.error)
      return
    }
    router.refresh()
  }

  const done = optimisticDone ?? briefing?.move_done === true

  async function markMoveDone() {
    if (!briefing?.move || !briefingId || done) return
    setOptimisticDone(true)
    setJustWon(true)
    buzz()
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { error: logError } = await supabase.from("logs").insert({
      user_id: user.id,
      workspace_id: workspaceId,
      type: "build",
      data: { action: briefing.move, source: "briefing" },
    })
    if (logError) {
      setOptimisticDone(false)
      setJustWon(false)
      return
    }
    await supabase
      .from("logs")
      .update({ data: { ...briefing, move_done: true } })
      .eq("id", briefingId)
    router.refresh()
  }

  return (
    <Card className="border-gold/25">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base text-gold-dark">
            <LightningBoltIcon className="h-4 w-4" />
            {d.briefing.title}
            <span
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                (briefing?.full ?? fullAi)
                  ? "gold-fill"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {(briefing?.full ?? fullAi)
                ? d.briefing.fullAi
                : d.briefing.liteAi}
            </span>
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {d.briefing.hint}
          </p>
        </div>
        {briefing ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => generate(true)}
            disabled={loading}
          >
            {loading ? d.briefing.generating : d.briefing.regenerate}
          </Button>
        ) : (
          <Button
            variant="outline"
            className="h-9 border-gold/40 text-gold-dark hover:text-gold-dark"
            onClick={() => generate(false)}
            disabled={loading}
          >
            {loading ? d.briefing.generating : d.briefing.generate}
          </Button>
        )}
      </CardHeader>
      {(briefing || error) && (
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-danger">{error}</p>}
          {briefing?.content && (
            <pre className="whitespace-pre-wrap font-sans text-sm text-ink">
              {briefing.content}
            </pre>
          )}
          {briefing?.move && (
            <div
              className={cn(
                "flex items-start gap-3 rounded-xl border border-gold/30 bg-gold/[0.06] p-3",
                justWon && done && "animate-glow"
              )}
            >
              <button
                type="button"
                onClick={markMoveDone}
                aria-pressed={done}
                aria-label={d.briefing.markDone}
                disabled={done}
                className={cn(
                  "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all active:scale-95",
                  done
                    ? "gold-fill border-transparent shadow-md shadow-gold/30"
                    : "border-gold/70 bg-card text-gold-dark hover:border-gold hover:bg-gold/10",
                  justWon && done && "animate-pop"
                )}
              >
                <CheckIcon className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-gold-dark">
                  {d.briefing.todayMove}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-sm font-semibold leading-snug",
                    done ? "text-ink/60" : "text-ink"
                  )}
                >
                  {briefing.move}
                </p>
                {done && (
                  <p className="mt-1 text-xs font-medium text-gold-dark">
                    {d.briefing.moveDone}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
