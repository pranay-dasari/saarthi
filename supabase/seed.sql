-- ─────────────────────────────────────────────────────────────────────────────
-- Saarthi — Seed Data
-- Admin user UUID: db2a5edb-b3c2-4c9c-9941-1d92f568a3ea
--
-- BEFORE RUNNING:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add User" → email: admin@app.local, password: admin
--    (The UUID will be db2a5edb-b3c2-4c9c-9941-1d92f568a3ea as provided)
-- 3. Then run this SQL in the SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_user_id   uuid := 'db2a5edb-b3c2-4c9c-9941-1d92f568a3ea';
  v_profile_id uuid;
  v_med1_id   uuid;
  v_med2_id   uuid;
  v_med3_id   uuid;
  v_med4_id   uuid;
  v_today     date := CURRENT_DATE;
BEGIN

-- ── Profile ──────────────────────────────────────────────────────────────────
INSERT INTO profiles (user_id, name, age, gender, conditions, doctor_phone)
VALUES (
  v_user_id,
  'Ramesh Kumar',
  72,
  'Male',
  ARRAY['Type 2 Diabetes', 'Hypertension', 'Mild Arthritis'],
  '+91-98765-43210'
)
ON CONFLICT (user_id) DO NOTHING
RETURNING id INTO v_profile_id;

-- If already exists, fetch it
IF v_profile_id IS NULL THEN
  SELECT id INTO v_profile_id FROM profiles WHERE user_id = v_user_id;
END IF;

-- ── Emergency Contacts ────────────────────────────────────────────────────────
INSERT INTO emergency_contacts (user_id, profile_id, name, relationship, phone, is_primary, sort_order)
VALUES
  (v_user_id, v_profile_id, 'Priya Kumar',  'Daughter', '+91-98765-11111', true,  1),
  (v_user_id, v_profile_id, 'Suresh Kumar', 'Son',      '+91-98765-22222', false, 2),
  (v_user_id, v_profile_id, 'Dr. Mehta',    'Doctor',   '+91-98765-43210', false, 3)
ON CONFLICT DO NOTHING;

-- ── Medicines ─────────────────────────────────────────────────────────────────
INSERT INTO medicines (id, user_id, profile_id, name, dosage, slots, is_active, notes)
VALUES
  (gen_random_uuid(), v_user_id, v_profile_id, 'Metformin',    '500mg',  ARRAY['morning', 'evening'], true, 'Take with food'),
  (gen_random_uuid(), v_user_id, v_profile_id, 'Amlodipine',   '5mg',    ARRAY['morning'],            true, 'Blood pressure tablet'),
  (gen_random_uuid(), v_user_id, v_profile_id, 'Aspirin',      '75mg',   ARRAY['night'],              true, 'Take after dinner'),
  (gen_random_uuid(), v_user_id, v_profile_id, 'Pantoprazole', '40mg',   ARRAY['morning'],            true, 'Take 30 min before breakfast')
RETURNING id INTO v_med1_id;

-- Fetch medicine IDs for log seeding
SELECT id INTO v_med1_id FROM medicines WHERE user_id = v_user_id AND name = 'Metformin'    LIMIT 1;
SELECT id INTO v_med2_id FROM medicines WHERE user_id = v_user_id AND name = 'Amlodipine'   LIMIT 1;
SELECT id INTO v_med3_id FROM medicines WHERE user_id = v_user_id AND name = 'Aspirin'      LIMIT 1;
SELECT id INTO v_med4_id FROM medicines WHERE user_id = v_user_id AND name = 'Pantoprazole' LIMIT 1;

-- ── Medicine Logs — past 3 days ───────────────────────────────────────────────
-- Day -3
INSERT INTO medicine_logs (user_id, medicine_id, profile_id, log_date, slot, status, taken_at)
VALUES
  (v_user_id, v_med1_id, v_profile_id, v_today - 3, 'morning', 'taken',  now() - interval '3 days 8 hours'),
  (v_user_id, v_med1_id, v_profile_id, v_today - 3, 'evening', 'taken',  now() - interval '3 days 2 hours'),
  (v_user_id, v_med2_id, v_profile_id, v_today - 3, 'morning', 'taken',  now() - interval '3 days 8 hours'),
  (v_user_id, v_med3_id, v_profile_id, v_today - 3, 'night',   'missed', null),
  (v_user_id, v_med4_id, v_profile_id, v_today - 3, 'morning', 'taken',  now() - interval '3 days 8 hours')
ON CONFLICT (medicine_id, log_date, slot) DO NOTHING;

-- Day -2
INSERT INTO medicine_logs (user_id, medicine_id, profile_id, log_date, slot, status, taken_at)
VALUES
  (v_user_id, v_med1_id, v_profile_id, v_today - 2, 'morning', 'taken',  now() - interval '2 days 8 hours'),
  (v_user_id, v_med1_id, v_profile_id, v_today - 2, 'evening', 'missed', null),
  (v_user_id, v_med2_id, v_profile_id, v_today - 2, 'morning', 'taken',  now() - interval '2 days 8 hours'),
  (v_user_id, v_med3_id, v_profile_id, v_today - 2, 'night',   'taken',  now() - interval '2 days 1 hour'),
  (v_user_id, v_med4_id, v_profile_id, v_today - 2, 'morning', 'taken',  now() - interval '2 days 8 hours')
ON CONFLICT (medicine_id, log_date, slot) DO NOTHING;

-- Day -1
INSERT INTO medicine_logs (user_id, medicine_id, profile_id, log_date, slot, status, taken_at)
VALUES
  (v_user_id, v_med1_id, v_profile_id, v_today - 1, 'morning', 'taken',  now() - interval '1 day 8 hours'),
  (v_user_id, v_med1_id, v_profile_id, v_today - 1, 'evening', 'taken',  now() - interval '1 day 2 hours'),
  (v_user_id, v_med2_id, v_profile_id, v_today - 1, 'morning', 'missed', null),
  (v_user_id, v_med3_id, v_profile_id, v_today - 1, 'night',   'taken',  now() - interval '1 day 1 hour'),
  (v_user_id, v_med4_id, v_profile_id, v_today - 1, 'morning', 'taken',  now() - interval '1 day 8 hours')
ON CONFLICT (medicine_id, log_date, slot) DO NOTHING;

-- ── Sample Symptom Sessions ───────────────────────────────────────────────────
INSERT INTO symptom_sessions (
  user_id, profile_id, transcript, detected_symptom, all_keywords,
  answers, triage_level, triage_label, action_taken, session_date
)
VALUES
(
  v_user_id, v_profile_id,
  'I have been having a fever since yesterday evening. I feel very hot and my body is aching.',
  'fever',
  ARRAY['fever'],
  '{"duration": "more_than_day", "temperature": "moderate", "other_symptoms": "no", "taking_paracetamol": "yes"}'::jsonb,
  'yellow',
  'Contact doctor today',
  'called_caregiver',
  now() - interval '2 days'
),
(
  v_user_id, v_profile_id,
  'I had some indigestion after lunch. Feeling a little bloated and uncomfortable.',
  'indigestion',
  ARRAY['indigestion'],
  '{"chest_pain": "no", "vomiting": "no", "duration": "few_hours"}'::jsonb,
  'green',
  'Monitor at home',
  null,
  now() - interval '5 days'
);

END $$;
