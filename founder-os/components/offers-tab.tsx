"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { useT } from "@/components/locale-provider"
import { createClient } from "@/lib/supabase/client"
import { formatMoney } from "@/lib/money"
import { PrimaryCta } from "@/components/primary-cta"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Offer } from "@/types/db"

const STATUSES = ["draft", "active", "retired"] as const

type LabelKey = "product" | "service" | "investment" | "draft" | "active" | "retired"

export function OffersTab({
  offers,
  workspaceId,
  offerTypes,
}: {
  offers: Offer[]
  workspaceId: string
  offerTypes: readonly string[]
}) {
  const router = useRouter()
  const d = useT()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState(offerTypes[0])
  const [name, setName] = useState("")
  const [audience, setAudience] = useState("")
  const [problem, setProblem] = useState("")
  const [whyBuy, setWhyBuy] = useState("")
  const [cost, setCost] = useState("")
  const [price, setPrice] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function label(value: string): string {
    return d.labels[value as LabelKey] ?? value
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { error: insertError } = await supabase.from("offers").insert({
      workspace_id: workspaceId,
      type,
      name: name.trim(),
      audience: audience.trim() || null,
      problem: problem.trim() || null,
      why_buy: whyBuy.trim() || null,
      cost: cost ? Number(cost) : 0,
      price: price ? Number(price) : 0,
    })

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    setName("")
    setAudience("")
    setProblem("")
    setWhyBuy("")
    setCost("")
    setPrice("")
    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  async function updateStatus(offerId: string, status: string) {
    const supabase = createClient()
    await supabase.from("offers").update({ status }).eq("id", offerId)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <PrimaryCta>{d.offers.addOffer}</PrimaryCta>
        </DialogTrigger>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-ink">{d.offers.newOffer}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="offer-type">{d.offers.type}</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="offer-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {offerTypes.map((offerType) => (
                    <SelectItem key={offerType} value={offerType}>
                      {label(offerType)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-name">{d.offers.whatSell}</Label>
              <Input
                id="offer-name"
                required
                maxLength={120}
                placeholder={d.offers.whatSellPlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-audience">{d.offers.audienceLabel}</Label>
              <Input
                id="offer-audience"
                maxLength={200}
                placeholder={d.offers.audiencePlaceholder}
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-problem">{d.offers.problemLabel}</Label>
              <Input
                id="offer-problem"
                maxLength={200}
                placeholder={d.offers.problemPlaceholder}
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-why">{d.offers.whyBuyLabel}</Label>
              <Input
                id="offer-why"
                maxLength={200}
                placeholder={d.offers.whyBuyPlaceholder}
                value={whyBuy}
                onChange={(e) => setWhyBuy(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="offer-cost">{d.offers.cost}</Label>
                <Input
                  id="offer-cost"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offer-price">{d.offers.price}</Label>
                <Input
                  id="offer-price"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {d.offers.marginNote}
            </p>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" className="h-11 w-full" disabled={saving}>
              {saving ? d.common.saving : d.offers.saveOffer}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {offers.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted-foreground">
          {d.offers.noOffers}
        </p>
      ) : (
        <div className="space-y-3">
          {offers.map((offer) => {
            const margin = offer.margin ?? 0
            return (
              <Card key={offer.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {offer.name}
                    </p>
                    {(offer.audience || offer.problem) && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {[offer.audience, offer.problem]
                          .filter(Boolean)
                          .join(" — ")}
                      </p>
                    )}
                    <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{label(offer.type)}</Badge>
                      {formatMoney(offer.cost ?? 0)} {d.offers.costWord} ·{" "}
                      {formatMoney(offer.price ?? 0)} {d.offers.priceWord}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p
                      className={
                        margin >= 0
                          ? "text-sm font-semibold tabular-nums text-ok"
                          : "text-sm font-semibold tabular-nums text-danger"
                      }
                    >
                      {formatMoney(margin)}
                    </p>
                    <Select
                      value={offer.status}
                      onValueChange={(status) => updateStatus(offer.id, status)}
                    >
                      <SelectTrigger className="h-9 w-[130px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {label(status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
