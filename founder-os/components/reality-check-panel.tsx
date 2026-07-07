"use client"

import { useState } from "react"

import { useLocale, useT } from "@/components/locale-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// One brutal AI audit of the current build — manual trigger, once per
// day. The verdict is persisted; the previous one stays visible so the
// founder is always confronted with what the last audit said.
export function RealityCheckPanel({
  context,
  workspaceId,
  last,
}: {
  context: string
  workspaceId?: string
  last?: { content: string; date: string } | null
}) {
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
      body: JSON.stringify({ context, locale, workspaceId }),
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
          <CardTitle className="text-base text-gold-dark">
            {d.buildPage.realityCheck}
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {d.buildPage.realityHint}
          </p>
        </div>
        <Button
          variant="outline"
          className="h-9 border-gold/40 text-gold-dark hover:text-gold-dark"
          onClick={run}
          disabled={loading}
        >
          {loading ? d.buildPage.checking : d.buildPage.runCheck}
        </Button>
      </CardHeader>
      {(error || result || last) && (
        <CardContent className="space-y-3">
          {error && <p className="text-sm text-danger">{error}</p>}
          {result && (
            <pre className="whitespace-pre-wrap font-sans text-sm">
              {result}
            </pre>
          )}
          {!result && last && (
            <details className="group">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {d.buildPage.lastCheck} · {last.date}
              </summary>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-ink/80">
                {last.content}
              </pre>
            </details>
          )}
        </CardContent>
      )}
    </Card>
  )
}
