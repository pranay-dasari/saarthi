import type { SupabaseClient } from "@supabase/supabase-js";
import type { MedicineLog } from "@/types";

export async function getLogsForDate(
  supabase: SupabaseClient,
  date: string
): Promise<MedicineLog[]> {
  const { data } = await supabase
    .from("medicine_logs")
    .select("*")
    .eq("log_date", date);
  return data ?? [];
}

export async function getLogsForRange(
  supabase: SupabaseClient,
  from: string,
  to: string
): Promise<MedicineLog[]> {
  const { data } = await supabase
    .from("medicine_logs")
    .select("*")
    .gte("log_date", from)
    .lte("log_date", to)
    .order("log_date", { ascending: false });
  return data ?? [];
}
