"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { useT } from "@/components/locale-provider"
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
import { Textarea } from "@/components/ui/textarea"

export function AddExperimentDialog({ workspaceId }: { workspaceId: string }) {
  const router = useRouter()
  const d = useT()
  const [open, setOpen] = useState(false)
  const [hypothesis, setHypothesis] = useState("")
  const [metric, setMetric] = useState("")
  const [deadline, setDeadline] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { error: insertError } = await supabase.from("experiments").insert({
      workspace_id: workspaceId,
      hypothesis: hypothesis.trim(),
      metric: metric.trim() || null,
      deadline: deadline || null,
    })

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    setHypothesis("")
    setMetric("")
    setDeadline("")
    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <PrimaryCta>{d.lab.addExperiment}</PrimaryCta>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-ink">{d.lab.newExperiment}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hypothesis">{d.lab.hypothesis}</Label>
            <Textarea
              id="hypothesis"
              required
              maxLength={500}
              placeholder={d.lab.hypothesisPlaceholder}
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="metric">{d.lab.metric}</Label>
            <Input
              id="metric"
              maxLength={120}
              placeholder={d.lab.metricPlaceholder}
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadline">{d.lab.deadline}</Label>
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="h-11 w-full" disabled={saving}>
            {saving ? d.common.saving : d.lab.saveExperiment}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
