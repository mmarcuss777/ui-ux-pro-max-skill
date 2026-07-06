"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { useT } from "@/components/locale-provider"
import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/dashboard", key: "dashboard" },
  { href: "/log", key: "log" },
  { href: "/business", key: "business" },
  { href: "/lab", key: "lab" },
  { href: "/offers", key: "offers" },
  { href: "/money", key: "money" },
  { href: "/coach", key: "coach" },
  { href: "/screen", key: "screen" },
  { href: "/review", key: "review" },
  { href: "/workspace", key: "workspace" },
] as const

export function AppNav() {
  const pathname = usePathname()
  const d = useT()

  return (
    <nav
      aria-label="Main"
      className="mx-auto flex max-w-5xl gap-1.5 overflow-x-auto px-4 pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {LINKS.map((link) => {
        const isActive = pathname.startsWith(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex h-9 shrink-0 items-center rounded-full px-4 text-sm font-medium transition-colors",
              isActive
                ? "bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-950/50"
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
