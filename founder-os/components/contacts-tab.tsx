"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { useT } from "@/components/locale-provider"
import { createClient } from "@/lib/supabase/client"
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
import type { Contact } from "@/types/db"

type LabelKey = "lead" | "client" | "supplier"

export function ContactsTab({
  contacts,
  workspaceId,
  contactTypes,
}: {
  contacts: Contact[]
  workspaceId: string
  contactTypes: readonly string[]
}) {
  const router = useRouter()
  const d = useT()
  const [open, setOpen] = useState(false)
  const [contactType, setContactType] = useState(contactTypes[0])
  const [name, setName] = useState("")
  const [contact, setContact] = useState("")
  const [stage, setStage] = useState("")
  const [nextStep, setNextStep] = useState("")
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
    const { error: insertError } = await supabase.from("contacts").insert({
      workspace_id: workspaceId,
      contact_type: contactType,
      name: name.trim(),
      contact: contact.trim() || null,
      stage: stage.trim() || null,
      next_step: nextStep.trim() || null,
    })

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    setName("")
    setContact("")
    setStage("")
    setNextStep("")
    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <PrimaryCta>{d.offers.addContact}</PrimaryCta>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-ink">
              {d.offers.newContact}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-type">{d.offers.type}</Label>
              <Select value={contactType} onValueChange={setContactType}>
                <SelectTrigger id="contact-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contactTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {label(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-name">{d.offers.name}</Label>
              <Input
                id="contact-name"
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-detail">{d.offers.contactDetail}</Label>
              <Input
                id="contact-detail"
                maxLength={120}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-stage">{d.offers.stage}</Label>
              <Input
                id="contact-stage"
                maxLength={60}
                placeholder={d.offers.stagePlaceholder}
                value={stage}
                onChange={(e) => setStage(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-next">{d.offers.nextStep}</Label>
              <Input
                id="contact-next"
                maxLength={120}
                placeholder={d.offers.nextStepPlaceholder}
                value={nextStep}
                onChange={(e) => setNextStep(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" className="h-11 w-full" disabled={saving}>
              {saving ? d.common.saving : d.offers.saveContact}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {contacts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted-foreground">
          {d.offers.noContacts}
        </p>
      ) : (
        <div className="space-y-3">
          {contacts.map((person) => (
            <Card key={person.id}>
              <CardContent className="space-y-1 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-ink">{person.name}</p>
                  <Badge variant="outline">{label(person.contact_type)}</Badge>
                  {person.stage && (
                    <Badge variant="secondary">{person.stage}</Badge>
                  )}
                </div>
                {person.contact && (
                  <p className="text-xs text-muted-foreground">
                    {person.contact}
                  </p>
                )}
                {person.next_step && (
                  <p className="text-xs text-ink">
                    {d.offers.next} {person.next_step}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
