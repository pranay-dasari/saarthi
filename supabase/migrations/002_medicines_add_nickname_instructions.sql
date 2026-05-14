-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 002: Add nickname and instructions columns to medicines
-- Run this in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE medicines
  ADD COLUMN IF NOT EXISTS nickname     text,
  ADD COLUMN IF NOT EXISTS instructions text;
