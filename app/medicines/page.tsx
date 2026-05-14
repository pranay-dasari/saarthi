import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/db/profile";
import { getActiveMedicines } from "@/lib/db/medicines";
import { getLogsForDate } from "@/lib/db/logs";
import { DoseCard } from "@/components/medicine/DoseCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClockRotateLeft,
  faSun,
  faCloudSun,
  faMoon,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { DoseEntry, Medicine, MedicineLog, Slot } from "@/types";

const SLOT_ORDER: Slot[] = ["morning", "afternoon", "evening", "night"];
const SLOT_LABELS: Record<Slot, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
};
const SLOT_ICON: Record<Slot, { icon: IconDefinition; color: string }> = {
  morning:   { icon: faSun,      color: "text-yellow-400" },
  afternoon: { icon: faSun,      color: "text-orange-400" },
  evening:   { icon: faCloudSun, color: "text-orange-300" },
  night:     { icon: faMoon,     color: "text-indigo-400" },
};

function buildDoses(medicines: Medicine[], logs: MedicineLog[]): DoseEntry[] {
  const logMap = new Map(logs.map((l) => [`${l.medicine_id}-${l.slot}`, l]));
  const entries: DoseEntry[] = [];
  for (const med of medicines) {
    for (const slot of med.slots as Slot[]) {
      const log = logMap.get(`${med.id}-${slot}`);
      entries.push({
        medicine_id: med.id,
        medicine_name: med.name,
        nickname: med.nickname,
        dosage: med.dosage,
        instructions: med.instructions,
        slot,
        status: log?.status ?? "pending",
        log_id: log?.id ?? null,
        taken_at: log?.taken_at ?? null,
      });
    }
  }
  return entries;
}

export default async function MedicinesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date().toISOString().split("T")[0];
  const [profile, medicines, logs] = await Promise.all([
    getProfile(supabase),
    getActiveMedicines(supabase),
    getLogsForDate(supabase, today),
  ]);

  const doses = buildDoses(medicines, logs);
  const grouped = SLOT_ORDER.map((slot) => ({
    slot,
    doses: doses.filter((d) => d.slot === slot),
  })).filter((g) => g.doses.length > 0);

  const takenCount = doses.filter((d) => d.status === "taken").length;
  const totalCount = doses.length;

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <PageHeader
        title="Medicines"
        rightSlot={
          <Link
            href="/medicines/history"
            className="flex items-center gap-1.5 text-blue-600 font-semibold text-base px-3 py-2 rounded-xl hover:bg-blue-50"
          >
            <FontAwesomeIcon icon={faClockRotateLeft} className="w-5 h-5" />
            History
          </Link>
        }
      />

      <div className="px-4 py-5 flex flex-col gap-5">
        {/* Progress summary */}
        <SectionCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-gray-900">Today's progress</p>
              <p className="text-gray-500 text-base mt-0.5">
                {takenCount} of {totalCount} doses taken
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-blue-600">
                {totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0}
                <span className="text-xl">%</span>
              </p>
            </div>
          </div>
          {totalCount > 0 && (
            <div className="mt-3 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.round((takenCount / totalCount) * 100)}%` }}
              />
            </div>
          )}
        </SectionCard>

        {/* Slots */}
        {grouped.length === 0 ? (
          <SectionCard>
            <p className="text-gray-500 text-lg text-center py-4">
              No medicines scheduled for today.
            </p>
          </SectionCard>
        ) : (
          grouped.map(({ slot, doses: slotDoses }) => (
            <div key={slot}>
              <h2 className="text-lg font-bold text-gray-600 mb-3 px-1 flex items-center gap-2">
                <FontAwesomeIcon icon={SLOT_ICON[slot].icon} className={`w-5 h-5 ${SLOT_ICON[slot].color}`} />
                <span>{SLOT_LABELS[slot]}</span>
              </h2>
              <div className="flex flex-col gap-3">
                {slotDoses.map((dose) => (
                  <DoseCard
                    key={`${dose.medicine_id}-${dose.slot}`}
                    dose={dose}
                    profileId={profile?.id ?? ""}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
