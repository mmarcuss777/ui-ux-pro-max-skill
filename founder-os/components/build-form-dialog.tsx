"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Cross2Icon, MagicWandIcon, PlusIcon } from "@radix-ui/react-icons"

import { useT, useLocale } from "@/components/locale-provider"
import { createClient } from "@/lib/supabase/client"
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

// The five universal lifecycle stages — the only fixed thing left.
// Everything else (type, playbook) is free-form or AI-drafted, so no
// business model is ever "not in the list".
const BUILD_STAGES = ["idea", "validation", "building", "selling", "scaling"]
const BUILD_PRIORITIES = ["high", "medium", "low"]

type StageKey = "idea" | "validation" | "building" | "selling" | "scaling"
type PriorityKey = "high" | "medium" | "low"
type PlaybookRow = { label: string; value: string }

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
  open: controlledOpen,
  onOpenChange,
}: {
  workspaceId: string
  build?: Build | null
  hasActive: boolean
  // Controlled mode (no own trigger) — used by the ⋯ menu on the hero.
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const router = useRouter()
  const d = useT()
  const locale = useLocale()
  const editing = Boolean(build)
  const [ownOpen, setOwnOpen] = useState(false)
  const controlled = controlledOpen !== undefined
  const open = controlled ? controlledOpen : ownOpen
  const setOpen = controlled ? (onOpenChange ?? (() => {})) : setOwnOpen

  // The AI entry point: describe the business in your own words.
  const [description, setDescription] = useState("")
  const [drafting, setDrafting] = useState(false)

  const [name, setName] = useState(build?.name ?? "")
  const [type, setType] = useState(build?.business_type ?? "")
  const [stage, setStage] = useState(build?.stage ?? "idea")
  const [weekGoal, setWeekGoal] = useState(build?.week_goal ?? "")
  const [priority, setPriority] = useState(build?.priority ?? "high")
  const [notes, setNotes] = useState(build?.notes ?? "")
  const [playbook, setPlaybook] = useState<PlaybookRow[]>(
    Object.entries((build?.fields as Record<string, string>) ?? {}).map(
      ([label, value]) => ({ label, value: String(value ?? "") })
    )
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function draftWithAi() {
    setDrafting(true)
    setError(null)
    const response = await fetch("/api/ai/build-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, locale }),
    })
    const data = await response.json().catch(() => ({}))
    setDrafting(false)
    if (response.status === 429) {
      setError(d.buildPage.aiLimit)
      return
    }
    if (!response.ok) {
      setError(d.buildPage.aiFailed)
      return
    }
    // Prefill everything — all of it stays editable below.
    setName(data.name || name)
    setType(data.business_type || type)
    setStage(data.stage || stage)
    setWeekGoal(data.week_goal || weekGoal)
    setNotes(data.notes || notes)
    if (Array.isArray(data.playbook) && data.playbook.length > 0) {
      setPlaybook(data.playbook)
    }
  }

  function setRow(index: number, patch: Partial<PlaybookRow>) {
    setPlaybook((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    )
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const fields = Object.fromEntries(
      playbook
        .filter((row) => row.label.trim() !== "")
        .map((row) => [row.label.trim(), row.value.trim()])
    )
    const payload = {
      name: name.trim(),
      business_type: type.trim() || "custom",
      stage,
      week_goal: weekGoal.trim() || null,
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
      {!controlled && (
        <DialogTrigger asChild>
          {editing ? (
            <Button variant="outline" size="sm" className="h-9">
              {d.common.edit}
            </Button>
          ) : (
            <PrimaryCta>{d.buildPage.newBuild}</PrimaryCta>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-ink">
            {editing ? d.buildPage.editBuild : d.buildPage.newBuild}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* AI first: any business, any stage of clarity. */}
          <div className="space-y-2 rounded-xl border border-gold/25 bg-gold/[0.05] p-3.5">
            <Label htmlFor="build-describe">{d.buildPage.describeLabel}</Label>
            <Textarea
              id="build-describe"
              rows={3}
              maxLength={2000}
              placeholder={d.buildPage.describePlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full border-gold/40 text-gold-dark hover:text-gold-dark"
              disabled={drafting || description.trim().length < 8}
              onClick={draftWithAi}
            >
              <MagicWandIcon className="mr-2 h-4 w-4" />
              {drafting ? d.buildPage.aiThinking : d.buildPage.aiSuggest}
            </Button>
          </div>

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
              <Input
                id="build-type"
                maxLength={60}
                placeholder={d.buildPage.typePlaceholder}
                value={type}
                onChange={(e) => setType(e.target.value)}
              />
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
                      {d.labels[option as StageKey]}
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
            <Label htmlFor="build-priority">{d.buildPage.priorityLabel}</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="build-priority" className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUILD_PRIORITIES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {d.labels[option as PriorityKey]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* The playbook: questions for THIS business, not a template.
              AI drafts it; every row stays editable and removable. */}
          <div className="space-y-3 rounded-xl border border-gold/25 bg-gold/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold-dark">
              {d.buildPage.playbook}
            </p>
            {playbook.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {d.buildPage.playbookEmpty}
              </p>
            )}
            {playbook.map((row, index) => (
              <div key={index} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Input
                    className="h-9 flex-1 text-xs font-medium"
                    maxLength={80}
                    placeholder={d.buildPage.playbookLabelPh}
                    value={row.label}
                    onChange={(e) => setRow(index, { label: e.target.value })}
                  />
                  <button
                    type="button"
                    aria-label={d.common.delete}
                    onClick={() =>
                      setPlaybook((rows) => rows.filter((_, i) => i !== index))
                    }
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gold-dark/40 transition-all hover:bg-gold/10 hover:text-gold-dark active:scale-90"
                  >
                    <Cross2Icon className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Input
                  maxLength={300}
                  placeholder={d.buildPage.playbookValuePh}
                  value={row.value}
                  onChange={(e) => setRow(index, { value: e.target.value })}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() =>
                setPlaybook((rows) => [...rows, { label: "", value: "" }])
              }
            >
              <PlusIcon className="mr-1 h-3.5 w-3.5" />
              {d.buildPage.playbookAdd}
            </Button>
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
