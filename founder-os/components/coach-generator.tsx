"use client"

import { useState } from "react"

import { useLocale, useT } from "@/components/locale-provider"
import { PrimaryCta } from "@/components/primary-cta"
import { Card, CardContent } from "@/components/ui/card"

export function CoachGenerator() {
  const d = useT()
  const locale = useLocale()
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function generate() {
    setLoading(true)
    setError(null)
    const response = await fetch("/api/ai/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    })
    const data = await response.json()
    if (!response.ok) {
      setError(data.error ?? d.coach.failed)
    } else {
      setResult(data.result)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <PrimaryCta onClick={generate} disabled={loading}>
          {loading ? d.coach.generating : d.coach.generate}
        </PrimaryCta>
        <p className="text-xs text-muted-foreground">{d.coach.note}</p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {result && (
        <Card>
          <CardContent className="p-4">
            <pre className="whitespace-pre-wrap font-sans text-sm">
              {result}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
