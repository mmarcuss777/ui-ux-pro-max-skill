// Build (project) configuration: business types and their adaptive fields.
// Field labels live in the i18n dictionary under d.buildFields.

export const BUILD_STAGES = [
  "idea",
  "validation",
  "building",
  "selling",
  "scaling",
] as const

export const BUILD_PRIORITIES = ["high", "medium", "low"] as const

export const BUILD_TYPES = {
  ecommerce: {
    fields: [
      "product",
      "supplier",
      "buy_price",
      "sell_price",
      "shipping_cost",
      "demand",
      "competition",
      "risk",
      "next_step",
    ],
  },
  resell: {
    fields: [
      "asset",
      "buy_price",
      "exit_price",
      "holding_time",
      "liquidity",
      "risk",
      "growth_reason",
      "exit_strategy",
    ],
  },
  service: {
    fields: [
      "client_type",
      "problem",
      "offer",
      "price",
      "delivery_time",
      "profit_per_hour",
      "sales_channel",
      "next_client_action",
    ],
  },
  content: {
    fields: [
      "niche",
      "audience",
      "format",
      "frequency",
      "offer",
      "monetization",
      "growth_metric",
    ],
  },
  digital: {
    fields: [
      "product_idea",
      "target_user",
      "problem_solved",
      "mvp_scope",
      "pricing",
      "distribution",
      "validation_method",
      "next_step",
    ],
  },
  b2b: {
    fields: [
      "target_company",
      "problem",
      "decision_maker",
      "offer",
      "pricing",
      "sales_cycle",
      "proof_needed",
      "next_outreach",
    ],
  },
  local: {
    fields: [
      "location",
      "target_customer",
      "offer",
      "startup_cost",
      "monthly_cost",
      "expected_revenue",
      "local_competition",
      "next_validation",
    ],
  },
  fitness_brand: {
    fields: [
      "product_offer",
      "target_customer",
      "positioning",
      "content_channel",
      "supplier_production",
      "price",
      "margin_note",
      "launch_step",
    ],
  },
  custom: {
    fields: ["details"],
  },
} as const

export type BuildType = keyof typeof BUILD_TYPES

export type BuildFieldKey =
  (typeof BUILD_TYPES)[BuildType]["fields"][number]

export const BUILD_TYPE_KEYS = Object.keys(BUILD_TYPES) as BuildType[]
