"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Cross2Icon } from "@radix-ui/react-icons"

import { useLocale, useT } from "@/components/locale-provider"
import { PrimaryCta } from "@/components/primary-cta"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type Picked = {
  name: string
  dataUrl: string // image/jpeg data URL, already downscaled
}

const MAX_IMAGES = 3

// Downscale in the browser so uploads stay small (~200-400 KB) and vision
// costs stay low; Screen Time text is still perfectly readable at 1200px.
async function downscale(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext("2d")!
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL("image/jpeg", 0.82)
}

export function ScreenTimeUploader() {
  const router = useRouter()
  const d = useT()
  const locale = useLocale()
  const inputRef = useRef<HTMLInputElement>(null)
  const [picked, setPicked] = useState<Picked[]>([])
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleFiles(files: FileList | null) {
    if (!files) return
    setError(null)
    const next = [...picked]
    for (const file of Array.from(files)) {
      if (next.length >= MAX_IMAGES) break
      if (!file.type.startsWith("image/")) continue
      next.push({ name: file.name, dataUrl: await downscale(file) })
    }
    setPicked(next)
    if (inputRef.current) inputRef.current.value = ""
  }

  async function analyze() {
    setLoading(true)
    setError(null)
    setResult(null)

    const images = picked.map((p) => ({
      media_type: "image/jpeg",
      data: p.dataUrl.split(",")[1],
    }))

    const response = await fetch("/api/ai/screen-time", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images, locale }),
    })
    const data = await response.json()
    if (response.status === 429) {
      setError(d.screen.limitReached)
    } else if (!response.ok) {
      setError(data.error ?? d.screen.failed)
    } else {
      setResult(data.analysis)
      setPicked([])
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={() => inputRef.current?.click()}
          disabled={picked.length >= MAX_IMAGES || loading}
        >
          {d.screen.pick}
        </Button>
        {picked.length > 0 && (
          <PrimaryCta onClick={analyze} disabled={loading}>
            {loading ? d.screen.analyzing : d.screen.analyze}
          </PrimaryCta>
        )}
        <p className="text-xs text-muted-foreground">{d.screen.maxNote}</p>
      </div>

      {picked.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {picked.map((image, index) => (
            <div key={index} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.dataUrl}
                alt={image.name}
                className="h-32 w-auto rounded-lg border border-line object-cover"
              />
              <button
                type="button"
                aria-label={d.screen.remove}
                onClick={() =>
                  setPicked((current) => current.filter((_, i) => i !== index))
                }
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-paper shadow-sm"
              >
                <Cross2Icon className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">{d.screen.privacy}</p>

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
