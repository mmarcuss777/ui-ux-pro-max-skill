"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckIcon, StarFilledIcon } from "@radix-ui/react-icons"

import { useT } from "@/components/locale-provider"
import { PrimaryCta } from "@/components/primary-cta"
import { Input } from "@/components/ui/input"
import type { OneMoveData } from "@/lib/log-schema"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

// The emotional center of the day: one field, one commitment. Everything
// else on the Today page hangs beneath this.
export function OneMoveCard({
  oneMoveId,
  oneMove,
  suggestion,
  workspaceId,
}: {
  oneMoveId: string | null
  oneMove: OneMoveData | null
  suggestion: string | null
  workspaceId: string
}) {
  const router = useRouter()
  const d = useT()
  const hasMove = (oneMove?.text ?? "").trim() !== ""
  const [editing, setEditing] = useState(!hasMove)
  const [text, setText] = useState(oneMove?.text ?? suggestion ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function persist(data: OneMoveData) {
    const supabase = createClient()
    if (oneMoveId) {
      const { error } = await supabase
        .from("logs")
        .update({ data })
        .eq("id", oneMoveId)
      return error
    }
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { message: "Unauthorized" }
    const { error } = await supabase.from("logs").insert({
      user_id: user.id,
      workspace_id: workspaceId,
      type: "one_move",
      data,
    })
    return error
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    if (text.trim() === "") return
    setSaving(true)
    setError(null)
    const problem = await persist({
      text: text.trim(),
      done: oneMove?.done ?? false,
    })
    setSaving(false)
    if (problem) {
      setError(problem.message ?? d.common.error)
      return
    }
    setEditing(false)
    router.refresh()
  }

  async function toggleDone() {
    const problem = await persist({
      text: (oneMove?.text ?? "").trim(),
      done: !(oneMove?.done ?? false),
    })
    if (!problem) router.refresh()
  }

  const done = oneMove?.done === true
  const showSuggestionHint =
    editing && !hasMove && suggestion !== null && text === suggestion

  return (
    <div className="rounded-2xl bg-gradient-to-br from-gold-light via-gold/40 to-gold-dark/50 p-px shadow-lg shadow-gold/15">
      <div className="rounded-[calc(1rem-1px)] bg-card p-5">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold-dark">
          <StarFilledIcon className="h-3.5 w-3.5" />
          {d.today.oneMoveTitle}
        </p>

        {editing ? (
          <form onSubmit={handleSave} className="mt-3 space-y-3">
            <label
              htmlFor="one-move"
              className="block text-lg font-semibold leading-snug text-ink"
            >
              {d.today.oneMoveQuestion}
            </label>
            <Input
              id="one-move"
              maxLength={140}
              placeholder={d.today.oneMovePlaceholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoComplete="off"
            />
            {showSuggestionHint && (
              <p className="text-xs text-gold-dark">{d.today.fromClose}</p>
            )}
            {error && <p className="text-sm text-danger">{error}</p>}
            <PrimaryCta
              type="submit"
              className="w-full sm:w-auto"
              disabled={saving || text.trim() === ""}
            >
              {saving ? d.common.saving : d.today.oneMoveSet}
            </PrimaryCta>
          </form>
        ) : (
          <div className="mt-3 flex items-start gap-3">
            <button
              type="button"
              onClick={toggleDone}
              aria-pressed={done}
              aria-label={d.today.oneMoveMark}
              className={cn(
                "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95",
                done
                  ? "gold-fill border-transparent shadow-md shadow-gold/30"
                  : "border-gold/40 text-muted-foreground hover:border-gold"
              )}
            >
              <CheckIcon className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-xl font-bold leading-snug",
                  done ? "text-muted-foreground" : "text-ink"
                )}
              >
                {oneMove?.text}
              </p>
              {done ? (
                <p className="mt-1 text-sm font-medium text-gold-dark">
                  {d.today.oneMoveWon}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="mt-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  {d.today.oneMoveEdit}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
