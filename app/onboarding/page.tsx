"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHeartPulse,
  faUser,
  faPills,
  faCheck,
  faPlus,
  faTrash,
  faArrowRight,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { BigButton } from "@/components/ui/BigButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { APP_NAME } from "@/lib/config";
import { upsertProfile, addMedicine } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import type { Slot } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "profile" | "medicine_question" | "add_medicine" | "done";

interface AddedMedicine {
  name: string;
  dosage: string;
  slots: Slot[];
}

const ALL_SLOTS: { key: Slot; label: string; time: string }[] = [
  { key: "morning",   label: "Morning",   time: "6 AM – 12 PM" },
  { key: "afternoon", label: "Afternoon", time: "12 PM – 5 PM" },
  { key: "evening",   label: "Evening",   time: "5 PM – 8 PM" },
  { key: "night",     label: "Night",     time: "8 PM – 12 AM" },
];

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`h-2.5 rounded-full transition-all duration-300 ${
            i === current
              ? "w-8 bg-blue-600"
              : i < current
              ? "w-2.5 bg-blue-300"
              : "w-2.5 bg-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const { speak } = useSpeechSynthesis();
  const spokenStep = useRef<Step | null>(null);

  const [step, setStep] = useState<Step>("profile");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Profile fields
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [conditions, setConditions] = useState("");
  const [doctorPhone, setDoctorPhone] = useState("");

  // Medicine entry
  const [medName, setMedName] = useState("");
  const [medNickname, setMedNickname] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medInstructions, setMedInstructions] = useState("");
  const [medSlots, setMedSlots] = useState<Slot[]>([]);
  const [addedMedicines, setAddedMedicines] = useState<AddedMedicine[]>([]);
  const [savingMed, setSavingMed] = useState(false);

  // Load profile id + name on mount
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, name, age")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        setProfileId(profile.id);
        setProfileName(profile.name ?? "");
        // Already completed onboarding (has age) — skip to home
        if (profile.age !== null) {
          router.replace("/");
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // TTS per step
  useEffect(() => {
    if (spokenStep.current === step) return;
    spokenStep.current = step;
    if (step === "profile") {
      speak("Welcome! Please tell us a little about yourself so Saarthi can help you better.");
    } else if (step === "medicine_question") {
      speak("Do you take any medicines regularly?");
    } else if (step === "add_medicine") {
      speak("Please add the name of your medicine and when you take it.");
    } else if (step === "done") {
      speak("You are all set! Saarthi is ready to help you.");
    }
  }, [step, speak]);

  // ── Step 1: save profile ────────────────────────────────────────────────────
  function handleProfileSave() {
    setError(null);

    if (!age || isNaN(Number(age)) || Number(age) < 1 || Number(age) > 120) {
      setError("Please enter a valid age.");
      return;
    }

    startTransition(async () => {
      try {
        // upsertProfile handles both cases: profile exists (update) and profile
        // missing (create) — the latter happens when email confirmation was
        // enabled at registration time and the initial profile insert was blocked.
        const savedId = await upsertProfile({
          name: profileName || "Friend",
          age: parseInt(age),
          gender: gender || null,
          conditions: conditions.split(",").map((s) => s.trim()).filter(Boolean),
          doctor_phone: doctorPhone.trim() || null,
        });
        if (!profileId) setProfileId(savedId);
        setStep("medicine_question");
      } catch {
        setError("Could not save. Please try again.");
      }
    });
  }

  // ── Step 3: add one medicine ────────────────────────────────────────────────
  async function handleAddMedicine() {
    if (!profileId) return;
    setError(null);

    if (!medName.trim()) { setError("Please enter the medicine name."); return; }
    if (medSlots.length === 0) { setError("Please select at least one time slot."); return; }

    setSavingMed(true);
    try {
      await addMedicine(profileId, {
        name: medName.trim(),
        nickname: medNickname.trim() || null,
        dosage: medDosage.trim() || null,
        slots: medSlots,
        notes: null,
        instructions: medInstructions.trim() || null,
      });
      setAddedMedicines((prev) => [
        ...prev,
        { name: medName.trim(), dosage: medDosage.trim(), slots: medSlots },
      ]);
      speak(`${medName} added.`);
      // Reset form for next medicine
      setMedName("");
      setMedNickname("");
      setMedDosage("");
      setMedInstructions("");
      setMedSlots([]);
    } catch {
      setError("Could not save medicine. Please try again.");
    } finally {
      setSavingMed(false);
    }
  }

  function toggleSlot(slot: Slot) {
    setMedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  }

  const dotIndex = step === "profile" ? 0 : step === "medicine_question" || step === "add_medicine" ? 1 : 2;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 px-6 pt-8 pb-10 text-white text-center">
        <div className="flex justify-center mb-3">
          <div className="bg-white rounded-full p-3">
            <FontAwesomeIcon icon={faHeartPulse} className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">{APP_NAME}</h1>
        <p className="text-blue-200 text-base mt-1">Let's get you set up</p>
      </div>

      <div className="flex-1 px-4 py-6 -mt-4">
        <StepDots current={dotIndex} />

        {/* ── Step 1: Profile ─────────────────────────────────────────────── */}
        {step === "profile" && (
          <SectionCard>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <FontAwesomeIcon icon={faUser} className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">
                  Hello, {profileName || "Friend"}!
                </p>
                <p className="text-gray-500 text-sm">Tell us about yourself</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {/* Age */}
              <div className="flex flex-col gap-1.5">
                <label className="text-base font-semibold text-gray-700">
                  Age <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 68"
                  min={1}
                  max={120}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg
                             focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>

              {/* Gender */}
              <div className="flex flex-col gap-1.5">
                <label className="text-base font-semibold text-gray-700">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg
                             focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                >
                  <option value="">Select (optional)</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Conditions */}
              <div className="flex flex-col gap-1.5">
                <label className="text-base font-semibold text-gray-700">
                  Known health conditions
                </label>
                <input
                  type="text"
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                  placeholder="e.g. Diabetes, High blood pressure"
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg
                             focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
                <p className="text-sm text-gray-400">Separate with commas — optional</p>
              </div>

              {/* Doctor phone */}
              <div className="flex flex-col gap-1.5">
                <label className="text-base font-semibold text-gray-700">
                  Doctor's phone number
                </label>
                <input
                  type="tel"
                  value={doctorPhone}
                  onChange={(e) => setDoctorPhone(e.target.value)}
                  placeholder="+91-XXXXX-XXXXX"
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg
                             focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>

              {error && (
                <p className="text-red-600 text-base font-medium">{error}</p>
              )}

              <BigButton
                variant="primary"
                size="lg"
                fullWidth
                disabled={isPending}
                onClick={handleProfileSave}
              >
                <FontAwesomeIcon icon={faChevronRight} className="w-5 h-5" />
                {isPending ? "Saving…" : "Continue"}
              </BigButton>
            </div>
          </SectionCard>
        )}

        {/* ── Step 2: Medicine question ────────────────────────────────────── */}
        {step === "medicine_question" && (
          <SectionCard>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <FontAwesomeIcon icon={faPills} className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">Medicines</p>
                <p className="text-gray-500 text-sm">Daily schedule setup</p>
              </div>
            </div>

            <p className="text-lg text-gray-800 font-medium mb-6 leading-snug">
              Do you take any medicines regularly?
            </p>

            <div className="flex flex-col gap-3">
              <BigButton
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => setStep("add_medicine")}
              >
                <FontAwesomeIcon icon={faCheck} className="w-5 h-5" />
                Yes, I take medicines
              </BigButton>
              <BigButton
                variant="secondary"
                size="lg"
                fullWidth
                onClick={() => setStep("done")}
              >
                No, I don't take any
              </BigButton>
            </div>
          </SectionCard>
        )}

        {/* ── Step 3: Add medicines ────────────────────────────────────────── */}
        {step === "add_medicine" && (
          <div className="flex flex-col gap-4">
            {/* Added medicines list */}
            {addedMedicines.length > 0 && (
              <SectionCard>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Added so far
                </p>
                <div className="flex flex-col gap-3">
                  {addedMedicines.map((m, i) => (
                    <div key={i} className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-gray-900">{m.name}</p>
                        <p className="text-sm text-gray-500">
                          {m.dosage && `${m.dosage} · `}
                          {m.slots.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(", ")}
                        </p>
                      </div>
                      <FontAwesomeIcon icon={faCheck} className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Add medicine form */}
            <SectionCard>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <FontAwesomeIcon icon={faPills} className="w-5 h-5 text-orange-600" />
                </div>
                <p className="text-lg font-bold text-gray-900">
                  {addedMedicines.length === 0 ? "Add your first medicine" : "Add another medicine"}
                </p>
              </div>

              <div className="flex flex-col gap-4">
                {/* Medicine name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-base font-semibold text-gray-700">
                    Medicine name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={medName}
                    onChange={(e) => setMedName(e.target.value)}
                    placeholder="e.g. Metformin"
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg
                               focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                {/* Pet name / nickname */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-base font-semibold text-gray-700">
                    Pet name / nickname
                  </label>
                  <input
                    type="text"
                    value={medNickname}
                    onChange={(e) => setMedNickname(e.target.value)}
                    placeholder="e.g. red tablet, orange bottle tonic"
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg
                               focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                  <p className="text-sm text-gray-400">Saarthi uses this in voice reminders</p>
                </div>

                {/* Dosage */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-base font-semibold text-gray-700">
                    Dosage
                  </label>
                  <input
                    type="text"
                    value={medDosage}
                    onChange={(e) => setMedDosage(e.target.value)}
                    placeholder="e.g. 500mg, 1 tablet"
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg
                               focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                {/* Time slots */}
                <div className="flex flex-col gap-2">
                  <label className="text-base font-semibold text-gray-700">
                    When to take <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_SLOTS.map(({ key, label, time }) => {
                      const selected = medSlots.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleSlot(key)}
                          className={`flex flex-col items-start px-4 py-3 rounded-xl border-2 transition-all text-left
                            ${selected
                              ? "border-blue-600 bg-blue-50"
                              : "border-gray-200 bg-white hover:border-blue-300"
                            }`}
                        >
                          <span className={`text-base font-semibold ${selected ? "text-blue-700" : "text-gray-800"}`}>
                            {label}
                          </span>
                          <span className="text-xs text-gray-400">{time}</span>
                          {selected && (
                            <FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5 text-blue-600 mt-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Instructions */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-base font-semibold text-gray-700">
                    Instructions
                  </label>
                  <input
                    type="text"
                    value={medInstructions}
                    onChange={(e) => setMedInstructions(e.target.value)}
                    placeholder="e.g. Take on empty stomach, Take after food"
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg
                               focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                  <p className="text-sm text-gray-400">Saarthi reads this during the reminder</p>
                </div>

                {error && (
                  <p className="text-red-600 text-base font-medium">{error}</p>
                )}

                <BigButton
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={savingMed}
                  onClick={handleAddMedicine}
                >
                  <FontAwesomeIcon icon={faPlus} className="w-5 h-5" />
                  {savingMed ? "Saving…" : "Add medicine"}
                </BigButton>
              </div>
            </SectionCard>

            {/* Done button — only shown after at least one medicine added */}
            {addedMedicines.length > 0 && (
              <BigButton
                variant="success"
                size="lg"
                fullWidth
                onClick={() => setStep("done")}
              >
                <FontAwesomeIcon icon={faCheck} className="w-5 h-5" />
                Done — I've added all my medicines
              </BigButton>
            )}

            <button
              className="text-center text-gray-400 text-base underline py-2"
              onClick={() => setStep("done")}
            >
              Skip for now
            </button>
          </div>
        )}

        {/* ── Step 4: Done ─────────────────────────────────────────────────── */}
        {step === "done" && (
          <SectionCard>
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <FontAwesomeIcon icon={faCheck} className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 text-center">
                You're all set!
              </h2>
              <p className="text-gray-500 text-base text-center leading-relaxed">
                {addedMedicines.length > 0
                  ? `Saarthi will remind you to take your ${addedMedicines.length === 1 ? "medicine" : `${addedMedicines.length} medicines`} every day.`
                  : "Saarthi is ready to help you manage your health."}
              </p>
              {addedMedicines.length > 0 && (
                <div className="w-full bg-gray-50 rounded-xl px-4 py-3 flex flex-col gap-2">
                  {addedMedicines.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                      <FontAwesomeIcon icon={faPills} className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      <span className="font-medium">{m.name}</span>
                      {m.dosage && <span className="text-gray-400">· {m.dosage}</span>}
                      <span className="text-gray-400 ml-auto">
                        {m.slots.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(", ")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <BigButton
                variant="primary"
                size="xl"
                fullWidth
                onClick={() => router.push("/")}
                className="mt-2"
              >
                <FontAwesomeIcon icon={faArrowRight} className="w-6 h-6" />
                Go to Saarthi
              </BigButton>
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
