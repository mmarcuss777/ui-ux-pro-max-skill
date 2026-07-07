import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { gcalExchangeCode } from "@/lib/connectors/gcal"
import { runSync } from "@/lib/connectors/sync-core"
import { encryptToken } from "@/lib/crypto"
import { createAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// OAuth landing: verify state, exchange the code, store encrypted tokens
// (service role — secrets are unreadable to the browser), run the first
// sync, bounce back to /connect.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const expected = cookies().get("gcal_oauth_state")?.value

  const back = (query: string) =>
    NextResponse.redirect(new URL(`/connect?${query}`, request.url))

  if (!code || !state || !expected || state !== expected) {
    return back("error=google_state")
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL("/login", request.url))

  try {
    const redirectUri = new URL("/api/integrations/gcal/callback", request.url).toString()
    const tokens = await gcalExchangeCode(code, redirectUri)
    const admin = createAdmin()

    const { data: integration, error } = await admin
      .from("integrations")
      .upsert(
        {
          user_id: user.id,
          provider: "gcal",
          status: "connected",
          scopes: "calendar.events.readonly",
          external_account: tokens.email,
          error: null,
        },
        { onConflict: "user_id,provider" }
      )
      .select()
      .single()
    if (error || !integration) throw new Error(error?.message ?? "save failed")

    await admin.from("integration_secrets").upsert({
      integration_id: integration.id,
      access_token_enc: encryptToken(tokens.accessToken),
      refresh_token_enc: tokens.refreshToken
        ? encryptToken(tokens.refreshToken)
        : null,
      expires_at: tokens.expiresAt,
      updated_at: new Date().toISOString(),
    })

    await runSync(admin, integration).catch(() => undefined)
    return back("connected=gcal")
  } catch (error) {
    console.error("Google Calendar callback failed:", error)
    return back("error=google_connect")
  }
}
