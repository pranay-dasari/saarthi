# Saarthi — Project Progress

## What Is This App

Saarthi is a mobile-first health companion for elderly users. Core features:
- Medicine reminder tracking (mark doses taken/missed)
- Symptom checker with voice input and triage (green/yellow/red)
- Emergency contact calling
- Per-user profile with health details
- Conversational voice UI (TTS) throughout

Stack: Next.js App Router (RSC + client components), Supabase (auth + Postgres + RLS), Web Speech API, Tailwind, Font Awesome, Vitest.

---

## Completed Work

### Phase 1 — Core Foundation
- Supabase auth (email/password), protected routes via `proxy.ts` middleware
- Bottom navigation (Home, Medicines, History, Profile tabs)
- Home dashboard with dose cards grouped by slot (morning/afternoon/evening/night)
- Disclaimer bar and `SectionCard` / `BigButton` / `PageHeader` reusable UI
- RLS: all tables scoped to `auth.uid() = user_id`
- **Tests: 38/38 passing**

### Phase 2 — Medicines & Profile
- Medicine list page with today's progress card
- Mark dose taken/missed (upsert via server action, idempotent)
- Medicine history page (`MedicineHistoryTable`)
- Profile page with full edit form (name, age, gender, conditions, doctor phone)
- Emergency contacts display with call button
- `saveProfile` server action with `revalidatePath`
- **Tests: 33/33 passing**

### Phase 3 — Symptom Checker + Voice Input
- `/symptom` page with full voice capture flow
- `useSpeechRecognition` hook — mic permission, transcript, error handling
- `detectSymptom` — keyword matching for 7 named symptoms
- `evaluateTriage` — deterministic green/yellow/red engine (no external AI)
- Follow-up questions per detected symptom
- Triage result screen with action guidance
- Symptom session saved to Supabase (`symptom_sessions` table)
- `/history` page listing past symptom sessions
- RLS blocks anon from reading sessions
- **Tests: 66/66 passing**

### Phase 4 — Registration Flow + Per-User Data Isolation
- `/register` page (name, email, password, confirm) — client-side validation
- `supabase.auth.signUp` + starter profile row insert
- `/register` added to public paths in `proxy.ts` middleware (was blocked — bug fixed)
- `UserButton` component: avatar in home header, bottom-sheet panel with profile summary + sign-out
- Sign-out added to Profile page
- Per-user data isolation verified — new users never see admin/demo data
- **Tests: 37/37 passing**
- **All 4 phases combined: 174/174 passing**

### Phase 5 — Voice V4 (Triage Result TTS)
- `TriageResult.tsx` — speaks level-specific message on result screen mount
  - green: "Your symptoms do not seem urgent right now…"
  - yellow: "You may need a doctor's attention soon…"
  - red: "This needs urgent attention. Please call emergency services…"
- `SymptomChecker.tsx` — `NoSymptomSpokenPrompt` null component speaks fallback when no symptom detected
- `spokenRef` guard pattern prevents double-speak on re-renders

### Phase 6 — Voice V5 (Medicine Reminder Conversation Loop)
- `MedicineReminderPrompt.tsx` — banner card on home page for current time slot's pending doses
- "Start reminder" → speaks greeting + first dose question as ONE combined `speak()` call (avoids TTS cancellation race)
- Yes / Not yet buttons → marks dose via existing `markDose` server action
- `lastSpokenIndexRef` tracks progress across re-renders without remounting
- Disappears when all doses confirmed or dismissed

### Phase 7 — New-User Experience Fix

**Root cause fixed:** Profile row INSERT during signup silently fails when Supabase email confirmation is required (no active session → RLS blocks INSERT). This left new users with a dead-end "No profile found. Please contact your caregiver." message.

**Fixes applied:**
- `app/profile/page.tsx` — server-side auto-bootstrap: if no profile row exists for authenticated user, INSERTs a starter row (RLS satisfied since user IS logged in server-side). Derives readable name from email prefix (e.g. `pranay.dasari` → `Pranay Dasari`).
- `components/profile/ProfileView.tsx` — added `isNewProfile` prop: opens in edit mode automatically, shows blue "Welcome to Saarthi!" banner, speaks "Please add your details…" on mount
- `components/ui/UserButton.tsx` — fixed initials: falls back to email prefix when name is empty (was showing `?`). Added "Edit profile" link to bottom sheet.
- `app/page.tsx` — added "Set up your profile" / "Complete your profile" banner card for new/incomplete users. Added `OnboardingVoice` component.
- `hooks/useSpeechSynthesis.ts` — added `saarthi:mute-change` custom event so toggling mute in one component instantly syncs all other hook instances in the same tab.
- `components/ui/MuteButton.tsx` — new: floating mute/unmute button (`bottom-[136px] right-4`), visible on all authenticated pages.
- `components/ui/OnboardingVoice.tsx` — new: null-rendering component that speaks _"Hi, welcome to Saarthi. I will guide you on how to use this app…"_ once on first home page visit for new users.
- `app/layout.tsx` — added `<MuteButton>` for all authenticated sessions.

