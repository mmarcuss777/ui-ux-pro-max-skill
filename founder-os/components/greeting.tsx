"use client"

import { useEffect, useState } from "react"

import { useT } from "@/components/locale-provider"

// Time-of-day greeting in the USER'S timezone — has to run client-side
// (the server renders in UTC). Mounts empty to avoid a hydration flash.
export function Greeting() {
  const d = useT()
  const [text, setText] = useState<string | null>(null)

  useEffect(() => {
    const hour = new Date().getHours()
    setText(
      hour < 11
        ? d.today.morning
        : hour < 18
          ? d.today.afternoon
          : d.today.evening
    )
  }, [d])

  if (!text) return null
  return <span className="font-medium text-ink/70">{text} </span>
}
