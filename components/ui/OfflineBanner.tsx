"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const handleOffline = () => setOffline(true);
    const handleOnline = () => setOffline(false);

    // Set initial state from browser
    setOffline(!navigator.onLine);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-50 max-w-lg mx-auto w-full bg-yellow-500 text-white px-4 py-2 flex items-center gap-2 text-sm font-medium shadow-md"
    >
      <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 shrink-0" aria-hidden="true" />
      You are offline. Some features may not be available.
    </div>
  );
}
