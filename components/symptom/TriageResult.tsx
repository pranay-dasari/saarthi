"use client";

import { useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPhone,
  faTriangleExclamation,
  faCircleCheck,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";
import { BigButton } from "@/components/ui/BigButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { TRIAGE_CONFIG } from "@/lib/config";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import type { EmergencyContact, Profile } from "@/types";
import { cn } from "@/lib/utils";

const TRIAGE_SPOKEN: Record<"green" | "yellow" | "red", string> = {
  green: "Your symptoms do not seem urgent right now. Please rest and monitor how you feel.",
  yellow: "You may need a doctor's attention soon. Please contact your doctor or caregiver today.",
  red: "This needs urgent attention. Please call emergency services or a trusted person right now.",
};

interface TriageResultProps {
  triageLevel: "green" | "yellow" | "red";
  symptomLabel: string;
  symptomEmoji: string;
  profile: Profile;
  contacts: EmergencyContact[];
  isPending: boolean;
  saved: boolean;
  onGoBack: () => void;
  onDone: () => void;
  onCallAction: (label: string) => void;
}

export function TriageResult({
  triageLevel,
  symptomLabel,
  symptomEmoji,
  profile,
  contacts,
  isPending,
  saved,
  onGoBack,
  onDone,
  onCallAction,
}: TriageResultProps) {
  const config = TRIAGE_CONFIG[triageLevel];
  const { speak } = useSpeechSynthesis();

  const spokenRef = useRef(false);
  useEffect(() => {
    if (spokenRef.current) return;
    spokenRef.current = true;
    speak(TRIAGE_SPOKEN[triageLevel]);
  }, [triageLevel, speak]);
  const primaryContact = contacts.find((c) => c.is_primary) ?? contacts[0];

  const levelIcon =
    triageLevel === "green" ? (
      <FontAwesomeIcon icon={faCircleCheck} className="w-10 h-10" />
    ) : (
      <FontAwesomeIcon icon={faTriangleExclamation} className="w-10 h-10" />
    );

  return (
    <div className="flex flex-col gap-5 p-4">
      <button
        onClick={onGoBack}
        className="flex items-center gap-2 text-gray-500 text-lg self-start"
        aria-label="Go back"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="w-5 h-5" />
        Back
      </button>

      {/* Result card */}
      <div
        className={cn(
          "rounded-2xl border-2 p-6 flex flex-col gap-3",
          config.bgClass,
          config.borderClass
        )}
      >
        <div className={cn("flex items-center gap-3", config.iconColor)}>
          {levelIcon}
          <span className="text-2xl font-bold">{config.label}</span>
        </div>
        <p className="text-gray-700 text-lg leading-relaxed">{config.explanation}</p>
        <div className={cn("self-start px-3 py-1 rounded-full text-sm font-semibold", config.badgeClass)}>
          {symptomEmoji} {symptomLabel}
        </div>
      </div>

      {/* Red: emergency contacts */}
      {triageLevel === "red" && (
        <SectionCard>
          <p className="font-bold text-red-700 text-lg mb-3">
            Call emergency services or someone you trust now
          </p>
          <div className="flex flex-col gap-3">
            <a
              href="tel:112"
              className={cn(
                "flex items-center gap-3 min-h-[56px] px-5 rounded-2xl",
                "bg-red-600 text-white font-semibold text-lg",
                "active:bg-red-700 transition-colors"
              )}
              onClick={() => onCallAction("Called 112")}
            >
              <FontAwesomeIcon icon={faPhone} className="w-5 h-5" />
              Call 112 (Emergency)
            </a>

            {contacts.length === 0 ? (
              <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4">
                <p className="text-gray-500 text-base">
                  No emergency contacts saved. Ask someone nearby for help or call 112.
                </p>
              </div>
            ) : (
              contacts.map((c) => (
                <a
                  key={c.id}
                  href={`tel:${c.phone}`}
                  className={cn(
                    "flex items-center gap-3 min-h-[56px] px-5 rounded-2xl",
                    "bg-orange-500 text-white font-semibold text-lg",
                    "active:bg-orange-600 transition-colors"
                  )}
                  onClick={() => onCallAction(`Called ${c.name}`)}
                >
                  <FontAwesomeIcon icon={faPhone} className="w-5 h-5" />
                  {c.name} ({c.relationship ?? "contact"})
                </a>
              ))
            )}
          </div>
        </SectionCard>
      )}

      {/* Yellow: call doctor or caregiver */}
      {triageLevel === "yellow" && (
        <SectionCard>
          <p className="font-bold text-yellow-700 text-lg mb-3">
            Contact your doctor today
          </p>
          <div className="flex flex-col gap-3">
            {profile.doctor_phone ? (
              <a
                href={`tel:${profile.doctor_phone}`}
                className={cn(
                  "flex items-center gap-3 min-h-[56px] px-5 rounded-2xl",
                  "bg-yellow-500 text-white font-semibold text-lg",
                  "active:bg-yellow-600 transition-colors"
                )}
                onClick={() => onCallAction("Called doctor")}
              >
                <FontAwesomeIcon icon={faPhone} className="w-5 h-5" />
                Call Doctor · {profile.doctor_phone}
              </a>
            ) : (
              <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4">
                <p className="text-gray-500 text-base">
                  No doctor number saved. Add one in your{" "}
                  <a href="/profile" className="text-blue-600 underline">Profile</a>.
                </p>
              </div>
            )}

            {primaryContact ? (
              <a
                href={`tel:${primaryContact.phone}`}
                className={cn(
                  "flex items-center gap-3 min-h-[56px] px-5 rounded-2xl",
                  "bg-blue-500 text-white font-semibold text-lg",
                  "active:bg-blue-600 transition-colors"
                )}
                onClick={() => onCallAction(`Called ${primaryContact.name}`)}
              >
                <FontAwesomeIcon icon={faPhone} className="w-5 h-5" />
                {primaryContact.name} ({primaryContact.relationship ?? "contact"})
              </a>
            ) : (
              <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4">
                <p className="text-gray-500 text-base">
                  No caregiver contact saved. Add one in your{" "}
                  <a href="/profile" className="text-blue-600 underline">Profile</a>.
                </p>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* Green: rest advice */}
      {triageLevel === "green" && (
        <SectionCard>
          <p className="text-green-800 font-medium text-lg">
            Rest, drink water, and keep an eye on how you feel. If it gets worse, come back and check again.
          </p>
          {primaryContact && (
            <a
              href={`tel:${primaryContact.phone}`}
              className={cn(
                "flex items-center gap-3 min-h-[56px] px-5 rounded-2xl mt-4",
                "bg-blue-100 text-blue-800 font-semibold text-lg",
                "active:bg-blue-200 transition-colors"
              )}
              onClick={() => onCallAction(`Called ${primaryContact.name}`)}
            >
              <FontAwesomeIcon icon={faPhone} className="w-5 h-5" />
              Call {primaryContact.name} if needed
            </a>
          )}
        </SectionCard>
      )}

      {/* Done */}
      <BigButton
        variant="secondary"
        size="lg"
        fullWidth
        disabled={isPending}
        onClick={onDone}
      >
        {isPending ? "Saving…" : "I understand, go home"}
      </BigButton>

      {saved && (
        <p className="text-center text-gray-400 text-sm">Session saved to history.</p>
      )}
    </div>
  );
}
