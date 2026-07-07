"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { useT } from "@/components/locale-provider"
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
import {
  KEY_PROVIDERS,
  PROVIDER_NAMES,
  type Provider,
} from "@/lib/connectors/registry"
import { createClient } from "@/lib/supabase/client"

// Per-provider action row on the Connect page. Strava = OAuth redirect;
// key providers (Stripe, GitHub, Toggl, ...) = paste-a-key dialog;
// CSV/Garmin = client-side parse with column mapping. Connected providers
// get Sync now / Disconnect / Delete data.
const EXTRA_FIELD: Partial<Record<Provider, "shopDomain" | "siteDomain">> = {
  shopify: "shopDomain",
  plausible: "siteDomain",
}

// Where the user finds the key — shown inside the connect dialog.
const KEY_HINTS: Partial<Record<Provider, string>> = {
  stripe: "dashboard.stripe.com → Developers → API keys (restricted, read-only)",
  shopify: "Admin → Settings → Apps → Develop apps → Admin API access token",
  plausible: "plausible.io → Settings → API keys",
  github: "github.com → Settings → Developer settings → Personal access tokens",
  toggl: "track.toggl.com → Profile settings → API token",
  rescuetime: "rescuetime.com/anapi/manage → Create API key",
  mailchimp: "Account → Extras → API keys",
  lemonsqueezy: "app.lemonsqueezy.com → Settings → API",
}

export function ConnectActions({
  provider,
  isConnected,
  workspaceId,
  oauthUrl,
}: {
  provider: Provider
  isConnected: boolean
  workspaceId: string
  // When set, connecting is one click through the provider's own login —
  // no key to paste. Falls back to the key dialog when absent.
  oauthUrl?: string
}) {
  const router = useRouter()
  const d = useT()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function manage(action: "sync" | "disconnect" | "delete_data") {
    setBusy(action)
    setError(null)
    const response = await fetch("/api/integrations/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, action }),
    })
    const data = await response.json().catch(() => ({}))
    setBusy(null)
    if (!response.ok) {
      setError(data.error ?? d.common.error)
      return
    }
    router.refresh()
  }

  return (
    <div className="space-y-2 pt-1">
      <div className="flex flex-wrap gap-2">
        {!isConnected && provider === "strava" && (
          <Button asChild variant="outline" size="sm" className="h-9">
            <a href="/api/integrations/strava/start">{d.connect.connectCta}</a>
          </Button>
        )}
        {!isConnected && oauthUrl && (
          <Button asChild variant="outline" size="sm" className="h-9">
            <a href={oauthUrl}>{d.connect.connectAccount}</a>
          </Button>
        )}
        {!isConnected && !oauthUrl && KEY_PROVIDERS.includes(provider) && (
          <KeyDialog provider={provider} onDone={() => router.refresh()} />
        )}
        {provider === "csv" && (
          <CsvDialog workspaceId={workspaceId} kind="money" />
        )}
        {provider === "garmin" && !isConnected && (
          <CsvDialog workspaceId={workspaceId} kind="fitness" />
        )}

        {isConnected && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              disabled={busy !== null}
              onClick={() => manage("sync")}
            >
              {busy === "sync" ? d.connect.syncing : d.connect.syncNow}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9"
              disabled={busy !== null}
              onClick={() => manage("disconnect")}
            >
              {d.connect.disconnect}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-danger hover:text-danger"
              disabled={busy !== null}
              onClick={() => manage("delete_data")}
            >
              {d.connect.deleteData}
            </Button>
          </>
        )}
      </div>
      {provider === "strava" && (
        <p className="text-[11px] text-muted-foreground">
          {d.connect.stravaHint}
        </p>
      )}
      {provider === "garmin" && (
        <p className="text-[11px] text-muted-foreground">
          {d.connect.garminHint}
        </p>
      )}
      {provider === "gcal" && !isConnected && oauthUrl && (
        <p className="text-[11px] text-muted-foreground">
          {d.connect.googleHint}
        </p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

// ---- key-paste connect ------------------------------------------------
function KeyDialog({
  provider,
  onDone,
}: {
  provider: Provider
  onDone: () => void
}) {
  const d = useT()
  const [open, setOpen] = useState(false)
  const [key, setKey] = useState("")
  const [extra, setExtra] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const extraField = EXTRA_FIELD[provider]

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const response = await fetch("/api/integrations/connect-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, key, extra: extra || null }),
    })
    const data = await response.json().catch(() => ({}))
    setBusy(false)
    if (!response.ok) {
      setError(data.error ?? d.common.error)
      return
    }
    setOpen(false)
    onDone()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          {d.connect.connectCta}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-ink">
            {PROVIDER_NAMES[provider]}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {KEY_HINTS[provider] && (
            <p className="text-xs text-muted-foreground">
              {KEY_HINTS[provider]}
            </p>
          )}
          {extraField && (
            <div className="space-y-2">
              <Label htmlFor="connect-extra">{d.connect[extraField]}</Label>
              <Input
                id="connect-extra"
                required
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="connect-key">{d.connect.keyLabel}</Label>
            <Input
              id="connect-key"
              required
              type="password"
              autoComplete="off"
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="h-11 w-full" disabled={busy}>
            {busy ? d.connect.connecting : d.connect.connectCta}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---- CSV import ---------------------------------------------------------
// Minimal quoted-CSV parser: handles "a,b", doubled quotes and CRLF.
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') inQuotes = false
      else cell += ch
    } else if (ch === '"') inQuotes = true
    else if (ch === ",") {
      row.push(cell)
      cell = ""
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++
      row.push(cell)
      cell = ""
      if (row.some((c) => c.trim() !== "")) rows.push(row)
      row = []
    } else cell += ch
  }
  row.push(cell)
  if (row.some((c) => c.trim() !== "")) rows.push(row)
  return rows
}

function normalizeDate(raw: string): string | null {
  const value = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
  const eu = value.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/)
  if (eu) {
    return `${eu[3]}-${eu[2].padStart(2, "0")}-${eu[1].padStart(2, "0")}`
  }
  const slash = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (slash) {
    return `${slash[3]}-${slash[1].padStart(2, "0")}-${slash[2].padStart(2, "0")}`
  }
  return null
}

