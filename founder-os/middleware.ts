import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { AUTH_COOKIE_OPTIONS } from "@/lib/supabase/cookie-options"

const PUBLIC_PATHS = ["/login", "/signup"]

// Fast path: if the session cookie holds a token that is still comfortably
// inside its lifetime, trust it and skip the network round trip to Supabase
// Auth. That call used to run on EVERY navigation and was the single
// biggest per-request latency tax. When the token is missing or near
// expiry we fall through to the full client, which also refreshes it.
// (Trade-off: a revoked-but-unexpired token passes the redirect check for
// up to an hour — data access is still protected by RLS on every query.)
function hasFreshSession(request: NextRequest): boolean {
  const chunks = request.cookies
    .getAll()
    .filter((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
  if (chunks.length === 0) return false
  let raw = chunks.map((c) => c.value).join("")
  try {
    if (raw.startsWith("base64-")) {
      const b64 = raw
        .slice(7)
        .replace(/-/g, "+")
        .replace(/_/g, "/")
      raw = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4))
    }
    const session = JSON.parse(raw) as { expires_at?: number }
    return (
      typeof session.expires_at === "number" &&
      session.expires_at * 1000 > Date.now() + 60_000
    )
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path))

  if (hasFreshSession(request)) {
    if (isPublic) {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: AUTH_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refreshes the auth token; required for @supabase/ssr to work reliably.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }
  if (user && isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  // manifest.json and sw.js must stay reachable without auth — a redirect
  // to /login here breaks PWA installation and service-worker updates.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
