"use client"

import { useRouter } from "next/navigation"
import { HamburgerMenuIcon } from "@radix-ui/react-icons"

import { useT } from "@/components/locale-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Secondary destinations on mobile (the bottom nav carries the primary five).
export function MobileMenu() {
  const router = useRouter()
  const d = useT()

  const items = [
    { href: "/mind", label: d.nav.mind },
    { href: "/nexa", label: d.nav.nexa },
    { href: "/workspace", label: d.nav.workspace },
  ]

  return (
    <div className="md:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            aria-label={d.nav.menu}
          >
            <HamburgerMenuIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {items.map((item) => (
            <DropdownMenuItem
              key={item.href}
              onSelect={() => router.push(item.href)}
            >
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
