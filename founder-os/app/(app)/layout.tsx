import Link from "next/link"
import { redirect } from "next/navigation"

import { AppNav, BottomNav } from "@/components/app-nav"
import { LanguageToggle } from "@/components/language-toggle"
import { LogoutButton } from "@/components/logout-button"
import { MobileMenu } from "@/components/mobile-menu"
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
      <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4">
          <Link href="/dashboard" className="text-lg font-bold tracking-tight">
            <span className="gold-text">Nexa</span>
            <span className="text-gold-light">.</span>
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
            <MobileMenu />
          </div>
        </div>
        <AppNav />
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-24 md:pb-6">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
