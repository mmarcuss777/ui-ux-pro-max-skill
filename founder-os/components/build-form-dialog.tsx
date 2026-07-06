"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { useT } from "@/components/locale-provider"
import { createClient } from "@/lib/supabase/client"
import {
  BUILD_PRIORITIES,
  BUILD_STAGES,
  BUILD_TYPE_KEYS,
  BUILD_TYPES,
  type BuildType,
} from "@/lib/build-types"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Build } from "@/types/db"

type LabelKey = keyof ReturnType<typeof useT>["labels"]

async function demoteActive(workspaceId: string, exceptId?: string) {
  const supabase = createClient()
  let query = supabase
    .from("builds")
    .update({ status: "paused" })
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
  if (exceptId) query = query.neq("id", exceptId)
  await query
}

export function BuildFormDialog({
  workspaceId,
  build,
  hasActive,
}: {
  workspaceId: string
  build?: Build | null
  hasActive: boolean
}) {
  const router = useRouter()
  const d = useT()
  const editing = Boolean(build)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(build?.name ?? "")
  const [type, setType] = useState<BuildType>(
    (build?.business_type as BuildType) ?? "ecommerce"
  )
  const [stage, setStage] = useState(build?.stage ?? "idea")
  const [weekGoal, setWeekGoal] = useState(build?.week_goal ?? "")
  const [nextAction, setNextAction] = useState(build?.next_action ?? "")
  const [priority, setPriority] = useState(build?.priority ?? "high")
  const [notes, setNotes] = useState(build?.notes ?? "")
  const [fields, setFields] = useState<Record<string, string>>(
    (build?.fields as Record<string, string>) ?? {}
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const typeFields = BUILD_TYPES[type].fields

  // E-commerce margin preview: sell − buy − shipping when the numbers parse.
  const margin =
    type === "ecommerce"
      ? Number(fields.sell_price) -
        Number(fields.buy_price || 0) -
        Number(fields.shipping_cost || 0)
      : NaN

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const payload = {
      name: name.trim(),
      business_type: type,
      stage,
      week_goal: weekGoal.trim() || null,
      next_action: nextAction.trim() || null,
      priority,
      notes: notes.trim() || null,
      fields,
    }

    let problem: { message: string } | null = null
    if (editing && build) {
      const { error } = await supabase
        .from("builds")
        .update(payload)
        .eq("id", build.id)
      problem = error
    } else {
      if (hasActive) await demoteActive(workspaceId)
      const { error } = await supabase.from("builds").insert({
        workspace_id: workspaceId,
        ...payload,
        status: "active",
      })
      problem = error
    }

    setSaving(false)
    if (problem) {
      setError(problem.message ?? d.common.error)
      return
    }
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="outline" size="sm" className="h-9">
            {d.common.edit}
          </Button>
        ) : (
          <PrimaryCta>{d.buildPage.newBuild}</PrimaryCta>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-ink">
            {editing ? d.buildPage.editBuild : d.buildPage.newBuild}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="build-name">{d.buildPage.name}</Label>
            <Input
              id="build-name"
              required
              maxLength={120}
              placeholder={d.buildPage.namePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="build-type">{d.buildPage.typeLabel}</Label>
              <Select
                value={type}
                onValueChange={(value) => setType(value as BuildType)}
              >
                <SelectTrigger id="build-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUILD_TYPE_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {d.labels[key as LabelKey] ?? key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="build-stage">{d.buildPage.stageLabel}</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger id="build-stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUILD_STAGES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {d.labels[option as LabelKey] ?? option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="build-goal">{d.buildPage.weekGoalLabel}</Label>
            <Input
              id="build-goal"
              maxLength={200}
              placeholder={d.buildPage.weekGoalPlaceholder}
              value={weekGoal}
              onChange={(e) => setWeekGoal(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="build-next">{d.buildPage.nextActionLabel}</Label>
            <Input
              id="build-next"
              maxLength={200}
              placeholder={d.buildPage.nextActionPlaceholder}
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="build-priority">{d.buildPage.priorityLabel}</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="build-priority" className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUILD_PRIORITIES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {d.labels[option as LabelKey] ?? option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 rounded-xl border border-gold/25 bg-gold/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold-dark">
              {d.buildPage.playbook} — {d.labels[type as LabelKey] ?? type}
            </p>
            {typeFields.map((key) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`field-${key}`} className="text-xs">
                  {d.buildFields[key]}
                </Label>
                <Input
                  id={`field-${key}`}
                  maxLength={200}
                  value={fields[key] ?? ""}
                  onChange={(e) =>
                    setFields((f) => ({ ...f, [key]: e.target.value }))
                  }
                />
              </div>
            ))}
            {type === "ecommerce" && Number.isFinite(margin) && (
              <p className="text-sm">
                {d.buildPage.margin}:{" "}
                <span
                  className={
                    margin >= 0
                      ? "font-semibold tabular-nums text-ok"
                      : "font-semibold tabular-nums text-danger"
                  }
                >
                  {margin.toFixed(2)}
                </span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="build-notes">{d.buildPage.notesLabel}</Label>
            <Textarea
              id="build-notes"
              rows={3}
              maxLength={1000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="h-11 w-full" disabled={saving}>
            {saving ? d.common.saving : d.buildPage.saveBuild}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ActivateBuildButton({
  buildId,
  workspaceId,
}: {
  buildId: string
  workspaceId: string
}) {
  const router = useRouter()
  const d = useT()

  async function activate() {
    await demoteActive(workspaceId, buildId)
    const supabase = createClient()
    await supabase.from("builds").update({ status: "active" }).eq("id", buildId)
    router.refresh()
  }

  return (
    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={activate}>
      {d.buildPage.activate}
    </Button>
  )
}
