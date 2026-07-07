export const BUSINESS_TYPES = {
  agency: {
    label: "Agency / Services",
    modules: ["leads", "offers", "experiments", "finance"],
    contactTypes: ["lead", "client", "supplier"],
    offerTypes: ["service"],
  },
  custom: {
    label: "Custom",
    modules: [],                                   // user selects during onboarding
    contactTypes: ["lead", "client", "supplier"],
    offerTypes: ["product", "service", "investment"],
  },
} as const;

export type BusinessType = keyof typeof BUSINESS_TYPES;
export const ALL_MODULES = ["leads", "offers", "experiments", "finance"] as const;
