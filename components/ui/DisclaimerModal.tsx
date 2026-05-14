"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { APP_NAME } from "@/lib/config";

const STORAGE_KEY = "saarthi-disclaimer-v1";

export function DisclaimerModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage blocked (private mode, etc.) — skip modal
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4"
    >
      <div className="bg-white rounded-3xl max-w-sm w-full p-8 flex flex-col items-center gap-5 shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
          <FontAwesomeIcon
            icon={faTriangleExclamation}
            className="w-8 h-8 text-amber-600"
            aria-hidden="true"
          />
        </div>

        <h2
          id="disclaimer-title"
          className="text-2xl font-bold text-gray-900 text-center leading-tight"
        >
          Important Notice
        </h2>

        <p className="text-lg text-gray-600 text-center leading-relaxed">
          <strong>{APP_NAME}</strong> is a reminder and symptom-reporting tool. It is{" "}
          <strong>not a medical diagnostic tool</strong> and cannot replace a qualified
          doctor.
        </p>

        <p className="text-base text-gray-500 text-center">
          In an emergency, always call <strong>112</strong>.
        </p>

        <button
          onClick={dismiss}
          className="w-full min-h-[60px] rounded-2xl bg-blue-600 text-white text-xl font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
        >
          I Understand
        </button>
      </div>
    </div>
  );
}
