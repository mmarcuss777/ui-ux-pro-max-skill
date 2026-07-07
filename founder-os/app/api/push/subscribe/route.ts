import { NextResponse } from "next/server"

import { parseLocale } from "@/lib/i18n"
import { createClient } from "@/lib/supabase/server"

// Stores (or removes) this device's web-push subscription so the evening
// reminder can reach it. One row per endpoint; RLS scopes rows to the user.
export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: {
    endpoint?: string
    keys?: { p256dh?: string; auth?: string }
    locale?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 })
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      locale: parseLocale(body.locale),
    },
    { onConflict: "endpoint" }
  )
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { endpoint } = (await request.json().catch(() => ({}))) as {
    endpoint?: string
  }
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint required" }, { status: 400 })
  }
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint)
  return NextResponse.json({ ok: true })
}
