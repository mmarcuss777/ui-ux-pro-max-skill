"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { useLocale, useT } from "@/components/locale-provider"
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
  const d = useT()
  const locale = useLocale()
  const [type, setType] = useState<LogType>("daily")
  const [score, setScore] = useState(70)
  const [energy, setEnergy] = useState(3)
  const [note, setNote] = useState("")
  const [topAction, setTopAction] = useState("")
  const [topActionDone, setTopActionDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [scoring, setScoring] = useState(false)
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

    const { data: inserted, error: insertError } = await supabase
      .from("logs")
      .insert({
        user_id: user.id,
        workspace_id: workspaceId,
        type,
        score: type === "daily" ? score : null,
        data,
      })
      .select()
      .single()

    if (insertError || !inserted) {
      setError(insertError?.message ?? d.common.error)
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

    // AI productivity score, applied in the background — the entry is already
    // saved; the badge appears in the list once scoring completes.
    setScoring(true)
    fetch("/api/ai/productivity-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logId: inserted.id, locale }),
    })
      .then(() => router.refresh())
      .catch(() => undefined)
      .finally(() => setScoring(false))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Tabs value={type} onValueChange={(value) => setType(value as LogType)}>
        <TabsList className="grid h-11 w-full grid-cols-3">
          <TabsTrigger value="daily" className="h-9">
            {d.labels.daily}
          </TabsTrigger>
          <TabsTrigger value="fitness" className="h-9">
            {d.labels.fitness}
          </TabsTrigger>
          <TabsTrigger value="learning" className="h-9">
            {d.labels.learning}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {type === "daily" && (
        <>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="score">{d.log.score}</Label>
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
              aria-label={d.log.score}
            />
          </div>

          <div className="space-y-2">
            <Label>{d.log.energy}</Label>
            <div
              className="grid grid-cols-5 gap-2"
              role="radiogroup"
              aria-label={d.log.energy}
            >
              {ENERGY_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  role="radio"
                  aria-checked={energy === level}
                  onClick={() => setEnergy(level)}
                  className={cn(
                    "h-11 rounded-lg border text-sm font-medium tabular-nums transition-colors",
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
            <Label htmlFor="top-action">{d.log.topAction}</Label>
            <Input
              id="top-action"
              maxLength={120}
              placeholder={d.log.topActionPlaceholder}
              value={topAction}
              onChange={(e) => setTopAction(e.target.value)}
            />
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <Checkbox
                checked={topActionDone}
                onCheckedChange={(checked) => setTopActionDone(checked === true)}
              />
              {d.log.topActionDone}
            </label>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="note">
          {type === "daily"
            ? d.log.note
            : type === "fitness"
              ? d.log.noteFitness
              : d.log.noteLearning}
        </Label>
        <Input
          id="note"
          maxLength={200}
          placeholder={d.log.notePlaceholder}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex items-center gap-3">
        <PrimaryCta type="submit" className="w-full sm:w-auto" disabled={saving}>
          {saving ? d.common.saving : d.log.addLog}
        </PrimaryCta>
        {saved && (
          <span className="text-sm text-ok" role="status">
            {d.common.saved}
          </span>
        )}
        {scoring && (
          <span className="text-sm text-muted-foreground" role="status">
            {d.log.scoring}
          </span>
        )}
      </div>
    </form>
  )
}
