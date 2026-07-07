import { NextResponse } from "next/server"

import { askAnalyst, languageInstruction } from "@/lib/ai"
import { checkAiLimit, recordAiCall } from "@/lib/ai-usage"
import { parseLocale } from "@/lib/i18n"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// The co-founder draft: the founder describes their business — or a
// half-formed idea — in their own words, and the strong model returns a
// complete, editable project profile. No fixed type list, no template:
// the playbook is generated for THIS business. Business-tier feature,
// so the top model earns its cost here.
const PROFILE_SYSTEM = `You are Nexa, a business co-founder AI for a solo
bootstrapped founder. The founder describes their business or idea in their
own words — possibly vague, exploratory or undecided. Build a working
project profile from it. If the idea is vague, pick the sharpest concrete
direction and make the weekly goal a cheap validation move with a number in
it. Be practical, never motivational.

Respond ONLY with valid JSON, no markdown fences, exactly this shape:
{"name":"short project name, max 60 chars","business_type":"2-4 word label
of the business model","stage":"idea|validation|building|selling|scaling",
"week_goal":"one concrete goal for this week, measurable","playbook":[
{"label":"a key question or area for THIS exact business","value":"concise
answer, or what to find out and how"}],"notes":"3-5 sentences: the sharpest
read of the idea, the biggest risk, and the first move"}

playbook: 4 to 6 items, tailored to this exact business — never generic.
Write all values in the founder's language.`

type Draft = {
  name?: string
  business_type?: string
  stage?: string
  week_goal?: string
  playbook?: { label?: string; value?: string }[]
  notes?: string
}

const STAGES = ["idea", "validation", "building", "selling", "scaling"]

export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { description?: string; locale?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const description = (body.description ?? "").trim()
  if (description.length < 8) {
    return NextResponse.json({ error: "description required" }, { status: 400 })
  }
  const locale = parseLocale(body.locale)

  if (!(await checkAiLimit(supabase, "build_profile"))) {
    return NextResponse.json({ error: "limit" }, { status: 429 })
  }
  await recordAiCall(supabase, user.id, "build_profile")

  try {
    const raw = await askAnalyst(
      PROFILE_SYSTEM + languageInstruction(locale),
      `Founder's description:\n${description.slice(0, 2000)}`,
      900
    )
    // Strip accidental fences, find the JSON object, parse defensively.
    const jsonText = raw
      .replace(/```json|```/g, "")
      .slice(raw.indexOf("{") >= 0 ? raw.replace(/```json|```/g, "").indexOf("{") : 0)
    const draft = JSON.parse(jsonText) as Draft

    return NextResponse.json({
      name: (draft.name ?? "").slice(0, 60),
      business_type: (draft.business_type ?? "").slice(0, 60),
      stage: STAGES.includes(draft.stage ?? "") ? draft.stage : "idea",
      week_goal: (draft.week_goal ?? "").slice(0, 200),
      playbook: (draft.playbook ?? [])
        .filter((row) => (row.label ?? "").trim() !== "")
        .slice(0, 8)
        .map((row) => ({
          label: (row.label ?? "").slice(0, 80),
          value: (row.value ?? "").slice(0, 300),
        })),
      notes: (draft.notes ?? "").slice(0, 1000),
    })
  } catch (error) {
    console.error("Build profile draft failed:", error)
    return NextResponse.json({ error: "ai_failed" }, { status: 502 })
  }
}
