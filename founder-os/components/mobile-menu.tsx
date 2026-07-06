"use client"

import { useRouter } from "next/navigation"
import {
  CheckIcon,
  ExitIcon,
  GearIcon,
  HamburgerMenuIcon,
} from "@radix-ui/react-icons"

import { useLocale, useT } from "@/components/locale-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const WORKSPACE_COOKIE = "fos_workspace"
const LOCALES: Locale[] = ["en", "sk"]
const LOCALE_LABEL: Record<Locale, string> = { en: "English", sk: "Slovenčina" }

type WorkspaceOption = { id: string; name: string; status: string }

// Everything that doesn't fit the mobile header lives behind this one
// button: workspace switching, secondary pillars, language, logout. Keeps
// the header itself to a fixed two-element row so it can never overflow
// the viewport width.
export function MobileMenu({
  workspaces,
  activeId,
}: {
  workspaces: WorkspaceOption[]
  activeId: string
}) {
  const router = useRouter()
  const d = useT()
  const locale = useLocale()

  function switchWorkspace(id: string) {
    if (id === activeId) return
    document.cookie = `${WORKSPACE_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`
    router.refresh()
  }

  function switchLocale(next: Locale) {
    if (next === locale) return
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
    router.refresh()
  }

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="md:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            aria-label={d.nav.menu}
          >
            <HamburgerMenuIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {d.switcher.workspace}
          </DropdownMenuLabel>
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onSelect={() => switchWorkspace(workspace.id)}
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
              {workspace.id === activeId && (
                <CheckIcon className="h-4 w-4 shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onSelect={() => router.push("/workspace")}>
            <GearIcon className="mr-2 h-4 w-4" />
            {d.switcher.manage}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => router.push("/mind")}>
            {d.nav.mind}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push("/nexa")}>
            {d.nav.nexa}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <div className="flex gap-1.5 px-2 py-1.5">
            {LOCALES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => switchLocale(option)}
                aria-pressed={locale === option}
                className={cn(
                  "h-7 flex-1 rounded-full text-xs font-semibold transition-colors",
                  locale === option
                    ? "gold-fill"
                    : "border border-line text-muted-foreground hover:text-ink"
                )}
              >
                {LOCALE_LABEL[option]}
              </button>
            ))}
          </div>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={logout}
            className="text-danger focus:text-danger"
          >
            <ExitIcon className="mr-2 h-4 w-4" />
            {d.nav.logout}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
