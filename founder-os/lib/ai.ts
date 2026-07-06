import Anthropic from "@anthropic-ai/sdk"

import type { Locale } from "@/lib/i18n"

// Server-side only — ANTHROPIC_API_KEY must never reach the client.
const MODEL = "claude-opus-4-8"

export function languageInstruction(locale: Locale): string {
  return locale === "sk"
    ? "\n\nWrite your entire answer in Slovak (informal, addressing the founder as 'ty'). Keep the section headings in Slovak too."
    : ""
}

function textOf(response: Anthropic.Message): string {
  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
}

export async function askAnalyst(
  system: string,
  prompt: string,
  maxTokens = 1024
): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
  })

  return textOf(response)
}

export type VisionImage = {
  media_type: "image/jpeg" | "image/png" | "image/webp"
  data: string // base64, no data: prefix
}

export async function askVision(
  system: string,
  prompt: string,
  images: VisionImage[],
  maxTokens = 1500
): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [
      {
        role: "user",
        content: [
          ...images.map(
            (image) =>
              ({
                type: "image",
                source: {
                  type: "base64",
                  media_type: image.media_type,
                  data: image.data,
                },
              }) as const
          ),
          { type: "text", text: prompt },
        ],
      },
    ],
  })

  return textOf(response)
}
