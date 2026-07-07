import type { Credentials, SyncFn } from "@/lib/connectors/types"

// Google Calendar — meetings per day show Nexa where the time goes.
// Web OAuth with the narrowest scope Google offers for this
// (calendar.events.readonly); only event times and attendee counts are
// read, never event contents beyond that.

const AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth"
const TOKEN_URL = "https://oauth2.googleapis.com/token"
const API = "https://www.googleapis.com/calendar/v3"

const SCOPE =
  "openid email https://www.googleapis.com/auth/calendar.events.readonly"

export function gcalAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline", // ask for a refresh token
    prompt: "consent",
    state,
  })
  return `${AUTH_BASE}?${params}`
}

type TokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in: number
  id_token?: string
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      ...body,
    }),
  })
  if (!response.ok) throw new Error(`Google token request failed (${response.status})`)
  return response.json()
}

export async function gcalExchangeCode(
  code: string,
  redirectUri: string
): Promise<{
  accessToken: string
  refreshToken: string
  expiresAt: string
  email: string
}> {
  const tokens = await tokenRequest({
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  })
  // The account email lives in the id_token payload (JWT middle part).
  let email = "Google"
  try {
    const payload = JSON.parse(
      Buffer.from((tokens.id_token ?? "").split(".")[1] ?? "", "base64url").toString()
    ) as { email?: string }
    if (payload.email) email = payload.email
  } catch {
    // Label only — never block the connect on it.
  }
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? "",
    expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    email,
  }
}

type CalendarEvent = {
  start?: { dateTime?: string; date?: string }
  attendees?: { email?: string }[]
  status?: string
}

export const gcalSync: SyncFn = async (credentials: Credentials, sinceDate) => {
  let accessToken = credentials.accessToken
  let updatedTokens
  // Refresh when expired or expiring within 5 minutes.
  const expiresAt = credentials.expiresAt ? new Date(credentials.expiresAt).getTime() : 0
  if (!accessToken || expiresAt < Date.now() + 300_000) {
    if (!credentials.refreshToken) throw new Error("Missing Google refresh token")
    const fresh = await tokenRequest({
      refresh_token: credentials.refreshToken,
      grant_type: "refresh_token",
    })
    accessToken = fresh.access_token
    updatedTokens = {
      accessToken: fresh.access_token,
      // Google usually omits the refresh token here; keep the stored one.
      ...(fresh.refresh_token ? { refreshToken: fresh.refresh_token } : {}),
      expiresAt: new Date(Date.now() + fresh.expires_in * 1000).toISOString(),
    }
  }

  const params = new URLSearchParams({
    timeMin: new Date(sinceDate).toISOString(),
    timeMax: new Date(Date.now() + 86_400_000).toISOString(),
    singleEvents: "true",
    maxResults: "2500",
  })
  const response = await fetch(`${API}/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw new Error(`Google Calendar sync failed (${response.status})`)
  const data = (await response.json()) as { items?: CalendarEvent[] }

  // A "meeting" = a timed event with at least one other attendee.
  // Solo blocks and all-day entries don't count.
  const byDay = new Map<string, number>()
  for (const event of data.items ?? []) {
    if (event.status === "cancelled") continue
    const start = event.start?.dateTime
    if (!start) continue
    if ((event.attendees?.length ?? 0) < 2) continue
    const date = start.slice(0, 10)
    byDay.set(date, (byDay.get(date) ?? 0) + 1)
  }

  const rows = Array.from(byDay.entries()).map(([date, value]) => ({
    metric: "meetings",
    date,
    value,
  }))
  return { rows, updatedTokens }
}
