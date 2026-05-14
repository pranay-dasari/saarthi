"use client";

import { useState, useEffect, useRef, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { markDose } from "@/app/actions";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { BigButton } from "@/components/ui/BigButton";
import { SectionCard } from "@/components/ui/SectionCard";
import type { DoseEntry, Slot } from "@/types";

// ─── Slot helpers ─────────────────────────────────────────────────────────────

const SLOT_LABELS: Record<Slot, string> = {
  morning: "morning", afternoon: "afternoon", evening: "evening", night: "night",
};

// Hour at which each slot begins (used for auto-trigger detection)
const SLOT_START_HOUR: Record<Slot, number> = {
  morning: 6, afternoon: 12, evening: 17, night: 20,
};

function getCurrentSlot(): Slot {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 20) return "evening";
  return "night";
}

// ─── Dynamic speech builders ──────────────────────────────────────────────────

function callName(dose: DoseEntry): string {
  // "Metformin, the red tablet" or just "Metformin"
  return dose.nickname
    ? `${dose.medicine_name}, the ${dose.nickname}`
    : dose.medicine_name;
}

function buildOpeningMessage(
  firstName: string,
  slot: Slot,
  doses: DoseEntry[]
): string {
  const slotLabel = SLOT_LABELS[slot];
  const names = doses.map(callName).join(" and ");
  return (
    `Hello ${firstName}, it is time for your ${slotLabel} ${doses.length === 1 ? "medicine" : "medicines"}. ` +
    `You need to take ${names}. ` +
    `I will ask you one by one.`
  );
}

function buildDoseQuestion(dose: DoseEntry): string {
  const name = callName(dose);
  const instruction = dose.instructions ? ` Remember, ${dose.instructions}.` : "";
  return `Have you taken your ${name}?${instruction}`;
}

function buildYesResponse(dose: DoseEntry, nextDose: DoseEntry | null): string {
  const base = `Good. ${dose.medicine_name} marked as taken.`;
  // Post-instruction: derive follow-up hint from instructions text
  let hint = "";
  if (dose.instructions) {
    const instr = dose.instructions.toLowerCase();
    if (instr.includes("empty stomach")) {
      hint = " You can now have your breakfast or meal.";
    } else if (instr.includes("after food") || instr.includes("after meal") || instr.includes("after breakfast") || instr.includes("after lunch") || instr.includes("after dinner")) {
      hint = " Make sure you have eaten before taking this next time.";
    } else if (instr.includes("water")) {
      hint = " Remember to drink plenty of water.";
    }
  }
  const next = nextDose
    ? ` Now let us check your next medicine.`
    : ` That is all for now.`;
  return base + hint + next;
}

function buildNoResponse(dose: DoseEntry): string {
  const name = callName(dose);
  const instruction = dose.instructions
    ? ` ${dose.instructions}.`
    : "";
  return `Okay. Please take your ${name} now.${instruction} I will leave it as pending.`;
}

