-- ============================================================================
-- MIGRATION: 20261125_stage4a_schema.sql
-- PURPOSE: Stage 4A Schema Preparation & Persistence Design
-- MODULE: Check Eligibility — Phase 4A Multi-Page Vision & Deterministic Evaluation
-- CONSTRAINTS:
--   1. Immutable audit logs with exception-raising triggers (ON DELETE RESTRICT ONLY)
--   2. Explicit privilege revocations (UPDATE/DELETE prohibited on audit tables)
--   3. Ordinary application roles cannot insert fabricated audit records (service_role only)
--   4. Versioned immutable proposal submissions
--   5. Canonical tender master datasets with SHA-256 integrity and in-place mutation freeze
--   6. Grounded evaluation results linked to exact dataset & proposal versions
--   7. Strict billing verification accounting (zero hardcoded cost assumption)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTEND EXISTING EXTRACTION INFRASTRUCTURE WITH BILLING ACCOUNTING
-- ----------------------------------------------------------------------------

-- Add billing verification columns to extraction_jobs if not already present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'extraction_jobs' AND column_name = 'billing_verification_status'
    ) THEN
        ALTER TABLE public.extraction_jobs 
            ADD COLUMN billing_verification_status VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN'
                CHECK (billing_verification_status IN ('VERIFIED_FREE', 'PAID', 'UNKNOWN', 'BLOCKED')),
            ADD COLUMN estimated_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.000000,
            ADD COLUMN actual_charge_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.000000;
    END IF;
END $$;

-- Add billing verification columns to batch_attempts if not already present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'batch_attempts' AND column_name = 'billing_verification_status'
    ) THEN
        ALTER TABLE public.batch_attempts 
            ADD COLUMN billing_verification_status VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN'
                CHECK (billing_verification_status IN ('VERIFIED_FREE', 'PAID', 'UNKNOWN', 'BLOCKED')),
            ADD COLUMN estimated_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.000000,
            ADD COLUMN actual_charge_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.000000;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. EXTEND CLAUSE EVIDENCE & STRUCTURED TABLES WITH HUMAN REVIEW ATTRIBUTES
-- ----------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'clause_evidence' AND column_name = 'review_status'
    ) THEN
        ALTER TABLE public.clause_evidence 
            ADD COLUMN review_status VARCHAR(32) NOT NULL DEFAULT 'PENDING_REVIEW'
                CHECK (review_status IN ('PENDING_REVIEW', 'APPROVED', 'CORRECTED', 'REJECTED', 'NEEDS_CLARIFICATION')),
            ADD COLUMN reviewed_by VARCHAR(255),
            ADD COLUMN reviewed_at TIMESTAMPTZ,
            ADD COLUMN corrected_value JSONB,
            ADD COLUMN correction_notes TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'structured_tables' AND column_name = 'review_status'
    ) THEN
        ALTER TABLE public.structured_tables 
            ADD COLUMN review_status VARCHAR(32) NOT NULL DEFAULT 'PENDING_REVIEW'
                CHECK (review_status IN ('PENDING_REVIEW', 'VERIFIED', 'CORRECTED')),
            ADD COLUMN reviewed_by VARCHAR(255),
            ADD COLUMN reviewed_at TIMESTAMPTZ,
            ADD COLUMN review_notes TEXT;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. IMMUTABLE APPEND-ONLY AUDIT LOGS FOR CRITERIA & TABLE CORRECTIONS
-- ----------------------------------------------------------------------------

-- Criteria Corrections Log (Strict ON DELETE RESTRICT — Never CASCADE)
CREATE TABLE IF NOT EXISTS public.criteria_corrections_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clause_id UUID NOT NULL REFERENCES public.clause_evidence(id) ON DELETE RESTRICT,
    job_id UUID NOT NULL REFERENCES public.extraction_jobs(id) ON DELETE RESTRICT,
    field_name VARCHAR(128) NOT NULL,
    original_ai_value JSONB NOT NULL,
    corrected_value JSONB NOT NULL,
    reviewer_id VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    source_page INT NOT NULL,
    source_clause_quote TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_criteria_corrections_clause ON public.criteria_corrections_log(clause_id);
CREATE INDEX IF NOT EXISTS idx_criteria_corrections_job ON public.criteria_corrections_log(job_id);
CREATE INDEX IF NOT EXISTS idx_criteria_corrections_reviewer ON public.criteria_corrections_log(reviewer_id);

-- Table Cell Corrections Log (Strict ON DELETE RESTRICT — Never CASCADE)
CREATE TABLE IF NOT EXISTS public.table_cell_corrections_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID NOT NULL REFERENCES public.structured_tables(id) ON DELETE RESTRICT,
    job_id UUID NOT NULL REFERENCES public.extraction_jobs(id) ON DELETE RESTRICT,
    row_index INT NOT NULL,
    column_index INT NOT NULL,
    column_name VARCHAR(255),
    original_ai_value JSONB NOT NULL,
    corrected_value JSONB NOT NULL,
    reviewer_id VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    source_page INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_table_corrections_table ON public.table_cell_corrections_log(table_id);
