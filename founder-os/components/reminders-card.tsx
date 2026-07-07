"use client"

import { useEffect, useState } from "react"
import { BellIcon } from "@radix-ui/react-icons"

import { useLocale, useT } from "@/components/locale-provider"
import { Button } from "@/components/ui/button"

const DISMISS_KEY = "nexa_remind_dismissed"

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"))
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

// One-tap opt-in for the 20:00 "close the day" push. Renders only when
// push is supported, keys are configured, permission isn't denied and
// this device isn't already subscribed.
export function RemindersCard() {
  const d = useT()
  const locale = useLocale()
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (
      !publicKey ||
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      Notification.permission === "denied" ||
      localStorage.getItem(DISMISS_KEY) === "1"
    ) {
      return
    }
    navigator.serviceWorker.ready.then(async (registration) => {
      const existing = await registration.pushManager.getSubscription()
      if (!existing) setVisible(true)
    })
  }, [])

  async function enable() {
    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setVisible(false)
        return
      }
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      })
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...subscription.toJSON(), locale }),
      })
      if (response.ok) {
        setEnabled(true)
        setTimeout(() => setVisible(false), 2500)
      }
    } finally {
      setBusy(false)
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1")
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gold/25 bg-gold/[0.06] p-4">
      <BellIcon className="h-5 w-5 shrink-0 text-gold-dark" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{d.today.remindTitle}</p>
        <p className="text-xs text-muted-foreground">{d.today.remindBody}</p>
      </div>
      {enabled ? (
        <span className="shrink-0 text-xs font-semibold text-ok" role="status">
          {d.today.remindDone}
        </span>
      ) : (
        <div className="flex shrink-0 items-center gap-1">
          <Button size="sm" className="h-9" onClick={enable} disabled={busy}>
            {d.today.remindCta}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2 text-xs"
            onClick={dismiss}
          >
            {d.today.remindLater}
          </Button>
        </div>
      )}
    </div>
  )
}
