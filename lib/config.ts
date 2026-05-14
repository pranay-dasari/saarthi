// ─── App-wide constants ───────────────────────────────────────────────────────
// Change APP_NAME before public launch.
export const APP_NAME = "Saarthi";

// Triage level display config — single source of truth for labels, colors, copy.
export const TRIAGE_CONFIG = {
  green: {
    level: "green" as const,
    label: "Monitor at home",
    explanation:
      "What you shared sounds mild. Rest, stay hydrated, and watch for any changes. Contact a doctor if it gets worse.",
    bgClass: "bg-green-50",
    borderClass: "border-green-400",
    badgeClass: "bg-green-100 text-green-800",
    iconColor: "text-green-600",
  },
  yellow: {
    level: "yellow" as const,
    label: "Contact doctor today",
    explanation:
      "What you shared needs a doctor's attention. Please call your doctor or visit a clinic today. Do not wait.",
    bgClass: "bg-yellow-50",
    borderClass: "border-yellow-400",
    badgeClass: "bg-yellow-100 text-yellow-800",
    iconColor: "text-yellow-600",
  },
  red: {
    level: "red" as const,
    label: "Emergency now",
    explanation:
      "What you shared needs urgent care. Call an ambulance or go to the emergency room immediately. Do not wait.",
    bgClass: "bg-red-50",
    borderClass: "border-red-500",
    badgeClass: "bg-red-100 text-red-800",
    iconColor: "text-red-600",
  },
} as const;

export type TriageLevel = keyof typeof TRIAGE_CONFIG;
