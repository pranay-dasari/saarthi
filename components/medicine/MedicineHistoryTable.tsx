"use client";

import { useState } from "react";
import { DoseStatusBadge } from "@/components/ui/StatusBadge";
import { SectionCard } from "@/components/ui/SectionCard";
import type { MedicineLog, Medicine } from "@/types";

interface Props {
  logs: MedicineLog[];
  medicines: Medicine[];
}

const SLOT_LABELS: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
};

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    weekday: "short",
  });
}

export function MedicineHistoryTable({ logs, medicines }: Props) {
  const [filter, setFilter] = useState("all");

  const medicineMap = new Map(medicines.map((m) => [m.id, m]));

  const filtered = filter === "all"
    ? logs
    : logs.filter((l) => l.medicine_id === filter);

  return (
    <div className="flex flex-col gap-4">
      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-xl text-base font-semibold border-2 transition-colors ${
            filter === "all"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
          }`}
        >
          All
        </button>
        {medicines.map((m) => (
          <button
            key={m.id}
            onClick={() => setFilter(m.id)}
            className={`px-4 py-2 rounded-xl text-base font-semibold border-2 transition-colors ${
              filter === m.id
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <SectionCard>
          <p className="text-gray-500 text-lg text-center py-6">
            No records found.
          </p>
        </SectionCard>
      ) : (
        <SectionCard padded={false}>
          <div className="divide-y divide-gray-100">
            {filtered.map((log) => {
              const med = medicineMap.get(log.medicine_id);
              return (
                <div key={log.id} className="flex items-center gap-3 px-4 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-semibold text-gray-900 truncate">
                      {med?.name ?? "Unknown"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(log.log_date)} · {SLOT_LABELS[log.slot] ?? log.slot}
                      {med?.dosage ? ` · ${med.dosage}` : ""}
                    </p>
                  </div>
                  <DoseStatusBadge status={log.status} />
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
