/**
 * TypeScript Data Models & Database Types
 * Phase 2 & Phase 4A — Multi-page Vision Extraction & Deterministic Evaluation Infrastructure
 * Mirrors the schema in:
 *  - Phase 2: supabase/migrations/20261121_tender_vision_extraction.sql
 *  - Phase 4A: supabase/migrations/20261125_stage4a_schema.sql
 */

export type ExtractionJobStatus =
  | 'PENDING'
  | 'INITIALIZING'
  | 'MAPPING'
  | 'EXTRACTING'
  | 'AUDITING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type PageDisposition =
  | 'PENDING'
  | 'PROCESSING'
  | 'PROCESSING_RETRY'
  | 'RELEVANT'
  | 'REVIEWED_NO_CRITERIA'
  | 'NEEDS_REVIEW'
  | 'NEEDS_REVIEW_EXHAUSTED'
  | 'UNREADABLE'
  | 'FAILED';

export type PageDetectedCategory =
  | 'FINANCIAL'
  | 'TECHNICAL'
  | 'OTHERS'
  | 'GENERAL_CONDITIONS'
  | 'LEGAL_ADMIN'
  | 'IRRELEVANT'
  | 'UNKNOWN';

export type ExtractionBatchStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'RETRYING';

export type BatchAttemptStatus =
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'RATE_LIMITED'
  | 'TIMED_OUT';

export type CriterionType = 'FINANCIAL' | 'TECHNICAL' | 'OTHERS';

export type ClauseMateriality =
  | 'MANDATORY'
  | 'EVALUATED_SCORE'
  | 'INFORMATIONAL'
  | 'DISQUALIFYING';

export type StructuralAnchorType =
  | 'CHAPTER_HEADING'
  | 'TABLE_OF_CONTENTS'
  | 'NIT_HEADER'
  | 'ANNEXURE'
  | 'SCHEDULE'
  | 'QUALIFICATION_CRITERIA'
  | 'EVALUATION_METRICS'
  | 'TECHNICAL_SPECS'
  | 'FINANCIAL_FORMAT'
  | 'OTHER';

/**
 * Phase 4A Human Review Statuses for Clauses
 */
export type ClauseReviewStatus =
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'CORRECTED'
  | 'REJECTED'
  | 'NEEDS_CLARIFICATION';

/**
 * Phase 4A Human Review Statuses for Tables
 */
export type TableReviewStatus =
  | 'PENDING_REVIEW'
  | 'VERIFIED'
  | 'CORRECTED';

/**
 * Phase 4A Billing & Free-Tier Accounting Status
 * Enforces zero-cost policy: Never hardcode 0; explicit verification is required.
 */
export type BillingVerificationStatus =
  | 'VERIFIED_FREE'
  | 'PAID'
  | 'UNKNOWN'
  | 'BLOCKED';

/**
 * Phase 4A Proposal Submission Status
 * Finalized statuses (READY_FOR_EVALUATION, SUBMITTED, ARCHIVED) are permanently immutable.
 */
export type ProposalSubmissionStatus =
  | 'DRAFT'
  | 'READY_FOR_EVALUATION'
  | 'SUBMITTED'
  | 'ARCHIVED';

