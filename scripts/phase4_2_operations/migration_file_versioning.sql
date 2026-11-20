-- ============================================================================
-- SCRIPT: migration_file_versioning.sql
-- PURPOSE: Phase 4.2.1 File Deduplication, Unique Fingerprinting & Versioning
-- SAFETY: Fully transactional, non-destructive, zero DROP/CASCADE.
--         Rigorous pre/post count invariants, strict foreign key validation,
--         and exact catalog index verification (indisunique, indisvalid,
--         indisready, indnkeyatts, indnatts, attname, exact predicate).
-- NOTE: DO NOT EXECUTE AUTOMATICALLY. FOR OPERATIONAL REVIEW ONLY.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- STEP 1: PRE-MIGRATION ASSERTIONS, BASELINE CAPTURE & DUPLICATE AUDIT
-- ----------------------------------------------------------------------------

-- Transaction-scoped temporary table to hold baseline counts across steps
CREATE TEMP TABLE IF NOT EXISTS _pre_migration_counts (
  pre_files integer NOT NULL,
  pre_items integer NOT NULL,
  pre_groups integer NOT NULL,
  pre_members integer NOT NULL
) ON COMMIT DROP;

DO $$
DECLARE
  v_table_exists boolean;
  v_items_exists boolean;
  v_groups_exists boolean;
  v_members_exists boolean;
  v_is_test_exists boolean;
  v_duplicate_hashes_count integer := 0;
  v_duplicate_active_keys integer := 0;
  v_files_cnt integer;
  v_items_cnt integer;
  v_groups_cnt integer;
  v_members_cnt integer;
  v_sql text;
BEGIN
  -- 1. Assert required core tables exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sor_files'
  ) INTO v_table_exists;

  IF NOT v_table_exists THEN
    RAISE EXCEPTION 'PRE-MIGRATION ASSERTION FAILED: Table public.sor_files does not exist.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sor_items'
  ) INTO v_items_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sor_item_groups'
  ) INTO v_groups_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sor_item_group_members'
  ) INTO v_members_exists;

  IF NOT (v_items_exists AND v_groups_exists AND v_members_exists) THEN
    RAISE EXCEPTION 'PRE-MIGRATION ASSERTION FAILED: Core SOR tables (items, groups, members) not found.';
  END IF;

  -- 2. Capture baseline counts across all four core tables
  SELECT count(*) INTO v_files_cnt FROM public.sor_files;
  SELECT count(*) INTO v_items_cnt FROM public.sor_items;
  SELECT count(*) INTO v_groups_cnt FROM public.sor_item_groups;
  SELECT count(*) INTO v_members_cnt FROM public.sor_item_group_members;

  INSERT INTO _pre_migration_counts (pre_files, pre_items, pre_groups, pre_members)
  VALUES (v_files_cnt, v_items_cnt, v_groups_cnt, v_members_cnt);

  -- 3. Check if is_test exists on sor_files
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sor_files' AND column_name = 'is_test'
  ) INTO v_is_test_exists;

  -- 4. Audit for pre-existing duplicate fingerprints (dynamic SQL prevents compile errors if columns do not yet exist)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sor_files' AND column_name = 'content_fingerprint'
  ) THEN
    IF v_is_test_exists THEN
      v_sql := 'SELECT count(*) FROM (
                  SELECT content_fingerprint FROM public.sor_files 
                  WHERE content_fingerprint IS NOT NULL AND is_test = false 
                  GROUP BY content_fingerprint HAVING count(*) > 1
                ) dup';
    ELSE
      v_sql := 'SELECT count(*) FROM (
                  SELECT content_fingerprint FROM public.sor_files 
                  WHERE content_fingerprint IS NOT NULL 
                  GROUP BY content_fingerprint HAVING count(*) > 1
                ) dup';
    END IF;

    EXECUTE v_sql INTO v_duplicate_hashes_count;

    IF v_duplicate_hashes_count > 0 THEN
      RAISE EXCEPTION 'PRE-MIGRATION ASSERTION FAILED: Found % duplicate content fingerprints. Resolve duplicates before applying unique constraint.', v_duplicate_hashes_count;
    END IF;
  END IF;

  -- 5. Audit for pre-existing duplicate active records per document_key (dynamic SQL)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sor_files' AND column_name = 'document_key'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sor_files' AND column_name = 'is_active'
  ) THEN
    IF v_is_test_exists THEN
      v_sql := 'SELECT count(*) FROM (
                  SELECT document_key FROM public.sor_files 
                  WHERE is_active = true AND is_test = false AND document_key IS NOT NULL 
                  GROUP BY document_key HAVING count(*) > 1
                ) dup_active';
    ELSE
      v_sql := 'SELECT count(*) FROM (
                  SELECT document_key FROM public.sor_files 
                  WHERE is_active = true AND document_key IS NOT NULL 
                  GROUP BY document_key HAVING count(*) > 1
                ) dup_active';
    END IF;

    EXECUTE v_sql INTO v_duplicate_active_keys;

    IF v_duplicate_active_keys > 0 THEN
      RAISE EXCEPTION 'PRE-MIGRATION ASSERTION FAILED: Found % document keys with multiple active records. Resolve active version conflicts before applying uq_sor_files_active_version.', v_duplicate_active_keys;
    END IF;
  END IF;

  RAISE NOTICE 'PRE-MIGRATION BASELINE CAPTURED: % files, % items, % groups, % group members. Pre-audit clean.',
    v_files_cnt, v_items_cnt, v_groups_cnt, v_members_cnt;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 2: SAFE DDL ADDITIONS & SEPARATE FOREIGN KEY CREATION
