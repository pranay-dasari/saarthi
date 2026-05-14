import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";

export function Disclaimer() {
  return (
    <footer className="bg-amber-50 border-t border-amber-200 px-4 py-3">
      <div className="flex items-start gap-2 max-w-lg mx-auto">
        <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800 leading-snug">
          <strong>Saarthi</strong> is not a medical diagnostic tool. Always
          consult a qualified doctor. In an emergency, call{" "}
          <strong>112</strong>.
        </p>
      </div>
    </footer>
  );
}
