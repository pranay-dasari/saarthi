"use client";

import { useTransition, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPhone } from "@fortawesome/free-solid-svg-icons";
import { BigButton } from "@/components/ui/BigButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { VoiceCapture } from "./VoiceCapture";
import { TranscriptConfirm } from "./TranscriptConfirm";
import { FollowUpQuestion } from "./FollowUpQuestion";
import { TriageResult } from "./TriageResult";
import { saveSymptomSession } from "@/app/actions";
import {
  detectSymptom,
  detectAllKeywords,
  evaluateTriage,
  buildTranscript,
} from "@/lib/symptom/triage";
import { TRIAGE_CONFIG } from "@/lib/config";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useSymptomSession } from "@/hooks/useSymptomSession";
import type { EmergencyContact, Profile } from "@/types";
import { cn } from "@/lib/utils";

function NoSymptomSpokenPrompt() {
  const { speak } = useSpeechSynthesis();
  const spokenRef = useRef(false);
  useEffect(() => {
    if (spokenRef.current) return;
    spokenRef.current = true;
    speak("I could not clearly identify the problem. Please contact your caregiver or doctor if needed.");
  }, [speak]);
  return null;
}

interface SymptomCheckerProps {
  profile: Profile;
  contacts: EmergencyContact[];
}

