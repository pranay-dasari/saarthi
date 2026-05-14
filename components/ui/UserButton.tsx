"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faRightFromBracket, faPen } from "@fortawesome/free-solid-svg-icons";

interface UserButtonProps {
  name: string;
  email: string;
  age: number | null;
  gender: string | null;
  conditions: string[] | null;
  medicineNames: string[];
}

export function UserButton({
  name,
  email,
  age,
  gender,
  conditions,
  medicineNames,
}: UserButtonProps) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Derive initials: prefer name words, fall back to email prefix, then "?"
  const initials = (() => {
    const fromName = name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
    if (fromName) return fromName;
    const fromEmail = email.split("@")[0].replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase();
    return fromEmail || "?";
  })();

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open my profile"
        className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-base hover:bg-white/30 active:bg-white/40 transition-colors"
      >
        {initials}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          {/* Bottom sheet */}
          <div className="relative bg-white rounded-t-3xl px-6 pt-6 pb-8 max-w-lg mx-auto w-full shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900">My details</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <FontAwesomeIcon icon={faXmark} className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Avatar + name */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <span className="text-2xl font-bold text-blue-600">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xl font-bold text-gray-900 truncate">
                  {name || "Your profile"}
                </p>
                <p className="text-sm text-gray-400 truncate">{email}</p>
              </div>
            </div>

            {/* Profile details */}
            <div className="flex flex-col gap-3 mb-5">
              <DetailRow label="Age" value={age ? `${age} years` : "Not added yet"} />
              <DetailRow label="Gender" value={gender || "Not added yet"} />
              <DetailRow
                label="Conditions"
                value={conditions?.length ? conditions.join(", ") : "Not added yet"}
              />
              <DetailRow
                label="Medicines"
                value={
                  medicineNames.length
                    ? medicineNames.join(", ")
                    : "No medicines added yet"
                }
              />
            </div>

            {/* Edit profile */}
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="w-full flex items-center justify-center gap-3 min-h-[52px] rounded-2xl bg-blue-50 text-blue-700 font-semibold text-base border-2 border-blue-100 hover:bg-blue-100 active:bg-blue-200 transition-colors mb-3"
            >
              <FontAwesomeIcon icon={faPen} className="w-4 h-4" />
              Edit profile
            </Link>

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full flex items-center justify-center gap-3 min-h-[52px] rounded-2xl bg-red-50 text-red-700 font-semibold text-base border-2 border-red-100 hover:bg-red-100 active:bg-red-200 transition-colors disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faRightFromBracket} className="w-5 h-5" />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-base text-gray-800">{value}</p>
    </div>
  );
}
