"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChartIcon, ChatBubbleIcon, TargetIcon } from "@radix-ui/react-icons"

import { useT } from "@/components/locale-provider"
import { cn } from "@/lib/utils"

// Three quiet section icons on the right side of the header — Nexa,
// Money, Review. One gold tone, no pills, no text: the logo owns the
// left, the controls own the right, the header stays clean. Mobile only;
// desktop has the full pill nav underneath. (Business lives in the dock —
// it's a daily pillar; Nexa is the occasional advisor, so it sits up here.)
export function HeaderSections() {
  const pathname = usePathname()
  const d = useT()

  const links = [
    { href: "/nexa", label: d.nav.nexa, icon: ChatBubbleIcon },
    { href: "/money", label: d.money.title, icon: BarChartIcon },
    { href: "/review", label: d.nav.review, icon: TargetIcon },
  ]

  return (
    <div className="flex items-center gap-0.5 md:hidden">
      {links.map(({ href, label, icon: Icon }) => {
        const isActive = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            prefetch={true}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full text-gold-dark transition-all active:scale-90",
              isActive ? "bg-gold/[0.15]" : "hover:bg-gold/[0.08]"
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </Link>
        )
      })}
    </div>
  )
}
