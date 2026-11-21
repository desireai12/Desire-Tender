-- Migration: 20261121_tender_vision_extraction.sql
-- Purpose: Schema, Composite Foreign Keys, Hardened Functions, and Strict RLS for Check Eligibility Upgrade (Phase 2 Final)
-- Architecture: Multi-page document vision extraction, durable batch tracking, clause evidence, and structural anchors.
-- STRICT: No existing tables, existing evaluator, or existing application schemas are modified.

-- ====================================================================
-- 1. PARENT EXTRACTION JOBS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.extraction_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id VARCHAR(100) NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'INITIALIZING', 'MAPPING', 'EXTRACTING', 'AUDITING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    total_pages INTEGER NOT NULL CHECK (total_pages >= 0),
    processed_pages INTEGER NOT NULL DEFAULT 0 CHECK (processed_pages >= 0 AND processed_pages <= total_pages),
    terminal_pages INTEGER NOT NULL DEFAULT 0 CHECK (terminal_pages >= 0 AND terminal_pages <= total_pages),
    processed_page_impressions INTEGER NOT NULL DEFAULT 0 CHECK (processed_page_impressions >= 0),
    total_batches INTEGER NOT NULL DEFAULT 0 CHECK (total_batches >= 0),
    completed_batches INTEGER NOT NULL DEFAULT 0 CHECK (completed_batches >= 0 AND completed_batches <= total_batches),
    document_map JSONB DEFAULT '{}'::jsonb,
    document_hash VARCHAR(64),
    source_file_url TEXT,
    error_message TEXT,
    total_input_tokens BIGINT NOT NULL DEFAULT 0 CHECK (total_input_tokens >= 0),
    total_output_tokens BIGINT NOT NULL DEFAULT 0 CHECK (total_output_tokens >= 0),
    total_thinking_tokens BIGINT NOT NULL DEFAULT 0 CHECK (total_thinking_tokens >= 0),
    total_cached_tokens BIGINT NOT NULL DEFAULT 0 CHECK (total_cached_tokens >= 0),
    total_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.000000 CHECK (total_cost_usd >= 0),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 2. DOCUMENT PAGES TABLE (Page-to-job provenance & disposition machine)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.document_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.extraction_jobs(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL CHECK (page_number >= 1),
    disposition VARCHAR(50) NOT NULL DEFAULT 'PENDING'
        CHECK (disposition IN ('PENDING', 'PROCESSING', 'PROCESSING_RETRY', 'RELEVANT', 'REVIEWED_NO_CRITERIA', 'NEEDS_REVIEW', 'NEEDS_REVIEW_EXHAUSTED', 'UNREADABLE', 'FAILED')),
    is_material BOOLEAN NOT NULL DEFAULT TRUE,
    detected_category VARCHAR(50)
        CHECK (detected_category IS NULL OR detected_category IN ('FINANCIAL', 'TECHNICAL', 'OTHERS', 'GENERAL_CONDITIONS', 'LEGAL_ADMIN', 'IRRELEVANT', 'UNKNOWN')),
    has_tables BOOLEAN NOT NULL DEFAULT FALSE,
    has_qualification_criteria BOOLEAN NOT NULL DEFAULT FALSE,
    extracted_text TEXT,
    token_count INTEGER NOT NULL DEFAULT 0 CHECK (token_count >= 0),
    review_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_document_pages_job_page UNIQUE (job_id, page_number)
);

-- ====================================================================
-- 3. EXTRACTION BATCHES TABLE (Sequential batch splits with leases)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.extraction_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.extraction_jobs(id) ON DELETE CASCADE,
    batch_index INTEGER NOT NULL CHECK (batch_index >= 1),
    start_page INTEGER NOT NULL CHECK (start_page >= 1),
    end_page INTEGER NOT NULL CHECK (end_page >= 1),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING')),
    model_used VARCHAR(100),
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts >= 1),
    lease_token UUID,
    leased_until TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_batch_pages CHECK (end_page >= start_page),
    CONSTRAINT uq_extraction_batches_job_batch_id UNIQUE (job_id, id),
    CONSTRAINT uq_extraction_batches_job_idx UNIQUE (job_id, batch_index)
);

-- Trigger: Ensure batch page ranges cannot exceed job total_pages
CREATE OR REPLACE FUNCTION public.check_batch_page_boundary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_job_total_pages INTEGER;
BEGIN
    SELECT total_pages INTO v_job_total_pages
    FROM public.extraction_jobs
    WHERE id = NEW.job_id;

    IF v_job_total_pages IS NOT NULL AND v_job_total_pages > 0 AND NEW.end_page > v_job_total_pages THEN
        RAISE EXCEPTION 'Batch end_page (%) cannot exceed job total_pages (%)', NEW.end_page, v_job_total_pages;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_batch_page_boundary ON public.extraction_batches;
CREATE TRIGGER trg_batch_page_boundary
    BEFORE INSERT OR UPDATE ON public.extraction_batches
    FOR EACH ROW
    EXECUTE FUNCTION public.check_batch_page_boundary();

-- Trigger: Page disposition state transition validation
CREATE OR REPLACE FUNCTION public.check_page_disposition_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF OLD.disposition = NEW.disposition THEN
        RETURN NEW;
    END IF;

    -- Disallow resetting reviewed terminal pages back to PENDING
    IF OLD.disposition IN ('RELEVANT', 'REVIEWED_NO_CRITERIA', 'NEEDS_REVIEW_EXHAUSTED', 'UNREADABLE') AND NEW.disposition = 'PENDING' THEN
        RAISE EXCEPTION 'Invalid transition: cannot reset reviewed page from % back to PENDING', OLD.disposition;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_page_disposition_transition ON public.document_pages;
CREATE TRIGGER trg_page_disposition_transition
    BEFORE UPDATE ON public.document_pages
    FOR EACH ROW
    EXECUTE FUNCTION public.check_page_disposition_transition();

