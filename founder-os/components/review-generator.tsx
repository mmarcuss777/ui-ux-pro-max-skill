"use client"

import { useState } from "react"

import { PrimaryCta } from "@/components/primary-cta"
import { Card, CardContent } from "@/components/ui/card"

export function ReviewGenerator({ summary }: { summary: string }) {
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function generate() {
    setLoading(true)
    setError(null)
    const response = await fetch("/api/ai/reality-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "weekly-review", summary }),
    })
    const data = await response.json()
    if (!response.ok) {
      setError(data.error ?? "Review failed.")
    } else {
      setResult(data.result)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <PrimaryCta onClick={generate} disabled={loading}>
        {loading ? "Generating…" : "Generate review"}
      </PrimaryCta>

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
