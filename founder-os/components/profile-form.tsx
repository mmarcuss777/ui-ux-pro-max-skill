"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { useT } from "@/components/locale-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/types/db"

// The operator's own parameters — the score engine and sections read
// these bars, so "hitting your own standard" is defined here, once.
export function ProfileForm({ profile }: { profile: Profile | null }) {
  const router = useRouter()
  const d = useT()
  const [name, setName] = useState(profile?.name ?? "")
  const [training, setTraining] = useState(
    String(profile?.training_per_week ?? 4)
  )
  const [focus, setFocus] = useState(
    String(profile?.focus_minutes_per_day ?? 25)
  )
  const [waste, setWaste] = useState(
    profile?.waste_limit_month != null ? String(profile.waste_limit_month) : ""
  )
  const [goal, setGoal] = useState(profile?.main_goal ?? "")
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
    const { error: upsertError } = await supabase.from("profiles").upsert({
      user_id: user.id,
      name: name.trim() || null,
      training_per_week: Math.min(7, Math.max(1, Number(training) || 4)),
      focus_minutes_per_day: Math.min(600, Math.max(5, Number(focus) || 25)),
      waste_limit_month: waste.trim() === "" ? null : Number(waste) || null,
      main_goal: goal.trim() || null,
      updated_at: new Date().toISOString(),
    })
    setSaving(false)
    if (upsertError) {
      setError(upsertError.message)
      return
    }
    setSaved(true)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="pf-name">{d.profile.name}</Label>
        <Input
          id="pf-name"
          maxLength={60}
          placeholder={d.profile.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="pf-training">{d.profile.trainingPerWeek}</Label>
          <Input
            id="pf-training"
            type="number"
            inputMode="numeric"
            min="1"
            max="7"
            required
            value={training}
            onChange={(e) => setTraining(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pf-focus">{d.profile.focusPerDay}</Label>
          <Input
            id="pf-focus"
            type="number"
            inputMode="numeric"
            min="5"
            max="600"
            required
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="pf-waste">{d.profile.wasteLimit}</Label>
        <Input
          id="pf-waste"
          type="number"
          inputMode="decimal"
          min="0"
          step="1"
          placeholder="50"
          value={waste}
          onChange={(e) => setWaste(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pf-goal">{d.profile.mainGoal}</Label>
        <Input
          id="pf-goal"
          maxLength={200}
          placeholder={d.profile.goalPlaceholder}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" className="h-11" disabled={saving}>
          {saving ? d.common.saving : d.profile.save}
        </Button>
        {saved && (
          <span className="text-sm font-medium text-ok" role="status">
            {d.profile.saved}
          </span>
        )}
      </div>
    </form>
  )
}
