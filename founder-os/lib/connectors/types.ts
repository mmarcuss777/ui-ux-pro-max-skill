// The socket every connector plugs into. `sync` receives decrypted
// credentials and returns daily metric rows; everything else (storage,
// encryption, sync_runs, last_sync_at) is handled by the shared core.

export type MetricRow = {
  metric: string
  date: string // YYYY-MM-DD
  value: number
  meta?: Record<string, unknown>
}

export type Credentials = {
  accessToken: string | null
  refreshToken: string | null
  expiresAt: string | null
  // Non-secret extras stored on the integration row (shop domain, site id)
  externalAccount: string | null
}

export type SyncResult = {
  rows: MetricRow[]
  // Refreshed tokens to persist (OAuth providers), if any
  updatedTokens?: {
    accessToken: string
    refreshToken?: string
    expiresAt?: string
  }
}

export type SyncFn = (
  credentials: Credentials,
  sinceDate: string // YYYY-MM-DD
) => Promise<SyncResult>

// Validates pasted credentials with one cheap API call; returns the
// external account label to display, or throws with a readable message.
export type ValidateKeyFn = (
  key: string,
  extra: string | null
) => Promise<string>
