import type { Credentials, SyncFn } from "@/lib/connectors/types"

// Strava — first fitness connector. Works today as pure web OAuth, and
// doubles as the Garmin bridge: Garmin Connect auto-pushes activities to
// Strava, so Garmin workouts land here without Garmin's API program.

const AUTH_BASE = "https://www.strava.com/oauth"
const API = "https://www.strava.com/api/v3"

export function stravaAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "activity:read_all",
    state,
  })
  return `${AUTH_BASE}/authorize?${params}`
}

type TokenResponse = {
  access_token: string
  refresh_token: string
  expires_at: number
  athlete?: { id: number; username?: string }
}

export async function stravaExchangeCode(code: string): Promise<TokenResponse> {
  const response = await fetch(`${AUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  })
  if (!response.ok) throw new Error(`Strava token exchange failed (${response.status})`)
  return response.json()
}

async function refresh(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch(`${AUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })
  if (!response.ok) throw new Error(`Strava token refresh failed (${response.status})`)
  return response.json()
}

type Activity = {
  start_date_local: string
  moving_time: number // seconds
  distance: number // meters
}

export const stravaSync: SyncFn = async (credentials: Credentials, sinceDate) => {
  let accessToken = credentials.accessToken
  let updatedTokens
  // Refresh when expired or expiring within 5 minutes.
  const expiresAt = credentials.expiresAt ? new Date(credentials.expiresAt).getTime() : 0
  if (!accessToken || expiresAt < Date.now() + 300_000) {
    if (!credentials.refreshToken) throw new Error("Missing Strava refresh token")
    const fresh = await refresh(credentials.refreshToken)
    accessToken = fresh.access_token
    updatedTokens = {
      accessToken: fresh.access_token,
      refreshToken: fresh.refresh_token,
      expiresAt: new Date(fresh.expires_at * 1000).toISOString(),
    }
  }

  const after = Math.floor(new Date(sinceDate).getTime() / 1000)
  const response = await fetch(
    `${API}/athlete/activities?after=${after}&per_page=100`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!response.ok) throw new Error(`Strava activities failed (${response.status})`)
  const activities: Activity[] = await response.json()

  // Aggregate per local day: workout count, active minutes, distance km.
  const byDay = new Map<string, { workouts: number; minutes: number; km: number }>()
  for (const activity of activities) {
    const date = activity.start_date_local.slice(0, 10)
    const day = byDay.get(date) ?? { workouts: 0, minutes: 0, km: 0 }
    day.workouts += 1
    day.minutes += Math.round(activity.moving_time / 60)
    day.km += activity.distance / 1000
    byDay.set(date, day)
  }

  const rows = Array.from(byDay.entries()).flatMap(([date, day]) => [
    { metric: "workouts", date, value: day.workouts },
    { metric: "active_minutes", date, value: day.minutes },
    { metric: "distance", date, value: Math.round(day.km * 100) / 100 },
  ])
  return { rows, updatedTokens }
}
