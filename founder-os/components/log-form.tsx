"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { useT } from "@/components/locale-provider"
import { daysAgo, today } from "@/lib/dates"
import { buzz } from "@/lib/haptics"
import type { MissionData } from "@/lib/log-schema"
import {
  actionDates,
  dailyScore,
  pillarComplete,
  pillarEvidence,
  streak,
  weekPillarDays,
  type Pillar,
} from "@/lib/stats"
import { createClient } from "@/lib/supabase/client"
import { PrimaryCta } from "@/components/primary-cta"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type { Log, Transaction } from "@/types/db"

type Tab = "daily" | "body" | "mind" | "build" | "money"

// What the user gets back the moment a log lands — score, streak, and
// one short line. Computed from data already in the database; AI never
// runs here, so the reward is instant.
type Feedback = {
  message: string
  score: number
  scoreGained: number
  streakDays: number
  weekDays: number | null
  complete: Record<Pillar, boolean>
}

const PILLAR_ORDER: Pillar[] = ["body", "mind", "build", "money"]

// Numbers that count up feel earned; numbers that appear feel reported.
function CountUp({ value, ms = 600 }: { value: number; ms?: number }) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    let raf: number
    const t0 = performance.now()
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, ms])
  return <>{shown}</>
}

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
  const [movedForward, setMovedForward] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setTopAction("")
    setTopActionDone(false)
    setLesson("")
    setNote("")
    setAmount("")
    setCategory("")
    setMovedForward(null)
  }

  // One fast query after the insert turns raw data into the reward:
  // today's score, the points this log just earned, the streak, and this
  // pillar's week count. `justAddedId` is the row we just wrote — removing
  // it gives the "before" score, so score gained needs no extra query.
  async function computeFeedback(
    supabase: ReturnType<typeof createClient>,
    justAddedLogId: string | null,
    justAddedTxId: string | null
  ): Promise<Feedback> {
    const monthAgo = daysAgo(29)
    const [{ data: recentLogs }, { data: recentTx }] = await Promise.all([
      supabase.from("logs").select("*").gte("date", monthAgo),
      supabase.from("transactions").select("*").gte("date", monthAgo),
    ])
    const logsArr = (recentLogs ?? []) as Log[]
    const txArr = (recentTx ?? []) as Transaction[]
    const todayLogs = logsArr.filter((l) => l.date === today())
    const todayTx = txArr.filter((t) => t.date === today())
    const missionRow = todayLogs.find((l) => l.type === "mission")
    const mission = missionRow
      ? ((missionRow.data ?? {}) as MissionData)
      : null

    const scoreFrom = (logs: Log[], tx: Transaction[]) =>
      dailyScore(pillarComplete(mission, pillarEvidence(logs, tx)))

    const complete = pillarComplete(mission, pillarEvidence(todayLogs, todayTx))
    const score = dailyScore(complete)
    const before = scoreFrom(
      todayLogs.filter((l) => l.id !== justAddedLogId),
      todayTx.filter((t) => t.id !== justAddedTxId)
    )

    const pillar: Pillar | null = tab === "daily" ? null : tab
    const message =
      score === 100
        ? d.feedback.allPillars
        : pillar
          ? d.feedback[pillar]
          : d.feedback.logged
    return {
      message,
      score,
      scoreGained: Math.max(0, score - before),
      streakDays: streak(actionDates(logsArr, txArr)),
      weekDays: pillar ? weekPillarDays(logsArr, txArr, pillar) : null,
      complete,
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setFeedback(null)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push("/login")
      return
    }

    let problem: { message: string } | null = null
    let newLogId: string | null = null
    let newTxId: string | null = null

    if (tab === "money") {
      const { data: inserted, error } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          workspace_id: workspaceId,
          type: txType,
          amount: Number(amount),
          category: category.trim() || null,
          note: note.trim() || null,
          // Discipline question — only asked when money goes out.
          ...(txType === "out" && movedForward !== null
            ? { moved_forward: movedForward }
            : {}),
        })
        .select("id")
        .single()
      problem = error
      newTxId = inserted?.id ?? null
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
      const { data: inserted, error } = await supabase
        .from("logs")
        .insert({
          user_id: user.id,
          workspace_id: workspaceId,
          type: tab,
          data,
        })
        .select("id")
        .single()
      problem = error
      newLogId = inserted?.id ?? null
    }

    if (problem) {
      setSaving(false)
      setError(problem.message ?? d.common.error)
      return
    }
    reset()
    buzz()
    setFeedback(await computeFeedback(supabase, newLogId, newTxId))
    setSaving(false)
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
      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(value as Tab)
          setFeedback(null)
        }}
      >
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
                onClick={() => {
                  setTxType(option)
                  setCategory("")
                  setMovedForward(null)
                }}
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
          {txType === "out" ? (
            <div className="space-y-2">
              <Label>{d.money.category}</Label>
              <div className="flex flex-wrap gap-2" role="radiogroup">
                {(
                  [
                    ["business", d.money.catBusiness],
                    ["body", d.money.catBody],
                    ["learning", d.money.catLearning],
                    ["lifestyle", d.money.catLifestyle],
                    ["waste", d.money.catWaste],
                  ] as const
                ).map(([option, optionLabel]) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={category === option}
                    onClick={() => setCategory(option)}
                    className={cn(
                      "rounded-full border px-3.5 py-2 text-xs font-medium transition-all",
                      category === option
                        ? "gold-fill border-transparent shadow-md shadow-gold/25"
                        : "border-line bg-card text-muted-foreground hover:text-ink"
                    )}
                  >
                    {optionLabel}
                  </button>
                ))}
              </div>
            </div>
          ) : (
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
          )}
          {txType === "out" && (
            <div className="space-y-2">
              <Label>{d.money.movedForward}</Label>
              <div className="grid grid-cols-2 gap-2" role="radiogroup">
                {([true, false] as const).map((option) => (
                  <button
                    key={String(option)}
                    type="button"
                    role="radio"
                    aria-checked={movedForward === option}
                    onClick={() => setMovedForward(option)}
                    className={cn(
                      "h-11 rounded-lg border text-sm font-medium transition-all",
                      movedForward === option
                        ? "gold-fill border-transparent shadow-md shadow-gold/25"
                        : "border-line bg-card text-muted-foreground hover:text-ink"
                    )}
                  >
                    {option ? d.money.yes : d.money.no}
                  </button>
                ))}
              </div>
            </div>
          )}
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
      <PrimaryCta type="submit" className="w-full sm:w-auto" disabled={saving}>
        {saving ? d.common.saving : d.log.addLog}
      </PrimaryCta>

      {feedback && (
        <div
          role="status"
          className="animate-fade-up space-y-3 rounded-xl border border-gold/30 bg-gold/[0.07] p-4"
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold text-ink">
              {feedback.message}
            </p>
            {feedback.scoreGained > 0 && (
              <span className="animate-pop shrink-0 rounded-full bg-ok/15 px-2.5 py-1 text-xs font-bold tabular-nums text-ok">
                +<CountUp value={feedback.scoreGained} ms={450} />
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="tabular-nums">
              <span className="font-semibold text-gold-dark">
                <CountUp value={feedback.score} />
                /100
              </span>{" "}
              {d.feedback.scoreLabel}
            </span>
            <span className="tabular-nums">
              <span className="font-semibold text-gold-dark">
                {feedback.streakDays}
                {d.feedback.daysShort}
              </span>{" "}
              {d.feedback.streakLabel}
            </span>
            {feedback.weekDays !== null && (
              <span className="tabular-nums">
                <span className="font-semibold text-gold-dark">
                  {feedback.weekDays}/7
                </span>{" "}
                {d.feedback.weekLabel}
              </span>
            )}
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {d.feedback.pillarsComplete}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PILLAR_ORDER.map((pillar) => (
                <span
                  key={pillar}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium",
                    feedback.complete[pillar]
                      ? "gold-fill"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  {d.pillars[pillar]}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
