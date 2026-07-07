"use client"

import { useState } from "react"

import { useLocale, useT } from "@/components/locale-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function ReviewGenerator({ summary }: { summary: string }) {
  const d = useT()
  const locale = useLocale()
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function generate() {
    setLoading(true)
    setError(null)
    const response = await fetch("/api/ai/reality-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "weekly-review", summary, locale }),
    })
    const data = await response.json()
    if (response.status === 429) {
      setError(d.review.limitReached)
    } else if (!response.ok) {
      setError(data.error ?? d.review.failed)
    } else {
      setResult(data.result)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={generate} disabled={loading}>
          {loading ? d.review.generating : d.review.generate}
        </Button>
        <p className="text-xs text-muted-foreground">{d.review.limitNote}</p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {result && (
        <Card className="border-gold/25">
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
