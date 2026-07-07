// Date-only strings (YYYY-MM-DD) in the server's timezone, matching the
// `date` columns in Postgres.

export function isoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function daysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return isoDate(date)
}

export function today(): string {
  return isoDate(new Date())
}

// Short human date for list rows: "6. 7." (sk) / "6 Jul" (en).
// Raw ISO dates in a personal app read like a database, not a diary.
export function shortDate(date: string, locale: "en" | "sk"): string {
  const [year, month, day] = date.split("-").map(Number)
  if (locale === "sk") return `${day}. ${month}.`
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })
}

// Monday of the current week — the boundary for the Weekly Reset.
export function weekStart(): string {
  const date = new Date()
  const sinceMonday = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - sinceMonday)
  return isoDate(date)
}
