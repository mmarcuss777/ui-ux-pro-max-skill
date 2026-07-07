"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckIcon } from "@radix-ui/react-icons"

import { useT } from "@/components/locale-provider"
import { buzz } from "@/lib/haptics"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PrimaryCta } from "@/components/primary-cta"
import { cn } from "@/lib/utils"

export type StepHistoryItem = { id: string; date: string; action: string }

// The step chain: one next step at a time. Done → real 'build' log
// (pillar lights, streak holds) → Nexa immediately asks for the next
// step, so the chain never breaks. History below is proof of movement.
export function StepChain({
  buildId,
  nextAction,
  workspaceId,
  history,
}: {
  buildId: string
  nextAction: string | null
  workspaceId: string
  history: StepHistoryItem[]
}) {
  const router = useRouter()
  const d = useT()
  const hasStep = (nextAction ?? "").trim() !== ""
  const [asking, setAsking] = useState(!hasStep)
  const [text, setText] = useState("")
  const [saving, setSaving] = useState(false)
  const [justDone, setJustDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function completeStep() {
    if (!nextAction || justDone) return
    setJustDone(true)
    buzz()
    setError(null)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { error: logError } = await supabase.from("logs").insert({
      user_id: user.id,
      workspace_id: workspaceId,
      type: "build",
      data: { action: nextAction, source: "step" },
    })
    if (logError) {
      setJustDone(false)
      setError(logError.message)
      return
    }
    // Chain: the finished step clears, the input for the next opens.
    await supabase.from("builds").update({ next_action: null }).eq("id", buildId)
    setAsking(true)
    router.refresh()
  }

  async function saveNext(event: React.FormEvent) {
    event.preventDefault()
    if (text.trim() === "") return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from("builds")
      .update({ next_action: text.trim() })
      .eq("id", buildId)
    setSaving(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setText("")
    setAsking(false)
    setJustDone(false)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{d.steps.title}</CardTitle>
        <p className="text-xs text-muted-foreground">{d.steps.hint}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasStep && !asking ? (
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={completeStep}
              aria-label={d.steps.markDone}
              className={cn(
                "mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-all active:scale-95",
                justDone
                  ? "gold-fill border-transparent shadow-md shadow-gold/30 animate-pop"
                  : "border-gold/70 bg-gold/[0.06] text-gold-dark hover:border-gold hover:bg-gold/10"
              )}
            >
              <CheckIcon className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-lg font-bold leading-snug",
                  justDone ? "text-ink/60" : "text-ink"
                )}
              >
                {nextAction}
              </p>
              <button
                type="button"
                onClick={() => {
                  setText(nextAction ?? "")
                  setAsking(true)
                }}
                className="mt-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                {d.steps.change}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={saveNext} className="space-y-3">
            {justDone && (
              <p className="text-sm font-medium text-gold-dark">
                {d.steps.doneNowNext}
              </p>
            )}
            <label
              htmlFor="next-step"
              className="block text-sm font-semibold text-ink"
            >
              {d.steps.prompt}
            </label>
            <Input
              id="next-step"
              maxLength={200}
              placeholder={d.steps.placeholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoComplete="off"
            />
            <PrimaryCta
              type="submit"
              className="w-full sm:w-auto"
              disabled={saving || text.trim() === ""}
            >
              {saving ? d.common.saving : d.steps.set}
            </PrimaryCta>
          </form>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}

        {history.length > 0 && (
          <div className="border-t border-line pt-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {d.steps.history} · {history.length}
            </p>
            <ul className="mt-2 space-y-1.5">
              {history.map((item) => (
                <li key={item.id} className="flex items-start gap-2 text-sm">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold-dark" />
                  <span className="min-w-0 flex-1 text-ink/80">
                    {item.action}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {item.date.slice(5)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
