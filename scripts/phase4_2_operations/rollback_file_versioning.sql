-- ============================================================================
-- SCRIPT: rollback_file_versioning.sql
-- PURPOSE: Targeted, safe rollback of Phase 4.2.1 File Versioning additions.
-- ARCHITECTURE: Structured as a single atomic DO $$ ... $$ procedural block
--               inside BEGIN ... COMMIT to guarantee that any early RETURN
--               halts the entire rollback immediately without falling through
--               to destructive drops.
-- SAFETY:
--   1. Revisions guard: Aborts if version_number > 1.
--   2. Lineage guard: Aborts if parent_file_id IS NOT NULL.
--   3. Registry guard: Aborts if sor_authority_registry contains records.
--   4. is_test ownership: Retains is_test column (application-wide test isolation).
--   5. Baseline preservation: Compares post-rollback core record counts against
--      pre-rollback counts to ensure zero data loss on original records.
-- NOTE: DO NOT EXECUTE AUTOMATICALLY. FOR OPERATIONAL REVIEW ONLY.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_table_exists boolean;
  v_col_count integer;
  v_revisions_count integer := 0;
  v_parent_links_count integer := 0;
  v_auth_registry_count integer := 0;
  v_auth_table_exists boolean;
  v_files_cnt integer := 0;
  v_items_cnt integer := 0;
  v_groups_cnt integer := 0;
  v_members_cnt integer := 0;
  v_post_files integer := 0;
  v_post_items integer := 0;
  v_post_groups integer := 0;
  v_post_members integer := 0;
