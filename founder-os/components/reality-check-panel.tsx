"use client"

import { useState } from "react"

import { useLocale, useT } from "@/components/locale-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// One brutal AI audit of the current build — manual trigger, once per day.
export function RealityCheckPanel({ context }: { context: string }) {
  const d = useT()
  const locale = useLocale()
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true)
    setError(null)
    const response = await fetch("/api/ai/reality-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context, locale }),
    })
    const data = await response.json()
    if (response.status === 429) {
      setError(d.buildPage.limitReached)
    } else if (!response.ok) {
      setError(data.error ?? d.common.error)
    } else {
      setResult(data.result)
    }
    setLoading(false)
  }

  return (
    <Card className="border-gold/25">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base text-gold-light">
            {d.buildPage.realityCheck}
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {d.buildPage.realityHint}
          </p>
        </div>
        <Button
          variant="outline"
          className="h-9 border-gold/40 text-gold-light hover:text-gold-light"
          onClick={run}
          disabled={loading}
        >
          {loading ? d.buildPage.checking : d.buildPage.runCheck}
        </Button>
      </CardHeader>
      {(error || result) && (
        <CardContent>
          {error && <p className="text-sm text-danger">{error}</p>}
          {result && (
            <pre className="whitespace-pre-wrap font-sans text-sm">
              {result}
            </pre>
          )}
        </CardContent>
      )}
    </Card>
  )
}