export interface ExtractionJob {
  id: string;
  tender_id: string;
  created_by?: string | null;
  status: ExtractionJobStatus;
  total_pages: number;
  processed_pages: number;
  terminal_pages: number;
  processed_page_impressions: number;
  total_batches: number;
  completed_batches: number;
  document_map?: Record<string, unknown>;
  document_hash?: string | null;
  source_file_url?: string | null;
  error_message?: string | null;
  total_input_tokens: number;
  total_output_tokens: number;
  total_thinking_tokens: number;
  total_cached_tokens: number;
  total_cost_usd: number;
  // Phase 4A Billing & Free-Tier Accounting
  billing_verification_status: BillingVerificationStatus;
  estimated_cost_usd: number;
  actual_charge_usd: number;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentPage {
  id: string;
  job_id: string;
  page_number: number;
  disposition: PageDisposition;
  is_material: boolean;
  detected_category?: PageDetectedCategory | null;
  has_tables: boolean;
  has_qualification_criteria: boolean;
  extracted_text?: string | null;
  token_count: number;
  review_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExtractionBatch {
  id: string;
  job_id: string;
  batch_index: number;
  start_page: number;
  end_page: number;
  status: ExtractionBatchStatus;
  model_used?: string | null;
  attempt_count: number;
  max_attempts: number;
  lease_token?: string | null;
  leased_until?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BatchAttempt {
  id: string;
  job_id: string;
  batch_id: string;
  attempt_number: number;
  status: BatchAttemptStatus;
  model_called: string;
  input_tokens: number;
  output_tokens: number;
  thinking_tokens: number;
  cached_tokens: number;
  cost_usd: number;
  latency_ms: number;
  // Phase 4A Billing & Free-Tier Accounting
  billing_verification_status: BillingVerificationStatus;
  estimated_cost_usd: number;
  actual_charge_usd: number;
  error_type?: string | null;
  error_details?: string | null;
  started_at: string;
  finished_at?: string | null;
  created_at: string;
}

export interface StructuredTable {
  id: string;
  job_id: string;
  table_identifier: string;
  start_page: number;
  end_page: number;
  category: 'FINANCIAL' | 'TECHNICAL' | 'OTHERS' | 'GENERAL';
  title?: string | null;
  headers: unknown[];
  rows: unknown[];
  footnotes: unknown[];
  is_multi_page: boolean;
  reconstruction_confidence: number;
  // Phase 4A Human Review Fields
  review_status: TableReviewStatus;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  created_at: string;
}

export interface ClauseEvidence {
  id: string;
  job_id: string;
  criterion_type: CriterionType;
  clause_number?: string | null;
  source_page: number;
  batch_id?: string | null;
  table_id?: string | null;
  verbatim_quote: string;
  summary: string;
  materiality: ClauseMateriality;
  parameter_key?: string | null;
  extracted_value?: unknown;
  confidence: number;
  // Phase 4A Human Review Fields
  review_status: ClauseReviewStatus;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  corrected_value?: unknown | null;
  correction_notes?: string | null;
  created_at: string;
}

export interface StructuralAnchor {
  id: string;
  job_id: string;
  page_number: number;
  batch_id?: string | null;
  anchor_type: StructuralAnchorType;
  anchor_name: string;
  section_number?: string | null;
  confidence: number;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// ============================================================================
// PHASE 4A NEW DATA MODELS & IMMUTABLE PERSISTENCE STRUCTURES
// ============================================================================

/**
 * Immutable, append-only audit record of human reviewer corrections to extracted criteria.
 * Deletion and in-place updates are blocked via PostgreSQL triggers and privilege revocation.
 */
export interface CriteriaCorrectionLogEntry {
  id: string;
  clause_id: string;
  job_id: string;
  field_name: string;
  original_ai_value: unknown;
  corrected_value: unknown;
  reviewer_id: string;
  reason: string;
  source_page: number;
  source_clause_quote?: string | null;
  created_at: string;
}

/**
 * Immutable, append-only audit record of cell-level corrections to structured tables.
 * Deletion and in-place updates are blocked via PostgreSQL triggers and privilege revocation.
 */
export interface TableCellCorrectionLogEntry {
  id: string;
  table_id: string;
  job_id: string;
  row_index: number;
  column_index: number;
  column_name?: string | null;
  original_ai_value: unknown;
  corrected_value: unknown;
  reviewer_id: string;
  reason: string;
  source_page: number;
  created_at: string;
}

/**
 * Finalized, canonical master dataset for a tender.
 * Can only be created once the 8-point completeness gate passes.
 * Uses SHA-256 canonical hash of all approved criteria and tables.
 */
export interface TenderMasterDataset {
  id: string;
  tender_id: string;
  job_id: string;
  version: number;
  canonical_content_hash: string;
  finalized_by: string;
  finalized_at: string;
  criteria_count: number;
  tables_count: number;
  total_pages_verified: number;
  completeness_audit_passed: boolean;
  completeness_audit_details: Record<string, unknown>;
  master_payload: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

/**
 * Versioned bidder proposal submission state.
 * DRAFT state allows edits.
 * Once marked READY_FOR_EVALUATION, SUBMITTED, or ARCHIVED, trigger prevents further mutation.
 */
export interface TenderProposalSubmission {
  id: string;
  tender_id: string;
  dataset_id: string;
  submission_version: number;
  status: ProposalSubmissionStatus;
  proposal_title: string;
  submitted_by?: string | null;
  is_immutable: boolean;
  finalized_at?: string | null;
  named_personnel_roster: Record<string, unknown>;
  tender_instruments_dossier: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Grounded deterministic evaluation result record.
 * Points to exact tender_master_datasets version and tender_proposal_submissions version.
 */
export interface TenderEvaluationResultRecord {
  id: string;
  tender_id: string;
  dataset_id: string;
  proposal_submission_id?: string | null;
  evaluator_version: string;
  evaluation_timestamp: string;
  corporate_qualification_verdict: 'PASS' | 'FAIL' | 'CANNOT_CHECK';
  proposal_readiness_status: 'COMPLETE' | 'INCOMPLETE' | 'NON_COMPLIANT';
  overall_tender_verdict: 'QUALIFIED' | 'DISQUALIFIED' | 'CANNOT_DETERMINE';
  financial_group_verdict: 'PASS' | 'FAIL' | 'CANNOT_CHECK' | 'INFO';
  technical_group_verdict: 'PASS' | 'FAIL' | 'CANNOT_CHECK' | 'INFO';
  others_group_verdict: 'PASS' | 'FAIL' | 'CANNOT_CHECK' | 'INFO';
  detailed_criteria_evaluations: Record<string, unknown>;
  evaluation_report_markdown: string;
  created_at: string;
}
