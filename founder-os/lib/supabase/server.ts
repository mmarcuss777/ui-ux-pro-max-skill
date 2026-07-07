import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import { AUTH_COOKIE_OPTIONS } from "@/lib/supabase/cookie-options"
import type { Database } from "@/types/db"

export function createClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: AUTH_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components cannot write cookies; the middleware
            // refreshes the session instead.
          }
        },
      },
    }
  )
}
