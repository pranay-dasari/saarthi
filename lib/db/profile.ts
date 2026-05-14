import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, EmergencyContact } from "@/types";

export async function getProfile(supabase: SupabaseClient): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .single();
  return data ?? null;
}

export async function getContacts(supabase: SupabaseClient): Promise<EmergencyContact[]> {
  const { data } = await supabase
    .from("emergency_contacts")
    .select("*")
    .order("sort_order");
  return data ?? [];
}

export async function createProfile(
  supabase: SupabaseClient,
  userId: string,
  name: string
): Promise<void> {
  await supabase.from("profiles").insert({
    user_id: userId,
    name,
    age: null,
    gender: null,
    conditions: [],
    doctor_phone: null,
  });
}

export async function updateProfile(
  supabase: SupabaseClient,
  profileId: string,
  updates: Partial<Pick<Profile, "name" | "age" | "gender" | "conditions" | "doctor_phone">>
): Promise<void> {
  await supabase.from("profiles").update(updates).eq("id", profileId);
}
