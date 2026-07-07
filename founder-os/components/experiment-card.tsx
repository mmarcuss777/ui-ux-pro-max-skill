"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { useLocale, useT } from "@/components/locale-provider"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import type { Experiment } from "@/types/db"

const DECISIONS = ["continue", "pivot", "kill", "scale"] as const

export function ExperimentCard({
  experiment,
  businessType,
}: {
  experiment: Experiment
  businessType: string
}) {
  const router = useRouter()
  const d = useT()
  const locale = useLocale()
  const [result, setResult] = useState(experiment.result ?? "")
  const [checkOpen, setCheckOpen] = useState(false)
  const [checkResult, setCheckResult] = useState<string | null>(null)
  const [checkError, setCheckError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  async function updateExperiment(fields: Partial<Experiment>) {
    const supabase = createClient()
    await supabase.from("experiments").update(fields).eq("id", experiment.id)
    router.refresh()
  }

  async function runRealityCheck() {
    if (checkResult || checking) return
    setChecking(true)
    setCheckError(null)
    const response = await fetch("/api/ai/reality-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessType,
        idea: experiment.hypothesis,
        goal: experiment.metric ?? "",
        constraint: experiment.deadline
          ? `deadline ${experiment.deadline}, solo founder, minimal budget`
          : "solo founder, minimal budget",
        locale,
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      setCheckError(data.error ?? d.common.error)
    } else {
      setCheckResult(data.result)
    }
    setChecking(false)
  }

  const overdue =
    experiment.deadline &&
    experiment.status !== "decided" &&
    experiment.deadline < new Date().toISOString().slice(0, 10)

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <p className="text-sm font-medium text-ink">{experiment.hypothesis}</p>
        {experiment.test_method && (
          <p className="text-xs text-muted-foreground">
            {d.lab.testMethod}: {experiment.test_method}
          </p>
        )}
        {experiment.metric && (
          <p className="text-xs text-muted-foreground">
            {d.lab.metricLabel}: {experiment.metric}
          </p>
        )}
        {experiment.deadline && (
          <p
            className={
              overdue
                ? "text-xs font-medium text-danger"
                : "text-xs text-muted-foreground"
            }
          >
            {d.lab.deadlineLabel}: {experiment.deadline}
            {overdue && ` — ${d.lab.overdue}`}
          </p>
        )}
        {experiment.result && experiment.status !== "decided" && (
          <p className="text-xs text-muted-foreground">
            {d.lab.resultLabel}: {experiment.result}
          </p>
        )}

        {experiment.status === "decided" ? (
          <div className="space-y-2">
            {/* The outcome gets written down before the verdict — that's
                what makes the next experiment smarter. */}
            <div className="flex items-center gap-2">
              <Input
                className="h-9 flex-1 text-xs"
                maxLength={300}
                placeholder={d.lab.resultPlaceholder}
                value={result}
                onChange={(e) => setResult(e.target.value)}
              />
              {result.trim() !== (experiment.result ?? "").trim() && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0"
                  onClick={() =>
                    updateExperiment({ result: result.trim() || null })
                  }
                >
                  {d.lab.saveResult}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
            <Select
              value={experiment.decision ?? undefined}
              onValueChange={(value) => updateExperiment({ decision: value })}
            >
              <SelectTrigger className="h-9 w-[150px] text-xs">
                <SelectValue placeholder={d.lab.decision} />
              </SelectTrigger>
              <SelectContent>
                {DECISIONS.map((decision) => (
                  <SelectItem key={decision} value={decision}>
                    {d.labels[decision]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {experiment.decision && (
              <Badge
                className={
                  experiment.decision === "kill"
                    ? "border-transparent bg-danger/15 text-danger hover:bg-danger/15"
                    : experiment.decision === "scale"
                      ? "border-transparent bg-ok/15 text-ok hover:bg-ok/15"
                      : ""
                }
                variant={
                  experiment.decision === "kill" ||
                  experiment.decision === "scale"
                    ? "default"
                    : "secondary"
                }
              >
                {d.labels[experiment.decision as (typeof DECISIONS)[number]] ??
                  experiment.decision}
              </Badge>
            )}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() =>
                updateExperiment({
                  status: experiment.status === "idea" ? "testing" : "decided",
                })
              }
            >
              {experiment.status === "idea" ? d.lab.startTesting : d.lab.decide}
            </Button>

            <Dialog open={checkOpen} onOpenChange={setCheckOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9"
                  onClick={runRealityCheck}
                >
                  {d.lab.realityCheck}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[80dvh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-ink">
                    {d.lab.realityCheck}
                  </DialogTitle>
                </DialogHeader>
                {checking && (
                  <p className="text-sm text-muted-foreground" role="status">
                    {d.lab.analyzing}
                  </p>
                )}
                {checkError && (
                  <p className="text-sm text-danger">{checkError}</p>
                )}
                {checkResult && (
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {checkResult}
                  </pre>
                )}
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