CREATE INDEX IF NOT EXISTS idx_table_corrections_job ON public.table_cell_corrections_log(job_id);

-- Trigger Function: Strictly block UPDATE and DELETE on audit logs
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit log records are immutable and append-only. Operations of type % are strictly prohibited on table %.',
        TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

-- Apply immutability triggers
DROP TRIGGER IF EXISTS trg_criteria_corrections_immutable ON public.criteria_corrections_log;
CREATE TRIGGER trg_criteria_corrections_immutable
    BEFORE UPDATE OR DELETE ON public.criteria_corrections_log
    FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS trg_table_cell_corrections_immutable ON public.table_cell_corrections_log;
CREATE TRIGGER trg_table_cell_corrections_immutable
    BEFORE UPDATE OR DELETE ON public.table_cell_corrections_log
    FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- Revoke application-role UPDATE, DELETE, and direct INSERT privileges
-- Ordinary client roles (anon, authenticated) CANNOT insert fabricated audit records
REVOKE ALL ON public.criteria_corrections_log FROM anon, authenticated;
REVOKE ALL ON public.table_cell_corrections_log FROM anon, authenticated;

-- Allow authenticated users to view audit records
GRANT SELECT ON public.criteria_corrections_log TO authenticated;
GRANT SELECT ON public.table_cell_corrections_log TO authenticated;

-- Only authorized backend operations (service_role) can append records
GRANT ALL ON public.criteria_corrections_log TO service_role;
GRANT ALL ON public.table_cell_corrections_log TO service_role;

-- ----------------------------------------------------------------------------
-- 4. TENDER MASTER DATASETS (CANONICAL PROVENANCE LEDGER)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tender_master_datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID NOT NULL,
    job_id UUID NOT NULL REFERENCES public.extraction_jobs(id) ON DELETE RESTRICT,
    version INT NOT NULL DEFAULT 1,
    canonical_content_hash CHAR(64) NOT NULL,
    finalized_by VARCHAR(255) NOT NULL,
    finalized_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    criteria_count INT NOT NULL CHECK (criteria_count > 0),
    tables_count INT NOT NULL DEFAULT 0,
    total_pages_verified INT NOT NULL CHECK (total_pages_verified > 0),
    completeness_audit_passed BOOLEAN NOT NULL CHECK (completeness_audit_passed = TRUE),
    completeness_audit_details JSONB NOT NULL,
    master_payload JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_tender_dataset_version UNIQUE (tender_id, version),
    CONSTRAINT uq_tender_dataset_hash UNIQUE (tender_id, canonical_content_hash)
);

CREATE INDEX IF NOT EXISTS idx_tender_master_datasets_tender ON public.tender_master_datasets(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_master_datasets_job ON public.tender_master_datasets(job_id);
CREATE INDEX IF NOT EXISTS idx_tender_master_datasets_hash ON public.tender_master_datasets(canonical_content_hash);

-- Trigger Function: Enforce Tender Master Dataset Immutability (Freeze in place)
CREATE OR REPLACE FUNCTION public.prevent_finalized_dataset_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Finalized tender master datasets are strictly immutable. Operations of type % are prohibited on table %. Corrections must create a new version.',
        TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tender_master_dataset_immutable ON public.tender_master_datasets;
CREATE TRIGGER trg_tender_master_dataset_immutable
    BEFORE UPDATE OR DELETE ON public.tender_master_datasets
    FOR EACH ROW EXECUTE FUNCTION public.prevent_finalized_dataset_mutation();

REVOKE UPDATE, DELETE ON public.tender_master_datasets FROM anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. VERSIONED BIDDER PROPOSAL SUBMISSIONS (IMMUTABLE FINALIZED VERSIONS)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tender_proposal_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID NOT NULL,
    dataset_id UUID NOT NULL REFERENCES public.tender_master_datasets(id) ON DELETE RESTRICT,
    submission_version INT NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'READY_FOR_EVALUATION', 'SUBMITTED', 'ARCHIVED')),
    proposal_title VARCHAR(255) NOT NULL,
    submitted_by VARCHAR(255),
    is_immutable BOOLEAN NOT NULL DEFAULT FALSE,
    finalized_at TIMESTAMPTZ,
    named_personnel_roster JSONB NOT NULL DEFAULT '{}'::jsonb,
    tender_instruments_dossier JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_tender_proposal_version UNIQUE (tender_id, submission_version)
);

CREATE INDEX IF NOT EXISTS idx_proposal_submissions_tender ON public.tender_proposal_submissions(tender_id);
CREATE INDEX IF NOT EXISTS idx_proposal_submissions_dataset ON public.tender_proposal_submissions(dataset_id);
CREATE INDEX IF NOT EXISTS idx_proposal_submissions_status ON public.tender_proposal_submissions(status);

