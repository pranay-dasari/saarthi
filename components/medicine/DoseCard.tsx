"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { DoseStatusBadge } from "@/components/ui/StatusBadge";
import { markDose } from "@/app/actions";
import type { DoseEntry, Slot } from "@/types";

interface DoseCardProps {
  dose: DoseEntry;
  profileId: string;
}

export function DoseCard({ dose, profileId }: DoseCardProps) {
  const [status, setStatus] = useState(dose.status);
  const [isPending, startTransition] = useTransition();

  const handle = (next: "taken" | "missed") => {
    const prev = status;
    setStatus(next);
    startTransition(async () => {
      try {
        await markDose(dose.medicine_id, profileId, dose.slot as Slot, next);
      } catch {
        setStatus(prev);
      }
    });
  };

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border-2 p-4 transition-colors",
        status === "taken"  && "border-green-200 bg-green-50",
        status === "missed" && "border-red-200 bg-red-50",
        status === "pending" && "border-gray-200"
      )}
    >
      {/* Name + badge row */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <p className="text-xl font-bold text-gray-900 leading-tight">
            {dose.medicine_name}
          </p>
          {dose.dosage && (
            <p className="text-base text-gray-500 mt-0.5">{dose.dosage}</p>
          )}
        </div>
        <DoseStatusBadge status={status} />
      </div>

      {/* Action buttons — always shown so user can change their answer */}
      <div className="flex gap-3">
        <button
          onClick={() => handle("taken")}
          disabled={isPending}
          aria-label="Mark as taken"
          className={cn(
            "flex-1 min-h-[56px] rounded-xl font-semibold text-lg border-2 transition-all",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-300",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            status === "taken"
              ? "bg-green-600 text-white border-green-600"
              : "bg-white text-green-700 border-green-300 hover:bg-green-50"
          )}
        >
          ✓ Taken
        </button>
        <button
          onClick={() => handle("missed")}
          disabled={isPending}
          aria-label="Mark as missed"
          className={cn(
            "flex-1 min-h-[56px] rounded-xl font-semibold text-lg border-2 transition-all",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-300",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            status === "missed"
              ? "bg-red-600 text-white border-red-600"
              : "bg-white text-red-700 border-red-300 hover:bg-red-50"
          )}
        >
          ✗ Missed
        </button>
      </div>
    </div>
  );
}
