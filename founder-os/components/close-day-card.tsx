"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MoonIcon } from "@radix-ui/react-icons"

import { useT } from "@/components/locale-provider"
import { buzz } from "@/lib/haptics"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { CloseDayData } from "@/lib/log-schema"
import { createClient } from "@/lib/supabase/client"

// Step 4 of the daily loop: the evening close. One required field, four
// optional. Once closed, the card flips into a short summary of the day —
// the immediate payoff for finishing.
export function CloseDayCard({
  closeId,
  close,
  score,
  streakDays,
  pillarsDone,
  workspaceId,
  insight,
}: {
  closeId: string | null
  close: CloseDayData | null
  score: number
  streakDays: number
  pillarsDone: number
  workspaceId: string
  insight?: string | null
}) {
  const router = useRouter()
  const d = useT()
  const [open, setOpen] = useState(false)
  const [gotDone, setGotDone] = useState(close?.got_done ?? "")
  const [failed, setFailed] = useState(close?.failed ?? "")
  const [avoided, setAvoided] = useState(close?.avoided ?? "")
  const [lesson, setLesson] = useState(close?.lesson ?? "")
  const [tomorrow, setTomorrow] = useState(close?.tomorrow_first_move ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    const data: CloseDayData = {
      got_done: gotDone.trim(),
      failed: failed.trim(),
      avoided: avoided.trim(),
      lesson: lesson.trim(),
      tomorrow_first_move: tomorrow.trim(),
    }

    const supabase = createClient()
    let problem: { message: string } | null = null
    if (closeId) {
      const { error } = await supabase
        .from("logs")
        .update({ data })
        .eq("id", closeId)
      problem = error
    } else {
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
        type: "close_day",
        data,
      })
      problem = error
    }

    setSaving(false)
    if (problem) {
      setError(problem.message ?? d.common.error)
      return
    }
    buzz()
    setOpen(false)
    router.refresh()
  }

  const closed = close !== null

  const form = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="close-done">{d.closeDay.gotDone}</Label>
        <Textarea
          id="close-done"
          rows={2}
          required
          maxLength={300}
          placeholder={d.closeDay.gotDonePlaceholder}
          value={gotDone}
          onChange={(e) => setGotDone(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          {d.closeDay.optionalHint}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="close-failed">{d.closeDay.failedLabel}</Label>
        <Input
          id="close-failed"
          maxLength={200}
          value={failed}
          onChange={(e) => setFailed(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="close-avoided">{d.closeDay.avoidedLabel}</Label>
        <Input
          id="close-avoided"
          maxLength={200}
          value={avoided}
          onChange={(e) => setAvoided(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="close-lesson">{d.closeDay.lessonLabel}</Label>
        <Input
          id="close-lesson"
          maxLength={200}
          value={lesson}
          onChange={(e) => setLesson(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="close-tomorrow">{d.closeDay.tomorrowLabel}</Label>
        <Input
          id="close-tomorrow"
          maxLength={140}
          placeholder={d.closeDay.tomorrowPlaceholder}
          value={tomorrow}
          onChange={(e) => setTomorrow(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" className="h-11 w-full" disabled={saving}>
        {saving ? d.closeDay.closing : d.closeDay.submit}
      </Button>
    </form>
  )

  if (!closed) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="h-12 w-full border-ink/15 text-ink"
          >
            <MoonIcon className="mr-2 h-4 w-4" />
            {d.closeDay.cta}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-ink">{d.closeDay.title}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {d.closeDay.subtitle}
            </p>
          </DialogHeader>
          {form}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Card className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-gold-light via-gold to-transparent"
      />
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <MoonIcon className="h-4 w-4 text-gold-dark" />
            {d.closeDay.closedTitle}
          </p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                {d.closeDay.reopen}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-ink">
                  {d.closeDay.title}
                </DialogTitle>
              </DialogHeader>
              {form}
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-secondary/70 px-2 py-3">
            <p className="text-lg font-bold tabular-nums text-ink">
              {score}
              <span className="text-xs font-normal text-muted-foreground">
                /100
              </span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              {d.closeDay.closedScore}
            </p>
          </div>
          <div className="rounded-xl bg-secondary/70 px-2 py-3">
            <p className="text-lg font-bold tabular-nums text-ink">
              {streakDays}
              <span className="text-xs font-normal text-muted-foreground">
                {d.feedback.daysShort}
              </span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              {d.closeDay.closedStreak}
            </p>
          </div>
          <div className="rounded-xl bg-secondary/70 px-2 py-3">
            <p className="text-lg font-bold tabular-nums text-ink">
              {pillarsDone}
              <span className="text-xs font-normal text-muted-foreground">
                /4
              </span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              {d.closeDay.closedPillars}
            </p>
          </div>
        </div>

        {insight && (
          <p className="rounded-xl bg-gold/[0.08] px-3 py-2.5 text-sm font-medium text-gold-dark">
            {insight}
          </p>
        )}

        {(close?.lesson ?? "").trim() !== "" && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-ink">
              {d.closeDay.lessonWord}:
            </span>{" "}
            {close?.lesson}
          </p>
        )}
        {(close?.tomorrow_first_move ?? "").trim() !== "" && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-gold-dark">
              {d.closeDay.tomorrowSet}
            </span>{" "}
            <span className="text-ink">{close?.tomorrow_first_move}</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
