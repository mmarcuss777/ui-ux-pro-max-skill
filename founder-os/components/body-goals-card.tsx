"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { TargetIcon } from "@radix-ui/react-icons"

import { useT } from "@/components/locale-provider"
import { PrimaryCta } from "@/components/primary-cta"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { BodyGoalData } from "@/lib/log-schema"
import { createClient } from "@/lib/supabase/client"

// The two anchors for the Body pillar: a persistent main goal and a weekly
// target. Both are one editable card, stored as a single body_goal log.
export function BodyGoalsCard({
  goalId,
  goals,
  workspaceId,
}: {
  goalId: string | null
  goals: BodyGoalData | null
  workspaceId: string
}) {
  const router = useRouter()
  const d = useT()
  const hasGoals =
    (goals?.main_goal ?? "").trim() !== "" ||
    (goals?.week_target ?? "").trim() !== ""
  const [editing, setEditing] = useState(!hasGoals)
  const [mainGoal, setMainGoal] = useState(goals?.main_goal ?? "")
  const [weekTarget, setWeekTarget] = useState(goals?.week_target ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    const data: BodyGoalData = {
      main_goal: mainGoal.trim(),
      week_target: weekTarget.trim(),
    }

    const supabase = createClient()
    let problem: { message: string } | null = null
    if (goalId) {
      const { error } = await supabase
        .from("logs")
        .update({ data })
        .eq("id", goalId)
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
        type: "body_goal",
        data,
      })
      problem = error
    }

    setSaving(false)
    if (problem) {
      setError(problem.message ?? d.common.error)
      return
    }
    setEditing(false)
    router.refresh()
  }

  if (editing) {
    return (
      <Card>
        <CardContent className="p-5">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="body-main">{d.body.mainGoal}</Label>
              <Input
                id="body-main"
                maxLength={140}
                placeholder={d.body.mainGoalPlaceholder}
                value={mainGoal}
                onChange={(e) => setMainGoal(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body-week">{d.body.weekTarget}</Label>
              <Input
                id="body-week"
                maxLength={140}
                placeholder={d.body.weekTargetPlaceholder}
                value={weekTarget}
                onChange={(e) => setWeekTarget(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <PrimaryCta
              type="submit"
              className="w-full sm:w-auto"
              disabled={saving || (mainGoal.trim() === "" && weekTarget.trim() === "")}
            >
              {saving ? d.common.saving : d.body.setTargets}
            </PrimaryCta>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-gold-light via-gold to-transparent"
      />
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-3">
            {(goals?.week_target ?? "").trim() !== "" && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gold-dark">
                  <TargetIcon className="h-3.5 w-3.5" />
                  {d.body.weekTarget}
                </p>
                <p className="mt-1 text-base font-semibold text-ink">
                  {goals?.week_target}
                </p>
              </div>
            )}
            {(goals?.main_goal ?? "").trim() !== "" && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {d.body.mainGoal}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {goals?.main_goal}
                </p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 text-xs"
            onClick={() => setEditing(true)}
          >
            {d.body.editTargets}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
