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
      <header className="glass sticky top-0 z-40 border-b">
        <div className="mx-auto flex h-[3.75rem] max-w-5xl items-center justify-between gap-2 px-4">
          <Link
            href="/dashboard"
            className="text-xl font-semibold tracking-tight"
          >
            <span className="gold-text">Nexa</span>
            <span className="text-gold-dark">.</span>
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
      <main className="mx-auto w-full max-w-5xl animate-fade-up px-4 py-6 pb-28 md:pb-8">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
