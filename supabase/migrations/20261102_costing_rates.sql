-- Costing rate database (replaces the old costing data; touches nothing else).
-- Run in the Supabase SQL editor, THEN run 20261102_costing_rates_seed.sql.
--
-- Access model (same as company_facts): nobody reads or writes from the browser.
-- Only the server (service role, inside the Next.js API route) reads rates.

-- ---------------------------------------------------------------------------
-- OPTIONAL STEP 0 - clear the OLD costing tables.
-- I could not see your database, so I do not know their names. List them first:
--   select table_name from information_schema.tables
--    where table_schema='public' and table_name ilike '%cost%';
-- then drop ONLY those, e.g.:
--   drop table if exists public.<old_costing_table> cascade;
-- Do NOT drop company_facts, tender_analyses or any eligibility / company table.
-- ---------------------------------------------------------------------------

create table if not exists public.costing_rate_sets (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  source_file    text not null,
  source_sha256  text not null,
  record_count   int  not null check (record_count > 0),
  is_active      boolean not null default false,
  created_at     timestamptz not null default now()
);
-- only one active rate set at a time
create unique index if not exists costing_rate_sets_one_active
  on public.costing_rate_sets (is_active) where is_active;

create table if not exists public.costing_rates (
  set_id           uuid not null references public.costing_rate_sets(id) on delete cascade,
  id               text not null,               -- strict_key-occurrence
  strict_key       text not null,
  loose_key        text not null,
  occurrence       int  not null check (occurrence >= 1),
  source_sl        text,
  source_row       int  not null,
  scope            text,
  headers          jsonb not null default '[]'::jsonb,
  description      text not null,
  unit             text,
  unit_norm        text not null default '',
  tender_est_rate  numeric,                      -- informational (incl. GST)
  purchase_rate    numeric check (purchase_rate  is null or purchase_rate  >= 0),
  execution_rate   numeric check (execution_rate is null or execution_rate >= 0),
  purchase_basis   text,                         -- original Excel formula (audit)
  execution_basis  text,
  rule_kind        text not null default 'FIXED' check (rule_kind in ('FIXED','PCT_OF_TOTAL')),
  rule_pct         numeric,
  priced           boolean not null,
  primary key (set_id, id)
);
create index if not exists costing_rates_strict on public.costing_rates (set_id, strict_key);
create index if not exists costing_rates_loose  on public.costing_rates (set_id, loose_key);

alter table public.costing_rate_sets enable row level security;
alter table public.costing_rates     enable row level security;
-- no policies on purpose: with RLS on and no policy, anon/authenticated get nothing
revoke all on public.costing_rate_sets from anon, authenticated;
revoke all on public.costing_rates     from anon, authenticated;
-- service_role bypasses RLS and is used only server-side.

-- rates may not be edited in place: load a new set and activate it instead
create or replace function public.costing_rates_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'costing_rates are immutable; load a new rate set instead';
end $$;
drop trigger if exists costing_rates_no_update on public.costing_rates;
create trigger costing_rates_no_update before update on public.costing_rates
  for each row execute function public.costing_rates_immutable();
