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

export default function OnboardingPage() {
  const router = useRouter()
  const d = useT()
  const [businessType, setBusinessType] = useState<BusinessType>("agency")
  const [customModules, setCustomModules] = useState<string[]>([])
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function toggleModule(module: string) {
    setCustomModules((current) =>
      current.includes(module)
        ? current.filter((m) => m !== module)
        : [...current, module]
    )
  }

  async function handleSubmit(event: React.FormEvent) {
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

    if (insertError || !workspace) {
      setError(insertError?.message ?? d.common.error)
      setLoading(false)
      return
    }

    document.cookie = `${WORKSPACE_COOKIE}=${workspace.id}; path=/; max-age=31536000; samesite=lax`
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center p-4">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl text-ink">
            {d.onboarding.title}
          </CardTitle>
          <CardDescription>{d.onboarding.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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
                  <span className="text-sm font-medium">{d.labels[key]}</span>
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
        </CardContent>
      </Card>
    </main>
  )
}
