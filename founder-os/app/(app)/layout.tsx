import Link from "next/link"
import { redirect } from "next/navigation"
import { PersonIcon } from "@radix-ui/react-icons"

import { AppNav, BottomNav } from "@/components/app-nav"
import { HeaderSections } from "@/components/header-sections"
import { WarmRoutes } from "@/components/warm-routes"
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
          <div className="flex items-center gap-1">
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
            <HeaderSections />
            {/* The operator's profile — rank, records, bars. */}
            <Link
              href="/profile"
              prefetch={true}
              aria-label="Profile"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold-dark transition-transform active:scale-90"
            >
              <PersonIcon className="h-4 w-4" />
            </Link>
            <MobileMenu
              workspaces={workspaces.map(({ id, name, status }) => ({
                id,
                name,
                status,
              }))}
              activeId={active.id}
            />
          </div>
        </div>
        <AppNav />
      </header>
      {/* Bottom padding clears the fixed mobile dock (its height + the
          device safe-area inset) so nothing hides behind it. Desktop has
          no dock, so it drops back to a normal gap. */}
      {/* Page-enter animation lives in template.tsx (per navigation) —
          the main shell stays static so nothing double-animates. */}
      <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-[calc(9.5rem+env(safe-area-inset-bottom))] md:pb-8">
        {children}
      </main>
      <BottomNav />
      <WarmRoutes />
    </div>
  )
}