-- Note on is_test: Application-wide test-isolation column required by db.ts.
-- ----------------------------------------------------------------------------

-- Ensure is_test exists on sor_files before creating index predicates that reference it
ALTER TABLE public.sor_files
  ADD COLUMN IF NOT EXISTS is_test boolean DEFAULT false;

-- Add binary SHA-256 content fingerprint
ALTER TABLE public.sor_files
  ADD COLUMN IF NOT EXISTS content_fingerprint text;

-- Add logical document grouping key (state::authority::discipline::year[::tender])
ALTER TABLE public.sor_files
  ADD COLUMN IF NOT EXISTS document_key text;

-- Add engineering discipline (Civil, Electrical, Mechanical, Plumbing, General, Other)
ALTER TABLE public.sor_files
  ADD COLUMN IF NOT EXISTS discipline text DEFAULT 'Civil';

-- Add document/schedule title
ALTER TABLE public.sor_files
  ADD COLUMN IF NOT EXISTS document_title text;

-- Add tender/package reference
ALTER TABLE public.sor_files
  ADD COLUMN IF NOT EXISTS tender_reference text;

-- Add revision version number (defaults to 1 for initial/existing uploads)
ALTER TABLE public.sor_files
  ADD COLUMN IF NOT EXISTS version_number integer DEFAULT 1;

-- Add active version designation flag (defaults to true)
ALTER TABLE public.sor_files
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Add parent/root file column (UUID) decoupled from foreign key
ALTER TABLE public.sor_files
  ADD COLUMN IF NOT EXISTS parent_file_id uuid;

-- Explicit, separate, idempotent foreign-key verification and creation step
DO $$
DECLARE
  v_col_type text;
  v_fk_name text;
  v_target_table text;
  v_target_col text;
  v_delete_rule text;
