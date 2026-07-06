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
                ? "gold-fill font-semibold shadow-gold-glow"
                : "text-muted-foreground hover:bg-black/[0.05] hover:text-ink"
            )}
          >
            {d.nav[link.key]}
          </Link>
        )
      })}
    </nav>
  )
}

// Floating glass dock — mobile only. Mind, Nexa and Workspace live in
// the header menu on small screens.
export function BottomNav() {
  const pathname = usePathname()
  const d = useT()

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+0.625rem)] md:hidden"
    >
      <div className="glass mx-auto grid max-w-md grid-cols-5 rounded-[1.75rem] border shadow-elevated">
        {MOBILE_LINKS.map((link) => {
          const isActive = pathname.startsWith(link.href)
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-[3.75rem] flex-col items-center justify-center gap-1 text-[10px] font-medium transition-all duration-200 ease-spring active:scale-95",
                isActive ? "text-gold-dark" : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-full transition-all duration-200 ease-spring",
                  isActive && "bg-gold/[0.16]"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    isActive &&
                      "drop-shadow-[0_1px_6px_rgba(201,162,39,0.5)]"
                  )}
                />
              </span>
              {d.nav[link.key]}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
