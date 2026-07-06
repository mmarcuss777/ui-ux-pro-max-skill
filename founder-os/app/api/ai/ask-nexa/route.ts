import { NextResponse } from "next/server"

import { askFast, languageInstruction } from "@/lib/ai"
import { checkAiLimit, recordAiCall } from "@/lib/ai-usage"
import { parseLocale } from "@/lib/i18n"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"

const NEXA_SYSTEM = `You are Nexa — a blunt, practical operator advising a solo
founder on business, training, learning, money and focus. Answer the question
using the founder's goals and current project as context. Be short and direct;
no motivation, no flattery. Output ONLY these sections, in order:

Short answer
Reasoning
Next step
Warning (only if genuinely needed)

Each section is one or two sentences or a very short list. No introduction.`

function fallback(locale: "en" | "sk"): string {
  return locale === "sk"
    ? "Short answer\nAI je teraz nedostupná — rozhodni sa sám podľa svojich cieľov.\n\nNext step\nSprav najmenší krok, ktorý sa dá overiť ešte dnes, a otázku polož znova neskôr."
    : "Short answer\nThe AI is unavailable right now — decide against your own goals.\n\nNext step\nTake the smallest step you can verify today and ask again later."
}

export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { question?: string; locale?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  const locale = parseLocale(body.locale)
  const question = body.question?.trim()
  if (!question) {
    return NextResponse.json({ error: "question is required" }, { status: 400 })
  }

  if (!(await checkAiLimit(supabase, "ask_nexa"))) {
    return NextResponse.json({ error: "limit" }, { status: 429 })
  }

  const workspaces = await getWorkspaces()
  const active = resolveActiveWorkspace(workspaces)
  const { data: builds } = await supabase
    .from("builds")
    .select("name, business_type, stage, week_goal, next_action")
    .eq("workspace_id", active?.id ?? "")
    .eq("status", "active")
    .limit(1)
  const build = builds?.[0]

  const prompt = [
    `Founder's goals and priorities: ${active?.goals?.trim() || "(not set)"}`,
    build
      ? `Current build: ${build.name} (${build.business_type}, stage ${build.stage}). Week goal: ${build.week_goal ?? "-"}. Next action: ${build.next_action ?? "-"}.`
      : "Current build: none yet.",
    "",
    `Question: ${question}`,
  ].join("\n")

  await recordAiCall(supabase, user.id, "ask_nexa")

  try {
    const result = await askFast(
      NEXA_SYSTEM + languageInstruction(locale),
      prompt,
      600
    )
    return NextResponse.json({ result })
  } catch (error) {
    console.error("Ask Nexa failed:", error)
    return NextResponse.json({ result: fallback(locale) })
  }
}
