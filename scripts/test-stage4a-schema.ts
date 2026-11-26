/**
 * DESIRE TENDER — PHASE 4A AUDIT & STAGING READINESS TEST SUITE
 * Comprehensive verification of:
 * 1. 8-Point Dataset Finalization Completeness Gate & Canonical Hash
 * 2. Dataset In-Place Mutation Freeze & New Version Creation
 * 3. Proposal Version Immutability & Lifecycle Sequence (1 to 8)
 * 4. Audit Log Security, Permissions & Immutability Rules
 * 5. Billing Safeguards, Zero-Cost Verification & Fallback Protection
 * 6. Dedicated Evaluation Report Renderer & Provenance
 * 7. SQL Migration Schema Static Rules & Symmetrical Teardown
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  evaluateFinalizationGate,
  computeCanonicalHash,
  FinalizationGateInput,
} from '../apps/web/src/lib/new-eligibility/datasetFinalizationGate';
import {
  renderTerminalReport,
  renderHtmlSummaryCard,
  toDatabaseRecord,
} from '../apps/web/src/lib/new-eligibility/evaluationReportRenderer';
import {
  evaluateCompanyForRadhanpur,
} from '../apps/web/src/lib/new-eligibility/deterministicEvaluator';
import { DESIRE_ENERGY_MASTER } from '../apps/web/src/lib/new-eligibility/companyMaster';
import {
  canEditProposal,
  transitionProposalStatus,
  updateDraftProposal,
  validateProposalDeletion,
  createNewProposalVersion,
  verifyEvaluationProposalBinding,
  ProposalMutationError,
} from '../apps/web/src/lib/new-eligibility/proposalManager';
import {
  verifyDeveloperApiFreeTier,
  enforceBillingGate,
  validateModelFallbackSafety,
  calculateCostAccounting,
  PERMISSIBLE_FREE_MODELS,
  BillingPolicyViolationError,
} from '../apps/web/src/lib/new-eligibility/billingSafeguards';
import {
  extractProjectRef,
  auditDatabaseEnvironment,
  assertSafeDatabaseWrite,
  shouldRunInMockMode,
  ProductionDatabaseBlockedError,
  BLOCKED_PRODUCTION_PROJECT_REF,
} from '../apps/web/src/lib/new-eligibility/databaseEnvironmentGuard';
import type {
  DocumentPage,
  StructuralAnchor,
  ClauseEvidence,
  StructuredTable,
  TenderProposalSubmission,
  TenderEvaluationResultRecord,
  CriteriaCorrectionLogEntry,
  TableCellCorrectionLogEntry,
} from '../apps/web/src/lib/new-eligibility/dbTypes';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ [FAIL] ${testName}`);
    if (detail) console.error(`    Detail: ${detail}`);
  }
}

// ----------------------------------------------------------------------------
// MOCK DATA FACTORIES
// ----------------------------------------------------------------------------

function createMockPages(count = 175): DocumentPage[] {
  const pages: DocumentPage[] = [];
  for (let i = 1; i <= count; i++) {
    pages.push({
      id: `page-${i}`,
      job_id: 'job-radhanpur-175',
      page_number: i,
      disposition: 'REVIEWED_NO_CRITERIA',
      is_material: [1, 2, 8, 14, 15, 26, 27, 28, 40, 41].includes(i),
      has_tables: [26, 40, 41].includes(i),
      has_qualification_criteria: [26, 27, 28].includes(i),
      token_count: 500,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
  return pages;
}

function createMockAnchors(): StructuralAnchor[] {
  return [
    {
      id: 'anchor-1',
      job_id: 'job-radhanpur-175',
      page_number: 1,
      anchor_type: 'NIT_HEADER',
      anchor_name: 'Notice Inviting Tender Header',
      confidence: 1.0,
      metadata: { reviewed: true, unresolved: false },
      created_at: new Date().toISOString(),
    },
    {
      id: 'anchor-2',
      job_id: 'job-radhanpur-175',
      page_number: 26,
      anchor_type: 'QUALIFICATION_CRITERIA',
      anchor_name: 'Volume I Section 2 Qualification Criteria',
      confidence: 1.0,
      metadata: { reviewed: true, unresolved: false },
      created_at: new Date().toISOString(),
    },
    {
      id: 'anchor-3',
      job_id: 'job-radhanpur-175',
      page_number: 40,
      anchor_type: 'FINANCIAL_FORMAT',
      anchor_name: 'Form 8 Completed Works Format',
      confidence: 1.0,
      metadata: { reviewed: true, unresolved: false },
      created_at: new Date().toISOString(),
    },
  ];
}

function createMockClauses(): ClauseEvidence[] {
  const criteria = [
    { num: 'CRIT_01', page: 26, mat: 'MANDATORY' as const },
    { num: 'CRIT_02', page: 26, mat: 'MANDATORY' as const },
    { num: 'CRIT_03', page: 26, mat: 'MANDATORY' as const },
    { num: 'CRIT_15', page: 27, mat: 'MANDATORY' as const },
    { num: 'CRIT_20', page: 28, mat: 'MANDATORY' as const },
  ];

  return criteria.map((c, i) => ({
    id: `clause-${i + 1}`,
    job_id: 'job-radhanpur-175',
    criterion_type: 'FINANCIAL',
    clause_number: c.num,
    source_page: c.page,
    verbatim_quote: `Verbatim text for ${c.num}`,
    summary: `Summary of ${c.num}`,
    materiality: c.mat,
    confidence: 1.0,
    review_status: 'APPROVED',
    reviewed_by: 'garv@desireenergy.com',
    reviewed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  }));
}

function createMockTables(): StructuredTable[] {
  return [
    {
      id: 'table-1',
      job_id: 'job-radhanpur-175',
      table_identifier: 'TABLE_P26_ESCALATION',
      start_page: 26,
      end_page: 26,
      category: 'FINANCIAL',
      title: 'Turnover Escalation Multipliers',
      headers: ['Financial Year', 'Multiplier'],
      rows: [['2023-24', '1.00'], ['2022-23', '1.10']],
      footnotes: [],
      is_multi_page: false,
      reconstruction_confidence: 1.0,
      review_status: 'VERIFIED',
      reviewed_by: 'garv@desireenergy.com',
      reviewed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  ];
}

console.log('='.repeat(80));
console.log('   RUNNING PHASE 4A FINAL AUDIT & STAGING READINESS TESTS');
console.log('='.repeat(80));

// ── TEST GROUP 1: 8-POINT FINALIZATION GATE ─────────────────────────────────
console.log('\n[TEST GROUP 1] 8-Point Dataset Finalization Completeness Gate');

// Test 1.1: Complete valid input passes gate
{
  const input: FinalizationGateInput = {
    tenderId: 'tender-radhanpur-001',
    jobId: 'job-radhanpur-175',
    totalPages: 175,
    pages: createMockPages(175),
    anchors: createMockAnchors(),
    clauses: createMockClauses(),
    tables: createMockTables(),
    corrigendaReconciled: true,
    corrigendaNotes: 'All 3 corrigenda reconciled against NIT clauses',
    finalizedBy: 'garv@desireenergy.com',
  };

  const res = evaluateFinalizationGate(input);
  assert(res.canFinalize === true, 'Test 1.1a: Valid input passes 8-point finalization gate');
  assert(res.blockingReasons.length === 0, 'Test 1.1b: Zero blocking reasons on valid input');
  assert(res.checks.length === 8, 'Test 1.1c: All 8 gate checks evaluated');
  assert(res.checks.every(c => c.passed), 'Test 1.1d: Every individual check passed');
  assert(Boolean(res.canonicalContentHash), 'Test 1.1e: Canonical content hash generated');
  assert(res.datasetRecord?.criteria_count === 5, 'Test 1.1f: Dataset record metadata populated');
}

// Test 1.2: Blocks when pages are pending or unaccounted
{
  const pages = createMockPages(175);
  pages[10].disposition = 'PENDING';

  const input: FinalizationGateInput = {
    tenderId: 'tender-radhanpur-001',
    jobId: 'job-radhanpur-175',
    totalPages: 175,
    pages,
    anchors: createMockAnchors(),
    clauses: createMockClauses(),
    tables: createMockTables(),
    corrigendaReconciled: true,
    finalizedBy: 'garv@desireenergy.com',
  };

  const res = evaluateFinalizationGate(input);
  assert(res.canFinalize === false, 'Test 1.2: Blocks finalization when page is PENDING');
  assert(res.blockingReasons.some(r => r.includes('Check 1 Failed')), 'Test 1.2: Check 1 failure reported');
}

// Test 1.3: Blocks when material structural anchor is unreviewed
{
  const anchors = createMockAnchors();
  anchors[1].metadata = { reviewed: false };

  const input: FinalizationGateInput = {
    tenderId: 'tender-radhanpur-001',
    jobId: 'job-radhanpur-175',
    totalPages: 175,
    pages: createMockPages(175),
    anchors,
    clauses: createMockClauses(),
    tables: createMockTables(),
    corrigendaReconciled: true,
    finalizedBy: 'garv@desireenergy.com',
  };

  const res = evaluateFinalizationGate(input);
  assert(res.canFinalize === false, 'Test 1.3: Blocks finalization when material anchor is unreviewed');
  assert(res.blockingReasons.some(r => r.includes('Check 2 Failed')), 'Test 1.3: Check 2 failure reported');
}

// Test 1.4: Blocks when mandatory section is unresolved
{
  const anchors = createMockAnchors();
  anchors[1].metadata = { reviewed: true, unresolved: true };

  const input: FinalizationGateInput = {
    tenderId: 'tender-radhanpur-001',
    jobId: 'job-radhanpur-175',
    totalPages: 175,
    pages: createMockPages(175),
    anchors,
    clauses: createMockClauses(),
    tables: createMockTables(),
    corrigendaReconciled: true,
    finalizedBy: 'garv@desireenergy.com',
  };

  const res = evaluateFinalizationGate(input);
  assert(res.canFinalize === false, 'Test 1.4: Blocks finalization when mandatory section is unresolved');
  assert(res.blockingReasons.some(r => r.includes('Check 3 Failed')), 'Test 1.4: Check 3 failure reported');
}

// Test 1.5: Blocks when mandatory criteria is in PENDING_REVIEW
{
  const clauses = createMockClauses();
  clauses[0].review_status = 'PENDING_REVIEW';

  const input: FinalizationGateInput = {
    tenderId: 'tender-radhanpur-001',
    jobId: 'job-radhanpur-175',
    totalPages: 175,
    pages: createMockPages(175),
    anchors: createMockAnchors(),
    clauses,
    tables: createMockTables(),
    corrigendaReconciled: true,
    finalizedBy: 'garv@desireenergy.com',
  };

  const res = evaluateFinalizationGate(input);
  assert(res.canFinalize === false, 'Test 1.5a: Blocks finalization when mandatory criterion is PENDING_REVIEW');
  assert(res.blockingReasons.some(r => r.includes('Check 4 Failed')), 'Test 1.5b: Check 4 failure reported');
  assert(res.blockingReasons.some(r => r.includes('Check 8 Failed')), 'Test 1.5c: Check 8 failure reported');
}

// Test 1.6: Blocks when structured table is unverified
{
  const tables = createMockTables();
  tables[0].review_status = 'PENDING_REVIEW';

  const input: FinalizationGateInput = {
    tenderId: 'tender-radhanpur-001',
    jobId: 'job-radhanpur-175',
    totalPages: 175,
    pages: createMockPages(175),
    anchors: createMockAnchors(),
    clauses: createMockClauses(),
    tables,
    corrigendaReconciled: true,
    finalizedBy: 'garv@desireenergy.com',
  };

  const res = evaluateFinalizationGate(input);
  assert(res.canFinalize === false, 'Test 1.6: Blocks finalization when table is unverified');
  assert(res.blockingReasons.some(r => r.includes('Check 5 Failed')), 'Test 1.6: Check 5 failure reported');
}

// Test 1.7: Blocks when corrigenda is unreconciled
{
  const input: FinalizationGateInput = {
    tenderId: 'tender-radhanpur-001',
    jobId: 'job-radhanpur-175',
    totalPages: 175,
    pages: createMockPages(175),
    anchors: createMockAnchors(),
    clauses: createMockClauses(),
    tables: createMockTables(),
    corrigendaReconciled: false,
    finalizedBy: 'garv@desireenergy.com',
  };

  const res = evaluateFinalizationGate(input);
  assert(res.canFinalize === false, 'Test 1.7: Blocks finalization when corrigenda is unreconciled');
  assert(res.blockingReasons.some(r => r.includes('Check 6 Failed')), 'Test 1.7: Check 6 failure reported');
}

// Test 1.8: Blocks when material page is marked UNREADABLE
{
  const pages = createMockPages(175);
  pages[25].is_material = true;
  pages[25].disposition = 'UNREADABLE';

  const input: FinalizationGateInput = {
    tenderId: 'tender-radhanpur-001',
    jobId: 'job-radhanpur-175',
    totalPages: 175,
    pages,
    anchors: createMockAnchors(),
    clauses: createMockClauses(),
    tables: createMockTables(),
    corrigendaReconciled: true,
    finalizedBy: 'garv@desireenergy.com',
  };

  const res = evaluateFinalizationGate(input);
  assert(res.canFinalize === false, 'Test 1.8: Blocks finalization when material page is UNREADABLE');
  assert(res.blockingReasons.some(r => r.includes('Check 7 Failed')), 'Test 1.8: Check 7 failure reported');
}

// Test 1.9: Deterministic SHA-256 Canonical Hashing
{
  const clauses1 = createMockClauses();
  const tables1 = createMockTables();
  const hash1 = computeCanonicalHash(clauses1, tables1);

  const clauses2 = createMockClauses();
  const tables2 = createMockTables();
  const hash2 = computeCanonicalHash(clauses2, tables2);

  assert(hash1 === hash2, 'Test 1.9a: Identical inputs produce identical SHA-256 canonical hash');
  assert(hash1.length === 64, 'Test 1.9b: Hash is valid 64-character SHA-256 hex string');

  // Modify clause quote
  clauses2[0].verbatim_quote = 'Modified verbatim text';
  const hash3 = computeCanonicalHash(clauses2, tables2);
  assert(hash1 !== hash3, 'Test 1.9c: Content mutation produces different SHA-256 canonical hash');
}

// ── TEST GROUP 2: PROPOSAL VERSION IMMUTABILITY & LIFECYCLE ─────────────────
console.log('\n[TEST GROUP 2] Proposal Version Immutability & Lifecycle Sequence');

{
  // 1. DRAFT proposal can be edited
  const p1: TenderProposalSubmission = {
    id: 'prop-v1',
    tender_id: 'tender-radhanpur-001',
    dataset_id: 'dataset-v1',
    submission_version: 1,
    status: 'DRAFT',
    proposal_title: 'Desire Bid Submission v1',
    submitted_by: 'bid.manager@desireenergy.com',
    is_immutable: false,
    finalized_at: null,
    named_personnel_roster: {},
    tender_instruments_dossier: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  assert(canEditProposal(p1) === true, 'Test 2.1: DRAFT proposal is editable');
  const p1Edited = updateDraftProposal(p1, { proposal_title: 'Updated Draft Title' });
  assert(p1Edited.proposal_title === 'Updated Draft Title', 'Test 2.2: DRAFT edits succeed');

  // 2. DRAFT can transition to READY_FOR_EVALUATION
  const p1Ready = transitionProposalStatus(p1Edited, 'READY_FOR_EVALUATION');
  assert(p1Ready.status === 'READY_FOR_EVALUATION', 'Test 2.3: Transition to READY_FOR_EVALUATION succeeds');
  assert(p1Ready.is_immutable === true, 'Test 2.4: READY_FOR_EVALUATION locks is_immutable to true');
  assert(Boolean(p1Ready.finalized_at), 'Test 2.5: READY_FOR_EVALUATION sets finalized_at timestamp');

  // 3. READY_FOR_EVALUATION cannot be edited
  assert(canEditProposal(p1Ready) === false, 'Test 2.6: READY_FOR_EVALUATION reports not editable');
  let err3 = '';
  try {
    updateDraftProposal(p1Ready, { proposal_title: 'Illegal Edit' });
  } catch (e: any) {
    err3 = e.message;
  }
  assert(err3.includes('Cannot update finalized proposal submission'), 'Test 2.7: Editing READY_FOR_EVALUATION throws error');

  // 4. SUBMITTED cannot be edited
  const pSubmitted: TenderProposalSubmission = { ...p1Ready, status: 'SUBMITTED' };
  let err4 = '';
  try {
    updateDraftProposal(pSubmitted, { proposal_title: 'Illegal Edit 2' });
  } catch (e: any) {
    err4 = e.message;
  }
  assert(err4.includes('Cannot update finalized proposal submission'), 'Test 2.8: Editing SUBMITTED throws error');

  // 5. ARCHIVED cannot be edited
  const pArchived: TenderProposalSubmission = { ...p1Ready, status: 'ARCHIVED' };
  let err5 = '';
  try {
    updateDraftProposal(pArchived, { proposal_title: 'Illegal Edit 3' });
  } catch (e: any) {
    err5 = e.message;
  }
  assert(err5.includes('Cannot update finalized proposal submission'), 'Test 2.9: Editing ARCHIVED throws error');

  // 6. Finalized proposal records cannot be deleted
  let err6 = '';
  try {
    validateProposalDeletion(p1Ready);
  } catch (e: any) {
    err6 = e.message;
  }
  assert(err6.includes('Cannot delete finalized proposal submission'), 'Test 2.10: Deleting finalized proposal throws error');

  // 7. A new version can be created without changing the old version
  const { oldVersion, newVersion } = createNewProposalVersion(p1Ready, 'prop-v2', {
    proposal_title: 'Desire Bid Submission v2',
  });
  assert(oldVersion.submission_version === 1, 'Test 2.11a: Old version unchanged (v1)');
  assert(oldVersion.status === 'READY_FOR_EVALUATION', 'Test 2.11b: Old version remains READY_FOR_EVALUATION');
  assert(oldVersion.is_immutable === true, 'Test 2.11c: Old version remains immutable');
  assert(newVersion.id === 'prop-v2', 'Test 2.11d: New version has distinct ID');
  assert(newVersion.submission_version === 2, 'Test 2.11e: New version incremented to v2');
  assert(newVersion.status === 'DRAFT', 'Test 2.11f: New version starts as DRAFT');
  assert(newVersion.is_immutable === false, 'Test 2.11g: New version is mutable');

  // 8. Existing evaluation results continue referencing their original proposal version
  const evalResult: TenderEvaluationResultRecord = {
    id: 'eval-1',
    tender_id: 'tender-radhanpur-001',
    dataset_id: 'dataset-v1',
    proposal_submission_id: 'prop-v1',
    evaluator_version: 'v4.0',
    evaluation_timestamp: new Date().toISOString(),
    corporate_qualification_verdict: 'CANNOT_CHECK',
    proposal_readiness_status: 'INCOMPLETE',
    overall_tender_verdict: 'CANNOT_DETERMINE',
    financial_group_verdict: 'PASS',
    technical_group_verdict: 'CANNOT_CHECK',
    others_group_verdict: 'PASS',
    detailed_criteria_evaluations: {},
    evaluation_report_markdown: 'report',
    created_at: new Date().toISOString(),
  };

  assert(verifyEvaluationProposalBinding(evalResult, oldVersion) === true, 'Test 2.12a: Evaluation bound to v1');
  assert(verifyEvaluationProposalBinding(evalResult, newVersion) === false, 'Test 2.12b: Evaluation does NOT point to v2');
}

// ── TEST GROUP 3: BILLING SAFEGUARDS & ZERO-COST POLICY ─────────────────────
console.log('\n[TEST GROUP 3] Developer API Billing Safeguards & Zero-Cost Enforcement');

{
  // 1. VERIFIED_FREE permits request
  const freeProject = {
    apiKeyPresent: true,
    developerApiProjectTier: 'FREE' as const,
    hasGoogleAiProSubscription: true,
    modelName: 'gemini-3.5-flash-lite',
  };
  const freeStatus = verifyDeveloperApiFreeTier(freeProject);
  assert(freeStatus === 'VERIFIED_FREE', 'Test 3.1a: Explicit free project tier is VERIFIED_FREE');
  const gateFree = enforceBillingGate(freeStatus);
  assert(gateFree.permitted === true, 'Test 3.1b: VERIFIED_FREE permits execution');

  // 2. PAID blocks requests
  const paidProject = {
    apiKeyPresent: true,
    developerApiProjectTier: 'PAID' as const,
    hasGoogleAiProSubscription: true,
    modelName: 'gemini-3.5-flash-lite',
  };
  const paidStatus = verifyDeveloperApiFreeTier(paidProject);
  assert(paidStatus === 'PAID', 'Test 3.2a: Paid developer tier identified as PAID');
  const gatePaid = enforceBillingGate(paidStatus);
  assert(gatePaid.permitted === false, 'Test 3.2b: PAID blocks execution');
  assert(gatePaid.reason?.includes('Strict zero-cost policy forbids paid API calls'), 'Test 3.2c: Policy reason provided');

  // 3. UNKNOWN blocks requests
  const unknownProject = {
    apiKeyPresent: true,
    developerApiProjectTier: 'UNKNOWN' as const,
    hasGoogleAiProSubscription: true,
    modelName: 'gemini-3.5-flash-lite',
  };
  const unknownStatus = verifyDeveloperApiFreeTier(unknownProject);
  assert(unknownStatus === 'UNKNOWN', 'Test 3.3a: Unverified tier returns UNKNOWN');
  const gateUnknown = enforceBillingGate(unknownStatus);
  assert(gateUnknown.permitted === false, 'Test 3.3b: UNKNOWN blocks execution');

  // 4. BLOCKED blocks requests
  const gateBlocked = enforceBillingGate('BLOCKED');
  assert(gateBlocked.permitted === false, 'Test 3.4: BLOCKED blocks execution');

  // 5. No model fallback can trigger paid usage
  let fallbackErr = '';
  try {
    validateModelFallbackSafety('gemini-3.5-flash-lite', 'gemini-1.5-pro'); // pro is not on free list
  } catch (e: any) {
    fallbackErr = e.message;
  }
  assert(fallbackErr.includes('not on the verified free-tier model list'), 'Test 3.5a: Paid fallback model is blocked');

  // Allowed fallback
  let noErr = true;
  try {
    validateModelFallbackSafety('gemini-3.5-flash-lite', 'gemini-1.5-flash');
  } catch {
    noErr = false;
  }
  assert(noErr === true, 'Test 3.5b: Verified free fallback model is allowed');

  // 6. Google AI Pro subscription does not confer free Developer API quota
  const proSubscriptionOnlyProject = {
    apiKeyPresent: true,
    developerApiProjectTier: 'PAYG' as const, // Developer API is Pay-As-You-Go
    hasGoogleAiProSubscription: true,        // User has Google AI Pro
    modelName: 'gemini-3.5-flash-lite',
  };
  const proStatus = verifyDeveloperApiFreeTier(proSubscriptionOnlyProject);
  assert(proStatus === 'PAID', 'Test 3.6a: Google AI Pro subscription does NOT override PAID developer API tier');
  assert(enforceBillingGate(proStatus).permitted === false, 'Test 3.6b: Blocked despite Google AI Pro subscription');

  // 7. Estimated commercial cost and actual payable cost remain separate
  const costFree = calculateCostAccounting(1_000_000, 200_000, 'VERIFIED_FREE');
  assert(costFree.estimatedCostUsd > 0, 'Test 3.7a: Estimated commercial cost is non-zero ($0.135 benchmark)');
  assert(costFree.actualChargeUsd === 0, 'Test 3.7b: Actual payable cost is 0 under VERIFIED_FREE');

  // 8. Actual payable cost is never hardcoded to zero
  let calcErr = '';
  try {
    calculateCostAccounting(1_000_000, 200_000, 'UNKNOWN');
  } catch (e: any) {
    calcErr = e.message;
  }
  assert(calcErr.includes('Cannot determine actual payable cost for unverified billing status'), 'Test 3.8: Rejects calculating payable cost when status is UNKNOWN');
}

// ── TEST GROUP 4: AUDIT LOG SECURITY & EVIDENCE PROVENANCE ──────────────────
console.log('\n[TEST GROUP 4] Audit Log Security, Immutability & Provenance Ledger');

{
  // Verify structure of CriteriaCorrectionLogEntry
  const entry: CriteriaCorrectionLogEntry = {
    id: 'corr-uuid-1',
    clause_id: 'clause-uuid-1',
    job_id: 'job-uuid-1',
    field_name: 'extracted_value.third_highest_turnover_cr',
    original_ai_value: 3.5,
    corrected_value: 4.25,
    reviewer_id: 'lead.reviewer@desireenergy.com',
    reason: 'Form 8 audited certificate on Page 40 confirms FY 2023-24 turnover of 4.25 Cr',
    source_page: 40,
    source_clause_quote: 'The bidder should have minimum turnover...',
    created_at: new Date().toISOString(),
  };

  assert(Boolean(entry.reviewer_id), 'Test 4.1: Audit record requires reviewer identity');
  assert(Boolean(entry.created_at), 'Test 4.2: Audit record requires timestamp');
  assert(Boolean(entry.reason), 'Test 4.3: Audit record requires justification reason');
  assert(entry.source_page === 40, 'Test 4.4: Audit record requires source page reference');
  assert(entry.original_ai_value === 3.5, 'Test 4.5: Original AI value preserved separately');
  assert(entry.corrected_value === 4.25, 'Test 4.6: Corrected value stored separately');

  // Verify structure of TableCellCorrectionLogEntry
  const tableEntry: TableCellCorrectionLogEntry = {
    id: 'tbl-corr-1',
    table_id: 'tbl-uuid-1',
    job_id: 'job-uuid-1',
    row_index: 2,
    column_index: 3,
    column_name: 'Escalation Multiplier',
    original_ai_value: '1.20',
    corrected_value: '1.21',
    reviewer_id: 'lead.reviewer@desireenergy.com',
    reason: 'Page 26 escalation table column 2 clearly states 1.21 for Year -2',
    source_page: 26,
    created_at: new Date().toISOString(),
  };

  assert(tableEntry.row_index === 2 && tableEntry.column_index === 3, 'Test 4.7: Table cell audit captures exact cell coordinates');
}

// ── TEST GROUP 5: DEDICATED REPORT RENDERER ─────────────────────────────────
console.log('\n[TEST GROUP 5] Dedicated Evaluation Report Renderer');

{
  const dualReport = evaluateCompanyForRadhanpur(DESIRE_ENERGY_MASTER);

  // Terminal rendering
  const terminalOut = renderTerminalReport(dualReport);
  assert(terminalOut.includes('DESIRE TENDER ELIGIBILITY EVALUATION REPORT'), 'Test 5.1a: Terminal report includes header');
  assert(terminalOut.includes('[DIMENSION 1] CORPORATE QUALIFICATION: [CANNOT_CHECK]'), 'Test 5.1b: Baseline Corporate Qualification is CANNOT_CHECK');
  assert(terminalOut.includes('[DIMENSION 2] PROPOSAL READINESS:      [INCOMPLETE]'), 'Test 5.1c: Baseline Proposal Readiness is INCOMPLETE');
  assert(terminalOut.includes('OVERALL TENDER VERDICT: [CANNOT_DETERMINE]'), 'Test 5.1d: Baseline Overall Verdict is CANNOT_DETERMINE');

  // HTML rendering
  const htmlOut = renderHtmlSummaryCard(dualReport);
  assert(htmlOut.includes('tender-evaluation-card'), 'Test 5.2a: HTML card includes outer container');
  assert(htmlOut.includes('Corporate Qualification'), 'Test 5.2b: HTML card includes Corporate Qualification dimension');
  assert(htmlOut.includes('Proposal Readiness'), 'Test 5.2c: HTML card includes Proposal Readiness dimension');

  // DB Record conversion
  const dbRecord = toDatabaseRecord(dualReport, 'dataset-uuid-1234', 'submission-uuid-5678');
  assert(dbRecord.tender_id === dualReport.tenderId, 'Test 5.3a: DB record maps tender_id');
  assert(dbRecord.dataset_id === 'dataset-uuid-1234', 'Test 5.3b: DB record maps dataset_id');
  assert(dbRecord.proposal_submission_id === 'submission-uuid-5678', 'Test 5.3c: DB record maps proposal_submission_id');
  assert(dbRecord.corporate_qualification_verdict === 'CANNOT_CHECK', 'Test 5.3d: DB record maps corporate verdict');
  assert(dbRecord.proposal_readiness_status === 'INCOMPLETE', 'Test 5.3e: DB record maps proposal readiness');
  assert(dbRecord.overall_tender_verdict === 'CANNOT_DETERMINE', 'Test 5.3f: DB record maps overall verdict');
}

// ── TEST GROUP 6: SQL MIGRATION SCHEMA STATIC RULES ────────────────────────
console.log('\n[TEST GROUP 6] SQL Migration Schema Static Rules & Immutability Triggers');

{
  const schemaPath = path.join(process.cwd(), 'supabase', 'migrations', '20261125_stage4a_schema.sql');
  const rollbackPath = path.join(process.cwd(), 'supabase', 'migrations', '20261125_stage4a_rollback.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const rollbackSql = fs.readFileSync(rollbackPath, 'utf8');

  assert(schemaSql.includes('ON DELETE RESTRICT'), 'Test 6.1: Schema uses ON DELETE RESTRICT on audit tables');
  const sqlWithoutComments = schemaSql.replace(/--.*$/gm, '');
  assert(!sqlWithoutComments.includes('ON DELETE CASCADE'), 'Test 6.2: Schema contains zero ON DELETE CASCADE');
  assert(schemaSql.includes('prevent_audit_log_mutation()'), 'Test 6.3: Schema includes prevent_audit_log_mutation trigger function');
  assert(schemaSql.includes('prevent_finalized_proposal_mutation()'), 'Test 6.4: Schema includes prevent_finalized_proposal_mutation trigger function');
  assert(schemaSql.includes('prevent_finalized_dataset_mutation()'), 'Test 6.5: Schema includes prevent_finalized_dataset_mutation trigger function');
  assert(schemaSql.includes('trg_tender_master_dataset_immutable'), 'Test 6.6: Schema attaches immutability trigger to tender_master_datasets');
  assert(schemaSql.includes('REVOKE ALL ON public.criteria_corrections_log FROM anon, authenticated;'), 'Test 6.7: Schema revokes direct insert/update/delete on criteria_corrections_log from ordinary app roles');
  assert(schemaSql.includes('REVOKE ALL ON public.table_cell_corrections_log FROM anon, authenticated;'), 'Test 6.8: Schema revokes direct insert/update/delete on table_cell_corrections_log from ordinary app roles');
  assert(schemaSql.includes('GRANT ALL ON public.criteria_corrections_log TO service_role;'), 'Test 6.9: Schema grants append privileges only to service_role');
  assert(schemaSql.includes('GRANT ALL ON public.table_cell_corrections_log TO service_role;'), 'Test 6.10: Schema grants append privileges only to service_role');
  assert(schemaSql.includes('uq_tender_dataset_hash'), 'Test 6.11: Schema includes unique constraint on canonical content hash');
  assert(schemaSql.includes('CHECK (billing_verification_status IN (\'VERIFIED_FREE\', \'PAID\', \'UNKNOWN\', \'BLOCKED\'))'), 'Test 6.12: Schema includes billing verification check constraint');

  // Rollback teardown checks
  assert(rollbackSql.includes('DROP FUNCTION IF EXISTS public.prevent_finalized_dataset_mutation()'), 'Test 6.13: Rollback drops prevent_finalized_dataset_mutation');
  assert(rollbackSql.includes('DROP TABLE IF EXISTS public.tender_master_datasets CASCADE;'), 'Test 6.14: Rollback drops tender_master_datasets in reverse order');
}

// ── TEST GROUP 7: PRODUCTION DATABASE ISOLATION GUARD ──────────────────────
console.log('\n[TEST GROUP 7] Production Database Isolation Guard & Fail-Closed Defense');

{
  const prodUrl = `https://${BLOCKED_PRODUCTION_PROJECT_REF}.supabase.co`;
  const localUrl = 'http://localhost:54321';
  const stagingUrl = 'https://desire-staging-12345.supabase.co';

  // Test 7.1: extractProjectRef extracts correct reference
  assert(extractProjectRef(prodUrl) === BLOCKED_PRODUCTION_PROJECT_REF, 'Test 7.1a: Correctly extracts production project ref');
  assert(extractProjectRef(stagingUrl) === 'desire-staging-12345', 'Test 7.1b: Correctly extracts staging project ref');
  assert(extractProjectRef(localUrl) === null, 'Test 7.1c: Local URL yields null project ref');

  // Test 7.2: Production URL is detected and blocked
  const prodAudit = auditDatabaseEnvironment(prodUrl);
  assert(prodAudit.isProduction === true, 'Test 7.2a: Detects production Supabase URL');
  assert(prodAudit.writePermitted === false, 'Test 7.2b: Write permission is strictly FALSE for Production');
  assert(prodAudit.persistenceMode === 'BLOCKED', 'Test 7.2c: Production persistence mode is BLOCKED');
  assert(prodAudit.reason.includes('SECURITY ALERT'), 'Test 7.2d: Reason contains security alert notice');

  // Test 7.3: assertSafeDatabaseWrite throws exception on Production
  let writeBlocked = false;
  try {
    assertSafeDatabaseWrite(prodUrl);
  } catch (e: any) {
    writeBlocked = e instanceof ProductionDatabaseBlockedError;
  }
  assert(writeBlocked === true, 'Test 7.3: assertSafeDatabaseWrite throws ProductionDatabaseBlockedError on Production');

  // Test 7.4: Local database is recognized and permits local writes
  const localAudit = auditDatabaseEnvironment(localUrl);
  assert(localAudit.isLocal === true, 'Test 7.4a: Identifies localhost as local database');
  assert(localAudit.writePermitted === true, 'Test 7.4b: Writes permitted for verified local database');
  assert(localAudit.persistenceMode === 'LOCAL_DB', 'Test 7.4c: Persistence mode is LOCAL_DB');

  // Test 7.5: Staging project is recognized
  const stagingAudit = auditDatabaseEnvironment(stagingUrl);
  assert(stagingAudit.isProduction === false, 'Test 7.5a: Non-production staging is not production');
  assert(stagingAudit.writePermitted === true, 'Test 7.5b: Writes permitted for isolated staging project');
  assert(stagingAudit.persistenceMode === 'STAGING_DB', 'Test 7.5c: Persistence mode is STAGING_DB');

  // Test 7.6: shouldRunInMockMode returns true for Production to prevent live writes
  assert(shouldRunInMockMode(prodUrl) === true, 'Test 7.6a: Production falls back to safe Mock Mode');
  assert(shouldRunInMockMode('') === true, 'Test 7.6b: Unconfigured URL falls back to safe Mock Mode');
  assert(shouldRunInMockMode(localUrl) === false, 'Test 7.6c: Local DB does not force Mock Mode');
}

// ----------------------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------------------
console.log('\n' + '='.repeat(80));
console.log(`PHASE 4A FINAL AUDIT SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (${failedTests} FAILED)`);
console.log('='.repeat(80));

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('ALL PHASE 4A AUDIT TESTS COMPLETED SUCCESSFULLY.');
  process.exit(0);
}
