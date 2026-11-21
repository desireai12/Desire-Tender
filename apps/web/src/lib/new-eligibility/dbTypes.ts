/**
 * TypeScript Data Models & Database Types
 * Phase 2 — Multi-page Document Vision Extraction Infrastructure (Remediated)
 * Mirrors the schema in supabase/migrations/20261121_tender_vision_extraction.sql
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
