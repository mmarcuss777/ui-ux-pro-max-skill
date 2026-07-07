// Connector registry — the "socket system". Every provider declares the
// same shape; adding a new integration is a new entry + one connector
// file, never a rewrite. Phase 1 ships the catalog with availability
// flags; OAuth/sync implementations arrive per phase.

export type Provider =
  | "csv"
  | "strava"
  | "apple_health"
  | "stripe"
  | "shopify"
  | "plausible"
  | "ga4"
  | "garmin"

export type PillarKey = "body" | "mind" | "build" | "money"

export type ConnectorMeta = {
  provider: Provider
  pillar: PillarKey
  // What this connector imports, as short human lines (i18n keys resolve
  // in the UI; these are stable identifiers).
  metrics: string[]
  // 'ready' = usable now, 'phase2'/'phase3'/'phase4' = catalog preview
  availability: "ready" | "phase2" | "phase3" | "phase4"
}

export const CONNECTORS: ConnectorMeta[] = [
  {
    provider: "csv",
    pillar: "money",
    metrics: ["transactions", "orders", "leads"],
    availability: "ready",
  },
  {
    provider: "strava",
    pillar: "body",
    metrics: ["workouts", "distance", "active_minutes"],
    availability: "phase2",
  },
  {
    provider: "apple_health",
    pillar: "body",
    metrics: ["steps", "sleep_minutes", "workouts"],
    availability: "phase4",
  },
  {
    provider: "stripe",
    pillar: "money",
    metrics: ["revenue", "net_cashflow", "refunds"],
    availability: "phase3",
  },
  {
    provider: "shopify",
    pillar: "build",
    metrics: ["orders", "revenue", "top_products"],
    availability: "phase3",
  },
  {
    provider: "plausible",
    pillar: "build",
    metrics: ["sessions", "visitors", "conversions"],
    availability: "phase3",
  },
  {
    provider: "ga4",
    pillar: "build",
    metrics: ["sessions", "conversions", "sources"],
    availability: "phase3",
  },
  {
    provider: "garmin",
    pillar: "body",
    metrics: ["sleep_minutes", "stress", "body_battery"],
    availability: "phase4",
  },
]
