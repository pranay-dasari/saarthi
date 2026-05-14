# [App Name] — Setup Guide

A voice-first elderly care assistant. Manage medicines, report symptoms, and get simple triage guidance.

---

## Prerequisites
- Node.js 18+
- Supabase project (already created)
- Vercel account (already set up)

---

## Step 1 — Clone and install
```bash
git clone <your-repo-url>
cd saarthi && npm install
```

## Step 2 — Environment variables
Fill `.env.local` with your Supabase values (Dashboard → Settings → API):
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Step 3 — Database setup

### 3a. Run migration
Supabase Dashboard → SQL Editor → paste `supabase/migrations/001_initial.sql` → Run

### 3b. Create admin user
Dashboard → Authentication → Users → Add User
- Email: admin@app.local  |  Password: admin
- UUID must be: db2a5edb-b3c2-4c9c-9941-1d92f568a3ea
  (if different, update seed.sql line 7 before running)

### 3c. Run seed
Supabase Dashboard → SQL Editor → paste `supabase/seed.sql` → Run

## Step 4 — Run locally
```bash
npm run dev
# Open http://localhost:3000
# Login: admin@app.local / admin
```

## Step 5 — Deploy to Vercel
```bash
npm i -g vercel && vercel --prod
```
Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel env settings.

---
⚠️  Change the admin password before sharing with anyone.
⚠️  This app is not a medical diagnostic tool. In an emergency, call 112.
