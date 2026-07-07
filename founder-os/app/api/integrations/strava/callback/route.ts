import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { stravaExchangeCode } from "@/lib/connectors/strava"
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
  const expected = cookies().get("strava_oauth_state")?.value

  const back = (query: string) =>
    NextResponse.redirect(new URL(`/connect?${query}`, request.url))

  if (!code || !state || !expected || state !== expected) {
    return back("error=strava_state")
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL("/login", request.url))

  try {
    const tokens = await stravaExchangeCode(code)
    const admin = createAdmin()

    const { data: integration, error } = await admin
      .from("integrations")
      .upsert(
        {
          user_id: user.id,
          provider: "strava",
          status: "connected",
          scopes: "activity:read_all",
          external_account: tokens.athlete?.username ?? String(tokens.athlete?.id ?? ""),
          error: null,
        },
        { onConflict: "user_id,provider" }
      )
      .select()
      .single()
    if (error || !integration) throw new Error(error?.message ?? "save failed")

    await admin.from("integration_secrets").upsert({
      integration_id: integration.id,
      access_token_enc: encryptToken(tokens.access_token),
      refresh_token_enc: encryptToken(tokens.refresh_token),
      expires_at: new Date(tokens.expires_at * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })

    await runSync(admin, integration).catch(() => undefined)
    return back("connected=strava")
  } catch (error) {
    console.error("Strava callback failed:", error)
    return back("error=strava_connect")
  }
}
