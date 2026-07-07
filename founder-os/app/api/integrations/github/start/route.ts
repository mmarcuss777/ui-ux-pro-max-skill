import { randomBytes } from "node:crypto"
import { NextResponse } from "next/server"

import { githubAuthUrl } from "@/lib/connectors/github"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// Kicks off GitHub OAuth. State goes into a short-lived cookie and is
// checked in the callback (CSRF protection).
export async function GET(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL("/login", request.url))
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/connect?error=github_env", request.url))
  }

  const state = randomBytes(16).toString("hex")
  const redirectUri = new URL("/api/integrations/github/callback", request.url).toString()
  const response = NextResponse.redirect(githubAuthUrl(redirectUri, state))
  response.cookies.set("github_oauth_state", state, {
    httpOnly: true,
    maxAge: 600,
    path: "/",
    sameSite: "lax",
  })
  return response
}
