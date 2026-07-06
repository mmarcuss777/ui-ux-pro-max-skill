"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { PrimaryCta } from "@/components/primary-cta"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type LogType = "daily" | "fitness" | "learning"

const ENERGY_LEVELS = [1, 2, 3, 4, 5]

export function DailyLogForm({ workspaceId }: { workspaceId: string }) {
  const router = useRouter()
  const [type, setType] = useState<LogType>("daily")
  const [score, setScore] = useState(70)
  const [energy, setEnergy] = useState(3)
  const [note, setNote] = useState("")
  const [topAction, setTopAction] = useState("")
  const [topActionDone, setTopActionDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push("/login")
      return
    }

    const data =
      type === "daily"
        ? {
            energy,
            note: note.trim(),
            top_action: topAction.trim(),
            top_action_done: topActionDone,
          }
        : { note: note.trim() }

    const { error: insertError } = await supabase.from("logs").insert({
      user_id: user.id,
      workspace_id: workspaceId,
      type,
      score: type === "daily" ? score : null,
      data,
    })

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    setNote("")
    setTopAction("")
    setTopActionDone(false)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Tabs value={type} onValueChange={(value) => setType(value as LogType)}>
        <TabsList className="grid h-11 w-full grid-cols-3">
          <TabsTrigger value="daily" className="h-9">
            Daily
          </TabsTrigger>
          <TabsTrigger value="fitness" className="h-9">
            Fitness
          </TabsTrigger>
          <TabsTrigger value="learning" className="h-9">
            Learning
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {type === "daily" && (
        <>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="score">Score</Label>
              <span className="text-2xl font-semibold tabular-nums text-ink">
                {score}
              </span>
            </div>
            <Slider
              id="score"
              value={[score]}
              onValueChange={([value]) => setScore(value)}
              max={100}
              step={5}
              aria-label="Daily score 0 to 100"
            />
          </div>

          <div className="space-y-2">
            <Label>Energy</Label>
            <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Energy 1 to 5">
              {ENERGY_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  role="radio"
                  aria-checked={energy === level}
                  onClick={() => setEnergy(level)}
                  className={cn(
                    "h-11 rounded-md border text-sm font-medium tabular-nums",
                    energy === level
                      ? "border-ink bg-ink text-paper"
                      : "border-line bg-card text-muted-foreground hover:text-ink"
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="top-action">Top action for today</Label>
            <Input
              id="top-action"
              maxLength={120}
              placeholder="The one move that matters"
              value={topAction}
              onChange={(e) => setTopAction(e.target.value)}
            />
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <Checkbox
                checked={topActionDone}
                onCheckedChange={(checked) => setTopActionDone(checked === true)}
              />
              Top action done?
            </label>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="note">
          {type === "daily"
            ? "Note"
            : type === "fitness"
              ? "What did you train?"
              : "What did you learn?"}
        </Label>
        <Input
          id="note"
          maxLength={200}
          placeholder="One line is enough"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex items-center gap-3">
        <PrimaryCta type="submit" className="w-full sm:w-auto" disabled={saving}>
          {saving ? "Saving…" : "Add log"}
        </PrimaryCta>
        {saved && (
          <span className="text-sm text-ok" role="status">
            Saved
          </span>
        )}
      </div>
    </form>
  )
}
