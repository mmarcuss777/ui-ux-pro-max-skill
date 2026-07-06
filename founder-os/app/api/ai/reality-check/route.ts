import { NextResponse } from "next/server"

import { askAnalyst } from "@/lib/ai"
import { createClient } from "@/lib/supabase/server"

const REALITY_CHECK_SYSTEM = `You are a hard, practical business risk analyst for a solo bootstrapped founder.
Analyze the idea below. Be blunt. State the realistic downside before any upside.
Never encourage, never motivate, never soften. Output ONLY these sections, in order,
each as a short list of concrete points:

Potential
Risks
What to validate
Minimal test (cheap, fast, with a deadline and one metric)
Exit plan
Verdict: one of kill / continue / pivot / scale

No introduction. No conclusion. No pep talk.`

const WEEKLY_REVIEW_SYSTEM = `You are a hard, practical weekly-review analyst for a solo bootstrapped founder.
You receive the founder's last 7 days of logs, experiments and money movements.
Be blunt. Name stagnation and excuses directly — where nothing moved, say so.
Never encourage, never motivate, never soften. Output ONLY these sections, in order,
each as a short list of concrete points:

What actually moved
What stagnated
Excuses and patterns
Money
Next week: do / cut / improve

No introduction. No conclusion. No pep talk.`

export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: {
    mode?: string
    businessType?: string
    idea?: string
    goal?: string
    constraint?: string
    summary?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  try {
    if (body.mode === "weekly-review") {
      if (!body.summary) {
        return NextResponse.json(
          { error: "summary is required" },
          { status: 400 }
        )
      }
      const result = await askAnalyst(WEEKLY_REVIEW_SYSTEM, body.summary)
      return NextResponse.json({ result })
    }

    if (!body.idea) {
      return NextResponse.json({ error: "idea is required" }, { status: 400 })
    }
    const prompt = [
      `Business type: ${body.businessType ?? "unknown"}`,
      `Idea: ${body.idea}`,
      `Goal / metric: ${body.goal || "not defined"}`,
      `Constraint: ${body.constraint || "solo founder, minimal budget"}`,
    ].join("\n")
    const result = await askAnalyst(REALITY_CHECK_SYSTEM, prompt)
    return NextResponse.json({ result })
  } catch (error) {
    console.error("AI request failed:", error)
    return NextResponse.json(
      { error: "AI request failed. Check ANTHROPIC_API_KEY and try again." },
      { status: 502 }
    )
  }
}
