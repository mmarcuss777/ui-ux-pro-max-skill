import { cookies } from "next/headers"

import {
  getDictionary,
  LOCALE_COOKIE,
  parseLocale,
  type Dictionary,
  type Locale,
} from "@/lib/i18n"

export function getLocale(): Locale {
  return parseLocale(cookies().get(LOCALE_COOKIE)?.value)
}

export function getT(): { locale: Locale; d: Dictionary } {
  const locale = getLocale()
  return { locale, d: getDictionary(locale) }
}
