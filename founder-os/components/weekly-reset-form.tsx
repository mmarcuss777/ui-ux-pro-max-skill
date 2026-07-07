"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { TargetIcon } from "@radix-ui/react-icons"

import { useT } from "@/components/locale-provider"
import { PrimaryCta } from "@/components/primary-cta"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { weekStart } from "@/lib/dates"
import type { WeeklyResetData } from "@/lib/log-schema"
import { createClient } from "@/lib/supabase/client"

// Step 5 of the loop: the Weekly Reset. Five look-back questions, five
// forward outputs. Only the focus is required — it then shows on the
// Today page all next week, which is the reason to come back and do this.
export function WeeklyResetForm({
  resetId,
  reset,
  workspaceId,
  buildName,
}: {
  resetId: string | null
  reset: WeeklyResetData | null
  workspaceId: string
  buildName: string | null
}) {
  const router = useRouter()
  const d = useT()
  const [editing, setEditing] = useState(reset === null)
  const [worked, setWorked] = useState(reset?.worked ?? "")
  const [failed, setFailed] = useState(reset?.failed ?? "")
  const [avoided, setAvoided] = useState(reset?.avoided ?? "")
  const [stop, setStop] = useState(reset?.stop ?? "")
  const [focus, setFocus] = useState(reset?.focus ?? "")
  const [buildPriority, setBuildPriority] = useState(
    reset?.build_priority ?? buildName ?? ""
  )
  const [bodyTarget, setBodyTarget] = useState(reset?.body_target ?? "")
  const [mindTarget, setMindTarget] = useState(reset?.mind_target ?? "")
  const [moneyRule, setMoneyRule] = useState(reset?.money_rule ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    const data: WeeklyResetData = {
      worked: worked.trim(),
      failed: failed.trim(),
      avoided: avoided.trim(),
      stop: stop.trim(),
      focus: focus.trim(),
      build_priority: buildPriority.trim(),
      body_target: bodyTarget.trim(),
      mind_target: mindTarget.trim(),
      money_rule: moneyRule.trim(),
      week_start: weekStart(),
    }

    const supabase = createClient()
    let problem: { message: string } | null = null
    if (resetId) {
      const { error } = await supabase
        .from("logs")
        .update({ data })
        .eq("id", resetId)
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
        type: "weekly_reset",
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

  if (!editing && reset !== null) {
    const outputs = [
      { label: d.review.buildLabel, value: reset.build_priority },
      { label: d.review.bodyTargetLabel, value: reset.body_target },
      { label: d.review.mindTargetLabel, value: reset.mind_target },
      { label: d.review.moneyRuleLabel, value: reset.money_rule },
    ].filter((o) => (o.value ?? "").trim() !== "")

    return (
      <Card className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-gold-light via-gold to-transparent"
        />
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TargetIcon className="h-4 w-4 text-gold-dark" />
            {d.review.weekClosed}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setEditing(true)}
          >
            {d.common.edit}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl bg-gold/[0.08] p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold-dark">
              {d.review.weekFocus}
            </p>
            <p className="mt-1 text-base font-semibold text-ink">
              {reset.focus}
            </p>
          </div>
          {outputs.length > 0 && (
            <dl className="space-y-1.5 text-sm">
              {outputs.map((o) => (
                <div key={o.label} className="flex gap-2">
                  <dt className="shrink-0 font-medium text-muted-foreground">
                    {o.label}:
                  </dt>
                  <dd className="min-w-0 text-ink">{o.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {d.review.lookBack}
            </p>
            <div className="space-y-2">
              <Label htmlFor="reset-worked">{d.review.workedLabel}</Label>
              <Textarea
                id="reset-worked"
                rows={2}
                maxLength={300}
                value={worked}
                onChange={(e) => setWorked(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-failed">{d.review.failedLabel}</Label>
              <Input
                id="reset-failed"
                maxLength={200}
                value={failed}
                onChange={(e) => setFailed(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-avoided">{d.review.avoidedLabel}</Label>
              <Input
                id="reset-avoided"
                maxLength={200}
                value={avoided}
                onChange={(e) => setAvoided(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-stop">{d.review.stopLabel}</Label>
              <Input
                id="reset-stop"
                maxLength={200}
                value={stop}
                onChange={(e) => setStop(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4 border-t border-line pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold-dark">
              {d.review.setWeek}
            </p>
            <div className="space-y-2">
              <Label htmlFor="reset-focus">{d.review.focusLabel}</Label>
              <Input
                id="reset-focus"
                required
                maxLength={140}
                placeholder={d.review.focusPlaceholder}
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {d.review.optionalHint}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-build">{d.review.buildLabel}</Label>
              <Input
                id="reset-build"
                maxLength={120}
                value={buildPriority}
                onChange={(e) => setBuildPriority(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reset-body">{d.review.bodyTargetLabel}</Label>
                <Input
                  id="reset-body"
                  maxLength={120}
                  placeholder={d.review.bodyTargetPlaceholder}
                  value={bodyTarget}
                  onChange={(e) => setBodyTarget(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-mind">{d.review.mindTargetLabel}</Label>
                <Input
                  id="reset-mind"
                  maxLength={120}
                  placeholder={d.review.mindTargetPlaceholder}
                  value={mindTarget}
                  onChange={(e) => setMindTarget(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-money">{d.review.moneyRuleLabel}</Label>
              <Input
                id="reset-money"
                maxLength={140}
                placeholder={d.review.moneyRulePlaceholder}
                value={moneyRule}
                onChange={(e) => setMoneyRule(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          <PrimaryCta
            type="submit"
            className="w-full sm:w-auto"
            disabled={saving || focus.trim() === ""}
          >
            {saving ? d.review.closingWeek : d.review.closeWeek}
          </PrimaryCta>
        </form>
      </CardContent>
    </Card>
  )
}
