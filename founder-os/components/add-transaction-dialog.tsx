"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { useT } from "@/components/locale-provider"
import { createClient } from "@/lib/supabase/client"
import { today } from "@/lib/dates"
import { PrimaryCta } from "@/components/primary-cta"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function AddTransactionDialog({ workspaceId }: { workspaceId: string }) {
  const router = useRouter()
  const d = useT()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<"in" | "out">("in")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("")
  const [date, setDate] = useState(today())
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push("/login")
      return
    }

    const { error: insertError } = await supabase.from("transactions").insert({
      user_id: user.id,
      workspace_id: workspaceId,
      type,
      amount: Number(amount),
      category: category.trim() || null,
      date,
      note: note.trim() || null,
    })

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    setAmount("")
    setCategory("")
    setNote("")
    setDate(today())
    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <PrimaryCta>{d.money.addTransaction}</PrimaryCta>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-ink">
            {d.money.newTransaction}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs
            value={type}
            onValueChange={(value) => setType(value as "in" | "out")}
          >
            <TabsList className="grid h-11 w-full grid-cols-2">
              <TabsTrigger value="in" className="h-9">
                {d.money.moneyIn}
              </TabsTrigger>
              <TabsTrigger value="out" className="h-9">
                {d.money.moneyOut}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="space-y-2">
            <Label htmlFor="tx-amount">{d.money.amount}</Label>
            <Input
              id="tx-amount"
              type="number"
              inputMode="decimal"
              required
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tx-category">{d.money.category}</Label>
              <Input
                id="tx-category"
                maxLength={60}
                placeholder={d.money.categoryPlaceholder}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-date">{d.money.date}</Label>
              <Input
                id="tx-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tx-note">{d.money.note}</Label>
            <Input
              id="tx-note"
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="h-11 w-full" disabled={saving}>
            {saving ? d.common.saving : d.money.saveTransaction}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
