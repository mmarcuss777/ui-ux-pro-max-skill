"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ChatBubbleIcon,
  HomeIcon,
  LightningBoltIcon,
  PlusIcon,
  ReaderIcon,
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

// Dock order: pillars around a raised gold Log button in the middle.
// Build, Money and Reset stay one tap away via Today's cards + the menu.
const MOBILE_LEFT = [
  { href: "/dashboard", key: "today", icon: HomeIcon },
  { href: "/body", key: "body", icon: LightningBoltIcon },
] as const
const MOBILE_RIGHT = [
  { href: "/mind", key: "mind", icon: ReaderIcon },
  { href: "/nexa", key: "nexa", icon: ChatBubbleIcon },
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

// Floating glass dock — mobile only. All four everyday destinations plus
// the raised gold Log button; Build, Money, Reset live in the header menu.
export function BottomNav() {
  const pathname = usePathname()
  const d = useT()

  function DockLink({
    link,
  }: {
    link: (typeof MOBILE_LEFT)[number] | (typeof MOBILE_RIGHT)[number]
  }) {
    const isActive = pathname.startsWith(link.href)
    const Icon = link.icon
    return (
      <Link
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
              isActive && "drop-shadow-[0_1px_6px_rgba(201,162,39,0.5)]"
            )}
          />
        </span>
        {d.nav[link.key]}
      </Link>
    )
  }

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+0.625rem)] md:hidden"
    >
      <div className="glass mx-auto grid max-w-md grid-cols-5 rounded-[1.75rem] border shadow-elevated">
        {MOBILE_LEFT.map((link) => (
          <DockLink key={link.href} link={link} />
        ))}
        {/* Center: the one action that keeps the loop alive. Raised and
            gold so logging is always a thumb-reach away. */}
        <div className="flex items-center justify-center">
          <Link
            href="/log"
            aria-label={d.nav.log}
            aria-current={pathname.startsWith("/log") ? "page" : undefined}
            className={cn(
              "gold-fill -mt-7 flex h-14 w-14 items-center justify-center rounded-full shadow-gold-glow ring-4 ring-paper transition-transform duration-200 ease-spring active:scale-90",
              pathname.startsWith("/log") && "ring-gold/30"
            )}
          >
            <PlusIcon className="h-6 w-6" />
          </Link>
        </div>
        {MOBILE_RIGHT.map((link) => (
          <DockLink key={link.href} link={link} />
        ))}
      </div>
    </nav>
  )
}
