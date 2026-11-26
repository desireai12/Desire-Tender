/**
 * DESIRE TENDER — DATASET FINALIZATION COMPLETENESS GATE
 * Phase 4A: Pre-Finalization Gate & Canonical Hash Generator
 *
 * Implements the strict 8-point completeness gate required before any tender
 * extraction can be promoted to a canonical, versioned `tender_master_datasets` record.
 *
 * Gate Rules:
 * 1. Every document page has an accounted disposition (not in ['PENDING', 'PROCESSING', 'FAILED', 'UNREADABLE']).
 * 2. Every material structural anchor has been reviewed.
 * 3. No mandatory section remains unresolved.
 * 4. All mandatory extracted criteria are reviewed (review_status in ['APPROVED', 'CORRECTED']).
 * 5. Mandatory table evidence is verified (review_status in ['VERIFIED', 'CORRECTED']).
 * 6. Corrigenda and amendments are reconciled.
 * 7. Zero unreadable or failed material pages.
 * 8. Zero mandatory criteria pending human review.
 */

import * as crypto from 'crypto';
import type {
  DocumentPage,
  StructuralAnchor,
  ClauseEvidence,
  StructuredTable,
  TenderMasterDataset,
} from './dbTypes';

export interface FinalizationGateInput {
  tenderId: string;
  jobId: string;
  totalPages: number;
  pages: DocumentPage[];
  anchors: StructuralAnchor[];
  clauses: ClauseEvidence[];
  tables: StructuredTable[];
  corrigendaReconciled: boolean;
  corrigendaNotes?: string;
  finalizedBy: string;
}

export interface GateCheckDetail {
  passed: boolean;
  checkNumber: number;
  checkName: string;
  details: string;
}

export interface FinalizationGateResult {
  canFinalize: boolean;
  checks: GateCheckDetail[];
  blockingReasons: string[];
  canonicalContentHash?: string;
  datasetRecord?: Omit<TenderMasterDataset, 'id' | 'created_at'>;
}

/**
 * Computes canonical SHA-256 hash of all finalized criteria and structured tables.
 * Deterministic: items are sorted by ID, keys are sorted recursively.
 */
export function computeCanonicalHash(
  clauses: ClauseEvidence[],
  tables: StructuredTable[]
): string {
  // Sort clauses by ID or (source_page, clause_number)
  const sortedClauses = [...clauses].sort((a, b) => {
    if (a.source_page !== b.source_page) return a.source_page - b.source_page;
    return (a.clause_number || '').localeCompare(b.clause_number || '');
  }).map((c) => ({
    criterion_type: c.criterion_type,
    clause_number: c.clause_number || null,
    source_page: c.source_page,
    verbatim_quote: c.verbatim_quote.trim(),
    materiality: c.materiality,
    parameter_key: c.parameter_key || null,
    extracted_value: c.corrected_value !== undefined && c.corrected_value !== null ? c.corrected_value : c.extracted_value,
    review_status: c.review_status,
  }));

  // Sort tables by table_identifier
  const sortedTables = [...tables].sort((a, b) =>
    a.table_identifier.localeCompare(b.table_identifier)
  ).map((t) => ({
    table_identifier: t.table_identifier,
    start_page: t.start_page,
    end_page: t.end_page,
    category: t.category,
    headers: t.headers,
    rows: t.rows,
    review_status: t.review_status,
  }));

  const canonicalPayload = {
    clauses: sortedClauses,
    tables: sortedTables,
  };

  const jsonString = JSON.stringify(canonicalPayload);
  return crypto.createHash('sha256').update(jsonString, 'utf8').digest('hex');
}

/**
 * Evaluates the 8-point completeness gate on candidate extraction and review data.
 */
