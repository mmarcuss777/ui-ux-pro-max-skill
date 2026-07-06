import { NextResponse } from "next/server"

import { askAnalyst, languageInstruction } from "@/lib/ai"
import { checkAiLimit, recordAiCall } from "@/lib/ai-usage"
import { parseLocale } from "@/lib/i18n"
import { createClient } from "@/lib/supabase/server"

const REALITY_CHECK_SYSTEM = `You are a hard, practical business risk analyst for
a solo bootstrapped founder. Audit the project below. Be blunt. State the
realistic downside before any upside. Never encourage, never motivate, never
soften. Output ONLY these sections, in order, each as a short list of concrete
points or a single line:

Execution score: <0-10>/10
Risk level: low / medium / high
Main weakness
Biggest opportunity
Next concrete move (cheap, fast, with a deadline and one metric)
Warning

No introduction. No conclusion. No pep talk.`

const WEEKLY_REVIEW_SYSTEM = `You are a hard, practical weekly-review analyst for
a solo bootstrapped founder. You receive the founder's last 7 days across four
pillars: body (training), mind (learning, focus), build (business execution) and
money. Be blunt. Name stagnation and excuses directly — where nothing moved, say
so. Never encourage, never motivate, never soften. Output ONLY these sections,
in order:

Body score: <0-10>/10
Mind score: <0-10>/10
Build score: <0-10>/10
Money score: <0-10>/10
Main win
Main problem
Next week focus
One project to prioritize

Scores on one line each; the rest as short lists of concrete points.
No introduction. No conclusion. No pep talk.`

function realityFallback(locale: "en" | "sk"): string {
  return locale === "sk"
    ? "Execution score: —\n\nAI je teraz nedostupná. Over si sám: najväčšie riziko, najlacnejší test s termínom a jednou metrikou, a čo spravíš zajtra."
    : "Execution score: —\n\nThe AI is unavailable right now. Check yourself: the biggest risk, the cheapest test with a deadline and one metric, and what you'll do tomorrow."
}

function weeklyFallback(locale: "en" | "sk"): string {
  return locale === "sk"
    ? "AI je teraz nedostupná. Prejdi si sám: čo sa reálne pohlo, kde si stagnoval, aká bola najčastejšia výhovorka a jediný fokus na budúci týždeň."
    : "The AI is unavailable right now. Walk through it yourself: what actually moved, where you stalled, your most common excuse, and the single focus for next week."
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
    mode?: string
    businessType?: string
    idea?: string
    goal?: string
    constraint?: string
    context?: string
    summary?: string
    locale?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  const locale = parseLocale(body.locale)

  if (body.mode === "weekly-review") {
    if (!body.summary) {
      return NextResponse.json(
        { error: "summary is required" },
        { status: 400 }
      )
    }
    if (!(await checkAiLimit(supabase, "weekly_review"))) {
      return NextResponse.json({ error: "limit" }, { status: 429 })
    }
    await recordAiCall(supabase, user.id, "weekly_review")
    try {
      const result = await askAnalyst(
        WEEKLY_REVIEW_SYSTEM + languageInstruction(locale),
        body.summary
      )
      return NextResponse.json({ result })
    } catch (error) {
      console.error("Weekly review failed:", error)
      return NextResponse.json({ result: weeklyFallback(locale) })
    }
  }

  // Reality check — either a full build context or a single experiment idea.
  const prompt =
    body.context ??
    (body.idea
      ? [
          `Business type: ${body.businessType ?? "unknown"}`,
          `Idea: ${body.idea}`,
          `Goal / metric: ${body.goal || "not defined"}`,
          `Constraint: ${body.constraint || "solo founder, minimal budget"}`,
        ].join("\n")
      : null)
  if (!prompt) {
    return NextResponse.json(
      { error: "context or idea is required" },
      { status: 400 }
    )
  }

  if (!(await checkAiLimit(supabase, "reality_check"))) {
    return NextResponse.json({ error: "limit" }, { status: 429 })
  }
  await recordAiCall(supabase, user.id, "reality_check")

  try {
    const result = await askAnalyst(
      REALITY_CHECK_SYSTEM + languageInstruction(locale),
      prompt
    )
    return NextResponse.json({ result })
  } catch (error) {
    console.error("Reality check failed:", error)
    return NextResponse.json({ result: realityFallback(locale) })
  }
}