export function SymptomChecker({ profile, contacts }: SymptomCheckerProps) {
  const router = useRouter();
  const { state, dispatch } = useSymptomSession();
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [pendingCallAction, setPendingCallAction] = useState<string | null>(null);

  // ── Transcript confirmed → detect symptom ──────────────────────────────────
  function handleTranscriptConfirm() {
    if (state.step !== "confirming") return;
    const detected = detectSymptom(state.transcript);
    if (detected) {
      dispatch({ type: "SYMPTOM_DETECTED", symptom: detected, transcript: state.transcript });
    } else {
      dispatch({ type: "NO_SYMPTOM_DETECTED", transcript: state.transcript });
    }
  }

  // ── Save session and navigate home ─────────────────────────────────────────
  function handleDone(actionTaken: string | null = null) {
    if (state.step !== "result") {
      router.push("/");
      return;
    }
    if (saved) { router.push("/"); return; }

    const { symptom, transcript, answers } = state;
    const triageLevel = evaluateTriage(symptom.id, answers);
    const config = TRIAGE_CONFIG[triageLevel];

    startTransition(async () => {
      try {
        const fullTranscript =
          transcript + "\n" + buildTranscript(symptom, answers).split("\n").slice(1).join("\n");
        await saveSymptomSession({
          profileId: profile.id,
          transcript: fullTranscript.trim(),
          detectedSymptom: symptom.label,
          allKeywords: detectAllKeywords(transcript),
          answers,
          triageLevel,
          triageLabel: config.label,
          actionTaken: actionTaken ?? pendingCallAction,
        });
        setSaved(true);
      } catch {
        // silent — don't block navigation on a save failure
      } finally {
        router.push("/");
      }
    });
  }

  // Save for no-symptom path too
  function handleNoSymptomDone(actionTaken: string | null = null) {
    if (saved) { router.push("/"); return; }
    if (state.step !== "no_symptom") { router.push("/"); return; }

    startTransition(async () => {
      try {
        await saveSymptomSession({
          profileId: profile.id,
          transcript: state.transcript,
          detectedSymptom: "",
          allKeywords: [],
          answers: {},
          triageLevel: "green",
          triageLabel: "No symptom detected",
          actionTaken,
        });
        setSaved(true);
      } catch {
        // silent
      } finally {
        router.push("/");
      }
    });
  }

  // ── Render by step ──────────────────────────────────────────────────────────

  if (state.step === "idle") {
    return (
      <VoiceCapture
        onTranscriptReady={(transcript) =>
          dispatch({ type: "CONFIRM_TRANSCRIPT", transcript })
        }
      />
    );
  }

  if (state.step === "recording") {
    // useSymptomSession START_RECORDING is dispatched from idle; VoiceCapture
    // manages the mic internally — this state is an in-between; render VoiceCapture.
    return (
      <VoiceCapture
        onTranscriptReady={(transcript) =>
          dispatch({ type: "CONFIRM_TRANSCRIPT", transcript })
        }
      />
    );
  }

  if (state.step === "text_input") {
    return (
      <VoiceCapture
        onTranscriptReady={(transcript) =>
          dispatch({ type: "CONFIRM_TRANSCRIPT", transcript })
        }
      />
    );
  }

  if (state.step === "confirming") {
    return (
      <TranscriptConfirm
        transcript={state.transcript}
        onConfirm={handleTranscriptConfirm}
        onRetry={() => dispatch({ type: "RETRY" })}
      />
    );
  }

  if (state.step === "no_symptom") {
    const primaryContact = contacts.find((c) => c.is_primary) ?? contacts[0];
    return (
      <div className="flex flex-col gap-5 p-4">
        <NoSymptomSpokenPrompt />
        <SectionCard>
          <p className="text-2xl font-bold text-gray-800 mb-2">
            We couldn&apos;t identify your problem
          </p>
          <p className="text-gray-600 text-lg leading-relaxed">
            What you shared did not match a known symptom. You can still call your doctor or a trusted person for help.
          </p>
        </SectionCard>

        <div className="rounded-2xl border-2 border-gray-200 bg-white p-5 text-lg text-gray-700 italic">
          &ldquo;{state.transcript}&rdquo;
        </div>

        <SectionCard>
          <p className="font-semibold text-gray-700 text-lg mb-3">
            Get help now
          </p>
          <div className="flex flex-col gap-3">
            {profile.doctor_phone ? (
              <a
                href={`tel:${profile.doctor_phone}`}
                className={cn(
                  "flex items-center gap-3 min-h-[56px] px-5 rounded-2xl",
                  "bg-yellow-500 text-white font-semibold text-lg active:bg-yellow-600"
                )}
                onClick={() => setPendingCallAction("Called doctor")}
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
                  "bg-blue-500 text-white font-semibold text-lg active:bg-blue-600"
                )}
                onClick={() => setPendingCallAction(`Called ${primaryContact.name}`)}
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

        <BigButton
          variant="secondary"
          size="lg"
          fullWidth
          disabled={isPending}
          onClick={() => handleNoSymptomDone(pendingCallAction)}
        >
          {isPending ? "Saving…" : "I understand, go home"}
        </BigButton>

        <button
          className="text-center text-blue-600 text-lg underline"
          onClick={() => dispatch({ type: "RETRY" })}
        >
          Try describing it again
        </button>
      </div>
    );
  }

  if (state.step === "questions") {
    const { symptom, questionIndex, answers } = state;
    const fu = symptom.followUps[questionIndex];

    return (
      <FollowUpQuestion
        followUp={fu}
        questionIndex={questionIndex}
        totalQuestions={symptom.followUps.length}
        symptomLabel={symptom.label}
        symptomEmoji={symptom.emoji}
        onAnswer={(value) =>
          dispatch({ type: "ANSWER_QUESTION", answerId: fu.id, value })
        }
        onBack={() => dispatch({ type: "GO_BACK" })}
      />
    );
  }

  // step === "result"
  const { symptom, answers } = state;
  const triageLevel = evaluateTriage(symptom.id, answers);

  return (
    <TriageResult
      triageLevel={triageLevel}
      symptomLabel={symptom.label}
      symptomEmoji={symptom.emoji}
      profile={profile}
      contacts={contacts}
      isPending={isPending}
      saved={saved}
      onGoBack={() => dispatch({ type: "GO_BACK" })}
      onDone={() => handleDone(pendingCallAction)}
      onCallAction={(label) => {
        setPendingCallAction(label);
      }}
    />
  );
}
