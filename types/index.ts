// ─── Shared app types ─────────────────────────────────────────────────────────

export type Slot = "morning" | "afternoon" | "evening" | "night";
export type DoseStatus = "taken" | "missed" | "pending";
export type TriageLevel = "green" | "yellow" | "red";

// ─── Database row types ───────────────────────────────────────────────────────

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  age: number | null;
  gender: string | null;
  conditions: string[] | null;
  doctor_phone: string | null;
  created_at: string;
}

export interface EmergencyContact {
  id: string;
  user_id: string;
  profile_id: string;
  name: string;
  relationship: string | null;
  phone: string;
  is_primary: boolean;
  sort_order: number;
}

export interface Medicine {
  id: string;
  user_id: string;
  profile_id: string;
  name: string;
  nickname: string | null;      // pet name used in voice reminders, e.g. "red tablet"
  dosage: string | null;
  slots: Slot[];
  is_active: boolean;
  notes: string | null;
  instructions: string | null;  // e.g. "take on empty stomach"
  created_at: string;
}

export interface MedicineLog {
  id: string;
  user_id: string;
  medicine_id: string;
  profile_id: string;
  log_date: string;       // "YYYY-MM-DD"
  slot: Slot;
  status: DoseStatus;
  taken_at: string | null;
  created_at: string;
}

export interface SymptomSession {
  id: string;
  user_id: string;
  profile_id: string;
  transcript: string;
  detected_symptom: string | null;
  all_keywords: string[] | null;
  answers: Record<string, string> | null;
  triage_level: TriageLevel | null;
  triage_label: string | null;
  action_taken: string | null;
  session_date: string;
  created_at: string;
}

// ─── UI composite types ───────────────────────────────────────────────────────

/** A single dose entry as shown on the dashboard */
export interface DoseEntry {
  medicine_id: string;
  medicine_name: string;
  nickname: string | null;
  dosage: string | null;
  instructions: string | null;
  slot: Slot;
  status: DoseStatus;
  log_id: string | null;
  taken_at: string | null;
}
