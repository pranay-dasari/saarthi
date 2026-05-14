"use client";

import { useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { BigButton } from "@/components/ui/BigButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";

interface TranscriptConfirmProps {
  transcript: string;
  onConfirm: () => void;
  onRetry: () => void;
}

export function TranscriptConfirm({ transcript, onConfirm, onRetry }: TranscriptConfirmProps) {
  const isEmpty = !transcript.trim();
  const { speak } = useSpeechSynthesis();

  // Speak the transcript back once on mount so the user can hear what was captured
  const spokenRef = useRef(false);
  useEffect(() => {
    if (spokenRef.current) return;
    spokenRef.current = true;
    if (isEmpty) {
      speak("Nothing was captured. Please try again.");
    } else {
      speak(`I heard: ${transcript}. Is that correct?`);
    }
  }, [isEmpty, transcript, speak]);

  return (
    <div className="flex flex-col gap-5 p-4">
      <SectionCard>
        <p className="text-xl font-semibold text-gray-800 mb-1">
          Is this what you said?
        </p>
        <p className="text-gray-500 text-base">
          Check that your words are correct before we continue.
        </p>
      </SectionCard>

      {/* Transcript */}
      <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-5 min-h-[100px]">
        {isEmpty ? (
          <p className="text-gray-400 text-lg italic">
            Nothing was captured. Please try again.
          </p>
        ) : (
          <p className="text-2xl text-gray-800 leading-relaxed">{transcript}</p>
        )}
      </div>

      {isEmpty && (
        <div className="rounded-xl bg-yellow-50 border border-yellow-300 p-4">
          <p className="text-yellow-800 text-base font-medium">
            We could not hear anything. Please tap &ldquo;Try again&rdquo; and speak clearly near the microphone.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <BigButton
          variant="primary"
          size="xl"
          fullWidth
          disabled={isEmpty}
          onClick={onConfirm}
        >
          <FontAwesomeIcon icon={faCircleCheck} className="w-6 h-6" />
          Looks right
        </BigButton>

        <BigButton
          variant="secondary"
          size="xl"
          fullWidth
          onClick={onRetry}
        >
          <FontAwesomeIcon icon={faRotateLeft} className="w-6 h-6" />
          Try again
        </BigButton>
      </div>
    </div>
  );
}
