"use client";

import { useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { BigButton } from "@/components/ui/BigButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import type { FollowUp } from "@/lib/symptom/triage";
import { cn } from "@/lib/utils";

interface FollowUpQuestionProps {
  followUp: FollowUp;
  questionIndex: number;
  totalQuestions: number;
  symptomLabel: string;
  symptomEmoji: string;
  onAnswer: (value: "yes" | "no" | "sometimes") => void;
  onBack: () => void;
}

export function FollowUpQuestion({
  followUp,
  questionIndex,
  totalQuestions,
  symptomLabel,
  symptomEmoji,
  onAnswer,
  onBack,
}: FollowUpQuestionProps) {
  const { speak } = useSpeechSynthesis();

  // Speak each question once when it becomes active.
  // This component re-renders (not remounts) between questions, so we track
  // the last-spoken question id with a ref to avoid re-speaking on unrelated
  // re-renders (e.g. mute toggle changes the `speak` reference).
  const lastSpokenIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (lastSpokenIdRef.current === followUp.id) return;
    lastSpokenIdRef.current = followUp.id;
    speak(`${followUp.question}. Please choose yes, no, or sometimes.`);
  }, [followUp.id, followUp.question, speak]);

  return (
    <div className="flex flex-col gap-6 p-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-500 text-lg self-start"
        aria-label="Go back"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="w-5 h-5" />
        Back
      </button>

      {/* Progress dots */}
      <div className="flex gap-2 justify-center" aria-label={`Question ${questionIndex + 1} of ${totalQuestions}`}>
        {Array.from({ length: totalQuestions }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-3 h-3 rounded-full transition-colors",
              i < questionIndex
                ? "bg-blue-500"
                : i === questionIndex
                ? "bg-blue-700"
                : "bg-gray-200"
            )}
          />
        ))}
      </div>

      <SectionCard>
        <p className="text-sm text-gray-500 mb-2">
          {symptomEmoji} {symptomLabel} · Question {questionIndex + 1} of {totalQuestions}
        </p>
        <p className="text-2xl font-semibold text-gray-800 leading-snug">
          {followUp.question}
        </p>
      </SectionCard>

      <div className="flex flex-col gap-4 mt-2">
        <BigButton
          variant="danger"
          size="xl"
          fullWidth
          onClick={() => onAnswer("yes")}
        >
          Yes
        </BigButton>

        <BigButton
          variant="secondary"
          size="xl"
          fullWidth
          onClick={() => onAnswer("sometimes")}
        >
          Sometimes
        </BigButton>

        <BigButton
          variant="ghost"
          size="xl"
          fullWidth
          onClick={() => onAnswer("no")}
        >
          No
        </BigButton>
      </div>
    </div>
  );
}
