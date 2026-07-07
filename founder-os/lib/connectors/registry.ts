// Connector registry — the "socket system". Every provider declares the
// same shape; adding a new integration is a new entry + one connector
// file, never a rewrite. 'ready' providers work today (key-paste or CSV);
// 'soon' providers sit in the catalog until their OAuth/approval lands.

export type Provider =
  | "csv"
  | "garmin"
  | "strava"
  | "apple_health"
  | "stripe"
  | "shopify"
  | "plausible"
  | "ga4"
  | "github"
  | "toggl"
  | "rescuetime"
  | "mailchimp"
  | "lemonsqueezy"
  | "gmail"
  | "gcal"
  | "paypal"

export type PillarKey = "body" | "mind" | "build" | "money"

// Brand names — not translated, shared by the catalog page and dialogs.
export const PROVIDER_NAMES: Record<Provider, string> = {
  csv: "CSV / Google Sheets",
  strava: "Strava",
  apple_health: "Apple Health",
  stripe: "Stripe",
  shopify: "Shopify",
  plausible: "Plausible",
  ga4: "Google Analytics",
  garmin: "Garmin",
  github: "GitHub",
  toggl: "Toggl Track",
  rescuetime: "RescueTime",
  mailchimp: "Mailchimp",
  lemonsqueezy: "Lemon Squeezy",
  gmail: "Gmail",
  gcal: "Google Calendar",
  paypal: "PayPal",
}

// Providers connected by pasting an API key (no OAuth dance).
export const KEY_PROVIDERS: Provider[] = [
  "stripe",
  "shopify",
  "plausible",
  "github",
  "toggl",
  "rescuetime",
  "mailchimp",
  "lemonsqueezy",
]

export type ConnectorMeta = {
  provider: Provider
  pillar: PillarKey
  // What this connector imports, as short human lines (i18n keys resolve
  // in the UI; these are stable identifiers).
  metrics: string[]
  // 'ready' = usable now, 'soon' = catalog preview until OAuth/approval lands
  availability: "ready" | "soon"
}

export const CONNECTORS: ConnectorMeta[] = [
  // ── Body ──────────────────────────────────────────────────────────
  {
    provider: "garmin",
    pillar: "body",
    metrics: ["workouts", "distance", "active_minutes"],
    availability: "ready", // CSV export today; direct API after approval
  },
  {
    provider: "apple_health",
    pillar: "body",
    metrics: ["steps", "sleep_minutes", "workouts"],
    availability: "soon",
  },
  // ── Mind ──────────────────────────────────────────────────────────
  {
    provider: "toggl",
    pillar: "mind",
    metrics: ["focus_minutes"],
    availability: "ready",
  },
  {
    provider: "rescuetime",
    pillar: "mind",
    metrics: ["productive_minutes"],
    availability: "ready",
  },
  {
    provider: "gcal",
    pillar: "mind",
    metrics: ["meetings", "focus_minutes"],
    availability: "soon",
  },
  // ── Business ──────────────────────────────────────────────────────
  {
    provider: "github",
    pillar: "build",
    metrics: ["commits"],
    availability: "ready",
  },
  {
    provider: "shopify",
    pillar: "build",
    metrics: ["orders", "revenue", "top_products"],
    availability: "ready",
  },
  {
    provider: "plausible",
    pillar: "build",
    metrics: ["sessions", "visitors", "conversions"],
    availability: "ready",
  },
  {
    provider: "mailchimp",
    pillar: "build",
    metrics: ["subscribers"],
    availability: "ready",
  },
  {
    provider: "gmail",
    pillar: "build",
    metrics: ["inbox"],
    availability: "soon",
  },
  {
    provider: "ga4",
    pillar: "build",
    metrics: ["sessions", "conversions", "sources"],
    availability: "soon",
  },
  // ── Money ─────────────────────────────────────────────────────────
  {
    provider: "csv",
    pillar: "money",
    metrics: ["transactions", "orders", "leads"],
    availability: "ready",
  },
  {
    provider: "stripe",
    pillar: "money",
    metrics: ["revenue", "net_cashflow", "refunds"],
    availability: "ready",
  },
  {
    provider: "lemonsqueezy",
    pillar: "money",
    metrics: ["revenue", "orders"],
    availability: "ready",
  },
  {
    provider: "paypal",
    pillar: "money",
    metrics: ["revenue", "net_cashflow"],
    availability: "soon",
  },
  // Strava stays in the codebase (OAuth flow built) but off the catalog:
  // its API now requires a paid subscription — Garmin covers the need.
]
