"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faCircleXmark,
  faCircle,
  faMicrophone,
  faRotateLeft,
  faKeyboard,
} from "@fortawesome/free-solid-svg-icons";
import { BigButton } from "@/components/ui/BigButton";
import type { PermissionState } from "@/hooks/useSpeechRecognition";

interface MicStatusCardProps {
  isSupported: boolean;
  permissionState: PermissionState;
  isListening: boolean;
  errorCode: string | null;
  hasTranscript: boolean;
  onRetry: () => void;
  onTypeInstead: () => void;
}

// ── Human-readable labels ────────────────────────────────────────────────────

const PERMISSION_LABEL: Record<PermissionState, string> = {
  checking:    "Checking…",
  granted:     "Allowed",
  denied:      "Blocked — please allow in browser settings",
  prompt:      "Will ask when you tap the microphone",
  unsupported: "Not available",
};

const PERMISSION_COLOR: Record<PermissionState, string> = {
  checking:    "text-gray-400",
  granted:     "text-green-700",
  denied:      "text-red-700",
  prompt:      "text-yellow-700",
  unsupported: "text-gray-500",
};

function errorSummary(code: string | null): string {
  switch (code) {
    case "not-allowed":     return "Microphone access was blocked.";
    case "no-speech":       return "No speech was detected. Please speak louder or closer.";
    case "audio-capture":   return "No microphone found on this device.";
    case "network":         return "A network error stopped the microphone.";
    case "aborted":         return "Recording was cancelled.";
    default:                return "An error occurred with the microphone.";
  }
}

function currentStatus(
  isListening: boolean,
  errorCode: string | null,
  hasTranscript: boolean
): string {
  if (isListening)    return "Listening…";
  if (errorCode)      return errorSummary(errorCode);
  if (hasTranscript)  return "Recording stopped · Words captured below";
  return "Ready · Tap the microphone to start";
}

// ── Row component ─────────────────────────────────────────────────────────────

function StatusRow({
  label,
  value,
  valueClass,
  ok,
}: {
  label: string;
  value: string;
  valueClass?: string;
  ok?: boolean | null;
}) {
  const icon =
    ok === true  ? faCircleCheck :
    ok === false ? faCircleXmark :
                   faCircle;
  const iconColor =
    ok === true  ? "text-green-500" :
    ok === false ? "text-red-500"   :
                   "text-gray-300";

  return (
    <div className="flex items-start gap-3 py-1">
      <FontAwesomeIcon icon={icon} className={`w-5 h-5 mt-0.5 shrink-0 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide mr-2">
          {label}
        </span>
        <span className={`text-base font-medium ${valueClass ?? "text-gray-800"}`}>
          {value}
        </span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function MicStatusCard({
  isSupported,
  permissionState,
  isListening,
  errorCode,
  hasTranscript,
  onRetry,
  onTypeInstead,
}: MicStatusCardProps) {
  const showRetry    = !!errorCode && !isListening;
  const statusText   = currentStatus(isListening, errorCode, hasTranscript);
  const permOk       = permissionState === "granted" ? true
                     : permissionState === "denied"  ? false
                     : null;

  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-white px-5 py-4 flex flex-col gap-3">
      <p className="text-base font-bold text-gray-700 flex items-center gap-2">
        <FontAwesomeIcon icon={faMicrophone} className="w-4 h-4 text-blue-600" />
        Microphone Status
      </p>

      <div className="flex flex-col divide-y divide-gray-100">
        <StatusRow
          label="Browser support"
          value={isSupported ? "Supported" : "Not supported on this device"}
          ok={isSupported}
        />
        {isSupported && (
          <StatusRow
            label="Permission"
            value={PERMISSION_LABEL[permissionState]}
            valueClass={PERMISSION_COLOR[permissionState]}
            ok={permOk}
          />
        )}
        <StatusRow
          label="Status"
          value={statusText}
          valueClass={errorCode ? "text-red-700" : isListening ? "text-red-600" : "text-gray-700"}
          ok={errorCode ? false : isListening ? null : null}
        />
      </div>

      {/* Action buttons — only shown when useful */}
      {(showRetry || true) && (
        <div className="flex gap-3 pt-1">
          {showRetry && (
            <BigButton
              variant="danger"
              size="md"
              fullWidth
              onClick={onRetry}
            >
              <FontAwesomeIcon icon={faRotateLeft} className="w-4 h-4" />
              Retry
            </BigButton>
          )}
          <BigButton
            variant="ghost"
            size="md"
            fullWidth
            onClick={onTypeInstead}
          >
            <FontAwesomeIcon icon={faKeyboard} className="w-4 h-4" />
            Type Instead
          </BigButton>
        </div>
      )}
    </div>
  );
}
