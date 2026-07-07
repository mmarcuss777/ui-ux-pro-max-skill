"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

// After every navigation, quietly re-prefetch the core destinations so
// the NEXT tap is always served from memory — including after a
// router.refresh() elsewhere flushed the client cache. Runs 400ms after
// settle so it never competes with the page being viewed.
const CORE_ROUTES = [
  "/dashboard",
  "/log",
  "/body",
  "/mind",
  "/build",
  "/nexa",
  "/money",
  "/review",
]

export function WarmRoutes() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const timer = setTimeout(() => {
      for (const route of CORE_ROUTES) {
        if (!pathname.startsWith(route)) router.prefetch(route)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [pathname, router])

  return null
}
