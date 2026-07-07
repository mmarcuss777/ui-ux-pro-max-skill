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
import type { Provider } from "@/lib/connectors/registry"
import { createClient } from "@/lib/supabase/client"

// Per-provider action row on the Connect page. Strava = OAuth redirect;
// Stripe/Shopify/Plausible = paste-a-key dialog; CSV = client-side parse
// with column mapping straight into transactions. Connected providers get
// Sync now / Disconnect / Delete data.
const EXTRA_FIELD: Partial<Record<Provider, "shopDomain" | "siteDomain">> = {
  shopify: "shopDomain",
  plausible: "siteDomain",
}

export function ConnectActions({
  provider,
  isConnected,
  workspaceId,
}: {
  provider: Provider
  isConnected: boolean
  workspaceId: string
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
        {!isConnected &&
          (provider === "stripe" ||
            provider === "shopify" ||
            provider === "plausible") && (
            <KeyDialog provider={provider} onDone={() => router.refresh()} />
          )}
        {provider === "csv" && <CsvDialog workspaceId={workspaceId} />}

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
          <DialogTitle className="text-ink capitalize">{provider}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
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

function CsvDialog({ workspaceId }: { workspaceId: string }) {
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
      setMapping({
        date: guess("date", "dátum", "datum"),
        amount: guess("amount", "suma", "total", "price"),
        type: guess("type", "typ"),
        category: guess("category", "kategór"),
        note: guess("note", "popis", "description", "poznám"),
      })
    }
    reader.readAsText(file)
  }

  async function importRows() {
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

  const fields = ["date", "amount", "type", "category", "note"] as const
  const labels: Record<(typeof fields)[number], string> = {
    date: d.connect.colDate,
    amount: d.connect.colAmount,
    type: d.connect.colType,
    category: d.connect.colCategory,
    note: d.connect.colNote,
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          {d.connect.importCta}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-ink">{d.connect.importCta}</DialogTitle>
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
              <p className="text-xs text-muted-foreground">{d.connect.typeHint}</p>
              <Button
                className="h-11 w-full"
                disabled={busy || mapping.date < 0 || mapping.amount < 0}
                onClick={importRows}
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
