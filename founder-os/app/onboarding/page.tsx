"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { useT } from "@/components/locale-provider"
import { createClient } from "@/lib/supabase/client"
import {
  ALL_MODULES,
  BUSINESS_TYPES,
  type BusinessType,
} from "@/lib/business-types"
import { PrimaryCta } from "@/components/primary-cta"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const WORKSPACE_COOKIE = "fos_workspace"

const TOTAL_STEPS = 4

// First-session onboarding: personalization → workspace → today's move →
// first build. The system knows the operator's bars from minute one; the
// first session still ends with a win in under five minutes. Everything
// except the workspace is skippable — momentum beats completeness.
export default function OnboardingPage() {
  const router = useRouter()
  const d = useT()
  const [step, setStep] = useState(1)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Step 1 — who's operating (writes the profiles row; editable any time
  // in the profile).
  const [profileName, setProfileName] = useState("")
  const [training, setTraining] = useState("4")
  const [focus, setFocus] = useState("25")
  const [mainGoal, setMainGoal] = useState("")

  // Step 2 — workspace
  const [businessType, setBusinessType] = useState<BusinessType>("agency")
  const [customModules, setCustomModules] = useState<string[]>([])
  const [name, setName] = useState("")

  // Step 3 — today's one move
  const [oneMove, setOneMove] = useState("")

  // Step 4 — first build
  const [buildName, setBuildName] = useState("")
  const [weekGoal, setWeekGoal] = useState("")
  const [nextAction, setNextAction] = useState("")

  function toggleModule(module: string) {
    setCustomModules((current) =>
      current.includes(module)
        ? current.filter((m) => m !== module)
        : [...current, module]
    )
  }

  function finish() {
    router.push("/dashboard")
    router.refresh()
  }

  async function handleProfile(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)

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
      name: profileName.trim() || null,
      training_per_week: Math.min(7, Math.max(1, Number(training) || 4)),
      focus_minutes_per_day: Math.min(600, Math.max(5, Number(focus) || 25)),
      main_goal: mainGoal.trim() || null,
      updated_at: new Date().toISOString(),
    })
    setLoading(false)
    if (upsertError) {
      setError(upsertError.message)
      return
    }
    setUserId(user.id)
    setStep(2)
  }

  async function handleCreateWorkspace(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push("/login")
      return
    }

    const modules =
      businessType === "agency"
        ? [...BUSINESS_TYPES.agency.modules]
        : customModules

    const { count } = await supabase
      .from("workspaces")
      .select("id", { count: "exact", head: true })

    const { data: workspace, error: insertError } = await supabase
      .from("workspaces")
      .insert({
        user_id: user.id,
        name: name.trim(),
        business_type: businessType,
        active_modules: modules,
        is_primary: (count ?? 0) === 0,
      })
      .select()
      .single()

    setLoading(false)
    if (insertError || !workspace) {
      setError(insertError?.message ?? d.common.error)
      return
    }

    document.cookie = `${WORKSPACE_COOKIE}=${workspace.id}; path=/; max-age=31536000; samesite=lax`
    setWorkspaceId(workspace.id)
    setUserId(user.id)
    setStep(3)
  }

  async function handleOneMove(event: React.FormEvent) {
    event.preventDefault()
    if (oneMove.trim() === "" || !workspaceId || !userId) {
      setStep(4)
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: insertError } = await supabase.from("logs").insert({
      user_id: userId,
      workspace_id: workspaceId,
      type: "one_move",
      data: { text: oneMove.trim(), done: false },
    })
    setLoading(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setStep(4)
  }

  async function handleBuild(event: React.FormEvent) {
    event.preventDefault()
    if (buildName.trim() === "" || !workspaceId) {
      finish()
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: insertError } = await supabase.from("builds").insert({
      workspace_id: workspaceId,
      name: buildName.trim(),
      business_type: "custom",
      stage: "idea",
      week_goal: weekGoal.trim() || null,
      next_action: nextAction.trim() || null,
      priority: "high",
    })
    setLoading(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    finish()
  }

  const stepTitles: Record<number, { title: string; subtitle: string }> = {
    1: {
      title: d.onboarding.profileTitle,
      subtitle: d.onboarding.profileSubtitle,
    },
    2: { title: d.onboarding.title, subtitle: d.onboarding.subtitle },
    3: {
      title: d.onboarding.oneMoveTitle,
      subtitle: d.onboarding.oneMoveSubtitle,
    },
    4: { title: d.onboarding.buildTitle, subtitle: d.onboarding.buildSubtitle },
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center p-4">
      <div className="mb-4 flex items-center justify-between px-1">
        <p className="text-xs font-medium text-muted-foreground">
          {d.onboarding.stepWord} {step} {d.onboarding.ofWord} {TOTAL_STEPS}
        </p>
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 w-6 rounded-full transition-colors",
                i < step ? "bg-gold" : "bg-line"
              )}
            />
          ))}
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl text-ink">
            {stepTitles[step].title}
          </CardTitle>
          <CardDescription>{stepTitles[step].subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <form onSubmit={handleProfile} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="pf-name">{d.profile.name}</Label>
                <Input
                  id="pf-name"
                  maxLength={60}
                  placeholder={d.profile.namePlaceholder}
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="pf-training">
                    {d.profile.trainingPerWeek}
                  </Label>
                  <Input
                    id="pf-training"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="7"
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
                    value={focus}
                    onChange={(e) => setFocus(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pf-goal">{d.profile.mainGoal}</Label>
                <Input
                  id="pf-goal"
                  maxLength={200}
                  placeholder={d.profile.goalPlaceholder}
                  value={mainGoal}
                  onChange={(e) => setMainGoal(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {d.onboarding.profileHint}
              </p>
              {error && <p className="text-sm text-danger">{error}</p>}
              <div className="flex items-center gap-3">
                <PrimaryCta type="submit" className="flex-1" disabled={loading}>
                  {loading ? d.common.saving : d.onboarding.continueWord}
                </PrimaryCta>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep(2)}
                >
                  {d.onboarding.skip}
                </Button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleCreateWorkspace} className="space-y-6">
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">
                  {d.onboarding.businessType}
                </legend>
                {(Object.keys(BUSINESS_TYPES) as BusinessType[]).map((key) => (
                  <label
                    key={key}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors",
                      businessType === key
                        ? "border-ink bg-secondary"
                        : "border-line hover:border-ink/40"
                    )}
                  >
                    <input
                      type="radio"
                      name="business-type"
                      value={key}
                      checked={businessType === key}
                      onChange={() => setBusinessType(key)}
                      className="h-4 w-4 accent-ink"
                    />
                    <span className="text-sm font-medium">
                      {d.labels[key]}
                    </span>
                  </label>
                ))}
              </fieldset>

              {businessType === "custom" && (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">
                    {d.onboarding.modules}
                  </legend>
                  {ALL_MODULES.map((module) => (
                    <label
                      key={module}
                      className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-line p-3"
                    >
                      <Checkbox
                        checked={customModules.includes(module)}
                        onCheckedChange={() => toggleModule(module)}
                      />
                      <span className="text-sm capitalize">
                        {d.labels[module]}
                      </span>
                    </label>
                  ))}
                </fieldset>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">{d.onboarding.name}</Label>
                <Input
                  id="name"
                  required
                  maxLength={60}
                  placeholder={d.onboarding.namePlaceholder}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {error && <p className="text-sm text-danger">{error}</p>}
              <PrimaryCta type="submit" className="w-full" disabled={loading}>
                {loading ? d.onboarding.creating : d.onboarding.create}
              </PrimaryCta>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleOneMove} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="onboarding-move">
                  {d.today.oneMoveQuestion}
                </Label>
                <Input
                  id="onboarding-move"
                  maxLength={140}
                  placeholder={d.today.oneMovePlaceholder}
                  value={oneMove}
                  onChange={(e) => setOneMove(e.target.value)}
                />
              </div>

              {error && <p className="text-sm text-danger">{error}</p>}
              <div className="flex items-center gap-3">
                <PrimaryCta
                  type="submit"
                  className="flex-1"
                  disabled={loading || oneMove.trim() === ""}
                >
                  {loading ? d.common.saving : d.onboarding.continueWord}
                </PrimaryCta>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep(4)}
                >
                  {d.onboarding.skip}
                </Button>
              </div>
              <button
                type="button"
                onClick={finish}
                className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                {d.onboarding.skipAll}
              </button>
            </form>
          )}

          {step === 4 && (
            <form onSubmit={handleBuild} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="build-name">{d.buildPage.name}</Label>
                <Input
                  id="build-name"
                  maxLength={120}
                  placeholder={d.buildPage.namePlaceholder}
                  value={buildName}
                  onChange={(e) => setBuildName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="build-week">{d.buildPage.weekGoalLabel}</Label>
                <Input
                  id="build-week"
                  maxLength={200}
                  placeholder={d.buildPage.weekGoalPlaceholder}
                  value={weekGoal}
                  onChange={(e) => setWeekGoal(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="build-next">
                  {d.buildPage.nextActionLabel}
                </Label>
                <Input
                  id="build-next"
                  maxLength={200}
                  placeholder={d.buildPage.nextActionPlaceholder}
                  value={nextAction}
                  onChange={(e) => setNextAction(e.target.value)}
                />
              </div>

              {error && <p className="text-sm text-danger">{error}</p>}
              <div className="flex items-center gap-3">
                <PrimaryCta
                  type="submit"
                  className="flex-1"
                  disabled={loading || buildName.trim() === ""}
                >
                  {loading ? d.common.saving : d.onboarding.finish}
                </PrimaryCta>
                <Button type="button" variant="ghost" onClick={finish}>
                  {d.onboarding.skip}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