function buildDoneMessage(firstName: string, slot: Slot): string {
  const nextSlot: Record<Slot, string | null> = {
    morning:   "afternoon",
    afternoon: "evening",
    evening:   "night",
    night:     null,
  };
  const next = nextSlot[slot];
  const nextHint = next
    ? ` Your next reminder will be for your ${next} medicines.`
    : " You are done with medicines for today. Well done!";
  return `All done, ${firstName}.${nextHint} Well done!`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface MedicineReminderPromptProps {
  profileName: string;
  profileId: string;
  pendingDoses: DoseEntry[];
}

type Phase = "banner" | "asking" | "done";

export function MedicineReminderPrompt({
  profileName,
  profileId,
  pendingDoses,
}: MedicineReminderPromptProps) {
  const router = useRouter();
  const { speak } = useSpeechSynthesis();
  const [isPending, startTransition] = useTransition();
  const [phase, setPhase] = useState<Phase>("banner");
  const [doseIndex, setDoseIndex] = useState(0);

  const currentSlot = getCurrentSlot();
  const slotDoses = pendingDoses.filter((d) => d.slot === currentSlot);
  const firstName = profileName.split(" ")[0] || profileName || "Friend";

  // Prevent double-speak across re-renders
  const lastSpokenIndexRef = useRef<number | null>(null);
  // Prevent double auto-trigger on mount
  const autoTriggeredRef = useRef(false);
  // Track the slot at last interval tick for boundary detection
  const lastSlotRef = useRef<Slot>(currentSlot);
  // Signal: auto-start when fresh slotDoses arrive after a slot-boundary refresh
  const autoStartAfterRefreshRef = useRef(false);

  // ── handleStart (stable via useCallback) ───────────────────────────────────
  const handleStart = useCallback(() => {
    setPhase("asking");
    setDoseIndex(0);
    lastSpokenIndexRef.current = 0;
    // Speak opening + first question as one utterance to avoid TTS cancellation race
    const firstDose = slotDoses[0];
    const opening = buildOpeningMessage(firstName, currentSlot, slotDoses);
    const firstQ = firstDose ? ` ${buildDoseQuestion(firstDose)}` : "";
    speak(opening + firstQ);
  // slotDoses and firstName change when props change — intentional
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speak, slotDoses, firstName, currentSlot]);

  // ── Auto-trigger on mount if it's the start of a slot ──────────────────────
  useEffect(() => {
    if (autoTriggeredRef.current) return;
    if (slotDoses.length === 0) return;

    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const slotStartHour = SLOT_START_HOUR[currentSlot];

    // Auto-start within first 5 minutes of the slot boundary crossing
    if (h === slotStartHour && m < 5) {
      autoTriggeredRef.current = true;
      handleStart();
    }
  // Only on mount — dependency array intentionally empty
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Interval: detect slot boundary while app is open, refresh + auto-start ─
  useEffect(() => {
    const interval = setInterval(() => {
      const newSlot = getCurrentSlot();
      if (newSlot !== lastSlotRef.current) {
        lastSlotRef.current = newSlot;
        // Reset phase so the new slot's banner shows
        setPhase("banner");
        setDoseIndex(0);
        lastSpokenIndexRef.current = null;
        autoStartAfterRefreshRef.current = true;
        // Refresh server data so pendingDoses reflects the new slot
        router.refresh();
      }
    }, 60_000); // check every minute

    return () => clearInterval(interval);
  }, [router]);

  // ── After router.refresh() delivers new slotDoses, auto-start ──────────────
  useEffect(() => {
    if (!autoStartAfterRefreshRef.current) return;
    if (slotDoses.length === 0) return;
    autoStartAfterRefreshRef.current = false;
    handleStart();
  }, [slotDoses, handleStart]);

  // ── Speak subsequent questions (index > 0) ──────────────────────────────────
  useEffect(() => {
    if (phase !== "asking" || doseIndex === 0) return;
    if (lastSpokenIndexRef.current === doseIndex) return;
    lastSpokenIndexRef.current = doseIndex;
    const dose = slotDoses[doseIndex];
    if (dose) speak(buildDoseQuestion(dose));
  }, [phase, doseIndex, slotDoses, speak]);

  // ─────────────────────────────────────────────────────────────────────────────

  if (slotDoses.length === 0 || phase === "done") return null;

  const currentDose = slotDoses[doseIndex];

  function advance(next: number) {
    if (next >= slotDoses.length) {
      speak(buildDoneMessage(firstName, currentSlot));
      setPhase("done");
    } else {
      setDoseIndex(next);
    }
  }

  function handleYes() {
    const dose = slotDoses[doseIndex];
    const nextDose = slotDoses[doseIndex + 1] ?? null;
    speak(buildYesResponse(dose, nextDose));
    startTransition(async () => {
      try {
        await markDose(dose.medicine_id, profileId, dose.slot as Slot, "taken");
      } catch {
        // silent — DoseCard reflects actual DB state independently
      }
    });
    advance(doseIndex + 1);
  }

  function handleNo() {
    const dose = slotDoses[doseIndex];
    speak(buildNoResponse(dose));
    advance(doseIndex + 1);
  }

  const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <SectionCard>
      {phase === "banner" && (
        <div className="flex flex-col gap-3">
          <p className="text-lg font-bold text-gray-800">
            {capitalise(SLOT_LABELS[currentSlot])} medicine reminder
          </p>
          <p className="text-gray-600 text-base">
            {slotDoses.length} medicine{slotDoses.length > 1 ? "s" : ""} pending:{" "}
            {slotDoses
              .map((d) => (d.nickname ? `${d.medicine_name} (${d.nickname})` : d.medicine_name))
              .join(", ")}
          </p>
          <div className="flex gap-3 mt-1">
            <BigButton variant="primary" size="lg" onClick={handleStart}>
              Start reminder
            </BigButton>
            <BigButton variant="ghost" size="lg" onClick={() => setPhase("done")}>
              Dismiss
            </BigButton>
          </div>
        </div>
      )}

      {phase === "asking" && currentDose && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-500">
            Medicine {doseIndex + 1} of {slotDoses.length}
          </p>
          <div>
            <p className="text-xl font-semibold text-gray-800">
              Have you taken{" "}
              <span className="text-blue-700">{currentDose.medicine_name}</span>?
            </p>
            {currentDose.nickname && (
              <p className="text-sm text-orange-600 mt-0.5">
                "{currentDose.nickname}"
                {currentDose.dosage && ` · ${currentDose.dosage}`}
              </p>
            )}
            {!currentDose.nickname && currentDose.dosage && (
              <p className="text-base text-gray-500 mt-0.5">{currentDose.dosage}</p>
            )}
            {currentDose.instructions && (
              <p className="text-sm text-blue-600 mt-1 italic">
                {currentDose.instructions}
              </p>
            )}
          </div>
          <div className="flex gap-3 mt-1">
            <BigButton
              variant="primary"
              size="lg"
              disabled={isPending}
              onClick={handleYes}
            >
              Yes, taken
            </BigButton>
            <BigButton variant="ghost" size="lg" onClick={handleNo}>
              Not yet
            </BigButton>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
