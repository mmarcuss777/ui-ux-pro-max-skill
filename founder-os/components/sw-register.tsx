"use client"

import { useEffect } from "react"

// Registers the app-shell cache so relaunching the installed PWA paints
// instantly instead of re-fetching every JS/CSS chunk over the network.
// Production only — a cached chunk in dev would fight next dev's HMR.
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (!("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js")
  }, [])

  return null
}