// "HH:MM:SS" / "MM:SS" / plain minutes → minutes.
function durationToMinutes(raw: string): number {
  const value = raw.trim()
  if (!value) return 0
  const parts = value.split(":").map(Number)
  if (parts.some((n) => !Number.isFinite(n))) {
    const plain = Number(value.replace(",", "."))
    return Number.isFinite(plain) ? Math.round(plain) : 0
  }
  if (parts.length === 3) return Math.round(parts[0] * 60 + parts[1] + parts[2] / 60)
  if (parts.length === 2) return Math.round(parts[0] + parts[1] / 60)
  return Math.round(parts[0])
}

export function CsvDialog({
  workspaceId,
  kind,
}: {
  workspaceId: string
  kind: "money" | "fitness"
}) {
  const d = useT()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setDone(null)
    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseCsv(String(reader.result ?? ""))
      if (parsed.length < 2) {
        setError(d.common.error)
        return
      }
      setHeaders(parsed[0].map((h) => h.trim()))
      setRows(parsed.slice(1))
      // Auto-map common column names.
      const lower = parsed[0].map((h) => h.trim().toLowerCase())
      const guess = (...names: string[]) =>
        lower.findIndex((h) => names.some((n) => h.includes(n)))
      setMapping(
        kind === "money"
          ? {
              date: guess("date", "dátum", "datum"),
              amount: guess("amount", "suma", "total", "price"),
              type: guess("type", "typ"),
              category: guess("category", "kategór"),
              note: guess("note", "popis", "description", "poznám"),
            }
          : {
              date: guess("date", "dátum", "datum"),
              duration: guess("time", "duration", "trvanie", "čas"),
              distance: guess("distance", "vzdial"),
            }
      )
    }
    reader.readAsText(file)
  }

  async function importFitness() {
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    // Aggregate activities per day: workout count + total minutes + km.
    const byDay = new Map<string, { workouts: number; minutes: number; km: number }>()
    for (const row of rows) {
      const date = normalizeDate(row[mapping.date] ?? "")
      if (!date) continue
      const day = byDay.get(date) ?? { workouts: 0, minutes: 0, km: 0 }
      day.workouts += 1
      if (mapping.duration >= 0)
        day.minutes += durationToMinutes(row[mapping.duration] ?? "")
      if (mapping.distance >= 0) {
        const km = Number(
          String(row[mapping.distance] ?? "").replace(",", ".").replace(/[^0-9.]/g, "")
        )
        if (Number.isFinite(km)) day.km += km
      }
      byDay.set(date, day)
    }

    const records = Array.from(byDay.entries()).flatMap(([date, day]) => {
      const rows_: {
        user_id: string
        provider: string
        metric: string
        date: string
        value: number
      }[] = [{ user_id: user.id, provider: "garmin", metric: "workouts", date, value: day.workouts }]
      if (day.minutes > 0)
        rows_.push({ user_id: user.id, provider: "garmin", metric: "active_minutes", date, value: day.minutes })
      if (day.km > 0)
        rows_.push({ user_id: user.id, provider: "garmin", metric: "distance", date, value: Math.round(day.km * 100) / 100 })
      return rows_
    })

    for (let i = 0; i < records.length; i += 200) {
      const { error: insertError } = await supabase
        .from("imported_metrics")
        .upsert(records.slice(i, i + 200), {
          onConflict: "user_id,provider,metric,date",
        })
      if (insertError) {
        setBusy(false)
        setError(insertError.message)
        return
      }
    }
    // Mark Garmin as connected so the card + sync state reflect it.
    await supabase.from("integrations").upsert(
      {
        user_id: user.id,
        provider: "garmin",
        status: "connected",
        last_sync_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    )
    setBusy(false)
    setDone(byDay.size)
    router.refresh()
  }

  async function importMoney() {
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const records = rows
      .map((row) => {
        const date = normalizeDate(row[mapping.date] ?? "")
        const amountRaw = Number(
          String(row[mapping.amount] ?? "").replace(",", ".").replace(/[^0-9.-]/g, "")
        )
        if (!date || !Number.isFinite(amountRaw) || amountRaw === 0) return null
        const typeRaw =
          mapping.type >= 0 ? String(row[mapping.type] ?? "").toLowerCase() : ""
        const type =
          typeRaw.includes("in") || typeRaw.includes("príjem")
            ? "in"
            : typeRaw.includes("out") || typeRaw.includes("výdav")
              ? "out"
              : amountRaw < 0
                ? "out"
                : "in"
        return {
          user_id: user.id,
          workspace_id: workspaceId,
          type,
          amount: Math.abs(amountRaw),
          date,
          category:
            mapping.category >= 0
              ? String(row[mapping.category] ?? "").trim() || null
              : null,
          note:
            mapping.note >= 0
              ? String(row[mapping.note] ?? "").trim() || null
              : "csv",
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    // Batch in chunks of 200 to stay well under payload limits.
    for (let i = 0; i < records.length; i += 200) {
      const { error: insertError } = await supabase
        .from("transactions")
        .insert(records.slice(i, i + 200))
      if (insertError) {
        setBusy(false)
        setError(insertError.message)
        return
      }
    }
    setBusy(false)
    setDone(records.length)
    router.refresh()
  }

  const moneyFields = ["date", "amount", "type", "category", "note"] as const
  const fitnessFields = ["date", "duration", "distance"] as const
  const fields = kind === "money" ? moneyFields : fitnessFields
  const labels: Record<string, string> = {
    date: d.connect.colDate,
    amount: d.connect.colAmount,
    type: d.connect.colType,
    category: d.connect.colCategory,
    note: d.connect.colNote,
    duration: d.connect.colDuration,
    distance: d.connect.colDistance,
  }
  const cta = kind === "money" ? d.connect.importCta : d.connect.importActivities

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          {cta}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-ink">{cta}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file">{d.connect.csvFile}</Label>
            <Input id="csv-file" type="file" accept=".csv,text/csv" onChange={onFile} />
          </div>

          {headers.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {d.connect.mapColumns}
              </p>
              {fields.map((field) => (
                <div key={field} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-sm text-ink">
                    {labels[field]}
                  </span>
                  <select
                    className="h-10 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-base md:text-sm"
                    value={mapping[field] ?? -1}
                    onChange={(e) =>
                      setMapping((m) => ({ ...m, [field]: Number(e.target.value) }))
                    }
                  >
                    <option value={-1}>{d.connect.skipCol}</option>
                    {headers.map((header, index) => (
                      <option key={index} value={index}>
                        {header || `#${index + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              {kind === "money" && (
                <p className="text-xs text-muted-foreground">
                  {d.connect.typeHint}
                </p>
              )}
              <Button
                className="h-11 w-full"
                disabled={
                  busy ||
                  mapping.date < 0 ||
                  (kind === "money" && mapping.amount < 0)
                }
                onClick={kind === "money" ? importMoney : importFitness}
              >
                {busy
                  ? d.common.saving
                  : `${d.connect.importBtn} (${rows.length} ${d.connect.rowsWord})`}
              </Button>
            </div>
          )}

          {done !== null && (
            <p className="text-sm font-medium text-ok" role="status">
              {d.connect.importedMsg}: {done} {d.connect.rowsWord}
            </p>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
