"use client"

import { useState } from "react"
import Link from "next/link"
import { LightningBoltIcon } from "@radix-ui/react-icons"

import { useLocale, useT } from "@/components/locale-provider"
import { PrimaryCta } from "@/components/primary-cta"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

// Not a generic chatbot: one primary action ("tell me what to do next")
// plus focused modes that narrow the answer to a single job.
type Mode = "free" | "reality" | "idea"

export function AskNexa() {
  const d = useT()
  const locale = useLocale()
  const [mode, setMode] = useState<Mode>("free")
  const [question, setQuestion] = useState("")
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function send(payload: { question: string; mode?: string }) {
    setLoading(true)
    setError(null)
    const response = await fetch("/api/ai/ask-nexa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, locale }),
    })
    const data = await response.json()
    if (response.status === 429) {
      setError(d.nexa.limitReached)
    } else if (!response.ok) {
      setError(data.error ?? d.nexa.failed)
    } else {
      setResult(data.result)
      setQuestion("")
    }
    setLoading(false)
  }

  function ask(event: React.FormEvent) {
    event.preventDefault()
    send({
      question,
      mode: mode === "free" ? undefined : mode,
    })
  }

  const placeholder =
    mode === "reality"
      ? d.nexa.realityPlaceholder
      : mode === "idea"
        ? d.nexa.ideaPlaceholder
        : d.nexa.placeholder

  return (
    <div className="space-y-4">
      {/* The most important button: one tap, one concrete next action. */}
      <PrimaryCta
        className="w-full"
        disabled={loading}
        onClick={() => send({ question: "", mode: "next_move" })}
      >
        <LightningBoltIcon className="mr-2 h-4 w-4" />
        {loading ? d.nexa.asking : d.nexa.modeNext}
      </PrimaryCta>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["free", d.nexa.modeFree],
            ["reality", d.nexa.modeReality],
            ["idea", d.nexa.modeIdea],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            onClick={() => setMode(value)}
            className={cn(
              "rounded-full border px-3.5 py-2 text-xs font-medium transition-all",
              mode === value
                ? "border-gold/50 bg-gold/10 text-gold-dark"
                : "border-line bg-card text-muted-foreground hover:text-ink"
            )}
          >
            {label}
          </button>
        ))}
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-[34px] rounded-full text-xs text-muted-foreground"
        >
          <Link href="/review">{d.nexa.modeWeekly}</Link>
        </Button>
      </div>

      <form onSubmit={ask} className="space-y-3">
        <Textarea
          rows={3}
          required
          maxLength={500}
          placeholder={placeholder}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <Button type="submit" variant="outline" disabled={loading}>
            {loading ? d.nexa.asking : d.nexa.ask}
          </Button>
          <p className="text-xs text-muted-foreground">{d.nexa.limitNote}</p>
        </div>
      </form>

      {error && <p className="text-sm text-danger">{error}</p>}

      {result ? (
        <Card className="border-gold/25">
          <CardContent className="p-4">
            <pre className="whitespace-pre-wrap font-sans text-sm">
              {result}
            </pre>
          </CardContent>
        </Card>
      ) : (
        !error && (
          <p className="text-sm text-muted-foreground">{d.nexa.empty}</p>
        )
      )}
    </div>
  )
}
