"use client"

import { useRouter } from "next/navigation"

import { useLocale } from "@/components/locale-provider"
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const OPTIONS: Locale[] = ["en", "sk"]

export function LanguageToggle() {
  const router = useRouter()
  const locale = useLocale()

  function switchTo(next: Locale) {
    if (next === locale) return
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
    router.refresh()
  }

  return (
    <div
      role="group"
      aria-label="Language"
      className="flex h-9 items-center rounded-full border border-line bg-card p-0.5"
    >
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => switchTo(option)}
          aria-pressed={locale === option}
          className={cn(
            "h-7 rounded-full px-2.5 text-xs font-semibold uppercase tracking-wide transition-colors",
            locale === option
              ? "gold-fill"
              : "text-muted-foreground hover:text-ink"
          )}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
