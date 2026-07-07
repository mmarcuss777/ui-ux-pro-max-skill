import type { SyncFn, ValidateKeyFn } from "@/lib/connectors/types"

// GitHub — commits per day feed the Business pillar. A builder's most
// honest metric. Personal access token (classic or fine-grained, no
// scopes needed for public events; `repo` for private), zero approval.

const API = "https://api.github.com"

export const githubValidate: ValidateKeyFn = async (key) => {
  const response = await fetch(`${API}/user`, {
    headers: { Authorization: `Bearer ${key}`, "User-Agent": "nexa-app" },
  })
  if (!response.ok) throw new Error("GitHub rejected the token — create a Personal Access Token in Settings → Developer settings.")
  const data = (await response.json()) as { login: string }
  return data.login
}

type GithubEvent = {
  type: string
  created_at: string
  payload?: { size?: number }
}

export const githubSync: SyncFn = async (credentials, sinceDate) => {
  const key = credentials.accessToken
  const login = credentials.externalAccount
  if (!key || !login) throw new Error("Missing GitHub credentials")

  // Events API covers ~90 days / 300 events — plenty for daily signals.
  const byDay = new Map<string, number>()
  for (let pageIndex = 1; pageIndex <= 3; pageIndex++) {
    const response = await fetch(
      `${API}/users/${login}/events?per_page=100&page=${pageIndex}`,
      { headers: { Authorization: `Bearer ${key}`, "User-Agent": "nexa-app" } }
    )
    if (!response.ok) throw new Error(`GitHub sync failed (${response.status})`)
    const events: GithubEvent[] = await response.json()
    if (events.length === 0) break
    for (const event of events) {
      const date = event.created_at.slice(0, 10)
      if (date < sinceDate) continue
      if (event.type === "PushEvent") {
        byDay.set(date, (byDay.get(date) ?? 0) + (event.payload?.size ?? 1))
      }
    }
  }

  const rows = Array.from(byDay.entries()).map(([date, commits]) => ({
    metric: "commits",
    date,
    value: commits,
  }))
  return { rows }
}
