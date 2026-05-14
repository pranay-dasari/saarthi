import type { SupabaseClient } from "@supabase/supabase-js";
import type { SymptomSession } from "@/types";

export async function getSymptomSessions(
  supabase: SupabaseClient,
  limit = 30
): Promise<SymptomSession[]> {
  const { data } = await supabase
    .from("symptom_sessions")
    .select("*")
    .order("session_date", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getSymptomSession(
  supabase: SupabaseClient,
  id: string
): Promise<SymptomSession | null> {
  const { data } = await supabase
    .from("symptom_sessions")
    .select("*")
    .eq("id", id)
    .single();
  return data ?? null;
}
