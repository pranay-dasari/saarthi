"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPhone,
  faUser,
  faPen,
  faCheck,
  faXmark,
  faRightFromBracket,
  faCircleInfo,
} from "@fortawesome/free-solid-svg-icons";
import { SectionCard } from "@/components/ui/SectionCard";
import { BigButton } from "@/components/ui/BigButton";
import { createClient } from "@/lib/supabase/client";
import { saveProfile } from "@/app/actions";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { MedicineManager } from "@/components/medicine/MedicineManager";
import type { Profile, EmergencyContact, Medicine } from "@/types";

interface Props {
  profile: Profile;
  contacts: EmergencyContact[];
  medicines: Medicine[];
  /** True when the profile row was just auto-created and still has no details. */
  isNewProfile?: boolean;
}

export function ProfileView({ profile, contacts, medicines, isNewProfile = false }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(isNewProfile);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  // Speak a one-time prompt for new users opening their profile for the first time.
  const { speak } = useSpeechSynthesis();
  const spokenRef = useRef(false);
  useEffect(() => {
    if (!isNewProfile || spokenRef.current) return;
    spokenRef.current = true;
    speak(
      "Welcome! Please add your name, age, and other details so Saarthi can help you better."
    );
  }, [isNewProfile, speak]);

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // Edit state mirrors profile fields
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(String(profile.age ?? ""));
  const [gender, setGender] = useState(profile.gender ?? "");
  const [conditions, setConditions] = useState(
    (profile.conditions ?? []).join(", ")
  );
  const [doctorPhone, setDoctorPhone] = useState(profile.doctor_phone ?? "");

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      try {
        await saveProfile(profile.id, {
          name: name.trim() || profile.name,
          age: age ? parseInt(age) : null,
          gender: gender.trim() || null,
          conditions: conditions
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          doctor_phone: doctorPhone.trim() || null,
        });
        setEditing(false);
      } catch {
        setError("Could not save. Please try again.");
      }
    });
  };

  const handleCancel = () => {
    setName(profile.name);
    setAge(String(profile.age ?? ""));
    setGender(profile.gender ?? "");
    setConditions((profile.conditions ?? []).join(", "));
    setDoctorPhone(profile.doctor_phone ?? "");
    setEditing(false);
    setError(null);
  };

  const initials = profile.name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  return (
    <div className="flex flex-col gap-5 px-4 py-5">
      {/* Welcome banner for new / incomplete profiles */}
      {isNewProfile && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-4 flex items-start gap-3">
          <FontAwesomeIcon
            icon={faCircleInfo}
            className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0"
          />
          <div>
            <p className="text-blue-900 font-semibold text-base leading-snug">
              Welcome to Saarthi!
            </p>
            <p className="text-blue-700 text-sm mt-0.5 leading-relaxed">
              Please add your details below so we can personalise your
              experience and help you better.
            </p>
          </div>
        </div>
      )}

      {/* Avatar + name */}
      <SectionCard>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <span className="text-3xl font-bold text-blue-600">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-2xl font-bold text-gray-900 border-b-2 border-blue-400 outline-none bg-transparent pb-1"
                placeholder="Full name"
              />
            ) : (
              <p className="text-2xl font-bold text-gray-900">
                {profile.name || "Your name"}
              </p>
            )}
            <p className="text-gray-500 text-base mt-0.5">Patient</p>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              aria-label="Edit profile"
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <FontAwesomeIcon icon={faPen} className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>
      </SectionCard>

      {/* Personal details */}
      <SectionCard>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FontAwesomeIcon icon={faUser} className="w-5 h-5 text-blue-600" />
          Personal Details
        </h2>
        <div className="flex flex-col gap-4">
          <Field label="Age">
            {editing ? (
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 72"
                className="field-input"
              />
            ) : (
              <span>{profile.age ? `${profile.age} years` : "Not added yet"}</span>
            )}
          </Field>
          <Field label="Gender">
            {editing ? (
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="field-input"
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            ) : (
              <span>{profile.gender ?? "Not added yet"}</span>
            )}
          </Field>
          <Field label="Known conditions">
            {editing ? (
              <input
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
                placeholder="e.g. Diabetes, Hypertension"
                className="field-input"
              />
            ) : (
              <span>
                {profile.conditions?.length
                  ? profile.conditions.join(", ")
                  : "Not added yet"}
              </span>
            )}
          </Field>
          {editing && (
            <p className="text-sm text-gray-400 -mt-2">
              Separate conditions with commas
            </p>
          )}
        </div>
      </SectionCard>

      {/* Doctor */}
      <SectionCard>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FontAwesomeIcon icon={faPhone} className="w-5 h-5 text-blue-600" />
          Doctor
        </h2>
        <Field label="Doctor's phone">
          {editing ? (
            <input
              value={doctorPhone}
              onChange={(e) => setDoctorPhone(e.target.value)}
              placeholder="+91-XXXXX-XXXXX"
              className="field-input"
            />
          ) : profile.doctor_phone ? (
            <a
              href={`tel:${profile.doctor_phone}`}
              className="text-blue-600 font-semibold underline"
            >
              {profile.doctor_phone}
            </a>
          ) : (
            <span className="text-gray-400">Not added yet</span>
          )}
        </Field>
      </SectionCard>

      {/* Edit save/cancel */}
      {editing && (
        <div className="flex flex-col gap-3">
          {error && (
            <p className="text-red-600 text-base font-medium text-center">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <BigButton
              variant="primary"
              size="lg"
              fullWidth
              disabled={isPending}
              onClick={handleSave}
            >
              <FontAwesomeIcon icon={faCheck} className="w-5 h-5" />
              {isPending ? "Saving…" : "Save"}
            </BigButton>
            <BigButton
              variant="secondary"
              size="lg"
              fullWidth
              disabled={isPending}
              onClick={handleCancel}
            >
              <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
              Cancel
            </BigButton>
          </div>
        </div>
      )}

      {/* Emergency contacts */}
      <SectionCard>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FontAwesomeIcon icon={faPhone} className="w-5 h-5 text-red-500" />
          Emergency Contacts
        </h2>
        {contacts.length === 0 ? (
          <p className="text-gray-400 text-base">No contacts saved yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {contacts.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold text-gray-900">
                      {c.name}
                    </p>
                    {c.is_primary && (
                      <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="text-base text-gray-500">
                    {c.relationship ?? "Contact"} · {c.phone}
                  </p>
                </div>
                <a
                  href={`tel:${c.phone}`}
                  aria-label={`Call ${c.name}`}
                  className="w-12 h-12 flex items-center justify-center rounded-xl bg-green-100 hover:bg-green-200 transition-colors"
                >
                  <FontAwesomeIcon icon={faPhone} className="w-5 h-5 text-green-700" />
                </a>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Medicines */}
      <SectionCard>
        <MedicineManager profileId={profile.id} medicines={medicines} />
      </SectionCard>

      {/* Sign out */}
      <BigButton
        variant="secondary"
        size="lg"
        fullWidth
        disabled={signingOut}
        onClick={handleSignOut}
      >
        <FontAwesomeIcon icon={faRightFromBracket} className="w-5 h-5" />
        {signingOut ? "Signing out…" : "Sign out"}
      </BigButton>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <div className="text-lg text-gray-800">{children}</div>
    </div>
  );
}
