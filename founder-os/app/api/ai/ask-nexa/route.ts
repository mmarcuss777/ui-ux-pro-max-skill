import { NextResponse } from "next/server"

import { askFast, languageInstruction } from "@/lib/ai"
import { checkAiLimit, recordAiCall } from "@/lib/ai-usage"
import { today } from "@/lib/dates"
import { parseLocale } from "@/lib/i18n"
import type { OneMoveData } from "@/lib/log-schema"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaces, resolveActiveWorkspace } from "@/lib/workspace"

// Focused modes keep Nexa from turning into a generic chatbot. Each one
// narrows the answer to a single job.
const MODES = {
  next_move: `Mode: NEXT MOVE. The founder is asking what to do right now.
Pick the ONE most valuable action for today from the context (build's next
action, one move, goals). Make it concrete, doable today, with a way to
verify it got done. Do not list alternatives.`,
  reality: `Mode: REALITY CHECK. Audit the plan or assumption in the
question for risk and self-deception. State the realistic downside first,
then what to validate cheapest.`,
  idea: `Mode: IDEA ANALYSIS. Analyze the idea in the question: potential,
risks, the cheapest fast test with a deadline and one metric, and a verdict
(kill / continue / change / scale).`,
} as const

type Mode = keyof typeof MODES

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

  let body: { question?: string; locale?: string; mode?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  const locale = parseLocale(body.locale)
  const mode: Mode | null =
    body.mode && body.mode in MODES ? (body.mode as Mode) : null
  // "Next move" works without typing anything — one tap, one answer.
  const question =
    body.question?.trim() ||
    (mode === "next_move"
      ? "What is the single most valuable thing I should do right now?"
      : undefined)
  if (!question) {
    return NextResponse.json({ error: "question is required" }, { status: 400 })
  }

  if (!(await checkAiLimit(supabase, "ask_nexa"))) {
    return NextResponse.json({ error: "limit" }, { status: 429 })
  }

  const workspaces = await getWorkspaces()
  const active = resolveActiveWorkspace(workspaces)
  const [{ data: builds }, { data: moves }] = await Promise.all([
    supabase
      .from("builds")
      .select("name, business_type, stage, week_goal, next_action")
      .eq("workspace_id", active?.id ?? "")
      .eq("status", "active")
      .limit(1),
    supabase
      .from("logs")
      .select("data")
      .eq("type", "one_move")
      .eq("date", today())
      .limit(1),
  ])
  const build = builds?.[0]
  const oneMove = (moves?.[0]?.data ?? null) as OneMoveData | null

  const prompt = [
    `Founder's goals and priorities: ${active?.goals?.trim() || "(not set)"}`,
    build
      ? `Current build: ${build.name} (${build.business_type}, stage ${build.stage}). Week goal: ${build.week_goal ?? "-"}. Next action: ${build.next_action ?? "-"}.`
      : "Current build: none yet.",
    oneMove?.text
      ? `Today's one move: "${oneMove.text}" (${oneMove.done ? "done" : "not done yet"})`
      : "Today's one move: not set.",
    "",
    `Question: ${question}`,
  ].join("\n")

  await recordAiCall(supabase, user.id, "ask_nexa")

  try {
    const result = await askFast(
      NEXA_SYSTEM + (mode ? `\n\n${MODES[mode]}` : "") + languageInstruction(locale),
      prompt,
      600
    )
    // Keep the answer — history is a reason to come back. Failure to save
    // must never block the reply itself.
    await supabase
      .from("logs")
      .insert({
        user_id: user.id,
        workspace_id: active?.id ?? null,
        type: "nexa_qa",
        data: { question, answer: result, mode },
      })
      .then(() => undefined)
    return NextResponse.json({ result })
  } catch (error) {
    console.error("Ask Nexa failed:", error)
    return NextResponse.json({ result: fallback(locale) })
  }
}
