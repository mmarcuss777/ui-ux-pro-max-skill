import type { Locale } from "@/lib/i18n"

// Correct plural for "day". EN: 1 day / 2 days. SK has three forms:
// 1 deň, 2–4 dni, 5+ dní (0 also takes "dní").
export function dayWord(n: number, locale: Locale): string {
  if (locale === "sk") {
    if (n === 1) return "deň"
    if (n >= 2 && n <= 4) return "dni"
    return "dní"
  }
  return n === 1 ? "day" : "days"
}

// "3 days" / "3 dni" — number plus the correctly inflected unit.
export function daysLabel(n: number, locale: Locale): string {
  return `${n} ${dayWord(n, locale)}`
}
