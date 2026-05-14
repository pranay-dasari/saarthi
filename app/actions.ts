"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DoseStatus, Slot, TriageLevel } from "@/types";

export async function markDose(
  medicineId: string,
  profileId: string,
  slot: Slot,
  status: DoseStatus
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const today = new Date().toISOString().split("T")[0];

  const { error } = await supabase.from("medicine_logs").upsert(
    {
      user_id: user.id,
      medicine_id: medicineId,
      profile_id: profileId,
      log_date: today,
      slot,
      status,
      taken_at: status === "taken" ? new Date().toISOString() : null,
    },
    { onConflict: "medicine_id,log_date,slot" }
  );

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/medicines");
}

export async function saveProfile(
  profileId: string,
  updates: {
    name: string;
    age: number | null;
    gender: string | null;
    conditions: string[];
    doctor_phone: string | null;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", profileId);

  if (error) throw new Error(error.message);

  revalidatePath("/profile");
  revalidatePath("/");
}

/**
 * Creates the profile if it doesn't exist, or updates it if it does.
 * Used by onboarding where the profile row may be missing (e.g. registration
 * failed silently when email confirmation was enabled at signup time).
 * Returns the profile id.
 */
export async function upsertProfile(updates: {
  name: string;
  age: number;
  gender: string | null;
  conditions: string[];
  doctor_phone: string | null;
}): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      { user_id: user.id, ...updates },
      { onConflict: "user_id" }
    )
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/profile");

  return data.id as string;
}

export async function addMedicine(
  profileId: string,
  medicine: {
    name: string;
    nickname: string | null;
    dosage: string | null;
    slots: string[];
    notes: string | null;
    instructions: string | null;
  }
): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("medicines")
    .insert({
      user_id: user.id,
      profile_id: profileId,
      name: medicine.name.trim(),
      nickname: medicine.nickname?.trim() || null,
      dosage: medicine.dosage?.trim() || null,
      slots: medicine.slots,
      is_active: true,
      notes: medicine.notes?.trim() || null,
      instructions: medicine.instructions?.trim() || null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/medicines");

  return data.id as string;
}

export async function updateMedicine(
  medicineId: string,
  updates: {
    name: string;
    nickname: string | null;
    dosage: string | null;
    slots: string[];
    instructions: string | null;
    is_active: boolean;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("medicines")
    .update({
      name: updates.name.trim(),
      nickname: updates.nickname?.trim() || null,
      dosage: updates.dosage?.trim() || null,
      slots: updates.slots,
      instructions: updates.instructions?.trim() || null,
      is_active: updates.is_active,
    })
    .eq("id", medicineId);

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/medicines");
  revalidatePath("/profile");
}

export async function deactivateMedicine(medicineId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("medicines")
    .update({ is_active: false })
    .eq("id", medicineId);

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/medicines");
  revalidatePath("/profile");
}

export async function saveSymptomSession(payload: {
  profileId: string;
  transcript: string;
  detectedSymptom: string;
  allKeywords: string[];
  answers: Record<string, unknown>;
  triageLevel: TriageLevel;
  triageLabel: string;
  actionTaken: string | null;
}): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("symptom_sessions")
    .insert({
      user_id: user.id,
      profile_id: payload.profileId,
      transcript: payload.transcript,
      detected_symptom: payload.detectedSymptom,
      all_keywords: payload.allKeywords,
      answers: payload.answers,
      triage_level: payload.triageLevel,
      triage_label: payload.triageLabel,
      action_taken: payload.actionTaken,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/history");

  return data.id as string;
}