**Register error handling fix:**
- `app/register/page.tsx` — overly broad `msg.includes("email")` was misclassifying ALL Supabase errors that mentioned "email" (e.g. "Email signups are disabled", "Email rate limit exceeded") as "Please enter a valid email address."
- Fixed: explicit 429 check via HTTP status, specific email-format phrases only, 429 rate-limit message, fall-through now shows the actual Supabase error message so the real problem is visible.

### Phase 8 — New-User Onboarding Wizard

**Problem:** After registration, new users landed directly on the home dashboard with no profile details and no medicines set up. Existing users without age/gender also had no guided path to complete their setup.

**Solution:** A dedicated `/onboarding` 4-step wizard that applies equally to new registrations AND existing users with incomplete profiles.

**Step 1 — Profile details**
- Collects age (required), gender, known health conditions (comma-separated), doctor's phone
- Speaks: *"Welcome! Please tell us a little about yourself so Saarthi can help you better."*
- Saves via existing `saveProfile` server action

**Step 2 — Medicine question**
- Asks: *"Do you take any medicines regularly?"*
- "Yes, I take medicines" → Step 3 | "No, I don't take any" → Step 4 (done)

**Step 3 — Add medicines (repeatable)**
- Collects: medicine name, **pet name / nickname** (e.g. "red tablet", "orange bottle tonic"), dosage, time slots (Morning / Afternoon / Evening / Night with time ranges), **instructions** (e.g. "Take on empty stomach")
- Saves each via new `addMedicine` server action → inserts into `medicines` table
- Running list of added medicines shown at top
- "Done — I've added all my medicines" button (appears after first add) + "Skip for now" link

**Step 4 — Done screen**
- Summarises added medicines
- Speaks: *"You are all set! Saarthi is ready to help you."*
- "Go to Saarthi" → home

**Files changed:**
- `app/onboarding/page.tsx` — new 4-step wizard page
- `app/register/page.tsx` — redirects to `/onboarding` instead of `/` after signup
- `proxy.ts` — explicit `/onboarding` route guard (auth required, no auth-user redirect loop)
- `app/actions.ts` — added `addMedicine` server action

### Phase 9 — Medicine Pet Names, Instructions & Dynamic Voice Reminders

**DB schema change (migration required):**
```sql
ALTER TABLE medicines ADD COLUMN IF NOT EXISTS nickname text;
ALTER TABLE medicines ADD COLUMN IF NOT EXISTS instructions text;
```

**Medicine add/edit in Profile tab:**
- New `MedicineManager` component embedded in the Profile page after Emergency Contacts
- Shows all medicines (active) with name, nickname in orange, dosage, slots, instructions in blue italic
- **Edit** button → inline pre-filled form per medicine
- **Remove** button → soft delete (`is_active = false`), no hard deletes
- **Add** button → inline form
- Changes saved via `addMedicine` / `updateMedicine` / `deactivateMedicine` server actions + `router.refresh()`

**Type system updates:**
- `Medicine` type: added `nickname: string | null` and `instructions: string | null`
- `DoseEntry` type: added `nickname: string | null` and `instructions: string | null`
- Both `buildDoses` functions (home + medicines page) propagate these fields from `Medicine` → `DoseEntry`

**Dynamic, conversational voice reminders (`MedicineReminderPrompt`):**

Reminders now use the patient's name, nickname, and instructions to speak personalised messages at every step:

| Moment | Example spoken text |
|---|---|
| Opening | *"Hello Ramesh, it is time for your morning medicines. You need to take Metformin, the red tablet and Amlodipine. I will ask you one by one."* |
| Per medicine | *"Have you taken your Metformin, the red tablet? Remember, take on empty stomach."* |
| Yes response | *"Good. Metformin marked as taken. You can now have your breakfast. Now let us check your next medicine."* |
| No response | *"Okay. Please take your Metformin, the red tablet now. Take on empty stomach. I will leave it as pending."* |
| All done | *"All done, Ramesh. Your next reminder will be for your afternoon medicines. Well done!"* |

**Auto-trigger on slot boundary (app open in background):**
- 60-second `setInterval` detects when the clock crosses a slot start hour (6 AM / 12 PM / 5 PM / 8 PM)
- On boundary crossing: resets to banner phase → calls `router.refresh()` to get fresh pending doses → auto-starts the reminder
- On page load: if current time is within first 5 minutes of a slot start AND pending doses exist → auto-starts without user tapping "Start reminder"

