import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSymptomSessions } from "@/lib/db/symptoms";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { TRIAGE_CONFIG } from "@/lib/config";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClockRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";
import type { TriageLevel } from "@/types";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sessions = await getSymptomSessions(supabase, 30);

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <PageHeader title="Symptom History" />

      <div className="flex-1 px-4 py-5 flex flex-col gap-4">
        {sessions.length === 0 ? (
          <SectionCard>
            <div className="flex flex-col items-center gap-3 py-8 text-gray-400">
              <FontAwesomeIcon icon={faClockRotateLeft} className="w-12 h-12" />
              <p className="text-xl text-center">No symptom sessions yet.</p>
              <p className="text-base text-center">
                When you report a problem, it will appear here.
              </p>
            </div>
          </SectionCard>
        ) : (
          <>
            <p className="text-gray-500 text-base px-1">
              Last {sessions.length} session{sessions.length > 1 ? "s" : ""}
            </p>
            {sessions.map((s) => {
              const level = (s.triage_level ?? "green") as TriageLevel;
              const config = TRIAGE_CONFIG[level];
              return (
                <div
                  key={s.id}
                  className={cn(
                    "rounded-2xl border-2 p-5 bg-white flex flex-col gap-2",
                    config.borderClass
                  )}
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-gray-800">
                        {s.detected_symptom ?? "General concern"}
                      </p>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {formatDate(s.session_date)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 px-3 py-1 rounded-full text-sm font-semibold mt-0.5",
                        config.badgeClass
                      )}
                    >
                      {config.label}
                    </span>
                  </div>

                  {/* Transcript lines */}
                  {s.transcript && (
                    <div className="mt-1 border-t border-gray-100 pt-3 flex flex-col gap-1">
                      {s.transcript
                        .split("\n")
                        .slice(1) // skip first line (symptom label, already shown above)
                        .map((line, i) => (
                          <p key={i} className="text-sm text-gray-500">
                            {line}
                          </p>
                        ))}
                    </div>
                  )}

                  {/* Action taken */}
                  {s.action_taken && (
                    <p className="text-sm text-gray-400 italic mt-1">
                      Action: {s.action_taken}
                    </p>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
