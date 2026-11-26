-- ============================================================================
-- ROLLBACK SCRIPT: 20261125_stage4a_rollback.sql
-- PURPOSE: Clean teardown and rollback of Stage 4A Schema Preparation
-- MODULE: Check Eligibility — Phase 4A Multi-Page Vision & Deterministic Evaluation
-- ============================================================================

-- 1. DROP POLICIES
DROP POLICY IF EXISTS "Allow read criteria_corrections_log" ON public.criteria_corrections_log;
DROP POLICY IF EXISTS "Allow read table_cell_corrections_log" ON public.table_cell_corrections_log;
DROP POLICY IF EXISTS "Allow read tender_master_datasets" ON public.tender_master_datasets;
DROP POLICY IF EXISTS "Allow read tender_proposal_submissions" ON public.tender_proposal_submissions;
DROP POLICY IF EXISTS "Allow read tender_evaluation_results" ON public.tender_evaluation_results;

DROP POLICY IF EXISTS "Allow service_role insert criteria_corrections_log" ON public.criteria_corrections_log;
DROP POLICY IF EXISTS "Allow service_role insert table_cell_corrections_log" ON public.table_cell_corrections_log;
DROP POLICY IF EXISTS "Allow service_role insert tender_master_datasets" ON public.tender_master_datasets;
DROP POLICY IF EXISTS "Allow insert criteria_corrections_log" ON public.criteria_corrections_log;
DROP POLICY IF EXISTS "Allow insert table_cell_corrections_log" ON public.table_cell_corrections_log;
DROP POLICY IF EXISTS "Allow insert tender_master_datasets" ON public.tender_master_datasets;
DROP POLICY IF EXISTS "Allow insert tender_proposal_submissions" ON public.tender_proposal_submissions;
DROP POLICY IF EXISTS "Allow update draft tender_proposal_submissions" ON public.tender_proposal_submissions;
DROP POLICY IF EXISTS "Allow insert tender_evaluation_results" ON public.tender_evaluation_results;

-- 2. DROP TRIGGERS
DROP TRIGGER IF EXISTS trg_criteria_corrections_immutable ON public.criteria_corrections_log;
DROP TRIGGER IF EXISTS trg_table_cell_corrections_immutable ON public.table_cell_corrections_log;
DROP TRIGGER IF EXISTS trg_tender_master_dataset_immutable ON public.tender_master_datasets;
DROP TRIGGER IF EXISTS trg_proposal_submission_immutable ON public.tender_proposal_submissions;

-- 3. DROP TRIGGER FUNCTIONS
DROP FUNCTION IF EXISTS public.prevent_audit_log_mutation();
DROP FUNCTION IF EXISTS public.prevent_finalized_dataset_mutation();
DROP FUNCTION IF EXISTS public.prevent_finalized_proposal_mutation();

-- 4. DROP TABLES (Strict Reverse Dependency Order)
DROP TABLE IF EXISTS public.tender_evaluation_results CASCADE;
DROP TABLE IF EXISTS public.tender_proposal_submissions CASCADE;
DROP TABLE IF EXISTS public.tender_master_datasets CASCADE;
DROP TABLE IF EXISTS public.table_cell_corrections_log CASCADE;
DROP TABLE IF EXISTS public.criteria_corrections_log CASCADE;

-- 5. REMOVE EXTENSION COLUMNS
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'structured_tables' AND column_name = 'review_status'
    ) THEN
        ALTER TABLE public.structured_tables 
            DROP COLUMN IF EXISTS review_status,
            DROP COLUMN IF EXISTS reviewed_by,
            DROP COLUMN IF EXISTS reviewed_at,
            DROP COLUMN IF EXISTS review_notes;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'clause_evidence' AND column_name = 'review_status'
    ) THEN
        ALTER TABLE public.clause_evidence 
            DROP COLUMN IF EXISTS review_status,
            DROP COLUMN IF EXISTS reviewed_by,
            DROP COLUMN IF EXISTS reviewed_at,
            DROP COLUMN IF EXISTS corrected_value,
            DROP COLUMN IF EXISTS correction_notes;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'batch_attempts' AND column_name = 'billing_verification_status'
    ) THEN
        ALTER TABLE public.batch_attempts 
            DROP COLUMN IF EXISTS billing_verification_status,
            DROP COLUMN IF EXISTS estimated_cost_usd,
            DROP COLUMN IF EXISTS actual_charge_usd;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'extraction_jobs' AND column_name = 'billing_verification_status'
    ) THEN
        ALTER TABLE public.extraction_jobs 
            DROP COLUMN IF EXISTS billing_verification_status,
            DROP COLUMN IF EXISTS estimated_cost_usd,
            DROP COLUMN IF EXISTS actual_charge_usd;
    END IF;
END $$;

-- End of Stage 4A Rollback Script
