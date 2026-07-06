"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

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
  const [open, setOpen] = useState(false)
  const [contactType, setContactType] = useState(contactTypes[0])
  const [name, setName] = useState("")
  const [contact, setContact] = useState("")
  const [stage, setStage] = useState("")
  const [nextStep, setNextStep] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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
          <PrimaryCta>Add contact</PrimaryCta>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-ink">New contact</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-type">Type</Label>
              <Select value={contactType} onValueChange={setContactType}>
                <SelectTrigger id="contact-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contactTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-name">Name</Label>
              <Input
                id="contact-name"
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-detail">Email / phone / handle</Label>
              <Input
                id="contact-detail"
                maxLength={120}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-stage">Stage</Label>
              <Input
                id="contact-stage"
                maxLength={60}
                placeholder="e.g. contacted, proposal sent"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-next">Next step</Label>
              <Input
                id="contact-next"
                maxLength={120}
                placeholder="e.g. follow up on Friday"
                value={nextStep}
                onChange={(e) => setNextStep(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" className="h-11 w-full" disabled={saving}>
              {saving ? "Saving…" : "Save contact"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {contacts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-4 text-sm text-muted-foreground">
          No contacts yet.
        </p>
      ) : (
        <div className="space-y-3">
          {contacts.map((person) => (
            <Card key={person.id}>
              <CardContent className="space-y-1 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-ink">{person.name}</p>
                  <Badge variant="outline" className="capitalize">
                    {person.contact_type}
                  </Badge>
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
                  <p className="text-xs text-ink">Next: {person.next_step}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
