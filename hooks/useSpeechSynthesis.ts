"use client";

import { useState, useCallback, useEffect, useRef } from "react";

const MUTE_KEY = "saarthi_tts_muted";

function readMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(MUTE_KEY) === "true";
  } catch {
    return false;
  }
}

export interface SpeechSynthesisHook {
  isSupported: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  speak: (text: string) => void;
  cancel: () => void;
  toggleMute: () => void;
}

export function useSpeechSynthesis(): SpeechSynthesisHook {
  // Start false on both server and client; set to real values after hydration.
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    setIsSupported("speechSynthesis" in window);
    setIsMuted(readMuted());
    // Sync mute state when any component in the same tab calls toggleMute.
    const handler = () => setIsMuted(readMuted());
    window.addEventListener("saarthi:mute-change", handler);
    return () => window.removeEventListener("saarthi:mute-change", handler);
  }, []);

  const cancel = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported || isMuted || !text.trim()) return;
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = "en-IN";
      utt.rate = 0.88;   // slightly slower — easier for elders
      utt.pitch = 1;
      utt.volume = 1;
      utt.onstart = () => setIsSpeaking(true);
      utt.onend = () => setIsSpeaking(false);
      utt.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utt);
    },
    [isSupported, isMuted]
  );

  const toggleMute = useCallback(() => {
    const next = !readMuted();
    try { localStorage.setItem(MUTE_KEY, String(next)); } catch { /* no-op */ }
    if (next && isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setIsMuted(next);
    // Notify all other hook instances in this tab (must be outside the updater
    // so the synchronous dispatchEvent doesn't trigger setState during render).
    window.dispatchEvent(new CustomEvent("saarthi:mute-change"));
  }, [isSupported]);

  // Cancel speech on unmount so it doesn't bleed between steps
  useEffect(() => {
    return () => {
      if (isSupported) window.speechSynthesis.cancel();
    };
  }, [isSupported]);

  return { isSupported, isSpeaking, isMuted, speak, cancel, toggleMute };
}