-- ====================================================================
-- 4. BATCH ATTEMPTS TABLE (Durable audit log & cost/token accounting)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.batch_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL,
    batch_id UUID NOT NULL,
    attempt_number INTEGER NOT NULL CHECK (attempt_number >= 1),
    status VARCHAR(50) NOT NULL
        CHECK (status IN ('RUNNING', 'SUCCEEDED', 'FAILED', 'RATE_LIMITED', 'TIMED_OUT')),
    model_called VARCHAR(100) NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
    output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
    thinking_tokens INTEGER NOT NULL DEFAULT 0 CHECK (thinking_tokens >= 0),
    cached_tokens INTEGER NOT NULL DEFAULT 0 CHECK (cached_tokens >= 0),
    cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.000000 CHECK (cost_usd >= 0),
    latency_ms INTEGER NOT NULL DEFAULT 0 CHECK (latency_ms >= 0),
    error_type VARCHAR(100),
    error_details TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Cross-job composite FK: attempt must match batch of the exact same job
    CONSTRAINT fk_batch_attempt_batch FOREIGN KEY (job_id, batch_id)
        REFERENCES public.extraction_batches(job_id, id) ON DELETE CASCADE,
    CONSTRAINT uq_batch_attempts_batch_attempt UNIQUE (batch_id, attempt_number)
);

-- ====================================================================
-- 5. STRUCTURED TABLES TABLE (Reconstructed multi-page tables)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.structured_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.extraction_jobs(id) ON DELETE CASCADE,
    table_identifier VARCHAR(100) NOT NULL,
    start_page INTEGER NOT NULL CHECK (start_page >= 1),
    end_page INTEGER NOT NULL CHECK (end_page >= 1),
    category VARCHAR(50) NOT NULL CHECK (category IN ('FINANCIAL', 'TECHNICAL', 'OTHERS', 'GENERAL')),
    title TEXT,
    headers JSONB NOT NULL DEFAULT '[]'::jsonb,
    rows JSONB NOT NULL DEFAULT '[]'::jsonb,
    footnotes JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_multi_page BOOLEAN NOT NULL DEFAULT FALSE,
    reconstruction_confidence NUMERIC(3, 2) DEFAULT 1.00
        CHECK (reconstruction_confidence >= 0.00 AND reconstruction_confidence <= 1.00),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_table_pages CHECK (end_page >= start_page),
    CONSTRAINT uq_structured_tables_job_id UNIQUE (job_id, id),
    CONSTRAINT uq_structured_tables_job_identifier UNIQUE (job_id, table_identifier)
);

-- ====================================================================
-- 6. CLAUSE EVIDENCE TABLE (Verbatim evidence with composite FK isolation)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.clause_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.extraction_jobs(id) ON DELETE CASCADE,
    criterion_type VARCHAR(50) NOT NULL CHECK (criterion_type IN ('FINANCIAL', 'TECHNICAL', 'OTHERS')),
    clause_number VARCHAR(100),
    source_page INTEGER NOT NULL CHECK (source_page >= 1),
    batch_id UUID,
    table_id UUID,
    verbatim_quote TEXT NOT NULL,
    summary TEXT NOT NULL,
    materiality VARCHAR(20) NOT NULL DEFAULT 'MANDATORY'
        CHECK (materiality IN ('MANDATORY', 'EVALUATED_SCORE', 'INFORMATIONAL', 'DISQUALIFYING')),
    parameter_key VARCHAR(100),
    extracted_value JSONB,
    confidence NUMERIC(3, 2) DEFAULT 1.00
        CHECK (confidence >= 0.00 AND confidence <= 1.00),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Cross-job composite FK: source_page must belong to this job's document_pages
    CONSTRAINT fk_evidence_page FOREIGN KEY (job_id, source_page)
        REFERENCES public.document_pages(job_id, page_number) ON DELETE CASCADE,
    -- Cross-job composite FK: table_id (optional) must belong to this job's structured_tables
    CONSTRAINT fk_evidence_table FOREIGN KEY (job_id, table_id)
        REFERENCES public.structured_tables(job_id, id) ON DELETE NO ACTION,
    -- Cross-job composite FK: batch_id (optional) must belong to this job's extraction_batches
    CONSTRAINT fk_evidence_batch FOREIGN KEY (job_id, batch_id)
        REFERENCES public.extraction_batches(job_id, id) ON DELETE NO ACTION
);

-- ====================================================================
-- 7. STRUCTURAL ANCHORS TABLE (Normalized Document Structure Anchors)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.structural_anchors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.extraction_jobs(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL CHECK (page_number >= 1),
    batch_id UUID,
    anchor_type VARCHAR(50) NOT NULL
        CHECK (anchor_type IN ('CHAPTER_HEADING', 'TABLE_OF_CONTENTS', 'NIT_HEADER', 'ANNEXURE', 'SCHEDULE', 'QUALIFICATION_CRITERIA', 'EVALUATION_METRICS', 'TECHNICAL_SPECS', 'FINANCIAL_FORMAT', 'OTHER')),
    anchor_name VARCHAR(150) NOT NULL,
    section_number VARCHAR(50),
    confidence NUMERIC(3, 2) DEFAULT 1.00
        CHECK (confidence >= 0.00 AND confidence <= 1.00),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Cross-job composite FK: page_number must exist in document_pages of this job
    CONSTRAINT fk_anchor_page FOREIGN KEY (job_id, page_number)
        REFERENCES public.document_pages(job_id, page_number) ON DELETE CASCADE,
    -- Cross-job composite FK: batch_id (optional) must exist in extraction_batches of this job
    CONSTRAINT fk_anchor_batch FOREIGN KEY (job_id, batch_id)
        REFERENCES public.extraction_batches(job_id, id) ON DELETE NO ACTION,
    CONSTRAINT uq_structural_anchors_job_name_page UNIQUE (job_id, anchor_name, page_number)
);

