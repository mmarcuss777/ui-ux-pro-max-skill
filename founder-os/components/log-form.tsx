"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { useT } from "@/components/locale-provider"
import { createClient } from "@/lib/supabase/client"
import { PrimaryCta } from "@/components/primary-cta"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type Tab = "daily" | "body" | "mind" | "build" | "money"

const LEVELS = [1, 2, 3, 4, 5]

function LevelPicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (level: number) => void
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label={label}>
        {LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={value === level}
            onClick={() => onChange(level)}
            className={cn(
              "h-11 rounded-lg border text-sm font-medium tabular-nums transition-all",
              value === level
                ? "gold-fill border-transparent shadow-md shadow-gold/25"
                : "border-line bg-card text-muted-foreground hover:text-ink"
            )}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  )
}

export function LogForm({ workspaceId }: { workspaceId: string }) {
  const router = useRouter()
  const d = useT()
  const [tab, setTab] = useState<Tab>("daily")
  const [energy, setEnergy] = useState(3)
  const [mood, setMood] = useState(3)
  const [topAction, setTopAction] = useState("")
  const [topActionDone, setTopActionDone] = useState(false)
  const [lesson, setLesson] = useState("")
  const [note, setNote] = useState("")
  const [amount, setAmount] = useState("")
  const [txType, setTxType] = useState<"in" | "out">("out")
  const [category, setCategory] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setTopAction("")
    setTopActionDone(false)
    setLesson("")
    setNote("")
    setAmount("")
    setCategory("")
  }

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

    let problem: { message: string } | null = null

    if (tab === "money") {
      const { error } = await supabase.from("transactions").insert({
        user_id: user.id,
        workspace_id: workspaceId,
        type: txType,
        amount: Number(amount),
        category: category.trim() || null,
        note: note.trim() || null,
      })
      problem = error
    } else {
      const data =
        tab === "daily"
          ? {
              energy,
              mood,
              top_action: topAction.trim(),
              top_action_done: topActionDone,
              note: note.trim(),
            }
          : tab === "mind"
            ? { lesson: lesson.trim(), note: note.trim() }
            : { note: note.trim() }
      const { error } = await supabase.from("logs").insert({
        user_id: user.id,
        workspace_id: workspaceId,
        type: tab,
        data,
      })
      problem = error
    }

    setSaving(false)
    if (problem) {
      setError(problem.message ?? d.common.error)
      return
    }
    reset()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
  }

  const noteLabel =
    tab === "body"
      ? d.log.whatTrained
      : tab === "build"
        ? d.log.whatMoved
        : d.log.note

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
        <TabsList className="grid h-11 w-full grid-cols-5">
          <TabsTrigger value="daily" className="h-9 px-1 text-xs sm:text-sm">
            {d.log.dailyTab}
          </TabsTrigger>
          <TabsTrigger value="body" className="h-9 px-1 text-xs sm:text-sm">
            {d.log.bodyTab}
          </TabsTrigger>
          <TabsTrigger value="mind" className="h-9 px-1 text-xs sm:text-sm">
            {d.log.mindTab}
          </TabsTrigger>
          <TabsTrigger value="build" className="h-9 px-1 text-xs sm:text-sm">
            {d.log.buildTab}
          </TabsTrigger>
          <TabsTrigger value="money" className="h-9 px-1 text-xs sm:text-sm">
            {d.log.moneyTab}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "daily" && (
        <>
          <LevelPicker label={d.log.energy} value={energy} onChange={setEnergy} />
          <LevelPicker label={d.log.mood} value={mood} onChange={setMood} />
          <div className="space-y-2">
            <Label htmlFor="top-action">{d.log.topAction}</Label>
            <Input
              id="top-action"
              maxLength={120}
              placeholder={d.log.topActionPlaceholder}
              value={topAction}
              onChange={(e) => setTopAction(e.target.value)}
            />
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <Checkbox
                checked={topActionDone}
                onCheckedChange={(checked) => setTopActionDone(checked === true)}
              />
              {d.log.topActionDone}
            </label>
          </div>
        </>
      )}

      {tab === "mind" && (
        <div className="space-y-2">
          <Label htmlFor="lesson">{d.log.lessonLabel}</Label>
          <Input
            id="lesson"
            maxLength={200}
            placeholder={d.log.lessonPlaceholder}
            value={lesson}
            onChange={(e) => setLesson(e.target.value)}
          />
        </div>
      )}

      {tab === "money" && (
        <>
          <div className="grid grid-cols-2 gap-2" role="radiogroup">
            {(["in", "out"] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={txType === option}
                onClick={() => setTxType(option)}
                className={cn(
                  "h-11 rounded-lg border text-sm font-medium transition-all",
                  txType === option
                    ? "gold-fill border-transparent shadow-md shadow-gold/25"
                    : "border-line bg-card text-muted-foreground hover:text-ink"
                )}
              >
                {option === "in" ? d.money.moneyIn : d.money.moneyOut}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="log-amount">{d.money.amount}</Label>
              <Input
                id="log-amount"
                type="number"
                inputMode="decimal"
                required
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="log-category">{d.money.category}</Label>
              <Input
                id="log-category"
                maxLength={60}
                placeholder={d.money.categoryPlaceholder}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="note">{noteLabel}</Label>
        <Input
          id="note"
          maxLength={200}
          placeholder={d.log.notePlaceholder}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex items-center gap-3">
        <PrimaryCta type="submit" className="w-full sm:w-auto" disabled={saving}>
          {saving ? d.common.saving : d.log.addLog}
        </PrimaryCta>
        {saved && (
          <span className="text-sm text-ok" role="status">
            {d.common.saved}
          </span>
        )}
      </div>
    </form>
  )
}
