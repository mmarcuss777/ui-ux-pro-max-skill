import { NextResponse } from "next/server"

import { askVision, type VisionImage } from "@/lib/ai"
import { checkAiLimit, recordAiCall } from "@/lib/ai-usage"
import { parseLocale } from "@/lib/i18n"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"

const SCREEN_SYSTEM = `You are a screen-time auditor for a solo bootstrapped
founder. You receive screenshots of a phone's Screen Time report. Read the
numbers in the screenshots carefully.

The FIRST line of your reply must be ONLY this JSON on a single line (keys in
English, no other text on that line):
{"total_minutes": <int>, "wasted_minutes": <int>, "top_apps": [{"name": "...", "minutes": <int>}]}
- total_minutes: the total screen time shown (best estimate).
- wasted_minutes: realistic daily minutes lost to low-value apps, judged against
  the founder's goals. Be honest, not dramatic.
- top_apps: up to 5 apps with the most time.
If a number is unreadable, estimate conservatively.

Then an empty line, then a blunt analysis:
- Which apps are stealing time relative to the founder's goals, with numbers.
- What that time could produce instead — concrete and tied to the goals
  (e.g. "45 min/day = 5 outreach emails or a full workout").
- Three concrete limits or replacements (app limits, deletion, time boxing).
No motivation, no softening, no preamble before the JSON.`

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const

type ParsedStats = {
  total_minutes?: number
  wasted_minutes?: number
  top_apps?: { name: string; minutes: number }[]
}

export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: {
    images?: { media_type?: string; data?: string }[]
    locale?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  const locale = parseLocale(body.locale)

  const images = (body.images ?? []).slice(0, 3)
  if (images.length === 0) {
    return NextResponse.json(
      { error: "At least one image is required" },
      { status: 400 }
    )
  }
  const visionImages: VisionImage[] = []
  for (const image of images) {
    if (
      !image.data ||
      !ALLOWED_TYPES.includes(image.media_type as (typeof ALLOWED_TYPES)[number]) ||
      image.data.length > 2_000_000
    ) {
      return NextResponse.json(
        { error: "Invalid or too large image" },
        { status: 400 }
      )
    }
    visionImages.push({
      media_type: image.media_type as VisionImage["media_type"],
      data: image.data,
    })
  }

  if (!(await checkAiLimit(supabase, "screen_time"))) {
    return NextResponse.json({ error: "limit" }, { status: 429 })
  }

  const workspaces = await getWorkspaces()
  const active = resolveActiveWorkspace(workspaces)
  const goals = active?.goals?.trim()

  const prompt = [
    `Founder's goals and priorities: ${goals || "(not set — assume growing a small business, fitness and learning)"}`,
    locale === "sk"
      ? "Keep the first JSON line exactly as specified (English keys). Write the analysis part in Slovak (informal 'ty')."
      : "",
    "Analyze the attached Screen Time screenshot(s).",
  ]
    .filter(Boolean)
    .join("\n")

  try {
    const raw = await askVision(SCREEN_SYSTEM, prompt, visionImages, 1500)

    let stats: ParsedStats = {}
    let analysis = raw.trim()
    const firstBrace = raw.indexOf("{")
    const firstLineEnd = raw.indexOf("\n", firstBrace)
    if (firstBrace !== -1 && firstLineEnd !== -1) {
      try {
        stats = JSON.parse(raw.slice(firstBrace, firstLineEnd)) as ParsedStats
        analysis = raw.slice(firstLineEnd).trim()
      } catch {
        // keep full text as analysis when the JSON line is malformed
      }
    }

    const data = {
      total_minutes:
        typeof stats.total_minutes === "number"
          ? Math.round(stats.total_minutes)
          : null,
      wasted_minutes:
        typeof stats.wasted_minutes === "number"
          ? Math.round(stats.wasted_minutes)
          : null,
      top_apps: Array.isArray(stats.top_apps)
        ? stats.top_apps.slice(0, 5)
        : [],
      analysis,
    }

    await supabase.from("logs").insert({
      user_id: user.id,
      workspace_id: active?.id ?? null,
      type: "screen_time",
      data,
    })
    await recordAiCall(supabase, user.id, "screen_time")

    return NextResponse.json(data)
  } catch (error) {
    console.error("Screen time analysis failed:", error)
    return NextResponse.json(
      { error: "Analysis failed. Check ANTHROPIC_API_KEY and try again." },
      { status: 502 }
    )
  }
}
