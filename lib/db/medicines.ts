import type { SupabaseClient } from "@supabase/supabase-js";
import type { Medicine } from "@/types";

export async function getActiveMedicines(supabase: SupabaseClient): Promise<Medicine[]> {
  const { data } = await supabase
    .from("medicines")
    .select("*")
    .eq("is_active", true)
    .order("created_at");
  return data ?? [];
}

export async function getAllMedicines(supabase: SupabaseClient): Promise<Medicine[]> {
  const { data } = await supabase
    .from("medicines")
    .select("*")
    .order("name");
  return data ?? [];
}