-- ====================================================================
-- 8. COMPOSITE FK SAFE DELETION TRIGGERS (Nullable references preservation)
-- ====================================================================
-- When a structured_table is deleted, only set clause_evidence.table_id to NULL.
-- Preserves job_id (NOT NULL) without triggering composite ON DELETE SET NULL error.
CREATE OR REPLACE FUNCTION public.handle_structured_table_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.clause_evidence
    SET table_id = NULL
    WHERE job_id = OLD.job_id AND table_id = OLD.id;

    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_structured_table_delete ON public.structured_tables;
CREATE TRIGGER trg_structured_table_delete
    BEFORE DELETE ON public.structured_tables
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_structured_table_delete();

-- When an extraction_batch is deleted, only set batch_id to NULL in referencing rows.
-- Preserves job_id (NOT NULL) in clause_evidence and structural_anchors.
CREATE OR REPLACE FUNCTION public.handle_batch_delete_references()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.clause_evidence
    SET batch_id = NULL
    WHERE job_id = OLD.job_id AND batch_id = OLD.id;

    UPDATE public.structural_anchors
    SET batch_id = NULL
    WHERE job_id = OLD.job_id AND batch_id = OLD.id;

    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_batch_delete_references ON public.extraction_batches;
CREATE TRIGGER trg_batch_delete_references
    BEFORE DELETE ON public.extraction_batches
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_batch_delete_references();

-- ====================================================================
-- 9. HARDENED SECURITY DEFINER FUNCTIONS (Pinned search_path = '')
-- ====================================================================

