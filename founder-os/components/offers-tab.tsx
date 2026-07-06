"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

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
  const [open, setOpen] = useState(false)
  const [type, setType] = useState(offerTypes[0])
  const [name, setName] = useState("")
  const [cost, setCost] = useState("")
  const [price, setPrice] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { error: insertError } = await supabase.from("offers").insert({
      workspace_id: workspaceId,
      type,
      name: name.trim(),
      cost: cost ? Number(cost) : 0,
      price: price ? Number(price) : 0,
    })

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    setName("")
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
          <PrimaryCta>Add offer</PrimaryCta>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-ink">New offer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="offer-type">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="offer-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {offerTypes.map((offerType) => (
                    <SelectItem key={offerType} value={offerType}>
                      {offerType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-name">Name</Label>
              <Input
                id="offer-name"
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="offer-cost">Cost</Label>
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
                <Label htmlFor="offer-price">Price</Label>
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
              Margin is calculated automatically: price − cost.
            </p>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" className="h-11 w-full" disabled={saving}>
              {saving ? "Saving…" : "Save offer"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {offers.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-4 text-sm text-muted-foreground">
          No offers yet.
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
                    <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="capitalize">
                        {offer.type}
                      </Badge>
                      {formatMoney(offer.cost ?? 0)} cost ·{" "}
                      {formatMoney(offer.price ?? 0)} price
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
                      <SelectTrigger className="h-9 w-[110px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
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
