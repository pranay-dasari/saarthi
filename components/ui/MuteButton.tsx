"use client";

import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faVolumeHigh, faVolumeXmark } from "@fortawesome/free-solid-svg-icons";

/**
 * Floating mute/unmute button for the app-wide TTS voice.
 * Fixed above the disclaimer bar so it never blocks page content.
 * Invisible when speech synthesis is not supported by the browser.
 */
export function MuteButton() {
  const { isSupported, isMuted, toggleMute } = useSpeechSynthesis();

  if (!isSupported) return null;

  return (
    <button
      onClick={toggleMute}
      aria-label={isMuted ? "Unmute voice" : "Mute voice"}
      title={isMuted ? "Tap to unmute voice" : "Tap to mute voice"}
      className="fixed bottom-[136px] right-4 z-40 w-11 h-11 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
    >
      <FontAwesomeIcon
        icon={isMuted ? faVolumeXmark : faVolumeHigh}
        className="w-5 h-5"
      />
    </button>
  );
}
