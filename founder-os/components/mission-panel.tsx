"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  BarChartIcon,
  CheckIcon,
  LightningBoltIcon,
  ReaderIcon,
  RocketIcon,
} from "@radix-ui/react-icons"

import { useT } from "@/components/locale-provider"
import { createClient } from "@/lib/supabase/client"
import type { MissionData, Pillar } from "@/lib/stats"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const PILLARS: {
  key: Pillar
  icon: typeof LightningBoltIcon
  tint: string
}[] = [
  { key: "body", icon: LightningBoltIcon, tint: "bg-amber-500/15 text-amber-700" },
  { key: "mind", icon: ReaderIcon, tint: "bg-blue-500/12 text-blue-700" },
  { key: "build", icon: RocketIcon, tint: "bg-gold/15 text-gold-dark" },
  { key: "money", icon: BarChartIcon, tint: "bg-ok/15 text-ok" },
]

export function MissionPanel({
  missionId,
  mission,
  complete,
  workspaceId,
}: {
  missionId: string | null
  mission: MissionData | null
  complete: Record<Pillar, boolean>
  workspaceId: string
}) {
  const router = useRouter()
  const d = useT()
  const [open, setOpen] = useState(false)
  const [texts, setTexts] = useState<Record<Pillar, string>>({
    body: mission?.body?.text ?? "",
    mind: mission?.mind?.text ?? "",
    build: mission?.build?.text ?? "",
    money: mission?.money?.text ?? "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function buildData(done: Partial<Record<Pillar, boolean>> = {}): MissionData {
    const data: MissionData = {}
    for (const pillar of ["body", "mind", "build", "money"] as Pillar[]) {
      data[pillar] = {
        text: texts[pillar].trim(),
        done: done[pillar] ?? mission?.[pillar]?.done ?? false,
      }
    }
    return data
  }

  async function persist(data: MissionData) {
    const supabase = createClient()
    if (missionId) {
      const { error } = await supabase
        .from("logs")
        .update({ data })
        .eq("id", missionId)
      return error
    }
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { message: "Unauthorized" }
    const { error } = await supabase.from("logs").insert({
      user_id: user.id,
      workspace_id: workspaceId,
      type: "mission",
      data,
    })
    return error
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    const problem = await persist(buildData())
    setSaving(false)
    if (problem) {
      setError(problem.message ?? d.common.error)
      return
    }
    setOpen(false)
    router.refresh()
  }

  async function toggle(pillar: Pillar) {
    const current = mission?.[pillar]?.done ?? false
    await persist(buildData({ [pillar]: !current }))
    router.refresh()
  }

  const hasMission = mission !== null

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">{d.today.mission}</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            {hasMission ? (
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                {d.today.editMission}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-9 border-gold/40 px-4 text-sm text-gold-dark hover:text-gold-dark"
              >
                {d.today.setMission}
              </Button>
            )}
          </DialogTrigger>
          <DialogContent className="max-h-[85dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-ink">
                {d.today.setMission}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              {PILLARS.map(({ key }) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`mission-${key}`}>{d.pillars[key]}</Label>
                  <Input
                    id={`mission-${key}`}
                    maxLength={140}
                    placeholder={
                      key === "body"
                        ? d.today.bodyPlaceholder
                        : key === "mind"
                          ? d.today.mindPlaceholder
                          : key === "build"
                            ? d.today.buildPlaceholder
                            : d.today.moneyPlaceholder
                    }
                    value={texts[key]}
                    onChange={(e) =>
                      setTexts((t) => ({ ...t, [key]: e.target.value }))
                    }
                  />
                </div>
              ))}
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" className="h-11 w-full" disabled={saving}>
                {saving ? d.common.saving : d.common.save}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {!hasMission ? (
          <p className="text-sm text-muted-foreground">
            {d.today.emptyMission}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {PILLARS.map(({ key, icon: Icon, tint }) => {
              const done = complete[key]
              const text = mission?.[key]?.text
              return (
                <li key={key} className="flex items-center gap-3 py-3">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      tint
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {d.pillars[key]}
                    </p>
                    <p
                      className={cn(
                        "truncate text-sm",
                        done
                          ? "text-muted-foreground line-through"
                          : "text-ink"
                      )}
                    >
                      {text || "—"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    aria-pressed={done}
                    aria-label={`${d.pillars[key]}: ${done ? d.common.done : d.common.notYet}`}
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all",
                      done
                        ? "gold-fill border-transparent shadow-md shadow-gold/25"
                        : "border-line text-muted-foreground hover:border-gold/50"
                    )}
                  >
                    <CheckIcon className="h-4 w-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
