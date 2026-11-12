-- Migration: Add scope_of_work, scope_key, effective_desc to costing_rates
-- Deterministic, non-breaking schema update for Scope-of-Work aware costing

ALTER TABLE public.costing_rates 
  ADD COLUMN IF NOT EXISTS scope_of_work text,
  ADD COLUMN IF NOT EXISTS scope_key text,
  ADD COLUMN IF NOT EXISTS effective_desc text;

CREATE INDEX IF NOT EXISTS idx_costing_rates_scope_strict 
  ON public.costing_rates (scope_key, strict_key);

