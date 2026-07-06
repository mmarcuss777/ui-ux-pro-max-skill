"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  HomeIcon,
  Pencil2Icon,
  LightningBoltIcon,
  RocketIcon,
  BarChartIcon,
} from "@radix-ui/react-icons"

import { useT } from "@/components/locale-provider"
import { cn } from "@/lib/utils"

const DESKTOP_LINKS = [
  { href: "/dashboard", key: "today" },
  { href: "/log", key: "log" },
  { href: "/body", key: "body" },
  { href: "/mind", key: "mind" },
  { href: "/build", key: "build" },
  { href: "/review", key: "review" },
  { href: "/nexa", key: "nexa" },
] as const

const MOBILE_LINKS = [
  { href: "/dashboard", key: "today", icon: HomeIcon },
  { href: "/log", key: "log", icon: Pencil2Icon },
  { href: "/body", key: "body", icon: LightningBoltIcon },
  { href: "/build", key: "build", icon: RocketIcon },
  { href: "/review", key: "review", icon: BarChartIcon },
] as const

export function AppNav() {
  const pathname = usePathname()
  const d = useT()

  return (
    <nav
      aria-label="Main"
      className="mx-auto hidden max-w-5xl gap-1.5 overflow-x-auto px-4 pb-3 pt-1 md:flex"
    >
      {DESKTOP_LINKS.map((link) => {
        const isActive = pathname.startsWith(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex h-9 shrink-0 items-center rounded-full px-4 text-sm font-medium transition-colors",
              isActive
                ? "gold-fill font-semibold shadow-md shadow-gold/20"
                : "text-muted-foreground hover:bg-secondary hover:text-ink"
            )}
          >
            {d.nav[link.key]}
          </Link>
        )
      })}
    </nav>
  )
}

// Fixed bottom navigation — mobile only. Mind, Nexa and Workspace live in
// the header menu on small screens.
export function BottomNav() {
  const pathname = usePathname()
  const d = useT()

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5">
        {MOBILE_LINKS.map((link) => {
          const isActive = pathname.startsWith(link.href)
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-[3.5rem] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                isActive ? "text-gold-light" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_6px_rgba(212,175,55,0.6)]")} />
              {d.nav[link.key]}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
