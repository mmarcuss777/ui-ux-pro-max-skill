import { NextResponse } from "next/server"

import { runSync } from "@/lib/connectors/sync-core"
import { createAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// One management endpoint, three actions:
//   sync        — pull fresh data now
//   disconnect  — remove the integration + its encrypted secrets
//   delete_data — wipe everything this provider ever imported
export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { provider?: string; action?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const { provider, action } = body
  if (!provider || !action) {
    return NextResponse.json({ error: "provider and action required" }, { status: 400 })
  }

  const admin = createAdmin()

  if (action === "sync") {
    const { data: integration } = await admin
      .from("integrations")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .single()
    if (!integration) return NextResponse.json({ error: "Not connected" }, { status: 404 })
    try {
      const items = await runSync(admin, integration)
      return NextResponse.json({ ok: true, items })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed"
      return NextResponse.json({ error: message }, { status: 502 })
    }
  }

  if (action === "disconnect") {
    await admin
      .from("integrations")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", provider)
    return NextResponse.json({ ok: true })
  }

  if (action === "delete_data") {
    await admin
      .from("imported_metrics")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", provider)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
