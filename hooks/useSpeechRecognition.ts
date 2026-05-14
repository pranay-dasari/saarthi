"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type PermissionState = "checking" | "granted" | "denied" | "prompt" | "unsupported";

export interface SpeechRecognitionState {
  isSupported: boolean;
  isListening: boolean;
  interimTranscript: string;
  finalTranscript: string;
  error: string | null;
  // ── V3 status fields (read-only, additive) ───────────────────────────────
  permissionState: PermissionState;
  errorCode: string | null;          // raw SpeechRecognitionError.error string
  // ─────────────────────────────────────────────────────────────────────────
  start: () => void;
  stop: () => void;
  reset: () => void;
}

// 60-second auto-stop per spec
const AUTO_STOP_MS = 60_000;

export function useSpeechRecognition(): SpeechRecognitionState {
  // Start false on both server and client; set to real value after hydration.
  const [isSupported, setIsSupported] = useState(false);
  useEffect(() => {
    setIsSupported(
      "SpeechRecognition" in window || "webkitSpeechRecognition" in window
    );
  }, []);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState>("checking");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Query microphone permission (additive; does not affect recognition) ──
  useEffect(() => {
    if (!isSupported) {
      setPermissionState("unsupported");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.permissions) {
      // Permissions API not available (e.g. Firefox < 96)
      setPermissionState("prompt");
      return;
    }
    let status: PermissionStatus | null = null;
    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((result) => {
        status = result;
        setPermissionState(result.state as PermissionState);
        result.onchange = () => {
          setPermissionState(result.state as PermissionState);
        };
      })
      .catch(() => {
        setPermissionState("prompt");
      });
    return () => {
      if (status) status.onchange = null;
    };
  }, [isSupported]);

  const stop = useCallback(() => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const start = useCallback(() => {
    if (!isSupported) return;
    setError(null);
    setErrorCode(null);
    setInterimTranscript("");

    const SR =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += text + " ";
        } else {
          interim += text;
        }
      }
      if (final) setFinalTranscript((prev) => (prev + final).trim());
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "aborted") {
        setError("Could not capture audio. Please try again.");
        setErrorCode(event.error);                    // V3: save raw code
        // Reflect permission change if browser signals it here
        if (event.error === "not-allowed") {
          setPermissionState("denied");
        }
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);

    // Auto-stop at 60s
    autoStopTimerRef.current = setTimeout(stop, AUTO_STOP_MS);
  }, [isSupported, stop]);

  const reset = useCallback(() => {
    stop();
    setFinalTranscript("");
    setInterimTranscript("");
    setError(null);
    setErrorCode(null);
  }, [stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
      recognitionRef.current?.abort();
    };
  }, []);

  return {
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
  };
}