**New server actions in `app/actions.ts`:**
- `addMedicine` — updated signature with `nickname` and `instructions`
- `updateMedicine(id, updates)` — updates name, nickname, dosage, slots, instructions, is_active
- `deactivateMedicine(id)` — sets `is_active = false` (soft remove)

---

## Current State

| Area | Status |
|---|---|
| Auth (login/logout/register) | ✅ Working |
| New-user onboarding wizard | ✅ Done — `/onboarding` 4-step flow |
| Existing-user medicine add/edit | ✅ Done — Profile tab → My Medicines |
| Medicine pet names + instructions | ✅ Done — stored in DB, used in voice |
| Dynamic personalised voice reminders | ✅ Done — name + nickname + instructions |
| Auto-trigger on slot boundary | ✅ Done — 60s interval + router.refresh() |
| New-user profile bootstrap | ✅ Fixed |
| Medicine tracking | ✅ Working |
| Symptom checker + triage | ✅ Working |
| TTS voice throughout | ✅ Working |
| Global mute button | ✅ Working |
| Per-user data isolation | ✅ Verified |
| Test suite | ✅ 174/174 passing |
| TypeScript | ✅ No errors |
| Build | ✅ Clean (`next build` passes) |

---

## Next Steps

### Immediate
- [ ] **Run DB migration** — execute in Supabase SQL editor:
  ```sql
  ALTER TABLE medicines ADD COLUMN IF NOT EXISTS nickname text;
  ALTER TABLE medicines ADD COLUMN IF NOT EXISTS instructions text;
  ```
- [ ] **Supabase signup rate limit** — Auth → Rate Limits → increase signup limit (default 3/hour on free tier causes 429 on repeated test signups)

### Short Term — UX Polish
- [ ] Emergency contacts add/edit UI (currently read-only display — only calling works)
- [ ] Better empty state on Medicines page for new users with zero medicines
- [ ] Loading skeletons on dashboard and history pages (TASKS.md Should-Have)
- [ ] First-load disclaimer modal (localStorage flag, TASKS.md Should-Have)

### Medium Term — Features
- [ ] Caregiver portal — separate role to manage patient data
- [ ] Multi-language support (Hindi, Telugu, etc. for elderly users)
- [ ] Offline fallback for voice when no connectivity
- [ ] Push notifications via Service Worker + Web Push API (true background reminders)

### Quality
- [ ] Add Phase 8 tests (onboarding wizard flow)
- [ ] Add Phase 9 tests (MedicineManager add/edit/remove, dynamic voice message builders)
- [ ] Add Phase 5 + 7 tests (TTS, profile bootstrap, mute button, onboarding voice)
- [ ] E2E test for full signup → onboarding → medicine mark flow

### Admin Features (deferred)
- [ ] Admin-only view of all users and their sessions
- [ ] Admin medicine seeding for specific users
- [ ] `admin@app.local` role separation from regular users

---

## Key Files Reference

| File | Purpose |
|---|---|
| `proxy.ts` | Next.js middleware — auth guard, public paths, `/onboarding` guard |
| `app/layout.tsx` | Root layout — BottomNav, Disclaimer, MuteButton |
| `app/page.tsx` | Home dashboard + OnboardingVoice |
| `app/register/page.tsx` | Signup form — redirects to `/onboarding` on success |
| `app/onboarding/page.tsx` | 4-step new-user wizard (profile → medicines → done) |
| `app/profile/page.tsx` | Profile page — auto-bootstrap + fetch medicines |
| `components/profile/ProfileView.tsx` | Profile edit form + welcome banner + MedicineManager |
| `components/medicine/MedicineManager.tsx` | Inline add/edit/remove medicines in profile |
| `components/medicine/MedicineReminderPrompt.tsx` | Dynamic conversational dose reminder + auto-trigger |
| `components/ui/UserButton.tsx` | Avatar + bottom-sheet panel |
| `components/ui/MuteButton.tsx` | Global floating mute control |
| `components/ui/OnboardingVoice.tsx` | One-time welcome TTS for new users |
| `components/symptom/SymptomChecker.tsx` | Full voice symptom flow |
| `hooks/useSpeechSynthesis.ts` | TTS hook — mute, speak, cancel, cross-component sync |
| `hooks/useSpeechRecognition.ts` | Mic + transcript hook |
| `lib/symptom/triage.ts` | Pure deterministic triage engine |
| `lib/db/profile.ts` | Profile DB helpers (getProfile, createProfile, updateProfile) |
| `lib/db/medicines.ts` | Medicine DB helpers (getActiveMedicines, getAllMedicines) |
| `app/actions.ts` | Server actions — markDose, saveProfile, addMedicine, updateMedicine, deactivateMedicine, saveSymptomSession |
| `types/index.ts` | Shared types — Medicine, DoseEntry, Profile, EmergencyContact, SymptomSession |
| `tests/phase{1-4}.test.ts` | Test suite — 174 tests total |