BEGIN
  -- --------------------------------------------------------------------------
  -- STEP 1: PRE-ROLLBACK EXISTENCE CHECKS & EARLY-EXIT HANDLING
  -- --------------------------------------------------------------------------

  -- 1.1 Check if table sor_files exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sor_files'
  ) INTO v_table_exists;

  IF NOT v_table_exists THEN
    RAISE NOTICE 'PRE-ROLLBACK NOTICE: Table public.sor_files does not exist. Nothing to roll back.';
    RETURN; -- Safe early exit: halts the entire DO block cleanly
  END IF;

  -- 1.2 Check if any Phase 4.2.1 versioning columns exist on sor_files
  SELECT count(*) INTO v_col_count
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'sor_files'
    AND column_name IN (
      'content_fingerprint', 'document_key', 'discipline', 
      'document_title', 'tender_reference', 'version_number', 
      'parent_file_id', 'is_active'
    );

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sor_authority_registry'
  ) INTO v_auth_table_exists;

  IF v_col_count = 0 AND NOT v_auth_table_exists THEN
    RAISE NOTICE 'PRE-ROLLBACK NOTICE: Versioning columns and registry do not exist. Nothing to roll back.';
    RETURN; -- Safe early exit: halts the entire DO block cleanly
  END IF;

  -- --------------------------------------------------------------------------
  -- STEP 2: CAPTURE BASELINE RECORD COUNTS BEFORE ANY MODIFICATIONS
  -- --------------------------------------------------------------------------
  SELECT count(*) INTO v_files_cnt FROM public.sor_files;

  SELECT count(*) INTO v_items_cnt 
  FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'sor_items';
  IF v_items_cnt > 0 THEN
    SELECT count(*) INTO v_items_cnt FROM public.sor_items;
  END IF;

  SELECT count(*) INTO v_groups_cnt 
  FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'sor_item_groups';
  IF v_groups_cnt > 0 THEN
    SELECT count(*) INTO v_groups_cnt FROM public.sor_item_groups;
  END IF;

  SELECT count(*) INTO v_members_cnt 
  FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'sor_item_group_members';
  IF v_members_cnt > 0 THEN
    SELECT count(*) INTO v_members_cnt FROM public.sor_item_group_members;
  END IF;

  -- --------------------------------------------------------------------------
  -- STEP 3: STRICT PRE-ROLLBACK DATA PRESERVATION GUARDS
  -- --------------------------------------------------------------------------

  -- 3.1 Revision Guard: Abort if newer revisions (version_number > 1) exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sor_files' AND column_name = 'version_number'
  ) THEN
    SELECT count(*) INTO v_revisions_count 
    FROM public.sor_files 
    WHERE version_number > 1;

    IF v_revisions_count > 0 THEN
      RAISE EXCEPTION 'PRE-ROLLBACK SAFETY ASSERTION FAILED: Found % files with version_number > 1. Rolling back would destroy revision history. Aborting transaction.', v_revisions_count;
    END IF;
  END IF;

  -- 3.2 Lineage Guard: Abort if revision parent links exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sor_files' AND column_name = 'parent_file_id'
  ) THEN
    SELECT count(*) INTO v_parent_links_count 
    FROM public.sor_files 
    WHERE parent_file_id IS NOT NULL;

    IF v_parent_links_count > 0 THEN
      RAISE EXCEPTION 'PRE-ROLLBACK SAFETY ASSERTION FAILED: Found % files linked via parent_file_id. Rolling back would break document lineage. Aborting transaction.', v_parent_links_count;
    END IF;
  END IF;

  -- 3.3 Authority Registry Guard: Abort if authority registry contains records
  IF v_auth_table_exists THEN
    SELECT count(*) INTO v_auth_registry_count FROM public.sor_authority_registry;
    IF v_auth_registry_count > 0 THEN
      RAISE EXCEPTION 'PRE-ROLLBACK SAFETY ASSERTION FAILED: Table public.sor_authority_registry contains % records. Cannot drop non-empty authority registry without an approved preservation strategy. Aborting transaction.', v_auth_registry_count;
    END IF;
  END IF;

  RAISE NOTICE 'PRE-ROLLBACK AUDIT PASSED: 0 revisions (v>1), 0 parent links, 0 authority records. Base counts: % files, % items, % groups, % members.',
    v_files_cnt, v_items_cnt, v_groups_cnt, v_members_cnt;

  -- --------------------------------------------------------------------------
  -- STEP 4: SAFE REMOVAL OF VERSIONING OBJECTS
  -- --------------------------------------------------------------------------

  -- 4.1 Drop foreign key constraint on parent_file_id if present
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'sor_files' 
      AND constraint_name = 'fk_sor_files_parent_file_id'
  ) THEN
    ALTER TABLE public.sor_files DROP CONSTRAINT fk_sor_files_parent_file_id;
  END IF;

  -- 4.2 Drop versioning indexes
  DROP INDEX IF EXISTS public.uq_sor_files_active_version;
  DROP INDEX IF EXISTS public.uq_sor_files_content_fingerprint;
  DROP INDEX IF EXISTS public.idx_sor_files_fingerprint;
  DROP INDEX IF EXISTS public.idx_sor_files_doc_version;
  DROP INDEX IF EXISTS public.idx_sor_files_doc_active;

  -- 4.3 Drop 8 versioning columns (is_test is NOT dropped - application ownership)
  ALTER TABLE public.sor_files
    DROP COLUMN IF EXISTS parent_file_id,
    DROP COLUMN IF EXISTS is_active,
    DROP COLUMN IF EXISTS version_number,
    DROP COLUMN IF EXISTS tender_reference,
    DROP COLUMN IF EXISTS document_title,
    DROP COLUMN IF EXISTS discipline,
    DROP COLUMN IF EXISTS document_key,
    DROP COLUMN IF EXISTS content_fingerprint;

  -- 4.4 Drop authority registry trigger, trigger function, and empty table
  DROP TRIGGER IF EXISTS trg_sor_authority_registry_updated_at ON public.sor_authority_registry;
  DROP FUNCTION IF EXISTS public.fn_sor_authority_registry_updated_at();
  DROP TABLE IF EXISTS public.sor_authority_registry;

  -- --------------------------------------------------------------------------
  -- STEP 5: POST-ROLLBACK ASSERTIONS (VERIFY COMPLETE CLEANUP & ZERO DATA LOSS)
  -- --------------------------------------------------------------------------

  -- 5.1 Assert all 8 versioning columns are gone
  SELECT count(*) INTO v_col_count
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'sor_files'
    AND column_name IN (
      'content_fingerprint', 'document_key', 'discipline', 
      'document_title', 'tender_reference', 'version_number', 
      'parent_file_id', 'is_active'
    );

  IF v_col_count <> 0 THEN
    RAISE EXCEPTION 'POST-ROLLBACK ASSERTION FAILED: Found % residual columns in sor_files.', v_col_count;
  END IF;

  -- 5.2 Assert authority registry table is gone
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sor_authority_registry'
  ) INTO v_auth_table_exists;

  IF v_auth_table_exists THEN
    RAISE EXCEPTION 'POST-ROLLBACK ASSERTION FAILED: Table public.sor_authority_registry still exists.';
  END IF;

  -- 5.3 Assert zero data loss across core business tables
  SELECT count(*) INTO v_post_files FROM public.sor_files;
  IF v_post_files <> v_files_cnt THEN
    RAISE EXCEPTION 'POST-ROLLBACK ASSERTION FAILED: Baseline sor_files count altered from % to %.', v_files_cnt, v_post_files;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sor_items') THEN
    SELECT count(*) INTO v_post_items FROM public.sor_items;
    IF v_post_items <> v_items_cnt THEN
      RAISE EXCEPTION 'POST-ROLLBACK ASSERTION FAILED: Baseline sor_items count altered from % to %.', v_items_cnt, v_post_items;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sor_item_groups') THEN
    SELECT count(*) INTO v_post_groups FROM public.sor_item_groups;
    IF v_post_groups <> v_groups_cnt THEN
      RAISE EXCEPTION 'POST-ROLLBACK ASSERTION FAILED: Baseline sor_item_groups count altered from % to %.', v_groups_cnt, v_post_groups;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sor_item_group_members') THEN
    SELECT count(*) INTO v_post_members FROM public.sor_item_group_members;
    IF v_post_members <> v_members_cnt THEN
      RAISE EXCEPTION 'POST-ROLLBACK ASSERTION FAILED: Baseline sor_item_group_members count altered from % to %.', v_members_cnt, v_post_members;
    END IF;
  END IF;

  RAISE NOTICE 'POST-ROLLBACK SUCCESS: All 8 versioning columns and registry dropped cleanly. Baseline counts preserved (files: %, items: %, groups: %, members: %).',
    v_post_files, v_post_items, v_post_groups, v_post_members;
END $$;

COMMIT;
