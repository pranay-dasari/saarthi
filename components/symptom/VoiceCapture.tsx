"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMicrophone,
  faStop,
  faVolumeHigh,
  faVolumeXmark,
} from "@fortawesome/free-solid-svg-icons";
import { BigButton } from "@/components/ui/BigButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { MicStatusCard } from "./MicStatusCard";
import { cn } from "@/lib/utils";

interface VoiceCaptureProps {
  onTranscriptReady: (transcript: string) => void;
}

export function VoiceCapture({ onTranscriptReady }: VoiceCaptureProps) {
  const {
    isSupported,
    isListening,
    interimTranscript,
    finalTranscript,
    error,
    permissionState,
    errorCode,
    start,
    stop,
    reset,
  } = useSpeechRecognition();

  const { speak, cancel, isMuted, toggleMute } = useSpeechSynthesis();

  const [textInput, setTextInput] = useState("");
  const [showFallback, setShowFallback] = useState(false);

  // Speak initial prompt once on mount — safe ref prevents re-speaking on re-renders
  const spokenRef = useRef(false);
  useEffect(() => {
    if (spokenRef.current) return;
    spokenRef.current = true;
    if (!isSupported) {
      speak("Voice input is not available. Please type your problem.");
    } else {
      speak("Please tell me what problem you are facing.");
    }
  }, [isSupported, speak]);

  // Auto-show fallback for unsupported browsers
  useEffect(() => {
    if (!isSupported) setShowFallback(true);
  }, [isSupported]);

  function handleConfirmVoice() {
    const full = finalTranscript.trim();
    if (!full) return;
    stop();
    onTranscriptReady(full);
  }

  function handleConfirmText() {
    const full = textInput.trim();
    if (!full) return;
    onTranscriptReady(full);
  }

  // Cancel TTS before starting STT — prevents conflict on Android Chrome
  function handleStartMic() {
    cancel();
    start();
  }

  // ── Text fallback ────────────────────────────────────────────────────────────
  if (showFallback) {
    return (
      <div className="flex flex-col gap-5 p-4">
        {!isSupported && (
          <div className="rounded-xl bg-amber-50 border-2 border-amber-300 px-5 py-4">
            <p className="text-amber-900 text-lg font-semibold leading-snug">
              Voice input is not available on this device.
            </p>
            <p className="text-amber-800 text-base mt-1">
              Please type what you are feeling below.
            </p>
          </div>
        )}

        <SectionCard>
          <label htmlFor="symptom-text" className="block text-xl font-semibold text-gray-800 mb-3">
            Describe how you feel
          </label>
          <textarea
            id="symptom-text"
            rows={5}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="e.g. I have a headache and feel dizzy…"
            className={cn(
              "w-full p-4 text-lg border-2 border-gray-200 rounded-xl resize-none",
              "focus:outline-none focus:border-blue-400",
              "placeholder:text-gray-400"
            )}
          />
        </SectionCard>

        <BigButton
          variant="primary"
          size="xl"
          fullWidth
          disabled={!textInput.trim()}
          onClick={handleConfirmText}
        >
          Continue
        </BigButton>

        {isSupported && (
          <BigButton
            variant="ghost"
            size="md"
            fullWidth
            onClick={() => { setShowFallback(false); reset(); }}
          >
            <FontAwesomeIcon icon={faMicrophone} className="w-5 h-5" />
            Use microphone instead
          </BigButton>
        )}
      </div>
    );
  }

  // ── Voice capture ─────────────────────────────────────────────────────────────
  const displayText = finalTranscript || interimTranscript;
  const hasTranscript = !!finalTranscript.trim();

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Instruction card + mute toggle */}
      <SectionCard>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-xl font-semibold text-gray-800 mb-1">
              Tell us how you feel
            </p>
            <p className="text-gray-500 text-base">
              Tap the microphone and speak. Recording stops automatically after 60 seconds.
            </p>
          </div>
          {/* Mute toggle — only shown when TTS is supported */}
          <button
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute voice prompts" : "Mute voice prompts"}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 rounded-xl shrink-0",
              "text-xs font-semibold transition-colors",
              isMuted
                ? "bg-gray-100 text-gray-400 hover:bg-gray-200"
                : "bg-blue-50 text-blue-600 hover:bg-blue-100"
            )}
          >
            <FontAwesomeIcon
              icon={isMuted ? faVolumeXmark : faVolumeHigh}
              className="w-5 h-5"
            />
            {isMuted ? "Unmute" : "Mute"}
          </button>
        </div>
      </SectionCard>

      {/* Mic status block — support, permission, current state */}
      <MicStatusCard
        isSupported={isSupported}
        permissionState={permissionState}
        isListening={isListening}
        errorCode={errorCode}
        hasTranscript={hasTranscript}
        onRetry={reset}
        onTypeInstead={() => setShowFallback(true)}
      />

      {/* Error warning card */}
      {error && (
        <div className="rounded-xl bg-red-50 border-2 border-red-300 px-5 py-4">
          <p className="text-red-800 text-lg font-semibold">
            Could not capture audio.
          </p>
          <p className="text-red-700 text-base mt-1">
            Please check that the microphone is allowed in your browser, then tap the button below to try again.
          </p>
        </div>
      )}

      {/* Transcript display */}
      <div
        className={cn(
          "min-h-[120px] rounded-2xl border-2 p-5 transition-colors",
          isListening ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"
        )}
        aria-live="polite"
      >
        {displayText ? (
          <p className="text-xl text-gray-800 leading-relaxed">{displayText}</p>
        ) : (
          <p className="text-gray-400 text-lg">Your words will appear here…</p>
        )}
      </div>

      {/* Mic / Stop button with visible label */}
      <div className="flex flex-col items-center gap-3 py-2">
        {!isListening ? (
          <>
            <button
              onClick={handleStartMic}
              aria-label="Start recording"
              className={cn(
                "w-32 h-32 rounded-full flex items-center justify-center",
                "bg-blue-600 text-white shadow-xl",
                "active:scale-95 transition-transform",
                "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
              )}
            >
              <FontAwesomeIcon icon={faMicrophone} className="w-16 h-16" />
            </button>
            <p className="text-xl font-bold text-blue-700 tracking-wide">
              Tap to Speak
            </p>
          </>
        ) : (
          <>
            <button
              onClick={stop}
              aria-label="Stop recording"
              className={cn(
                "w-32 h-32 rounded-full flex items-center justify-center",
                "bg-red-600 text-white shadow-xl animate-pulse",
                "active:scale-95 transition-transform",
                "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-300"
              )}
            >
              <FontAwesomeIcon icon={faStop} className="w-14 h-14" />
            </button>
            <p className="text-xl font-bold text-red-600 tracking-wide animate-pulse">
              Listening… Tap to Stop
            </p>
          </>
        )}
      </div>

      {/* Confirm / Reset — shown after transcript captured */}
      {hasTranscript && !isListening && (
        <div className="flex flex-col gap-3">
          <BigButton variant="primary" size="xl" fullWidth onClick={handleConfirmVoice}>
            Continue with this
          </BigButton>
          <BigButton
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => { reset(); }}
          >
            Try again
          </BigButton>
        </div>
      )}

    </div>
  );
}
