import Link from "next/link"
import { redirect } from "next/navigation"

import { AppNav, BottomNav } from "@/components/app-nav"
import { LanguageToggle } from "@/components/language-toggle"
import { LogoutButton } from "@/components/logout-button"
import { MobileMenu } from "@/components/mobile-menu"
import { WorkspaceSwitcher } from "@/components/workspace-switcher"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Auth is already enforced by middleware for every route this layout
  // wraps (unauthenticated requests are redirected before they get here) —
  // checking again here would just be a second network round trip to
  // Supabase Auth on every navigation.
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
          <div className="hidden items-center gap-1.5 md:flex">
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
          <MobileMenu
            workspaces={workspaces.map(({ id, name, status }) => ({
              id,
              name,
              status,
            }))}
            activeId={active.id}
          />
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
