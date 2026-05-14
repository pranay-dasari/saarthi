import { cn } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircle } from "@fortawesome/free-solid-svg-icons";
import type { DoseStatus, TriageLevel } from "@/types";

// ── Dose status badge ─────────────────────────────────────────────────────────
const doseClasses: Record<DoseStatus, string> = {
  taken:   "bg-green-100 text-green-800 border border-green-300",
  missed:  "bg-red-100 text-red-800 border border-red-300",
  pending: "bg-gray-100 text-gray-600 border border-gray-300",
};

const doseLabels: Record<DoseStatus, string> = {
  taken:   "✓ Taken",
  missed:  "✗ Missed",
  pending: "Pending",
};

interface DoseStatusBadgeProps {
  status: DoseStatus;
  className?: string;
}

export function DoseStatusBadge({ status, className }: DoseStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-base font-semibold",
        doseClasses[status],
        className
      )}
    >
      {doseLabels[status]}
    </span>
  );
}

// ── Triage level badge ────────────────────────────────────────────────────────
const triageClasses: Record<TriageLevel, string> = {
  green:  "bg-green-100 text-green-800 border border-green-300",
  yellow: "bg-yellow-100 text-yellow-800 border border-yellow-300",
  red:    "bg-red-100 text-red-800 border border-red-300",
};

const triageDotColor: Record<TriageLevel, string> = {
  green:  "text-green-500",
  yellow: "text-yellow-500",
  red:    "text-red-500",
};

const triageText: Record<TriageLevel, string> = {
  green:  "Monitor at home",
  yellow: "Contact doctor today",
  red:    "Emergency now",
};

interface TriageBadgeProps {
  level: TriageLevel;
  className?: string;
}

export function TriageBadge({ level, className }: TriageBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-base font-semibold",
        triageClasses[level],
        className
      )}
    >
      <FontAwesomeIcon icon={faCircle} className={cn("w-2.5 h-2.5", triageDotColor[level])} />
      {triageText[level]}
    </span>
  );
}
