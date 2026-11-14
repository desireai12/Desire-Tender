-- Migration: 20261114_costing_engine_upgrade.sql
-- Purpose: Support Scope-of-Work awareness, fingerprint cache, and human corrections.
-- STRICT: Does not alter or delete any existing rate values.

-- 1. Extend costing_rates with scope and fingerprint metadata
ALTER TABLE public.costing_rates
  ADD COLUMN IF NOT EXISTS scope_key text,
  ADD COLUMN IF NOT EXISTS scope_source text DEFAULT 'column',
  ADD COLUMN IF NOT EXISTS scope_confidence text DEFAULT 'HIGH',
  ADD COLUMN IF NOT EXISTS effective_desc text,
  ADD COLUMN IF NOT EXISTS fingerprint jsonb;

-- 2. Cache table for deterministic AI fingerprinting (G4)
CREATE TABLE IF NOT EXISTS public.costing_item_fingerprints (
  cache_key text PRIMARY KEY,
  fingerprint jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Human-in-the-loop corrections table
CREATE TABLE IF NOT EXISTS public.costing_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boq_text_hash text NOT NULL,
  db_rate_id text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approve', 'reject')),
  note text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Indexes for fast deterministic matching
CREATE INDEX IF NOT EXISTS idx_costing_rates_scope_strict 
  ON public.costing_rates (scope_key, strict_key);

CREATE INDEX IF NOT EXISTS idx_costing_corrections_lookup 
  ON public.costing_corrections (boq_text_hash, db_rate_id);

