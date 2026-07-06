"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

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
import type { Experiment } from "@/types/db"

const DECISIONS = ["kill", "continue", "pivot", "scale"] as const

export function ExperimentCard({
  experiment,
  businessType,
}: {
  experiment: Experiment
  businessType: string
}) {
  const router = useRouter()
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
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      setCheckError(data.error ?? "Reality check failed.")
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
        {experiment.metric && (
          <p className="text-xs text-muted-foreground">
            Metric: {experiment.metric}
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
            Deadline: {experiment.deadline}
            {overdue && " — overdue"}
          </p>
        )}
        {experiment.result && (
          <p className="text-xs text-muted-foreground">
            Result: {experiment.result}
          </p>
        )}

        {experiment.status === "decided" ? (
          <div className="flex items-center gap-2">
            <Select
              value={experiment.decision ?? undefined}
              onValueChange={(value) => updateExperiment({ decision: value })}
            >
              <SelectTrigger className="h-9 w-[130px] text-xs">
                <SelectValue placeholder="Decision…" />
              </SelectTrigger>
              <SelectContent>
                {DECISIONS.map((decision) => (
                  <SelectItem key={decision} value={decision}>
                    {decision}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {experiment.decision && (
              <Badge
                className={
                  experiment.decision === "kill"
                    ? "bg-danger hover:bg-danger"
                    : experiment.decision === "scale"
                      ? "bg-ok hover:bg-ok"
                      : ""
                }
                variant={
                  experiment.decision === "kill" ||
                  experiment.decision === "scale"
                    ? "default"
                    : "secondary"
                }
              >
                {experiment.decision}
              </Badge>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() =>
                updateExperiment({
                  status:
                    experiment.status === "idea" ? "testing" : "decided",
                })
              }
            >
              {experiment.status === "idea" ? "Start testing" : "Decide"}
            </Button>

            <Dialog open={checkOpen} onOpenChange={setCheckOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9"
                  onClick={runRealityCheck}
                >
                  Reality Check
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[80dvh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-ink">Reality Check</DialogTitle>
                </DialogHeader>
                {checking && (
                  <p className="text-sm text-muted-foreground" role="status">
                    Analyzing…
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
