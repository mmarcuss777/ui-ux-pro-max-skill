import Anthropic from "@anthropic-ai/sdk"

// Server-side only — ANTHROPIC_API_KEY must never reach the client.
const MODEL = "claude-opus-4-8"

export async function askAnalyst(
  system: string,
  prompt: string
): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: prompt }],
  })

  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
}