-- Trigger Function: Enforce Proposal Submission Version Immutability
CREATE OR REPLACE FUNCTION public.prevent_finalized_proposal_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.status != 'DRAFT' OR OLD.is_immutable = TRUE THEN
            RAISE EXCEPTION 'Cannot delete finalized proposal submission (status: %, version: %). Historical proposal submission versions are permanently immutable.',
                OLD.status, OLD.submission_version;
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != 'DRAFT' OR OLD.is_immutable = TRUE THEN
            RAISE EXCEPTION 'Cannot update finalized proposal submission (status: %, version: %). Historical proposal submission versions are permanently immutable.',
                OLD.status, OLD.submission_version;
        END IF;
        -- If transitioning from DRAFT to a finalized state, lock it permanently
        IF NEW.status IN ('READY_FOR_EVALUATION', 'SUBMITTED', 'ARCHIVED') THEN
            NEW.is_immutable := TRUE;
            IF NEW.finalized_at IS NULL THEN
                NEW.finalized_at := timezone('utc'::text, now());
            END IF;
        END IF;
        NEW.updated_at := timezone('utc'::text, now());
        RETURN NEW;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_proposal_submission_immutable ON public.tender_proposal_submissions;
CREATE TRIGGER trg_proposal_submission_immutable
    BEFORE UPDATE OR DELETE ON public.tender_proposal_submissions
    FOR EACH ROW EXECUTE FUNCTION public.prevent_finalized_proposal_mutation();

-- ----------------------------------------------------------------------------
-- 6. TENDER EVALUATION RESULTS (GROUNDED & VERSION-LINKED)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tender_evaluation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID NOT NULL,
    dataset_id UUID NOT NULL REFERENCES public.tender_master_datasets(id) ON DELETE RESTRICT,
    proposal_submission_id UUID REFERENCES public.tender_proposal_submissions(id) ON DELETE RESTRICT,
    evaluator_version VARCHAR(64) NOT NULL,
    evaluation_timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    corporate_qualification_verdict VARCHAR(32) NOT NULL
        CHECK (corporate_qualification_verdict IN ('PASS', 'FAIL', 'CANNOT_CHECK')),
    proposal_readiness_status VARCHAR(32) NOT NULL
        CHECK (proposal_readiness_status IN ('COMPLETE', 'INCOMPLETE', 'NON_COMPLIANT')),
    overall_tender_verdict VARCHAR(64) NOT NULL
        CHECK (overall_tender_verdict IN ('QUALIFIED', 'DISQUALIFIED', 'CANNOT_DETERMINE')),
    financial_group_verdict VARCHAR(32) NOT NULL
        CHECK (financial_group_verdict IN ('PASS', 'FAIL', 'CANNOT_CHECK', 'INFO')),
    technical_group_verdict VARCHAR(32) NOT NULL
        CHECK (technical_group_verdict IN ('PASS', 'FAIL', 'CANNOT_CHECK', 'INFO')),
    others_group_verdict VARCHAR(32) NOT NULL
        CHECK (others_group_verdict IN ('PASS', 'FAIL', 'CANNOT_CHECK', 'INFO')),
    detailed_criteria_evaluations JSONB NOT NULL,
    evaluation_report_markdown TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_tender_eval_results_tender ON public.tender_evaluation_results(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_eval_results_dataset ON public.tender_evaluation_results(dataset_id);
CREATE INDEX IF NOT EXISTS idx_tender_eval_results_proposal ON public.tender_evaluation_results(proposal_submission_id);

-- ----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------

ALTER TABLE public.criteria_corrections_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_cell_corrections_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tender_master_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tender_proposal_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tender_evaluation_results ENABLE ROW LEVEL SECURITY;

-- Read policies for authenticated application users
CREATE POLICY "Allow read criteria_corrections_log" ON public.criteria_corrections_log
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read table_cell_corrections_log" ON public.table_cell_corrections_log
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read tender_master_datasets" ON public.tender_master_datasets
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read tender_proposal_submissions" ON public.tender_proposal_submissions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read tender_evaluation_results" ON public.tender_evaluation_results
    FOR SELECT TO authenticated USING (true);

-- Authorized backend insert policy for audit logs (service_role only)
-- Ordinary client roles (anon, authenticated) have NO insert policy
CREATE POLICY "Allow service_role insert criteria_corrections_log" ON public.criteria_corrections_log
    FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Allow service_role insert table_cell_corrections_log" ON public.table_cell_corrections_log
    FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Allow service_role insert tender_master_datasets" ON public.tender_master_datasets
    FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Allow insert tender_proposal_submissions" ON public.tender_proposal_submissions
    FOR INSERT TO authenticated WITH CHECK (status = 'DRAFT' OR is_immutable = FALSE);

CREATE POLICY "Allow update draft tender_proposal_submissions" ON public.tender_proposal_submissions
    FOR UPDATE TO authenticated USING (status = 'DRAFT' AND is_immutable = FALSE);

CREATE POLICY "Allow insert tender_evaluation_results" ON public.tender_evaluation_results
    FOR INSERT TO authenticated WITH CHECK (true);

-- End of Stage 4A Schema Preparation
