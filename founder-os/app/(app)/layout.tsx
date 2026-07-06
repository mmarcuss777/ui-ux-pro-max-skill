import Link from "next/link"
import { redirect } from "next/navigation"

import { AppNav } from "@/components/app-nav"
import { LanguageToggle } from "@/components/language-toggle"
import { LogoutButton } from "@/components/logout-button"
import { WorkspaceSwitcher } from "@/components/workspace-switcher"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  const workspaces = await getWorkspaces()
  if (workspaces.length === 0) {
    redirect("/onboarding")
  }
  const active = resolveActiveWorkspace(workspaces)!

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4">
          <Link
            href="/dashboard"
            className="text-lg font-bold tracking-tight text-ink"
          >
            Nexa<span className="text-ok">.</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <LanguageToggle />
            <WorkspaceSwitcher
              workspaces={workspaces.map(({ id, name, status }) => ({
                id,
                name,
                status,
              }))}
              activeId={active.id}
            />
            <LogoutButton />
          </div>
        </div>
        <AppNav />
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
    </div>
  )
}