-- 9.1 Structural Anchor Upsert Function (Strictly service_role)
CREATE OR REPLACE FUNCTION public.upsert_structural_anchor(
    p_job_id UUID,
    p_page_number INTEGER,
    p_anchor_type VARCHAR(50),
    p_anchor_name VARCHAR(150),
    p_batch_id UUID DEFAULT NULL,
    p_section_number VARCHAR(50) DEFAULT NULL,
    p_confidence NUMERIC(3, 2) DEFAULT 1.00,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_id UUID;
BEGIN
    -- Validate anchor type
    IF p_anchor_type NOT IN ('CHAPTER_HEADING', 'TABLE_OF_CONTENTS', 'NIT_HEADER', 'ANNEXURE', 'SCHEDULE', 'QUALIFICATION_CRITERIA', 'EVALUATION_METRICS', 'TECHNICAL_SPECS', 'FINANCIAL_FORMAT', 'OTHER') THEN
        RAISE EXCEPTION 'Invalid anchor_type: %', p_anchor_type;
    END IF;

    -- Validate page number exists for this extraction job
    IF NOT EXISTS (
        SELECT 1 FROM public.document_pages
        WHERE job_id = p_job_id AND page_number = p_page_number
    ) THEN
        RAISE EXCEPTION 'Page % does not exist in document_pages for job %', p_page_number, p_job_id;
    END IF;

    -- Validate optional batch_id belongs to same job
    IF p_batch_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.extraction_batches
        WHERE job_id = p_job_id AND id = p_batch_id
    ) THEN
        RAISE EXCEPTION 'Batch % does not belong to job %', p_batch_id, p_job_id;
    END IF;

    INSERT INTO public.structural_anchors (
        job_id,
        page_number,
        batch_id,
        anchor_type,
        anchor_name,
        section_number,
        confidence,
        metadata
    )
    VALUES (
        p_job_id,
        p_page_number,
        p_batch_id,
        p_anchor_type,
        p_anchor_name,
        p_section_number,
        p_confidence,
        p_metadata
    )
    ON CONFLICT (job_id, anchor_name, page_number)
    DO UPDATE SET
        batch_id = COALESCE(EXCLUDED.batch_id, public.structural_anchors.batch_id),
        anchor_type = EXCLUDED.anchor_type,
        section_number = COALESCE(EXCLUDED.section_number, public.structural_anchors.section_number),
        confidence = EXCLUDED.confidence,
        metadata = public.structural_anchors.metadata || EXCLUDED.metadata
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_structural_anchor(UUID, INTEGER, VARCHAR, VARCHAR, UUID, VARCHAR, NUMERIC, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_structural_anchor(UUID, INTEGER, VARCHAR, VARCHAR, UUID, VARCHAR, NUMERIC, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_structural_anchor(UUID, INTEGER, VARCHAR, VARCHAR, UUID, VARCHAR, NUMERIC, JSONB) TO service_role;

-- 9.2 Tender Access Authorization Function (Fully Qualified, Pinned Search Path)
CREATE OR REPLACE FUNCTION public.check_user_tender_access(p_tender_id VARCHAR(100))
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_role VARCHAR(100);
    v_user_dept VARCHAR(100);
    v_user_perms JSONB;
    v_user_projects JSONB;
    v_tender_dept VARCHAR(100);
    v_tender_category VARCHAR(50);
BEGIN
    -- 1. Service role always has server-side execution access
    IF pg_catalog.coalesce(auth.jwt()->>'role', '') = 'service_role' OR CURRENT_USER = 'service_role' THEN
        RETURN TRUE;
    END IF;

    -- 2. Deny unauthenticated requests
    IF auth.uid() IS NULL AND (auth.jwt()->>'employee_id') IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 3. Lookup user record in public.users
    SELECT u.role, u.department, u.permissions, u.assigned_projects
    INTO v_user_role, v_user_dept, v_user_perms, v_user_projects
    FROM public.users u
    WHERE (u.id = auth.uid() OR u.employee_id = (auth.jwt()->>'employee_id'))
      AND u.status = 'Active'
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- 4. Administrator has company-wide access
    IF v_user_role IN ('Administrator', 'Admin') THEN
        RETURN TRUE;
    END IF;

    -- 5. User MUST have the 'eligibility' permission
    IF v_user_perms IS NULL OR NOT (v_user_perms ? 'eligibility') THEN
        RETURN FALSE;
    END IF;

    -- 6. Retrieve target tender department and project category
    SELECT t.department_assigned, t.project_category
    INTO v_tender_dept, v_tender_category
    FROM public.tenders t
    WHERE t.id = p_tender_id
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- 7. Strict department isolation: user department must match tender department (case-insensitive)
    IF pg_catalog.lower(pg_catalog.trim(v_user_dept)) <> pg_catalog.lower(pg_catalog.trim(v_tender_dept)) THEN
        RETURN FALSE;
    END IF;

    -- 8. Assigned projects isolation: user assigned_projects array must contain tender's project_category
    IF v_user_projects IS NOT NULL AND pg_catalog.jsonb_array_length(v_user_projects) > 0 THEN
        IF NOT (v_user_projects ? v_tender_category) THEN
            RETURN FALSE;
        END IF;
    END IF;

    RETURN TRUE;
END;
$$;

-- 9.3 Job Access Helper Function (Fully Qualified, Pinned Search Path)
CREATE OR REPLACE FUNCTION public.check_user_extraction_job_access(p_job_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_tender_id VARCHAR(100);
BEGIN
    IF pg_catalog.coalesce(auth.jwt()->>'role', '') = 'service_role' OR CURRENT_USER = 'service_role' THEN
        RETURN TRUE;
    END IF;

    SELECT j.tender_id INTO v_tender_id
    FROM public.extraction_jobs j
    WHERE j.id = p_job_id
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    RETURN public.check_user_tender_access(v_tender_id);
END;
$$;

REVOKE ALL ON FUNCTION public.check_user_tender_access(VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_user_tender_access(VARCHAR) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.check_user_extraction_job_access(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_user_extraction_job_access(UUID) TO authenticated, service_role;

-- ====================================================================
-- 10. ATOMIC BATCH LEASING, ATTEMPT ALLOCATION & JOB ACCOUNTING
-- ====================================================================

-- 10.1 Atomic Batch Claim / Lease Function
CREATE OR REPLACE FUNCTION public.claim_extraction_batch(
    p_job_id UUID,
    p_batch_id UUID,
    p_worker_token UUID,
    p_lease_duration_seconds INTEGER DEFAULT 300
)
RETURNS TABLE (
    claimed BOOLEAN,
    status VARCHAR(50),
    attempt_number INTEGER,
    attempt_id UUID,
    error_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_batch RECORD;
    v_next_attempt INTEGER;
    v_attempt_id UUID;
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
    v_lease_expiry TIMESTAMPTZ := v_now + (p_lease_duration_seconds * INTERVAL '1 second');
BEGIN
    -- 0. Reject NULL worker token (cannot bypass lease protection)
    IF p_worker_token IS NULL THEN
        RETURN QUERY SELECT FALSE, 'INVALID_TOKEN'::VARCHAR(50), 0, NULL::UUID, 'Worker token must not be null'::TEXT;
        RETURN;
    END IF;

    -- 1. Acquire exclusive row lock on extraction_batches
    SELECT b.id, b.job_id, b.status, b.attempt_count, b.max_attempts, b.lease_token, b.leased_until, b.start_page, b.end_page
    INTO v_batch
    FROM public.extraction_batches b
    WHERE b.id = p_batch_id AND b.job_id = p_job_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'NOT_FOUND'::VARCHAR(50), 0, NULL::UUID, 'Batch not found'::TEXT;
        RETURN;
    END IF;

    -- 2. Strict Idempotency: If already completed, reject immediately
    IF v_batch.status = 'COMPLETED' THEN
        RETURN QUERY SELECT FALSE, 'COMPLETED'::VARCHAR(50), v_batch.attempt_count, NULL::UUID, 'Batch already completed'::TEXT;
        RETURN;
    END IF;

    -- 3. Active Lease Protection: Second worker cannot acquire active lease; same worker cannot duplicate attempts
    IF v_batch.status = 'PROCESSING' AND v_batch.leased_until IS NOT NULL AND v_batch.leased_until > v_now THEN
        IF v_batch.lease_token = p_worker_token THEN
            RETURN QUERY SELECT FALSE, 'ALREADY_LEASED_BY_CALLER'::VARCHAR(50), v_batch.attempt_count, NULL::UUID, 'Caller already holds active lease on this batch'::TEXT;
            RETURN;
        ELSE
            RETURN QUERY SELECT FALSE, 'LOCKED'::VARCHAR(50), v_batch.attempt_count, NULL::UUID, 'Batch actively leased by another worker'::TEXT;
            RETURN;
        END IF;
    END IF;

    -- 4. Maximum Attempt Enforcement: Enforced across FAILED, RETRYING, and expired-lease PROCESSING
    -- A worker crash cannot permit unlimited retries once max_attempts is reached.
    IF v_batch.attempt_count >= v_batch.max_attempts THEN
        UPDATE public.extraction_batches
        SET status = 'FAILED',
            lease_token = NULL,
            leased_until = NULL,
            updated_at = v_now
        WHERE id = p_batch_id;

        -- Terminal disposition for pages belonging to this failed batch
        UPDATE public.document_pages
        SET disposition = 'NEEDS_REVIEW_EXHAUSTED',
            review_notes = 'Batch ' || p_batch_id || ' exhausted all ' || v_batch.max_attempts || ' attempts after worker failure',
            updated_at = v_now
        WHERE job_id = p_job_id
          AND page_number >= v_batch.start_page
          AND page_number <= v_batch.end_page
          AND disposition IN ('PENDING', 'PROCESSING', 'PROCESSING_RETRY');

        RETURN QUERY SELECT FALSE, 'MAX_ATTEMPTS_EXCEEDED'::VARCHAR(50), v_batch.attempt_count, NULL::UUID, 'Maximum attempts exhausted'::TEXT;
        RETURN;
    END IF;

    -- 5. Atomically allocate next attempt number
    v_next_attempt := v_batch.attempt_count + 1;

    -- 6. Claim batch and assign lease
    UPDATE public.extraction_batches
    SET status = 'PROCESSING',
        attempt_count = v_next_attempt,
        lease_token = p_worker_token,
        leased_until = v_lease_expiry,
        updated_at = v_now
    WHERE id = p_batch_id;

    -- 7. Insert attempt record inside the same transaction
    INSERT INTO public.batch_attempts (
        job_id,
        batch_id,
        attempt_number,
        status,
        model_called,
        started_at
    )
    VALUES (
        p_job_id,
        p_batch_id,
        v_next_attempt,
        'RUNNING',
        'PENDING_MODEL',
        v_now
    )
    RETURNING id INTO v_attempt_id;

    -- 8. Mark pages as PROCESSING
    UPDATE public.document_pages
    SET disposition = 'PROCESSING',
        updated_at = v_now
    WHERE job_id = p_job_id
      AND page_number >= v_batch.start_page
      AND page_number <= v_batch.end_page
      AND disposition IN ('PENDING', 'PROCESSING_RETRY');

    RETURN QUERY SELECT TRUE, 'PROCESSING'::VARCHAR(50), v_next_attempt, v_attempt_id, NULL::TEXT;
END;
$$;

-- 10.2 Atomic Batch Complete & Job Accounting Function (Idempotent & Unique Page Accounting)
CREATE OR REPLACE FUNCTION public.complete_extraction_batch(
    p_job_id UUID,
    p_batch_id UUID,
    p_attempt_id UUID,
    p_worker_token UUID,
    p_model_used VARCHAR(100),
    p_input_tokens INTEGER,
    p_output_tokens INTEGER,
    p_thinking_tokens INTEGER,
    p_cached_tokens INTEGER,
    p_cost_usd NUMERIC(10, 6),
    p_latency_ms INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_batch RECORD;
    v_job RECORD;
    v_completed_batches INTEGER;
    v_processed_page_impressions INTEGER;
    v_terminal_pages INTEGER;
    v_successfully_reviewed_pages INTEGER;
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
BEGIN
    -- 0. Reject NULL worker token
    IF p_worker_token IS NULL THEN
        RAISE EXCEPTION 'Worker token must not be null';
    END IF;

    -- 1. Lock batch row with FOR UPDATE (Lock Level 1: Child extraction_batches)
    SELECT b.id, b.status, b.start_page, b.end_page, b.lease_token, b.leased_until
    INTO v_batch
    FROM public.extraction_batches b
    WHERE b.id = p_batch_id AND b.job_id = p_job_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Batch % not found for job %', p_batch_id, p_job_id;
    END IF;

    -- 2. Idempotency Guard: A batch can be counted as completed only once
    -- Duplicate completion invocations are safe no-ops and cannot increment job counters twice.
    IF v_batch.status = 'COMPLETED' THEN
        RETURN FALSE;
    END IF;

    -- 3. Stale Worker & Lease Expiry Guard
    -- A worker with an expired lease must not complete a batch, even if no replacement worker has claimed it yet.
    IF v_batch.status <> 'PROCESSING' OR v_batch.lease_token IS DISTINCT FROM p_worker_token THEN
        RAISE EXCEPTION 'Stale worker or invalid lease ownership on batch %. Current lease: %', p_batch_id, v_batch.lease_token;
    END IF;

    IF v_batch.leased_until IS NULL OR v_batch.leased_until <= v_now THEN
        RAISE EXCEPTION 'Worker lease has expired on batch %. Leased until: %, Current time: %', p_batch_id, v_batch.leased_until, v_now;
    END IF;

    -- 4. Verify attempt belongs to this batch and is currently RUNNING
    IF NOT EXISTS (
        SELECT 1 FROM public.batch_attempts
        WHERE id = p_attempt_id AND job_id = p_job_id AND batch_id = p_batch_id AND status = 'RUNNING'
    ) THEN
        RAISE EXCEPTION 'Attempt % is not in RUNNING status for batch %', p_attempt_id, p_batch_id;
    END IF;

    -- 5. Complete attempt record
    UPDATE public.batch_attempts
    SET status = 'SUCCEEDED',
        model_called = p_model_used,
        input_tokens = p_input_tokens,
        output_tokens = p_output_tokens,
        thinking_tokens = p_thinking_tokens,
        cached_tokens = p_cached_tokens,
        cost_usd = p_cost_usd,
        latency_ms = p_latency_ms,
        finished_at = v_now
    WHERE id = p_attempt_id AND job_id = p_job_id AND batch_id = p_batch_id;

    -- 6. Mark batch COMPLETED and release lease
    -- Note: Page dispositions are NOT modified here. A completed background batch does not prove that
    -- a page contains no criteria; page disposition changes belong strictly to extraction and audit stages.
    UPDATE public.extraction_batches
    SET status = 'COMPLETED',
        model_used = p_model_used,
        lease_token = NULL,
        leased_until = NULL,
        error_message = NULL,
        updated_at = v_now
    WHERE id = p_batch_id;

    -- 7. Lock parent extraction_jobs row (Lock Level 2: Parent extraction_jobs FOR UPDATE)
    -- Serializes aggregate accounting across concurrent batch completions to prevent lost updates or stale counters.
    SELECT j.id, j.total_pages, j.total_batches
    INTO v_job
    FROM public.extraction_jobs j
    WHERE j.id = p_job_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Extraction job % not found', p_job_id;
    END IF;

    -- 8. Recalculate exact committed batch units and page impressions across all completed batches
    SELECT
        pg_catalog.count(*),
        pg_catalog.coalesce(pg_catalog.sum(b.end_page - b.start_page + 1), 0)
    INTO v_completed_batches, v_processed_page_impressions
    FROM public.extraction_batches b
    WHERE b.job_id = p_job_id AND b.status = 'COMPLETED';

    -- 9. Calculate UNIQUE pages reaching ANY terminal disposition
    SELECT pg_catalog.count(DISTINCT p.page_number)
    INTO v_terminal_pages
    FROM public.document_pages p
    WHERE p.job_id = p_job_id
      AND p.disposition IN ('RELEVANT', 'REVIEWED_NO_CRITERIA', 'NEEDS_REVIEW_EXHAUSTED', 'UNREADABLE', 'FAILED');

    -- 10. Calculate UNIQUE pages successfully processed and reviewed (excluding FAILED, UNREADABLE, NEEDS_REVIEW_EXHAUSTED)
    SELECT pg_catalog.count(DISTINCT p.page_number)
    INTO v_successfully_reviewed_pages
    FROM public.document_pages p
    WHERE p.job_id = p_job_id
      AND p.disposition IN ('RELEVANT', 'REVIEWED_NO_CRITERIA');

    -- 11. Atomically update extraction_jobs progress counters under parent row lock
    -- Separate metrics: completed_batches, processed_page_impressions, terminal_pages, processed_pages (capped at total_pages)
    UPDATE public.extraction_jobs
    SET completed_batches = v_completed_batches,
        processed_page_impressions = v_processed_page_impressions,
        terminal_pages = pg_catalog.least(v_job.total_pages, v_terminal_pages),
        processed_pages = pg_catalog.least(v_job.total_pages, v_successfully_reviewed_pages),
        total_input_tokens = total_input_tokens + p_input_tokens,
        total_output_tokens = total_output_tokens + p_output_tokens,
        total_thinking_tokens = total_thinking_tokens + p_thinking_tokens,
        total_cached_tokens = total_cached_tokens + p_cached_tokens,
        total_cost_usd = total_cost_usd + p_cost_usd,
        status = CASE WHEN v_completed_batches >= v_job.total_batches THEN 'COMPLETED' ELSE status END,
        completed_at = CASE WHEN v_completed_batches >= v_job.total_batches THEN v_now ELSE completed_at END,
        updated_at = v_now
    WHERE id = p_job_id;

    RETURN TRUE;
END;
$$;

-- 10.3 Atomic Batch Failure & Retry Handler Function
CREATE OR REPLACE FUNCTION public.fail_extraction_batch(
    p_job_id UUID,
    p_batch_id UUID,
    p_attempt_id UUID,
    p_worker_token UUID,
    p_status VARCHAR(50), -- 'FAILED' or 'RATE_LIMITED'
    p_error_type VARCHAR(100),
    p_error_details TEXT,
    p_latency_ms INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_start_page INTEGER;
    v_end_page INTEGER;
    v_attempt_count INTEGER;
    v_max_attempts INTEGER;
    v_lease_token UUID;
    v_leased_until TIMESTAMPTZ;
    v_is_exhausted BOOLEAN;
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
BEGIN
    IF p_worker_token IS NULL THEN
        RAISE EXCEPTION 'Worker token must not be null';
    END IF;

    SELECT b.start_page, b.end_page, b.attempt_count, b.max_attempts, b.lease_token, b.leased_until
    INTO v_start_page, v_end_page, v_attempt_count, v_max_attempts, v_lease_token, v_leased_until
    FROM public.extraction_batches b
    WHERE b.id = p_batch_id AND b.job_id = p_job_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Stale worker guard: Stale worker cannot fail a batch that was re-leased by another worker or whose lease expired
    IF v_lease_token IS DISTINCT FROM p_worker_token OR v_leased_until IS NULL OR v_leased_until <= v_now THEN
        RETURN FALSE;
    END IF;

    v_is_exhausted := (v_attempt_count >= v_max_attempts);

    -- 1. Record attempt failure
    UPDATE public.batch_attempts
    SET status = p_status,
        error_type = p_error_type,
        error_details = p_error_details,
        latency_ms = p_latency_ms,
        finished_at = v_now
    WHERE id = p_attempt_id AND job_id = p_job_id AND batch_id = p_batch_id;

    -- 2. Update batch status & release lease
    UPDATE public.extraction_batches
    SET status = CASE WHEN v_is_exhausted THEN 'FAILED' ELSE 'RETRYING' END,
        error_message = p_error_details,
        lease_token = NULL,
        leased_until = NULL,
        updated_at = v_now
    WHERE id = p_batch_id;

    -- 3. Update document pages: if exhausted -> NEEDS_REVIEW_EXHAUSTED, if retrying -> PROCESSING_RETRY
    UPDATE public.document_pages
    SET disposition = CASE WHEN v_is_exhausted THEN 'NEEDS_REVIEW_EXHAUSTED' ELSE 'PROCESSING_RETRY' END,
        review_notes = 'Attempt ' || v_attempt_count || ' failed: ' || pg_catalog.coalesce(p_error_details, 'Unknown error'),
        updated_at = v_now
    WHERE job_id = p_job_id
      AND page_number >= v_start_page
      AND page_number <= v_end_page;

    RETURN TRUE;
END;
$$;

-- Restrict execution of atomic batch RPCs strictly to service_role
REVOKE ALL ON FUNCTION public.claim_extraction_batch(UUID, UUID, UUID, INTEGER) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_extraction_batch(UUID, UUID, UUID, INTEGER) TO service_role;

REVOKE ALL ON FUNCTION public.complete_extraction_batch(UUID, UUID, UUID, UUID, VARCHAR, INTEGER, INTEGER, INTEGER, INTEGER, NUMERIC, INTEGER) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_extraction_batch(UUID, UUID, UUID, UUID, VARCHAR, INTEGER, INTEGER, INTEGER, INTEGER, NUMERIC, INTEGER) TO service_role;

REVOKE ALL ON FUNCTION public.fail_extraction_batch(UUID, UUID, UUID, UUID, VARCHAR, VARCHAR, TEXT, INTEGER) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.fail_extraction_batch(UUID, UUID, UUID, UUID, VARCHAR, VARCHAR, TEXT, INTEGER) TO service_role;

-- ====================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES ON ALL 7 TABLES
-- ====================================================================

ALTER TABLE public.extraction_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraction_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.structured_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clause_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.structural_anchors ENABLE ROW LEVEL SECURITY;

-- 11.1 extraction_jobs policies
DROP POLICY IF EXISTS p_extraction_jobs_service ON public.extraction_jobs;
CREATE POLICY p_extraction_jobs_service ON public.extraction_jobs
    FOR ALL TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);

DROP POLICY IF EXISTS p_extraction_jobs_select ON public.extraction_jobs;
CREATE POLICY p_extraction_jobs_select ON public.extraction_jobs
    FOR SELECT TO authenticated
    USING (public.check_user_tender_access(tender_id));

DROP POLICY IF EXISTS p_extraction_jobs_insert ON public.extraction_jobs;
CREATE POLICY p_extraction_jobs_insert ON public.extraction_jobs
    FOR INSERT TO authenticated
    WITH CHECK (public.check_user_tender_access(tender_id));

DROP POLICY IF EXISTS p_extraction_jobs_update ON public.extraction_jobs;
CREATE POLICY p_extraction_jobs_update ON public.extraction_jobs
    FOR UPDATE TO authenticated
    USING (public.check_user_tender_access(tender_id))
    WITH CHECK (public.check_user_tender_access(tender_id));

DROP POLICY IF EXISTS p_extraction_jobs_delete ON public.extraction_jobs;
CREATE POLICY p_extraction_jobs_delete ON public.extraction_jobs
    FOR DELETE TO authenticated
    USING (public.check_user_tender_access(tender_id));

-- 11.2 document_pages policies
DROP POLICY IF EXISTS p_document_pages_service ON public.document_pages;
CREATE POLICY p_document_pages_service ON public.document_pages
    FOR ALL TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);

DROP POLICY IF EXISTS p_document_pages_select ON public.document_pages;
CREATE POLICY p_document_pages_select ON public.document_pages
    FOR SELECT TO authenticated
    USING (public.check_user_extraction_job_access(job_id));

DROP POLICY IF EXISTS p_document_pages_insert ON public.document_pages;
CREATE POLICY p_document_pages_insert ON public.document_pages
    FOR INSERT TO authenticated
    WITH CHECK (public.check_user_extraction_job_access(job_id));

DROP POLICY IF EXISTS p_document_pages_update ON public.document_pages;
CREATE POLICY p_document_pages_update ON public.document_pages
    FOR UPDATE TO authenticated
    USING (public.check_user_extraction_job_access(job_id))
    WITH CHECK (public.check_user_extraction_job_access(job_id));

DROP POLICY IF EXISTS p_document_pages_delete ON public.document_pages;
CREATE POLICY p_document_pages_delete ON public.document_pages
    FOR DELETE TO authenticated
    USING (public.check_user_extraction_job_access(job_id));

-- 11.3 extraction_batches policies
DROP POLICY IF EXISTS p_extraction_batches_service ON public.extraction_batches;
CREATE POLICY p_extraction_batches_service ON public.extraction_batches
    FOR ALL TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);

DROP POLICY IF EXISTS p_extraction_batches_select ON public.extraction_batches;
CREATE POLICY p_extraction_batches_select ON public.extraction_batches
    FOR SELECT TO authenticated
    USING (public.check_user_extraction_job_access(job_id));

DROP POLICY IF EXISTS p_extraction_batches_insert ON public.extraction_batches;
CREATE POLICY p_extraction_batches_insert ON public.extraction_batches
    FOR INSERT TO authenticated
    WITH CHECK (public.check_user_extraction_job_access(job_id));

DROP POLICY IF EXISTS p_extraction_batches_update ON public.extraction_batches;
CREATE POLICY p_extraction_batches_update ON public.extraction_batches
    FOR UPDATE TO authenticated
    USING (public.check_user_extraction_job_access(job_id))
    WITH CHECK (public.check_user_extraction_job_access(job_id));

DROP POLICY IF EXISTS p_extraction_batches_delete ON public.extraction_batches;
CREATE POLICY p_extraction_batches_delete ON public.extraction_batches
    FOR DELETE TO authenticated
    USING (public.check_user_extraction_job_access(job_id));

-- 11.4 batch_attempts policies (SELECT only for authenticated; mutations reserved for service_role)
DROP POLICY IF EXISTS p_batch_attempts_service ON public.batch_attempts;
CREATE POLICY p_batch_attempts_service ON public.batch_attempts
    FOR ALL TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);

DROP POLICY IF EXISTS p_batch_attempts_select ON public.batch_attempts;
CREATE POLICY p_batch_attempts_select ON public.batch_attempts
    FOR SELECT TO authenticated
    USING (public.check_user_extraction_job_access(job_id));

-- 11.5 structured_tables policies
DROP POLICY IF EXISTS p_structured_tables_service ON public.structured_tables;
CREATE POLICY p_structured_tables_service ON public.structured_tables
    FOR ALL TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);

DROP POLICY IF EXISTS p_structured_tables_select ON public.structured_tables;
CREATE POLICY p_structured_tables_select ON public.structured_tables
    FOR SELECT TO authenticated
    USING (public.check_user_extraction_job_access(job_id));

DROP POLICY IF EXISTS p_structured_tables_insert ON public.structured_tables;
CREATE POLICY p_structured_tables_insert ON public.structured_tables
    FOR INSERT TO authenticated
    WITH CHECK (public.check_user_extraction_job_access(job_id));

DROP POLICY IF EXISTS p_structured_tables_update ON public.structured_tables;
CREATE POLICY p_structured_tables_update ON public.structured_tables
    FOR UPDATE TO authenticated
    USING (public.check_user_extraction_job_access(job_id))
    WITH CHECK (public.check_user_extraction_job_access(job_id));

DROP POLICY IF EXISTS p_structured_tables_delete ON public.structured_tables;
CREATE POLICY p_structured_tables_delete ON public.structured_tables
    FOR DELETE TO authenticated
    USING (public.check_user_extraction_job_access(job_id));

-- 11.6 clause_evidence policies
DROP POLICY IF EXISTS p_clause_evidence_service ON public.clause_evidence;
CREATE POLICY p_clause_evidence_service ON public.clause_evidence
    FOR ALL TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);

DROP POLICY IF EXISTS p_clause_evidence_select ON public.clause_evidence;
CREATE POLICY p_clause_evidence_select ON public.clause_evidence
    FOR SELECT TO authenticated
    USING (public.check_user_extraction_job_access(job_id));

DROP POLICY IF EXISTS p_clause_evidence_insert ON public.clause_evidence;
CREATE POLICY p_clause_evidence_insert ON public.clause_evidence
    FOR INSERT TO authenticated
    WITH CHECK (public.check_user_extraction_job_access(job_id));

DROP POLICY IF EXISTS p_clause_evidence_update ON public.clause_evidence;
CREATE POLICY p_clause_evidence_update ON public.clause_evidence
    FOR UPDATE TO authenticated
    USING (public.check_user_extraction_job_access(job_id))
    WITH CHECK (public.check_user_extraction_job_access(job_id));

DROP POLICY IF EXISTS p_clause_evidence_delete ON public.clause_evidence;
CREATE POLICY p_clause_evidence_delete ON public.clause_evidence
    FOR DELETE TO authenticated
    USING (public.check_user_extraction_job_access(job_id));

-- 11.7 structural_anchors policies
DROP POLICY IF EXISTS p_structural_anchors_service ON public.structural_anchors;
CREATE POLICY p_structural_anchors_service ON public.structural_anchors
    FOR ALL TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);

DROP POLICY IF EXISTS p_structural_anchors_select ON public.structural_anchors;
CREATE POLICY p_structural_anchors_select ON public.structural_anchors
    FOR SELECT TO authenticated
    USING (public.check_user_extraction_job_access(job_id));

DROP POLICY IF EXISTS p_structural_anchors_insert ON public.structural_anchors;
CREATE POLICY p_structural_anchors_insert ON public.structural_anchors
    FOR INSERT TO authenticated
    WITH CHECK (public.check_user_extraction_job_access(job_id));

DROP POLICY IF EXISTS p_structural_anchors_update ON public.structural_anchors;
CREATE POLICY p_structural_anchors_update ON public.structural_anchors
    FOR UPDATE TO authenticated
    USING (public.check_user_extraction_job_access(job_id))
    WITH CHECK (public.check_user_extraction_job_access(job_id));

DROP POLICY IF EXISTS p_structural_anchors_delete ON public.structural_anchors;
CREATE POLICY p_structural_anchors_delete ON public.structural_anchors
    FOR DELETE TO authenticated
    USING (public.check_user_extraction_job_access(job_id));

-- Revoke unnecessary permissions from anon role
REVOKE ALL ON public.extraction_jobs FROM anon;
REVOKE ALL ON public.document_pages FROM anon;
REVOKE ALL ON public.extraction_batches FROM anon;
REVOKE ALL ON public.batch_attempts FROM anon;
REVOKE ALL ON public.structured_tables FROM anon;
REVOKE ALL ON public.clause_evidence FROM anon;
REVOKE ALL ON public.structural_anchors FROM anon;

-- Explicitly grant permissions to authenticated and service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.extraction_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_pages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.extraction_batches TO authenticated;
GRANT SELECT ON public.batch_attempts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.structured_tables TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clause_evidence TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.structural_anchors TO authenticated;

GRANT ALL ON public.extraction_jobs TO service_role;
GRANT ALL ON public.document_pages TO service_role;
GRANT ALL ON public.extraction_batches TO service_role;
GRANT ALL ON public.batch_attempts TO service_role;
GRANT ALL ON public.structured_tables TO service_role;
GRANT ALL ON public.clause_evidence TO service_role;
GRANT ALL ON public.structural_anchors TO service_role;

-- ====================================================================
-- 12. PERFORMANCE INDEXES
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_tender ON public.extraction_jobs(tender_id);
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_status ON public.extraction_jobs(status);
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_created_by ON public.extraction_jobs(created_by);

CREATE INDEX IF NOT EXISTS idx_document_pages_job_page ON public.document_pages(job_id, page_number);
CREATE INDEX IF NOT EXISTS idx_document_pages_disposition ON public.document_pages(job_id, disposition);
CREATE INDEX IF NOT EXISTS idx_document_pages_category ON public.document_pages(job_id, detected_category);

CREATE INDEX IF NOT EXISTS idx_extraction_batches_job_idx ON public.extraction_batches(job_id, batch_index);
CREATE INDEX IF NOT EXISTS idx_extraction_batches_status ON public.extraction_batches(job_id, status);
CREATE INDEX IF NOT EXISTS idx_extraction_batches_lease ON public.extraction_batches(job_id, leased_until);

CREATE INDEX IF NOT EXISTS idx_batch_attempts_job_batch ON public.batch_attempts(job_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_attempts_status ON public.batch_attempts(status);

CREATE INDEX IF NOT EXISTS idx_structured_tables_job ON public.structured_tables(job_id);
CREATE INDEX IF NOT EXISTS idx_structured_tables_category ON public.structured_tables(job_id, category);

CREATE INDEX IF NOT EXISTS idx_clause_evidence_job ON public.clause_evidence(job_id);
CREATE INDEX IF NOT EXISTS idx_clause_evidence_batch ON public.clause_evidence(job_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_clause_evidence_type ON public.clause_evidence(job_id, criterion_type);
CREATE INDEX IF NOT EXISTS idx_clause_evidence_materiality ON public.clause_evidence(job_id, materiality);

CREATE INDEX IF NOT EXISTS idx_structural_anchors_job ON public.structural_anchors(job_id);
CREATE INDEX IF NOT EXISTS idx_structural_anchors_batch ON public.structural_anchors(job_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_structural_anchors_type ON public.structural_anchors(job_id, anchor_type);
CREATE INDEX IF NOT EXISTS idx_structural_anchors_page ON public.structural_anchors(job_id, page_number);
