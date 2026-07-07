"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { useT } from "@/components/locale-provider"
import { PrimaryCta } from "@/components/primary-cta"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { MindData } from "@/lib/log-schema"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

const FOCUS_LEVELS = [1, 2, 3, 4, 5]

// The full mind entry — lesson, avoidance, distraction, focus, learning
// minutes, tomorrow's improvement. Only the lesson is required; the rest
// is one tap or one line each.
export function MindFormDialog({ workspaceId }: { workspaceId: string }) {
  const router = useRouter()
  const d = useT()
  const [open, setOpen] = useState(false)
  const [lesson, setLesson] = useState("")
  const [avoided, setAvoided] = useState("")
  const [distraction, setDistraction] = useState("")
  const [focus, setFocus] = useState<number | null>(null)
  const [minutes, setMinutes] = useState("")
  const [tomorrow, setTomorrow] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push("/login")
      return
    }

    const data: MindData = {
      lesson: lesson.trim(),
      avoided: avoided.trim(),
      distraction: distraction.trim(),
      ...(focus !== null ? { focus } : {}),
      ...(minutes !== "" ? { learning_minutes: Number(minutes) } : {}),
      tomorrow: tomorrow.trim(),
    }

    const { error: insertError } = await supabase.from("logs").insert({
      user_id: user.id,
      workspace_id: workspaceId,
      type: "mind",
      data,
    })

    setSaving(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setLesson("")
    setAvoided("")
    setDistraction("")
    setFocus(null)
    setMinutes("")
    setTomorrow("")
    setOpen(false)
    router.refresh()
    router.prefetch("/dashboard")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <PrimaryCta>{d.mind.cta}</PrimaryCta>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-ink">{d.mind.entryTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mind-lesson">{d.log.lessonLabel}</Label>
            <Input
              id="mind-lesson"
              required
              maxLength={200}
              placeholder={d.log.lessonPlaceholder}
              value={lesson}
              onChange={(e) => setLesson(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{d.mind.entryHint}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mind-avoided">{d.closeDay.avoidedLabel}</Label>
            <Input
              id="mind-avoided"
              maxLength={200}
              value={avoided}
              onChange={(e) => setAvoided(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mind-distraction">
              {d.mind.distractionLabel}
            </Label>
            <Input
              id="mind-distraction"
              maxLength={120}
              value={distraction}
              onChange={(e) => setDistraction(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{d.mind.focusLabel}</Label>
            <div
              className="grid grid-cols-5 gap-2"
              role="radiogroup"
              aria-label={d.mind.focusLabel}
            >
              {FOCUS_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  role="radio"
                  aria-checked={focus === level}
                  onClick={() => setFocus(level)}
                  className={cn(
                    "h-11 rounded-lg border text-sm font-medium tabular-nums transition-all",
                    focus === level
                      ? "gold-fill border-transparent shadow-md shadow-gold/25"
                      : "border-line bg-card text-muted-foreground hover:text-ink"
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mind-minutes">{d.mind.minutesLabel}</Label>
            <Input
              id="mind-minutes"
              type="number"
              inputMode="numeric"
              min="0"
              max="960"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mind-tomorrow">{d.mind.tomorrowLabel}</Label>
            <Input
              id="mind-tomorrow"
              maxLength={200}
              value={tomorrow}
              onChange={(e) => setTomorrow(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="h-11 w-full" disabled={saving}>
            {saving ? d.common.saving : d.mind.saveEntry}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
