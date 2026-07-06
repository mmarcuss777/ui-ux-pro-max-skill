import { ContactsTab } from "@/components/contacts-tab"
import { OffersTab } from "@/components/offers-tab"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BUSINESS_TYPES, type BusinessType } from "@/lib/business-types"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"

export default async function OffersPage() {
  const supabase = createClient()
  const workspaces = await getWorkspaces()
  const active = resolveActiveWorkspace(workspaces)!

  const [{ data: offers }, { data: contacts }] = await Promise.all([
    supabase
      .from("offers")
      .select("*")
      .eq("workspace_id", active.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("contacts")
      .select("*")
      .eq("workspace_id", active.id)
      .order("created_at", { ascending: false }),
  ])

  const config =
    BUSINESS_TYPES[active.business_type as BusinessType] ??
    BUSINESS_TYPES.custom

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Offers & Contacts</h1>
        <p className="text-sm text-muted-foreground">
          What you sell, and who you sell it to.
        </p>
      </div>

      <Tabs defaultValue="offers">
        <TabsList className="grid h-11 w-full max-w-xs grid-cols-2">
          <TabsTrigger value="offers" className="h-9">
            Offers
          </TabsTrigger>
          <TabsTrigger value="contacts" className="h-9">
            Contacts
          </TabsTrigger>
        </TabsList>
        <TabsContent value="offers" className="mt-4">
          <OffersTab
            offers={offers ?? []}
            workspaceId={active.id}
            offerTypes={config.offerTypes}
          />
        </TabsContent>
        <TabsContent value="contacts" className="mt-4">
          <ContactsTab
            contacts={contacts ?? []}
            workspaceId={active.id}
            contactTypes={config.contactTypes}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