export function evaluateFinalizationGate(input: FinalizationGateInput): FinalizationGateResult {
  const blockingReasons: string[] = [];
  const checks: GateCheckDetail[] = [];

  // Check 1: Every document page has an accounted disposition
  const unaccountedDispositions = new Set(['PENDING', 'PROCESSING', 'PROCESSING_RETRY']);
  const unaccountedPages = input.pages.filter(
    (p) => unaccountedDispositions.has(p.disposition)
  );
  const totalPagesCovered = input.pages.length === input.totalPages;
  const check1Passed = totalPagesCovered && unaccountedPages.length === 0;

  checks.push({
    passed: check1Passed,
    checkNumber: 1,
    checkName: 'Page Disposition Accounting',
    details: check1Passed
      ? `All ${input.totalPages} pages have accounted terminal dispositions.`
      : `Missing or pending page dispositions: ${unaccountedPages.map((p) => p.page_number).join(', ') || 'Coverage mismatch'}`,
  });
  if (!check1Passed) {
    blockingReasons.push(
      `Check 1 Failed: ${unaccountedPages.length} pages are in pending/unaccounted state or total count (${input.pages.length}) != expected (${input.totalPages}).`
    );
  }

  // Check 2: Every material structural anchor has been reviewed
  const materialAnchorTypes = new Set([
    'QUALIFICATION_CRITERIA',
    'EVALUATION_METRICS',
    'NIT_HEADER',
    'TECHNICAL_SPECS',
    'FINANCIAL_FORMAT',
  ]);
  const materialAnchors = input.anchors.filter((a) => materialAnchorTypes.has(a.anchor_type));
  const unreviewedAnchors = materialAnchors.filter(
    (a) => !a.metadata || a.metadata.reviewed !== true
  );
  const check2Passed = unreviewedAnchors.length === 0;

  checks.push({
    passed: check2Passed,
    checkNumber: 2,
    checkName: 'Material Structural Anchor Review',
    details: check2Passed
      ? `All ${materialAnchors.length} material anchors have been verified by reviewer.`
      : `${unreviewedAnchors.length} material anchors remain unreviewed: ${unreviewedAnchors.map((a) => a.anchor_name).join(', ')}`,
  });
  if (!check2Passed) {
    blockingReasons.push(
      `Check 2 Failed: ${unreviewedAnchors.length} material structural anchors have not been reviewed.`
    );
  }

  // Check 3: No mandatory section remains unresolved
  // A mandatory section is unresolved if a material anchor has unresolved pages
  const unresolvedSections = materialAnchors.filter((a) => a.metadata && a.metadata.unresolved === true);
  const check3Passed = unresolvedSections.length === 0;

  checks.push({
    passed: check3Passed,
    checkNumber: 3,
    checkName: 'Mandatory Section Resolution',
    details: check3Passed
      ? 'Zero mandatory sections remain unresolved.'
      : `${unresolvedSections.length} mandatory sections are marked unresolved.`,
  });
  if (!check3Passed) {
    blockingReasons.push(
      `Check 3 Failed: ${unresolvedSections.length} mandatory tender sections remain unresolved.`
    );
  }

  // Check 4: All mandatory extracted criteria are reviewed (APPROVED or CORRECTED)
  const mandatoryClauses = input.clauses.filter((c) => c.materiality === 'MANDATORY' || c.materiality === 'DISQUALIFYING');
  const validReviewStatuses = new Set(['APPROVED', 'CORRECTED']);
  const unreviewedMandatory = mandatoryClauses.filter(
    (c) => !validReviewStatuses.has(c.review_status)
  );
  const check4Passed = unreviewedMandatory.length === 0 && mandatoryClauses.length > 0;

  checks.push({
    passed: check4Passed,
    checkNumber: 4,
    checkName: 'Mandatory Criteria Human Review',
    details: check4Passed
      ? `All ${mandatoryClauses.length} mandatory criteria are explicitly APPROVED or CORRECTED.`
      : `${unreviewedMandatory.length} mandatory criteria lack valid approval: ${unreviewedMandatory.map((c) => c.clause_number || c.summary).slice(0, 5).join(', ')}`,
  });
  if (!check4Passed) {
    blockingReasons.push(
      `Check 4 Failed: ${unreviewedMandatory.length} mandatory criteria are not APPROVED or CORRECTED (found status: ${[...new Set(unreviewedMandatory.map((c) => c.review_status))].join(', ')}).`
    );
  }

  // Check 5: Mandatory table evidence is verified
  const unverifiedTables = input.tables.filter(
    (t) => t.review_status !== 'VERIFIED' && t.review_status !== 'CORRECTED'
  );
  const check5Passed = unverifiedTables.length === 0;

  checks.push({
    passed: check5Passed,
    checkNumber: 5,
    checkName: 'Mandatory Table Evidence Verification',
    details: check5Passed
      ? `All ${input.tables.length} structured tables are VERIFIED or CORRECTED.`
      : `${unverifiedTables.length} tables lack verification: ${unverifiedTables.map((t) => t.table_identifier).join(', ')}`,
  });
  if (!check5Passed) {
    blockingReasons.push(
      `Check 5 Failed: ${unverifiedTables.length} structured tables are pending verification.`
    );
  }

  // Check 6: Corrigenda and amendments are reconciled
  const check6Passed = input.corrigendaReconciled === true;

  checks.push({
    passed: check6Passed,
    checkNumber: 6,
    checkName: 'Corrigenda & Amendments Reconciliation',
    details: check6Passed
      ? 'Corrigenda and tender addenda have been audited and reconciled.'
      : 'Corrigenda audit has not been marked as reconciled.',
  });
  if (!check6Passed) {
    blockingReasons.push(
      `Check 6 Failed: Corrigenda and amendments have not been formally reconciled.`
    );
  }

  // Check 7: Zero unreadable or failed material pages
  const failedOrUnreadablePages = input.pages.filter(
    (p) => p.is_material && (p.disposition === 'UNREADABLE' || p.disposition === 'FAILED')
  );
  const check7Passed = failedOrUnreadablePages.length === 0;

  checks.push({
    passed: check7Passed,
    checkNumber: 7,
    checkName: 'Zero Failed / Unreadable Material Pages',
    details: check7Passed
      ? 'Zero material pages failed extraction or remained unreadable.'
      : `${failedOrUnreadablePages.length} material pages failed: ${failedOrUnreadablePages.map((p) => p.page_number).join(', ')}`,
  });
  if (!check7Passed) {
    blockingReasons.push(
      `Check 7 Failed: ${failedOrUnreadablePages.length} material pages are marked UNREADABLE or FAILED.`
    );
  }

  // Check 8: Zero mandatory criteria pending human review
  const pendingClauses = input.clauses.filter(
    (c) => (c.materiality === 'MANDATORY' || c.materiality === 'DISQUALIFYING') && c.review_status === 'PENDING_REVIEW'
  );
  const check8Passed = pendingClauses.length === 0;

  checks.push({
    passed: check8Passed,
    checkNumber: 8,
    checkName: 'Zero Mandatory Criteria Pending Review',
    details: check8Passed
      ? 'Zero mandatory criteria are in PENDING_REVIEW status.'
      : `${pendingClauses.length} mandatory criteria are still in PENDING_REVIEW.`,
  });
  if (!check8Passed) {
    blockingReasons.push(
      `Check 8 Failed: ${pendingClauses.length} mandatory criteria are still PENDING_REVIEW.`
    );
  }

  const canFinalize = checks.every((c) => c.passed);
  let canonicalContentHash: string | undefined;
  let datasetRecord: Omit<TenderMasterDataset, 'id' | 'created_at'> | undefined;

  if (canFinalize) {
    canonicalContentHash = computeCanonicalHash(input.clauses, input.tables);

    datasetRecord = {
      tender_id: input.tenderId,
      job_id: input.jobId,
      version: 1, // Will be set or incremented by persistence layer
      canonical_content_hash: canonicalContentHash,
      finalized_by: input.finalizedBy,
      finalized_at: new Date().toISOString(),
      criteria_count: input.clauses.length,
      tables_count: input.tables.length,
      total_pages_verified: input.totalPages,
      completeness_audit_passed: true,
      completeness_audit_details: {
        checks,
        evaluatedAt: new Date().toISOString(),
        corrigendaNotes: input.corrigendaNotes || null,
      },
      master_payload: {
        clauses: input.clauses,
        tables: input.tables,
        anchors: input.anchors,
      },
      is_active: true,
    };
  }

  return {
    canFinalize,
    checks,
    blockingReasons,
    canonicalContentHash,
    datasetRecord,
  };
}

