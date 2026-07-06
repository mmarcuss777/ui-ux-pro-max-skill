"use client"

import { useState } from "react"

import { useLocale, useT } from "@/components/locale-provider"
import { PrimaryCta } from "@/components/primary-cta"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

export function AskNexa() {
  const d = useT()
  const locale = useLocale()
  const [question, setQuestion] = useState("")
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function ask(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const response = await fetch("/api/ai/ask-nexa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, locale }),
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

  return (
    <div className="space-y-4">
      <form onSubmit={ask} className="space-y-3">
        <Textarea
          rows={3}
          required
          maxLength={500}
          placeholder={d.nexa.placeholder}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <PrimaryCta type="submit" disabled={loading}>
            {loading ? d.nexa.asking : d.nexa.ask}
          </PrimaryCta>
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
