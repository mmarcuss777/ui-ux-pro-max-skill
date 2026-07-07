import { ContactsTab } from "@/components/contacts-tab"
import { OffersTab } from "@/components/offers-tab"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BUSINESS_TYPES, type BusinessType } from "@/lib/business-types"
import { getT } from "@/lib/i18n-server"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"

export default async function OffersPage() {
  const supabase = createClient()
  const { d } = getT()
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
        <h1 className="text-2xl font-bold text-ink">{d.offers.title}</h1>
        <p className="text-sm text-muted-foreground">{d.offers.subtitle}</p>
      </div>

      <Tabs defaultValue="offers">
        <TabsList className="grid h-11 w-full max-w-xs grid-cols-2">
          <TabsTrigger value="offers" className="h-9">
            {d.offers.offersTab}
          </TabsTrigger>
          <TabsTrigger value="contacts" className="h-9">
            {d.offers.contactsTab}
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
