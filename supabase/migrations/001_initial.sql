-- ─────────────────────────────────────────────────────────────────────────────
-- Saarthi — Initial Migration
-- Run this in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. profiles ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  age          integer,
  gender       text,
  conditions   text[],
  doctor_phone text,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (user_id = auth.uid());

-- ── 2. emergency_contacts ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name         text NOT NULL,
  relationship text,
  phone        text NOT NULL,
  is_primary   boolean DEFAULT false,
  sort_order   integer DEFAULT 0
);

ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_select_own" ON emergency_contacts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "contacts_insert_own" ON emergency_contacts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "contacts_update_own" ON emergency_contacts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "contacts_delete_own" ON emergency_contacts
  FOR DELETE USING (user_id = auth.uid());

-- ── 3. medicines ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medicines (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name       text NOT NULL,
  dosage     text,
  slots      text[] NOT NULL DEFAULT '{}',
  is_active  boolean DEFAULT true,
  notes      text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medicines_select_own" ON medicines
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "medicines_insert_own" ON medicines
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "medicines_update_own" ON medicines
  FOR UPDATE USING (user_id = auth.uid());

-- ── 4. medicine_logs ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medicine_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medicine_id uuid NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  log_date    date NOT NULL,
  slot        text NOT NULL,
  status      text NOT NULL CHECK (status IN ('taken', 'missed', 'pending')),
  taken_at    timestamptz,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(medicine_id, log_date, slot)
);

ALTER TABLE medicine_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "logs_select_own" ON medicine_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "logs_insert_own" ON medicine_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "logs_update_own" ON medicine_logs
  FOR UPDATE USING (user_id = auth.uid());

-- ── 5. symptom_sessions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS symptom_sessions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transcript       text NOT NULL,
  detected_symptom text,
  all_keywords     text[],
  answers          jsonb,
  triage_level     text CHECK (triage_level IN ('green', 'yellow', 'red')),
  triage_label     text,
  action_taken     text,
  session_date     timestamptz DEFAULT now(),
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE symptom_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_select_own" ON symptom_sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "sessions_insert_own" ON symptom_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "sessions_update_own" ON symptom_sessions
  FOR UPDATE USING (user_id = auth.uid());
