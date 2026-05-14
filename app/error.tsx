"use client";

import { useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleExclamation, faRotateRight } from "@fortawesome/free-solid-svg-icons";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 gap-6 text-center">
      <FontAwesomeIcon
        icon={faCircleExclamation}
        className="w-16 h-16 text-red-400"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-gray-900">Something went wrong</h2>
        <p className="text-lg text-gray-500">Please try again. If the problem continues, restart the app.</p>
      </div>
      <button
        onClick={reset}
        className="inline-flex items-center justify-center gap-3 min-h-[56px] px-8 rounded-2xl bg-blue-600 text-white text-lg font-semibold border-2 border-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
      >
        <FontAwesomeIcon icon={faRotateRight} className="w-5 h-5" aria-hidden="true" />
        Try again
      </button>
    </div>
  );
}
