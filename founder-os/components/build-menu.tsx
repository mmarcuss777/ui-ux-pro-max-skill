"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  DotsHorizontalIcon,
  Pencil1Icon,
  TrashIcon,
} from "@radix-ui/react-icons"

import { BuildFormDialog } from "@/components/build-form-dialog"
import { useT } from "@/components/locale-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import type { Build } from "@/types/db"

// Full control over the project, always one tap away: edit it, delete
// it, or wipe the AI's briefings and audits. The founder's data (logs,
// transactions) is never touched from here.
export function BuildMenu({
  build,
  workspaceId,
}: {
  build: Build
  workspaceId: string
}) {
  const router = useRouter()
  const d = useT()
  const [editOpen, setEditOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function deleteBuild() {
    if (!window.confirm(d.buildPage.confirmDeleteBuild)) return
    setBusy(true)
    const supabase = createClient()
    await supabase.from("builds").delete().eq("id", build.id)
    setBusy(false)
    router.refresh()
  }

  async function deleteAiHistory() {
    if (!window.confirm(d.buildPage.confirmDeleteAi)) return
    setBusy(true)
    const supabase = createClient()
    await supabase
      .from("logs")
      .delete()
      .in("type", ["briefing", "reality_check"])
    setBusy(false)
    router.refresh()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            aria-label={d.buildPage.menuLabel}
            disabled={busy}
          >
            <DotsHorizontalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil1Icon className="mr-2 h-4 w-4" />
            {d.common.edit}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={deleteAiHistory}
            className="text-muted-foreground"
          >
            <TrashIcon className="mr-2 h-4 w-4" />
            {d.buildPage.deleteAi}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={deleteBuild} className="text-danger">
            <TrashIcon className="mr-2 h-4 w-4" />
            {d.buildPage.deleteBuild}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <BuildFormDialog
        workspaceId={workspaceId}
        build={build}
        hasActive
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  )
}
