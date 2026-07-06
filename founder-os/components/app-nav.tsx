"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/log", label: "Log" },
  { href: "/lab", label: "Lab" },
  { href: "/offers", label: "Offers" },
  { href: "/money", label: "Money" },
  { href: "/review", label: "Review" },
  { href: "/workspace", label: "Workspace" },
]

export function AppNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Main"
      className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4"
    >
      {LINKS.map((link) => {
        const isActive = pathname.startsWith(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex h-11 shrink-0 items-center border-b-2 px-3 text-sm font-medium",
              isActive
                ? "border-ink text-ink"
                : "border-transparent text-muted-foreground hover:text-ink"
            )}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
