"use client";

import { useEffect, useRef } from "react";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";

const WELCOME_TEXT =
  "Hi, welcome to Saarthi. I will guide you on how to use this app. " +
  "Please go to your profile to add your details, then add your medicines. " +
  "You can always tap the I have a problem button if you feel unwell.";

/**
 * Null-rendering component that speaks a one-time welcome message for new users.
 * Fires only when isNewUser is true and only on first mount.
 * Respects the global mute state.
 */
export function OnboardingVoice({ isNewUser }: { isNewUser: boolean }) {
  const { speak } = useSpeechSynthesis();
  const spokenRef = useRef(false);

  useEffect(() => {
    if (!isNewUser || spokenRef.current) return;
    spokenRef.current = true;
    speak(WELCOME_TEXT);
  }, [isNewUser, speak]);

  return null;
}
