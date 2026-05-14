import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/db/profile";
import { getActiveMedicines } from "@/lib/db/medicines";
import { getLogsForDate } from "@/lib/db/logs";
import { DoseCard } from "@/components/medicine/DoseCard";
import { MedicineReminderPrompt } from "@/components/medicine/MedicineReminderPrompt";
import { UserButton } from "@/components/ui/UserButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { BigButton } from "@/components/ui/BigButton";
import { OnboardingVoice } from "@/components/ui/OnboardingVoice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPills,
  faTriangleExclamation,
  faSun,
  faCloudSun,
  faMoon,
  faArrowRight,
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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

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

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile, medicines, logs] = await Promise.all([
    getProfile(supabase),
    getActiveMedicines(supabase),
    getLogsForDate(supabase, new Date().toISOString().split("T")[0]),
  ]);

  const doses = buildDoses(medicines, logs);
  const grouped = SLOT_ORDER.map((slot) => ({
    slot,
    doses: doses.filter((d) => d.slot === slot),
  })).filter((g) => g.doses.length > 0);

  const pendingCount = doses.filter((d) => d.status === "pending").length;

  // New user: no profile row yet (profile INSERT during signup failed silently)
  const isNewUser = !profile;
  // Partially set up: profile exists but age/gender are empty
  const isIncomplete = !isNewUser && !!profile && profile.age === null && profile.gender === null;

  // Route all incomplete users (new and existing) through onboarding.
  // Admin (admin@app.local) has age=72 from seed data, so this never fires for them.
  if (isNewUser || isIncomplete) {
    redirect("/onboarding");
  }

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Onboarding voice — fires once for new users, respects mute */}
      <OnboardingVoice isNewUser={isNewUser} />

      {/* Header */}
      <div className="bg-blue-600 px-6 pt-8 pb-10 text-white">
        <div className="flex items-start justify-between mb-1">
          <p className="text-blue-200 text-base">{formatDate()}</p>
          <UserButton
            name={profile?.name ?? ""}
            email={user.email ?? ""}
            age={profile?.age ?? null}
            gender={profile?.gender ?? null}
            conditions={profile?.conditions ?? null}
            medicineNames={medicines.map((m) => m.name)}
          />
        </div>
        <h1 className="text-3xl font-bold leading-tight">
          {getGreeting()},
        </h1>
        <p className="text-3xl font-bold leading-tight">
          {profile?.name ?? "Friend"}
        </p>
        {pendingCount > 0 && (
          <div className="mt-4 bg-blue-500 rounded-xl px-4 py-2 inline-flex items-center gap-2">
            <FontAwesomeIcon icon={faPills} className="w-4 h-4" />
            <span className="text-sm font-medium">
              {pendingCount} dose{pendingCount > 1 ? "s" : ""} pending today
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 px-4 py-5 flex flex-col gap-5 -mt-4">
        {/* New-user setup prompt */}
        {(isNewUser || isIncomplete) && (
          <SectionCard>
            <div className="flex flex-col gap-3">
              <p className="text-gray-800 font-semibold text-base">
                {isNewUser
                  ? "Your profile is not set up yet."
                  : "Your profile is not complete yet."}
              </p>
              <p className="text-gray-500 text-sm leading-relaxed">
                Add your name, age, and health details so Saarthi can help you
                better.
              </p>
              <Link href="/profile" className="block">
                <BigButton variant="primary" size="md" fullWidth>
                  <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4" />
                  {isNewUser ? "Set up your profile" : "Complete your profile"}
                </BigButton>
              </Link>
            </div>
          </SectionCard>
        )}

        <MedicineReminderPrompt
          profileName={profile?.name ?? ""}
          profileId={profile?.id ?? ""}
          pendingDoses={doses.filter((d) => d.status === "pending")}
        />

        {/* Medicine schedule */}
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

        {/* I have a problem CTA */}
        <div className="mt-2">
          <Link href="/symptom" className="block">
            <BigButton
              variant="danger"
              size="xl"
              fullWidth
              className="shadow-md"
            >
              <FontAwesomeIcon icon={faTriangleExclamation} className="w-7 h-7" />
              I have a problem
            </BigButton>
          </Link>
          <p className="text-center text-gray-400 text-sm mt-2">
            Tap if you feel unwell or have a symptom
          </p>
        </div>
      </div>
    </div>
  );
}
