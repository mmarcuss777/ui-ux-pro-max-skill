import { NextResponse } from "next/server"

import { runSync } from "@/lib/connectors/sync-core"
import { createAdmin } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// Morning dispatch: refresh every connected integration so the day opens
// with live data — the streak and pillars light up even before the first
// manual log. Vercel Hobby allows two cron jobs, so this one carries all
// syncing and the evening one carries all notifications.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get("authorization")
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdmin()
  const { data: integrations } = await admin
    .from("integrations")
    .select("*")
    .neq("status", "disconnected")

  let ok = 0
  let failed = 0
  for (const integration of integrations ?? []) {
    try {
      await runSync(admin, integration)
      ok++
    } catch {
      failed++
    }
  }
  return NextResponse.json({ ok, failed })
}
