import { NextResponse } from "next/server"

import { githubValidate } from "@/lib/connectors/github"
import { lemonsqueezyValidate } from "@/lib/connectors/lemonsqueezy"
import { mailchimpValidate } from "@/lib/connectors/mailchimp"
import { plausibleValidate } from "@/lib/connectors/plausible"
import { rescuetimeValidate } from "@/lib/connectors/rescuetime"
import { shopifyValidate } from "@/lib/connectors/shopify"
import { stripeValidate } from "@/lib/connectors/stripe"
import { togglValidate } from "@/lib/connectors/toggl"
import { runSync } from "@/lib/connectors/sync-core"
import type { ValidateKeyFn } from "@/lib/connectors/types"
import { encryptToken } from "@/lib/crypto"
import { createAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const VALIDATORS: Record<string, ValidateKeyFn> = {
  stripe: stripeValidate,
  shopify: shopifyValidate,
  plausible: plausibleValidate,
  github: githubValidate,
  toggl: togglValidate,
  rescuetime: rescuetimeValidate,
  mailchimp: mailchimpValidate,
  lemonsqueezy: lemonsqueezyValidate,
}

// Key-paste connect for providers without OAuth friction: validate with
// one cheap API call, store the key encrypted, run the first sync.
export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { provider?: string; key?: string; extra?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const provider = body.provider ?? ""
  const key = body.key?.trim() ?? ""
  const extra = body.extra?.trim() || null
  const validate = VALIDATORS[provider]
  if (!validate || !key) {
    return NextResponse.json({ error: "provider and key required" }, { status: 400 })
  }

  try {
    const account = await validate(key, extra)
    const admin = createAdmin()

    const { data: integration, error } = await admin
      .from("integrations")
      .upsert(
        {
          user_id: user.id,
          provider,
          status: "connected",
          external_account: extra ?? account,
          error: null,
        },
        { onConflict: "user_id,provider" }
      )
      .select()
      .single()
    if (error || !integration) throw new Error(error?.message ?? "save failed")

    await admin.from("integration_secrets").upsert({
      integration_id: integration.id,
      access_token_enc: encryptToken(key),
      refresh_token_enc: null,
      expires_at: null,
      updated_at: new Date().toISOString(),
    })

    const items = await runSync(admin, integration).catch(() => 0)
    return NextResponse.json({ ok: true, account, items })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connect failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
