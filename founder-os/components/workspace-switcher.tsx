"use client"

import { useRouter } from "next/navigation"
import {
  CaretSortIcon,
  CheckIcon,
  GearIcon,
  PlusIcon,
} from "@radix-ui/react-icons"

import { useT } from "@/components/locale-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const WORKSPACE_COOKIE = "fos_workspace"

type WorkspaceOption = {
  id: string
  name: string
  status: string
}

export function WorkspaceSwitcher({
  workspaces,
  activeId,
}: {
  workspaces: WorkspaceOption[]
  activeId: string
}) {
  const router = useRouter()
  const d = useT()

  function switchTo(id: string) {
    document.cookie = `${WORKSPACE_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`
    router.refresh()
  }

  const active = workspaces.find((w) => w.id === activeId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 max-w-[160px] gap-1 rounded-full">
          <span className="truncate">
            {active?.name ?? d.switcher.workspace}
          </span>
          <CaretSortIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            onSelect={() => switchTo(workspace.id)}
            className="justify-between"
          >
            <span className="truncate">
              {workspace.name}
              {workspace.status !== "active" && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({workspace.status})
                </span>
              )}
            </span>
            {workspace.id === activeId && <CheckIcon className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/workspace")}>
          <GearIcon className="mr-2 h-4 w-4" />
          {d.switcher.manage}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/onboarding")}>
          <PlusIcon className="mr-2 h-4 w-4" />
          {d.switcher.newWorkspace}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
