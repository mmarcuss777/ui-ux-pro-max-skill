"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { ALL_MODULES, BUSINESS_TYPES, type BusinessType } from "@/lib/business-types"
import { PrimaryCta } from "@/components/primary-cta"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { Workspace } from "@/types/db"

const STATUSES = ["active", "paused", "archived"] as const

export function WorkspaceForm({ workspace }: { workspace: Workspace }) {
  const router = useRouter()
  const [name, setName] = useState(workspace.name)
  const [modules, setModules] = useState<string[]>(workspace.active_modules)
  const [status, setStatus] = useState(workspace.status)
  const [isPrimary, setIsPrimary] = useState(workspace.is_primary)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const typeLabel =
    BUSINESS_TYPES[workspace.business_type as BusinessType]?.label ??
    workspace.business_type

  function toggleModule(module: string) {
    setModules((current) =>
      current.includes(module)
        ? current.filter((m) => m !== module)
        : [...current, module]
    )
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)

    const supabase = createClient()

    // Only one workspace can be primary at a time.
    if (isPrimary && !workspace.is_primary) {
      await supabase
        .from("workspaces")
        .update({ is_primary: false })
        .neq("id", workspace.id)
    }

    const { error: updateError } = await supabase
      .from("workspaces")
      .update({
        name: name.trim(),
        active_modules: modules,
        status,
        is_primary: isPrimary,
      })
      .eq("id", workspace.id)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="ws-name">Name</Label>
        <Input
          id="ws-name"
          required
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium">Business type</p>
        <p className="text-sm text-muted-foreground">{typeLabel}</p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Active modules</legend>
        {ALL_MODULES.map((module) => (
          <label
            key={module}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-line p-3"
          >
            <Checkbox
              checked={modules.includes(module)}
              onCheckedChange={() => toggleModule(module)}
            />
            <span className="text-sm capitalize">{module}</span>
          </label>
        ))}
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="ws-status">Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger id="ws-status" className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-line p-3">
        <span className="text-sm font-medium">Primary workspace</span>
        <Switch checked={isPrimary} onCheckedChange={setIsPrimary} />
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex items-center gap-3">
        <PrimaryCta type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
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
