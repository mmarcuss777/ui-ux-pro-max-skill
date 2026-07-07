import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import webpush from "web-push"

import { weekStart } from "@/lib/dates"
import type { Database } from "@/types/db"

export const dynamic = "force-dynamic"

// Sunday afternoon: everyone who hasn't done this week's review gets one
// nudge. The weekly ritual is the anchor that makes Monday intentional.
const MESSAGES = {
  en: {
    title: "Weekly Review",
    body: "Three minutes. Close the week, set the next one.",
  },
  sk: {
    title: "Týždenné review",
    body: "Tri minúty. Uzavri týždeň, nastav ďalší.",
  },
} as const

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get("authorization")
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "VAPID keys not set" }, { status: 500 })
  }
  webpush.setVapidDetails("mailto:reminders@nexa.app", publicKey, privateKey)

  const admin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const [{ data: subscriptions }, { data: doneRows }] = await Promise.all([
    admin.from("push_subscriptions").select("*"),
    admin
      .from("logs")
      .select("user_id")
      .eq("type", "weekly_reset")
      .gte("date", weekStart()),
  ])

  const done = new Set((doneRows ?? []).map((r) => r.user_id))
  const targets = (subscriptions ?? []).filter((s) => !done.has(s.user_id))

  let sent = 0
  const dead: string[] = []
  await Promise.all(
    targets.map(async (sub) => {
      const message = MESSAGES[sub.locale === "sk" ? "sk" : "en"]
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(message)
        )
        sent++
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) dead.push(sub.endpoint)
      }
    })
  )
  if (dead.length > 0) {
    await admin.from("push_subscriptions").delete().in("endpoint", dead)
  }

  return NextResponse.json({ sent, skipped: done.size, removed: dead.length })
}