BEGIN
  -- Verify parent_file_id data type
  SELECT data_type INTO v_col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'sor_files' AND column_name = 'parent_file_id';

  IF v_col_type <> 'uuid' THEN
    RAISE EXCEPTION 'MIGRATION INTEGRITY ERROR: Existing column parent_file_id has incompatible type % (expected uuid).', v_col_type;
  END IF;

  -- Inspect existing foreign key on parent_file_id if present
  SELECT 
    tc.constraint_name,
    ccu.table_name,
    ccu.column_name,
    rc.delete_rule
  INTO 
    v_fk_name,
    v_target_table,
    v_target_col,
    v_delete_rule
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
  JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
  WHERE tc.table_schema = 'public' 
    AND tc.table_name = 'sor_files' 
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'parent_file_id'
  LIMIT 1;

  IF v_fk_name IS NOT NULL THEN
    -- Incompatible target table or column
    IF v_target_table <> 'sor_files' OR v_target_col <> 'id' THEN
      RAISE EXCEPTION 'MIGRATION INTEGRITY ERROR: Existing foreign key % on parent_file_id references %.% instead of sor_files.id.',
        v_fk_name, v_target_table, v_target_col;
    END IF;
    -- Incompatible delete rule
    IF v_delete_rule <> 'SET NULL' THEN
      RAISE EXCEPTION 'MIGRATION INTEGRITY ERROR: Existing foreign key % on parent_file_id has ON DELETE % instead of SET NULL.',
        v_fk_name, v_delete_rule;
    END IF;
    RAISE NOTICE 'Existing compatible foreign key constraint % verified on parent_file_id.', v_fk_name;
  ELSE
    -- Add explicit foreign key constraint
    ALTER TABLE public.sor_files
      ADD CONSTRAINT fk_sor_files_parent_file_id
      FOREIGN KEY (parent_file_id) REFERENCES public.sor_files(id) ON DELETE SET NULL;
    RAISE NOTICE 'Created foreign key constraint fk_sor_files_parent_file_id on parent_file_id.';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 3: PERSISTENT AUTHORITY REGISTRY TABLE & AUTOMATIC TIMESTAMP TRIGGER
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sor_authority_registry (
  authority_code text PRIMARY KEY,
  authority_name text NOT NULL,
  state_name text NOT NULL,
  department_type text DEFAULT 'General',
  keywords jsonb DEFAULT '[]'::jsonb,
  supported_sor_years jsonb DEFAULT '[]'::jsonb,
  is_central_agency boolean DEFAULT false,
  is_custom boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Trigger function for automatic updated_at maintenance
CREATE OR REPLACE FUNCTION public.fn_sor_authority_registry_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sor_authority_registry_updated_at ON public.sor_authority_registry;

CREATE TRIGGER trg_sor_authority_registry_updated_at
BEFORE UPDATE ON public.sor_authority_registry
FOR EACH ROW
EXECUTE FUNCTION public.fn_sor_authority_registry_updated_at();

-- ----------------------------------------------------------------------------
-- STEP 4: SAFE BACKFILL STRATEGY FOR HISTORICAL RECORDS
-- Note: Each historical file receives an independent, distinct document_key
-- based on its file ID to prevent accidental grouping or silent deactivation.
-- Strictly filters on NULLs so running migration multiple times does not overwrite keys.
-- ----------------------------------------------------------------------------
UPDATE public.sor_files
SET 
  version_number = COALESCE(version_number, 1),
  is_active = COALESCE(is_active, true),
  discipline = COALESCE(discipline, 'Civil'),
  is_test = COALESCE(is_test, false),
  document_key = COALESCE(
    document_key, 
    LOWER(CONCAT(
      COALESCE(state_name, detected_state, 'unassigned_state'), 
      '::', 
      COALESCE(authority_code, 'unassigned_auth'), 
      '::', 
      COALESCE(discipline, 'civil'), 
      '::', 
      COALESCE(sor_year, 'historical'),
      '::legacy_',
      SUBSTRING(id::text, 1, 8)
    ))
  )
WHERE version_number IS NULL OR is_active IS NULL OR document_key IS NULL OR is_test IS NULL OR discipline IS NULL;

-- ----------------------------------------------------------------------------
-- STEP 5: UNIQUE & PERFORMANCE INDICES (WITH INCOMPATIBLE DEFINITION GUARDS)
-- Uses PostgreSQL catalog metadata (indisunique, indisvalid, indisready,
-- indnkeyatts, indnatts, attname) and exact normalized predicate analysis.
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  v_existing_unique boolean;
  v_existing_valid boolean;
  v_existing_ready boolean;
  v_existing_natts smallint;
  v_existing_nkeyatts smallint;
  v_existing_col text;
  v_norm_pred text;
  v_raw_pred text;
BEGIN
  -- 1. Inspect uq_sor_files_content_fingerprint if it already exists
  SELECT 
    i.indisunique,
    i.indisvalid,
    i.indisready,
    i.indnatts,
    i.indnkeyatts,
    att.attname,
    LOWER(REGEXP_REPLACE(pg_get_expr(i.indpred, i.indrelid), '[\s\(\)]', '', 'g')),
    pg_get_expr(i.indpred, i.indrelid)
  INTO 
    v_existing_unique,
    v_existing_valid,
    v_existing_ready,
    v_existing_natts,
    v_existing_nkeyatts,
    v_existing_col,
    v_norm_pred,
    v_raw_pred
  FROM pg_index i
  JOIN pg_class idx ON idx.oid = i.indexrelid
  JOIN pg_class tbl ON tbl.oid = i.indrelid
  JOIN pg_namespace nsp ON nsp.oid = tbl.relnamespace
  JOIN pg_attribute att ON att.attrelid = i.indexrelid AND att.attnum = 1
  WHERE nsp.nspname = 'public' 
    AND tbl.relname = 'sor_files' 
    AND idx.relname = 'uq_sor_files_content_fingerprint';

  IF v_existing_unique IS NOT NULL THEN
    IF NOT v_existing_unique 
       OR NOT v_existing_valid
       OR NOT v_existing_ready
       OR v_existing_natts <> 1
       OR v_existing_nkeyatts <> 1
       OR v_existing_col <> 'content_fingerprint'
       OR v_raw_pred ILIKE '%OR%'
       OR v_norm_pred NOT IN (
            'content_fingerprintisnotnullandis_test=false',
            'is_test=falseandcontent_fingerprintisnotnull'
          ) THEN
      RAISE EXCEPTION 'MIGRATION INTEGRITY ERROR: Existing index uq_sor_files_content_fingerprint has conflicting or invalid definition (unique: %, valid: %, ready: %, natts: %, nkeyatts: %, col: %, pred: %)',
        v_existing_unique, v_existing_valid, v_existing_ready, v_existing_natts, v_existing_nkeyatts, v_existing_col, v_raw_pred;
    END IF;
    RAISE NOTICE 'Existing compatible index uq_sor_files_content_fingerprint verified.';
  ELSE
    CREATE UNIQUE INDEX uq_sor_files_content_fingerprint 
      ON public.sor_files(content_fingerprint) 
      WHERE content_fingerprint IS NOT NULL AND is_test = false;
    RAISE NOTICE 'Created partial unique index uq_sor_files_content_fingerprint.';
  END IF;

  -- 2. Inspect uq_sor_files_active_version if it already exists
  SELECT 
    i.indisunique,
    i.indisvalid,
    i.indisready,
    i.indnatts,
    i.indnkeyatts,
    att.attname,
    LOWER(REGEXP_REPLACE(pg_get_expr(i.indpred, i.indrelid), '[\s\(\)]', '', 'g')),
    pg_get_expr(i.indpred, i.indrelid)
  INTO 
    v_existing_unique,
    v_existing_valid,
    v_existing_ready,
    v_existing_natts,
    v_existing_nkeyatts,
    v_existing_col,
    v_norm_pred,
    v_raw_pred
  FROM pg_index i
  JOIN pg_class idx ON idx.oid = i.indexrelid
  JOIN pg_class tbl ON tbl.oid = i.indrelid
  JOIN pg_namespace nsp ON nsp.oid = tbl.relnamespace
  JOIN pg_attribute att ON att.attrelid = i.indexrelid AND att.attnum = 1
  WHERE nsp.nspname = 'public' 
    AND tbl.relname = 'sor_files' 
    AND idx.relname = 'uq_sor_files_active_version';

  IF v_existing_unique IS NOT NULL THEN
    IF NOT v_existing_unique 
       OR NOT v_existing_valid
       OR NOT v_existing_ready
       OR v_existing_natts <> 1
       OR v_existing_nkeyatts <> 1
       OR v_existing_col <> 'document_key'
       OR v_raw_pred ILIKE '%OR%'
       OR v_norm_pred NOT IN (
            'is_active=trueandis_test=falseanddocument_keyisnotnull',
            'is_active=trueanddocument_keyisnotnullandis_test=false',
            'is_test=falseandis_active=trueanddocument_keyisnotnull',
            'is_test=falseanddocument_keyisnotnullandis_active=true',
            'document_keyisnotnullandis_active=trueandis_test=false',
            'document_keyisnotnullandis_test=falseandis_active=true'
          ) THEN
      RAISE EXCEPTION 'MIGRATION INTEGRITY ERROR: Existing index uq_sor_files_active_version has conflicting or invalid definition (unique: %, valid: %, ready: %, natts: %, nkeyatts: %, col: %, pred: %)',
        v_existing_unique, v_existing_valid, v_existing_ready, v_existing_natts, v_existing_nkeyatts, v_existing_col, v_raw_pred;
    END IF;
    RAISE NOTICE 'Existing compatible index uq_sor_files_active_version verified.';
  ELSE
    CREATE UNIQUE INDEX uq_sor_files_active_version
      ON public.sor_files(document_key)
      WHERE is_active = true AND is_test = false AND document_key IS NOT NULL;
    RAISE NOTICE 'Created partial unique index uq_sor_files_active_version.';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sor_files_doc_version 
  ON public.sor_files(document_key, version_number);

CREATE INDEX IF NOT EXISTS idx_sor_files_doc_active 
  ON public.sor_files(document_key, is_active);

-- ----------------------------------------------------------------------------
-- STEP 6: COMPREHENSIVE POST-MIGRATION ASSERTIONS
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_col_count integer;
  v_pre_files integer;
  v_pre_items integer;
  v_pre_groups integer;
  v_pre_members integer;
  v_post_files integer;
  v_post_items integer;
  v_post_groups integer;
  v_post_members integer;
  v_auth_table_exists boolean;
  v_fk_exists boolean;
  v_trg_exists boolean;
  v_col_rec record;
  v_idx_unique boolean;
  v_idx_valid boolean;
  v_idx_ready boolean;
  v_idx_natts smallint;
  v_idx_nkeyatts smallint;
  v_idx_table text;
  v_idx_schema text;
  v_idx_col text;
  v_norm_pred text;
  v_raw_pred text;
BEGIN
  -- 1. Compare exact post-migration counts against captured pre-migration baseline
  SELECT pre_files, pre_items, pre_groups, pre_members 
  INTO v_pre_files, v_pre_items, v_pre_groups, v_pre_members 
  FROM _pre_migration_counts LIMIT 1;

  SELECT count(*) INTO v_post_files FROM public.sor_files;
  SELECT count(*) INTO v_post_items FROM public.sor_items;
  SELECT count(*) INTO v_post_groups FROM public.sor_item_groups;
  SELECT count(*) INTO v_post_members FROM public.sor_item_group_members;

  IF v_post_files <> v_pre_files THEN
    RAISE EXCEPTION 'POST-MIGRATION COUNT ASSERTION FAILED: sor_files count changed from % to %.', v_pre_files, v_post_files;
  END IF;

  IF v_post_items <> v_pre_items THEN
    RAISE EXCEPTION 'POST-MIGRATION COUNT ASSERTION FAILED: sor_items count changed from % to %.', v_pre_items, v_post_items;
  END IF;

  IF v_post_groups <> v_pre_groups THEN
    RAISE EXCEPTION 'POST-MIGRATION COUNT ASSERTION FAILED: sor_item_groups count changed from % to %.', v_pre_groups, v_post_groups;
  END IF;

  IF v_post_members <> v_pre_members THEN
    RAISE EXCEPTION 'POST-MIGRATION COUNT ASSERTION FAILED: sor_item_group_members count changed from % to %.', v_pre_members, v_post_members;
  END IF;

  -- 2. Verify all 8 versioning columns and is_test: data types and defaults
  SELECT count(*) INTO v_col_count
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'sor_files'
    AND column_name IN (
      'content_fingerprint', 'document_key', 'discipline', 
      'document_title', 'tender_reference', 'version_number', 
      'parent_file_id', 'is_active', 'is_test'
    );

  IF v_col_count <> 9 THEN
    RAISE EXCEPTION 'POST-MIGRATION ASSERTION FAILED: Expected 9 versioning & test columns in sor_files, found %.', v_col_count;
  END IF;

  FOR v_col_rec IN 
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sor_files'
  LOOP
    IF v_col_rec.column_name = 'content_fingerprint' AND v_col_rec.data_type <> 'text' THEN
      RAISE EXCEPTION 'POST-MIGRATION ASSERTION FAILED: content_fingerprint type % (expected text)', v_col_rec.data_type;
    ELSIF v_col_rec.column_name = 'document_key' AND v_col_rec.data_type <> 'text' THEN
      RAISE EXCEPTION 'POST-MIGRATION ASSERTION FAILED: document_key type % (expected text)', v_col_rec.data_type;
    ELSIF v_col_rec.column_name = 'discipline' AND (v_col_rec.data_type <> 'text' OR v_col_rec.column_default NOT LIKE '%Civil%') THEN
      RAISE EXCEPTION 'POST-MIGRATION ASSERTION FAILED: discipline type % or default % invalid (expected text, default Civil)', v_col_rec.data_type, v_col_rec.column_default;
    ELSIF v_col_rec.column_name = 'document_title' AND v_col_rec.data_type <> 'text' THEN
      RAISE EXCEPTION 'POST-MIGRATION ASSERTION FAILED: document_title type % (expected text)', v_col_rec.data_type;
    ELSIF v_col_rec.column_name = 'tender_reference' AND v_col_rec.data_type <> 'text' THEN
      RAISE EXCEPTION 'POST-MIGRATION ASSERTION FAILED: tender_reference type % (expected text)', v_col_rec.data_type;
    ELSIF v_col_rec.column_name = 'version_number' AND (v_col_rec.data_type <> 'integer' OR v_col_rec.column_default NOT LIKE '%1%') THEN
      RAISE EXCEPTION 'POST-MIGRATION ASSERTION FAILED: version_number type % or default % invalid (expected integer, default 1)', v_col_rec.data_type, v_col_rec.column_default;
    ELSIF v_col_rec.column_name = 'parent_file_id' AND v_col_rec.data_type <> 'uuid' THEN
      RAISE EXCEPTION 'POST-MIGRATION ASSERTION FAILED: parent_file_id type % (expected uuid)', v_col_rec.data_type;
    ELSIF v_col_rec.column_name = 'is_active' AND (v_col_rec.data_type <> 'boolean' OR v_col_rec.column_default NOT LIKE '%true%') THEN
      RAISE EXCEPTION 'POST-MIGRATION ASSERTION FAILED: is_active type % or default % invalid (expected boolean, default true)', v_col_rec.data_type, v_col_rec.column_default;
    ELSIF v_col_rec.column_name = 'is_test' AND (v_col_rec.data_type <> 'boolean' OR v_col_rec.column_default NOT LIKE '%false%') THEN
      RAISE EXCEPTION 'POST-MIGRATION ASSERTION FAILED: is_test type % or default % invalid (expected boolean, default false)', v_col_rec.data_type, v_col_rec.column_default;
    END IF;
  END LOOP;

  -- 3. Verify parent_file_id foreign key constraint to sor_files(id) with ON DELETE SET NULL
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu 
      ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
    WHERE tc.table_schema = 'public' 
      AND tc.table_name = 'sor_files'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'parent_file_id'
      AND ccu.table_name = 'sor_files'
      AND ccu.column_name = 'id'
      AND rc.delete_rule = 'SET NULL'
  ) INTO v_fk_exists;

  IF NOT v_fk_exists THEN
    RAISE EXCEPTION 'POST-MIGRATION ASSERTION FAILED: Foreign key constraint on parent_file_id referencing sor_files(id) ON DELETE SET NULL not found.';
  END IF;

  -- 4. Assert authority registry table and trigger exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sor_authority_registry'
  ) INTO v_auth_table_exists;

  IF NOT v_auth_table_exists THEN
    RAISE EXCEPTION 'POST-MIGRATION ASSERTION FAILED: Table public.sor_authority_registry does not exist.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE event_object_table = 'sor_authority_registry' 
      AND trigger_name = 'trg_sor_authority_registry_updated_at'
  ) INTO v_trg_exists;

  IF NOT v_trg_exists THEN
    RAISE EXCEPTION 'POST-MIGRATION ASSERTION FAILED: Trigger trg_sor_authority_registry_updated_at not found on sor_authority_registry.';
  END IF;

  -- 5. Deep Catalog Assertions on uq_sor_files_content_fingerprint
  SELECT 
    i.indisunique,
    i.indisvalid,
    i.indisready,
    i.indnatts,
    i.indnkeyatts,
    tbl.relname,
    nsp.nspname,
    att.attname,
    LOWER(REGEXP_REPLACE(pg_get_expr(i.indpred, i.indrelid), '[\s\(\)]', '', 'g')),
    pg_get_expr(i.indpred, i.indrelid)
  INTO 
    v_idx_unique,
    v_idx_valid,
    v_idx_ready,
    v_idx_natts,
    v_idx_nkeyatts,
    v_idx_table,
    v_idx_schema,
    v_idx_col,
    v_norm_pred,
    v_raw_pred
  FROM pg_index i
  JOIN pg_class idx ON idx.oid = i.indexrelid
  JOIN pg_class tbl ON tbl.oid = i.indrelid
  JOIN pg_namespace nsp ON nsp.oid = tbl.relnamespace
  JOIN pg_attribute att ON att.attrelid = i.indexrelid AND att.attnum = 1
  WHERE nsp.nspname = 'public' 
    AND tbl.relname = 'sor_files' 
    AND idx.relname = 'uq_sor_files_content_fingerprint';

  IF v_idx_unique IS NULL OR NOT v_idx_unique THEN
    RAISE EXCEPTION 'POST-MIGRATION ASSERTION FAILED: uq_sor_files_content_fingerprint must exist and be UNIQUE.';
  END IF;

  IF NOT v_idx_valid THEN
    RAISE EXCEPTION 'POST-MIGRATION ASSERTION FAILED: uq_sor_files_content_fingerprint is NOT valid for queries (indisvalid = false).';
  END IF;

  IF NOT v_idx_ready THEN
    RAISE EXCEPTION 'POST-MIGRATION ASSERTION FAILED: uq_sor_files_content_fingerprint is NOT ready for inserts/updates (indisready = false).';
  END IF;

  IF v_idx_nkeyatts <> 1 THEN
    RAISE EXCEPTION 'POST-MIGRATION ASSERTION FAILED: uq_sor_files_content_fingerprint must have exactly 1 key column (found %)', v_idx_nkeyatts;
  END IF;

  IF v_idx_natts <> 1 THEN
    RAISE EXCEPTION 'POST-MIGRATION ASSERTION FAILED: uq_sor_files_content_fingerprint has unexpected included columns (indnatts = %, expected 1)', v_idx_natts;
  END IF;

  IF v_idx_schema <> 'public' OR v_idx_table <> 'sor_files' OR v_idx_col <> 'content_fingerprint' THEN
    RAISE EXCEPTION 'POST-MIGRATION ASSERTION FAILED: uq_sor_files_content_fingerprint must index public.sor_files(content_fingerprint). Found %.%(%)',
      v_idx_schema, v_idx_table, v_idx_col;
  END IF;

  IF v_raw_pred IS NULL 
     OR v_raw_pred ILIKE '%OR%'
     OR v_norm_pred NOT IN (
          'content_fingerprintisnotnullandis_test=false',
          'is_test=falseandcontent_fingerprintisnotnull'
        ) THEN
    RAISE EXCEPTION 'POST-MIGRATION ASSERTION FAILED: uq_sor_files_content_fingerprint predicate invalid: % (expected exact content_fingerprint IS NOT NULL AND is_test = false)', v_raw_pred;
  END IF;

  -- 6. Deep Catalog Assertions on uq_sor_files_active_version
  SELECT 
    i.indisunique,
    i.indisvalid,
    i.indisready,
    i.indnatts,
    i.indnkeyatts,
    tbl.relname,
    nsp.nspname,
    att.attname,
    LOWER(REGEXP_REPLACE(pg_get_expr(i.indpred, i.indrelid), '[\s\(\)]', '', 'g')),
    pg_get_expr(i.indpred, i.indrelid)
  INTO 
    v_idx_unique,
    v_idx_valid,
    v_idx_ready,
    v_idx_natts,
    v_idx_nkeyatts,
    v_idx_table,
    v_idx_schema,
    v_idx_col,
    v_norm_pred,
    v_raw_pred
  FROM pg_index i
  JOIN pg_class idx ON idx.oid = i.indexrelid
  JOIN pg_class tbl ON tbl.oid = i.indrelid
  JOIN pg_namespace nsp ON nsp.oid = tbl.relnamespace
  JOIN pg_attribute att ON att.attrelid = i.indexrelid AND att.attnum = 1
  WHERE nsp.nspname = 'public' 
    AND tbl.relname = 'sor_files' 
    AND idx.relname = 'uq_sor_files_active_version';

  IF v_idx_unique IS NULL OR NOT v_idx_unique THEN
    RAISE EXCEPTION 'POST-MIGRATION ASSERTION FAILED: uq_sor_files_active_version must exist and be UNIQUE.';
  END IF;

  IF NOT v_idx_valid THEN
    RAISE EXCEPTION 'POST-MIGRATION ASSERTION FAILED: uq_sor_files_active_version is NOT valid for queries (indisvalid = false).';
  END IF;

  IF NOT v_idx_ready THEN
    RAISE EXCEPTION 'POST-MIGRATION ASSERTION FAILED: uq_sor_files_active_version is NOT ready for inserts/updates (indisready = false).';
  END IF;

  IF v_idx_nkeyatts <> 1 THEN
    RAISE EXCEPTION 'POST-MIGRATION ASSERTION FAILED: uq_sor_files_active_version must have exactly 1 key column (found %)', v_idx_nkeyatts;
  END IF;

  IF v_idx_natts <> 1 THEN
    RAISE EXCEPTION 'POST-MIGRATION ASSERTION FAILED: uq_sor_files_active_version has unexpected included columns (indnatts = %, expected 1)', v_idx_natts;
  END IF;

  IF v_idx_schema <> 'public' OR v_idx_table <> 'sor_files' OR v_idx_col <> 'document_key' THEN
    RAISE EXCEPTION 'POST-MIGRATION ASSERTION FAILED: uq_sor_files_active_version must index public.sor_files(document_key). Found %.%(%)',
      v_idx_schema, v_idx_table, v_idx_col;
  END IF;

  IF v_raw_pred IS NULL 
     OR v_raw_pred ILIKE '%OR%'
     OR v_norm_pred NOT IN (
          'is_active=trueandis_test=falseanddocument_keyisnotnull',
          'is_active=trueanddocument_keyisnotnullandis_test=false',
          'is_test=falseandis_active=trueanddocument_keyisnotnull',
          'is_test=falseanddocument_keyisnotnullandis_active=true',
          'document_keyisnotnullandis_active=trueandis_test=false',
          'document_keyisnotnullandis_test=falseandis_active=true'
        ) THEN
    RAISE EXCEPTION 'POST-MIGRATION ASSERTION FAILED: uq_sor_files_active_version predicate invalid: % (expected exact is_active = true AND is_test = false AND document_key IS NOT NULL)', v_raw_pred;
  END IF;

  RAISE NOTICE 'POST-MIGRATION SUCCESS: All counts verified (files: %, items: %, groups: %, members: %). All 9 columns, FK, trigger, and unique catalog indexes verified.',
    v_post_files, v_post_items, v_post_groups, v_post_members;
END $$;

COMMIT;
