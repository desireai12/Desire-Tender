/**
 * Realistic Fixture-Based Functional Pipeline Test Suite (TypeScript)
 * Directly exercises:
 *  1. discovery.ts
 *  2. tableReconstructor.ts
 *  3. evidenceVerifier.ts
 *  4. completenessAuditor.ts
 *  5. evaluatorBridge.ts
 *  6. Evaluator and Master preservation
 */

import { discoverPageAnchors, buildDocumentMap } from '../apps/web/src/lib/new-eligibility/discovery';
import {
  parseCellNumericalValue,
  stitchTableContinuation,
  expandTableGrid,
  deduplicateTableRows,
  validateTableMatrixIntegrity,
  type StructuredTablePayload,
} from '../apps/web/src/lib/new-eligibility/tableReconstructor';
import {
  verifyCriterionEvidence,
  verifyNumericalAlignment,
  verifyQuoteInPageText,
  type UnverifiedCriterionCandidate,
} from '../apps/web/src/lib/new-eligibility/evidenceVerifier';
import {
  auditExtractionCompleteness,
  isCategoryPresentInTender,
  type PageAuditItem,
  type SectionAnchorAuditItem,
  type VerifiedClauseSummary,
} from '../apps/web/src/lib/new-eligibility/completenessAuditor';
import {
  mapVerifiedClausesToExtractionResult,
  evaluateJvConsortiumCompliance,
  extractTenderJvRules,
  buildJvCombinedProfile,
  runBridgeEligibilityEvaluation,
  type VerifiedClauseInput,
} from '../apps/web/src/lib/new-eligibility/evaluatorBridge';
import { DESIRE_ENERGY_MASTER, type CompanyMasterProfile } from '../apps/web/src/lib/new-eligibility/companyMaster';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function runTest(name: string, fn: () => void) {
  console.log(`\n[RUNNING] ${name}...`);
  try {
    fn();
    passCount++;
    console.log(`  [PASS] ${name}`);
  } catch (err: any) {
    failCount++;
    console.error(`  [FAIL] ${name}: ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. STRUCTURAL DISCOVERY & 100% PAGE ACCOUNTING
// ─────────────────────────────────────────────────────────────────────────────
runTest('1. Full-Document Structural Discovery & 100% Page Accounting', () => {
  const p1 = `
  GOVERNMENT OF GUJARAT - WATER RESOURCES DEPARTMENT
  NOTICE INVITING TENDER (NIT) NO. 12 OF 2024-25
  Name of Work: Construction of Solar Lift Irrigation Pipeline
  `;

  const p14 = `
  SECTION III: MINIMUM ELIGIBILITY CRITERIA
  3.1 Financial Criteria:
  The bidder must have average annual turnover of Rs. 69.78 Crores in the last 3 years.
  `;

  const p15 = `
  SECTION III: MINIMUM ELIGIBILITY CRITERIA (Contd.)
  3.2 Technical Criteria:
  Bidder must have completed similar water supply works of at least Rs. 27.91 Cr.
  `;

  const p45 = `
  ANNEXURE A: LIST OF COMPLETED PROJECTS AND CERTIFICATES
  `;

  const anchors1 = discoverPageAnchors(1, p1);
  assert(anchors1.length > 0, 'Should detect NIT_HEADER on page 1');
  assert(anchors1[0].anchorType === 'NIT_HEADER', 'Anchor type must be NIT_HEADER');

  const anchors14 = discoverPageAnchors(14, p14);
  assert(anchors14.length > 0, 'Should detect QUALIFICATION_CRITERIA on page 14');
  assert(anchors14[0].anchorType === 'QUALIFICATION_CRITERIA', 'Anchor type must be QUALIFICATION_CRITERIA');

  const anchors15 = discoverPageAnchors(15, p15);
  assert(anchors15.length > 0, 'Should detect continuation on page 15');
  assert(anchors15[0].isContinued === true, 'Page 15 must be recognized as continued section');

  const anchors45 = discoverPageAnchors(45, p45);
  assert(anchors45.length > 0, 'Should detect ANNEXURE on page 45');

  // Document map with 100 total pages
  const allAnchors = [...anchors1, ...anchors14, ...anchors15, ...anchors45];
  const docMap = buildDocumentMap(allAnchors, 100);

  assert(docMap.totalDiscoveredSections >= 4, 'Must register at least 4 sections');
  assert(docMap.qualificationPageRanges.length > 0, 'Must produce qualification ranges');
  assert(docMap.pageCoverage.totalPages === 100, 'Must record 100 total pages');
  assert(typeof docMap.pageCoverage.mappedPagesCount === 'number', 'Mapped page count must be number');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. MULTI-PAGE TABLE RECONSTRUCTION & REPEATED HEADERS
// ─────────────────────────────────────────────────────────────────────────────
runTest('2. Multi-Page Table Reconstruction & Repeated Header Handling', () => {
  const table1: StructuredTablePayload = {
    tableIdentifier: 'tbl-fin-01',
    category: 'FINANCIAL',
    title: 'Financial Turnover Matrix',
    startPage: 14,
    endPage: 14,
    isMultiPage: false,
    headers: [{ level: 1, headers: [{ title: 'Financial Year' }, { title: 'Turnover (Rs. Cr)' }] }],
    rows: [
      { rowIndex: 1, cells: [{ value: 'FY 2021-22' }, { value: 'Rs. 45.50 Cr', numericValue: 45.5, unit: 'Cr' }] },
      { rowIndex: 2, cells: [{ value: 'FY 2022-23' }, { value: 'Rs. 72.10 Cr', numericValue: 72.1, unit: 'Cr' }] },
    ],
    footnotes: ['* Audited only.'],
    reconstructionConfidence: 0.95,
  };

  const table2ContinuationWithRepeatedHeader: StructuredTablePayload = {
    tableIdentifier: 'tbl-fin-01',
    category: 'FINANCIAL',
    title: 'Financial Turnover Matrix (Contd.)',
    startPage: 15,
    endPage: 15,
    isMultiPage: false,
    headers: [{ level: 1, headers: [{ title: 'Financial Year' }, { title: 'Turnover (Rs. Cr)' }] }],
    rows: [
      // Row 1 on page 15 is a REPEATED HEADER ROW
      {
        rowIndex: 1,
        isHeaderRow: true,
        cells: [{ value: 'Financial Year' }, { value: 'Turnover (Rs. Cr)' }],
      },
      // Row 2 on page 15 is the actual next data row
      {
        rowIndex: 2,
        isHeaderRow: false,
        cells: [{ value: 'FY 2023-24' }, { value: 'Rs. 85.30 Cr', numericValue: 85.3, unit: 'Cr' }],
      },
    ],
    footnotes: ['* Provisional figures rejected.'],
    reconstructionConfidence: 0.95,
  };

  const stitched = stitchTableContinuation(table1, table2ContinuationWithRepeatedHeader);

  // Stitched table must strip the repeated header row and have exactly 3 data rows!
  assert(stitched.rows.length === 3, `Expected 3 data rows, got ${stitched.rows.length}`);
  assert(stitched.rows[0].cells[0].value === 'FY 2021-22', 'Row 1 mismatch');
  assert(stitched.rows[1].cells[0].value === 'FY 2022-23', 'Row 2 mismatch');
  assert(stitched.rows[2].cells[0].value === 'FY 2023-24', 'Row 3 should be FY 2023-24, repeated header stripped');
  assert(stitched.rows[2].rowIndex === 3, 'Row 3 index reindexed to 3');
  assert(stitched.isMultiPage === true, 'Must be marked multi-page');
  assert(stitched.endPage === 15, 'End page must be 15');

  // Test Merged Cell Grid Expansion
  const tableWithColspan: StructuredTablePayload = {
    tableIdentifier: 'tbl-merged-01',
    category: 'TECHNICAL',
    title: 'Combined Works Table',
    startPage: 20,
    endPage: 20,
    isMultiPage: false,
    headers: [{ level: 1, headers: [{ title: 'Col 1' }, { title: 'Col 2' }, { title: 'Col 3' }] }],
    rows: [
      {
        rowIndex: 1,
        cells: [
          { value: 'Merged Header', colSpan: 2 },
          { value: 'Single Col 3', colSpan: 1 },
        ],
      },
      {
        rowIndex: 2,
        cells: [
          { value: 'Cell 1' },
          { value: 'Cell 2' },
          { value: 'Cell 3' },
        ],
      },
    ],
    footnotes: [],
    reconstructionConfidence: 0.95,
  };

  const grid = expandTableGrid(tableWithColspan);
  assert(grid.length === 2, 'Grid must have 2 rows');
  assert(grid[0].length === 3, 'Grid row 0 must expand to 3 columns');
  assert(grid[0][0].value === 'Merged Header', 'Col 1 must be Merged Header');
  assert(grid[0][1].isSpanned === true, 'Col 2 must be marked spanned');
  assert(grid[0][2].value === 'Single Col 3', 'Col 3 must not be shifted');

  // Test Units and Exceptions parsing
  const parsedExc = parseCellNumericalValue('₹ 69.78 Cr (exclusive of GST)');
  assert(parsedExc.numericValue === 69.78, 'Parsed numeric value must be 69.78');
  assert(parsedExc.unit === 'Cr', 'Parsed unit must be Cr');
  assert(parsedExc.exceptionNotes === 'exclusive of GST', 'Must extract exception note');

  // Test Duplicate Preservation
  const rowsWithRepetition = [
    { rowIndex: 1, cells: [{ value: 'Package 1' }, { value: '50.00 Cr', numericValue: 50.0, unit: 'Cr' }] },
    { rowIndex: 2, cells: [{ value: 'Package 2' }, { value: '50.00 Cr', numericValue: 50.0, unit: 'Cr' }] },
  ];
  const deduped = deduplicateTableRows(rowsWithRepetition);
  assert(deduped.length === 2, 'Distinct packages with identical threshold must BOTH be preserved');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. EVIDENCE VERIFICATION (POSITIVE, NEGATIVE, AMBIGUOUS, CELL ADDRESS)
// ─────────────────────────────────────────────────────────────────────────────
runTest('3. Deep Evidence Verification (Negative Mismatches & Cell Coordinates)', () => {
  const pageText = `
  3.1 Financial Capability:
  The bidder should have an average annual financial turnover of not less than Rs. 69.78 Crores
  in the last three financial years (i.e. 2021-22, 2022-23 and 2023-24).
  `;

  // Positive Case: Verbatim quote + matching number
  const candidateValid: UnverifiedCriterionCandidate = {
    criterionType: 'FINANCIAL',
    clauseNumber: '3.1',
    sourcePage: 14,
    verbatimQuote: 'average annual financial turnover of not less than Rs. 69.78 Crores in the last three financial years',
    summary: 'Average turnover Rs 69.78 Cr',
    materiality: 'MANDATORY',
    parameterKey: 'annual_turnover',
    extractedNumericValue: 69.78,
    extractedUnit: 'Cr',
  };
  const resValid = verifyCriterionEvidence(candidateValid, pageText);
  assert(resValid.status === 'VERIFIED', 'Valid candidate must be VERIFIED');
  assert(resValid.isVerified === true, 'isVerified must be true');
  assert(resValid.verifiedNumericValue === 69.78, 'Verified value must match 69.78');

  // Negative Case 1: Hallucinated Quote (not on page)
  const candidateHallucinated: UnverifiedCriterionCandidate = {
    ...candidateValid,
    verbatimQuote: 'Bidder must possess turnover of 500 Crores verified by Asian Development Bank',
  };
  const resHallucinated = verifyCriterionEvidence(candidateHallucinated, pageText);
  assert(resHallucinated.status === 'REJECTED', 'Hallucinated quote must be REJECTED');
  assert(resHallucinated.isVerified === false, 'isVerified must be false');
  assert(resHallucinated.rejectionReason?.includes('Verbatim quote not found'), 'Must give quote not found reason');

  // Negative Case 2: Quote exists, but extracted number contradicts quote
  const candidateWrongNum: UnverifiedCriterionCandidate = {
    ...candidateValid,
    extractedNumericValue: 96.78, // Wrong number!
  };
  const resWrongNum = verifyCriterionEvidence(candidateWrongNum, pageText);
  assert(resWrongNum.status === 'REJECTED', 'Numerical mismatch must be REJECTED');
  assert(resWrongNum.isVerified === false, 'isVerified must be false');
  assert(resWrongNum.rejectionReason?.includes('Numerical interpretation mismatch'), 'Must give numerical mismatch reason');

  // Ambiguous Case: Table cell coordinate not found in table
  const dummyTable: StructuredTablePayload = {
    tableIdentifier: 'tbl-fin-01',
    category: 'FINANCIAL',
    startPage: 14,
    endPage: 14,
    isMultiPage: false,
    headers: [],
    rows: [{ rowIndex: 1, cells: [{ value: 'Rs. 69.78 Cr' }] }],
    footnotes: [],
    reconstructionConfidence: 0.95,
  };
  const candidateInvalidCell: UnverifiedCriterionCandidate = {
    ...candidateValid,
    tableIdentifier: 'tbl-fin-01',
    tableCellAddress: 'R10C10', // Coordinate out of range!
  };
  const resInvalidCell = verifyCriterionEvidence(candidateInvalidCell, pageText, dummyTable);
  assert(resInvalidCell.status === 'NEEDS_REVIEW', 'Unconfirmed table coordinate must yield NEEDS_REVIEW');
  assert(resInvalidCell.isVerified === false, 'isVerified must be false for NEEDS_REVIEW');
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. COMPLETENESS AUDITOR (5 DISTINCT CATEGORY STATES & DISCOVERY GATING)
// ─────────────────────────────────────────────────────────────────────────────
runTest('4. Completeness Auditor (5 Distinct Category States & Discovery Gating)', () => {
  // Scenario A: Standard tender with both Financial & Technical present and extracted
  // All 20 pages participate in discovery and have terminal dispositions
  const pagesStandard: PageAuditItem[] = [];
  for (let p = 1; p <= 20; p++) {
    pagesStandard.push({
      pageNumber: p,
      disposition: p === 14 || p === 16 ? 'RELEVANT' : 'REVIEWED_NO_CRITERIA',
      detectedCategory: p === 14 ? 'FINANCIAL' : (p === 16 ? 'TECHNICAL' : null),
    });
  }
  const anchorsStandard: SectionAnchorAuditItem[] = [
    { anchorType: 'FINANCIAL_FORMAT', anchorName: 'Financial Turnover Criteria', pageNumber: 14, isReviewed: true },
    { anchorType: 'TECHNICAL_SPECS', anchorName: 'Technical Experience Criteria', pageNumber: 16, isReviewed: true },
  ];
  const clausesStandard: VerifiedClauseSummary[] = [
    { criterionType: 'FINANCIAL', sourcePage: 14, summary: 'Turnover Rs 69.78 Cr', materiality: 'MANDATORY' },
    { criterionType: 'TECHNICAL', sourcePage: 16, summary: 'Similar work Rs 27.91 Cr', materiality: 'MANDATORY' },
  ];
  const reportStandard = auditExtractionCompleteness(20, pagesStandard, anchorsStandard, clausesStandard);
  assert(reportStandard.canProduceDefinitiveVerdict === true, 'Standard extraction must allow definitive verdict');
  assert(reportStandard.categoryStatuses.FINANCIAL.status === 'PRESENT_AND_REVIEWED', 'Financial must be PRESENT_AND_REVIEWED');
  assert(reportStandard.categoryStatuses.TECHNICAL.status === 'PRESENT_AND_REVIEWED', 'Technical must be PRESENT_AND_REVIEWED');

  // Scenario B: Supply Tender where Technical criteria is ABSENT from document after complete review
  // All 20 pages participate in discovery and have terminal dispositions
  const pagesSupply: PageAuditItem[] = [];
  for (let p = 1; p <= 20; p++) {
    pagesSupply.push({
      pageNumber: p,
      disposition: p === 14 ? 'RELEVANT' : 'REVIEWED_NO_CRITERIA',
      detectedCategory: p === 14 ? 'FINANCIAL' : null,
    });
  }
  const anchorsSupply: SectionAnchorAuditItem[] = [
    { anchorType: 'FINANCIAL_FORMAT', anchorName: 'Financial Turnover Criteria', pageNumber: 14, isReviewed: true },
  ];
  const clausesSupply: VerifiedClauseSummary[] = [
    { criterionType: 'FINANCIAL', sourcePage: 14, summary: 'Turnover Rs 69.78 Cr', materiality: 'MANDATORY' },
  ];
  const reportSupply = auditExtractionCompleteness(20, pagesSupply, anchorsSupply, clausesSupply);
  assert(reportSupply.categoryStatuses.TECHNICAL.status === 'ABSENT_FROM_TENDER', 'Technical must be ABSENT_FROM_TENDER after complete review');
  assert(reportSupply.canProduceDefinitiveVerdict === true, 'Complete review with technical absent MUST allow definitive verdict!');

  // Scenario B2: Insufficient Discovery (Only 10 of 20 pages processed)
  // An uncertain discovery result must NEVER be treated as proof that a category does not exist!
  const pagesIncomplete: PageAuditItem[] = [];
  for (let p = 1; p <= 10; p++) {
    pagesIncomplete.push({
      pageNumber: p,
      disposition: p === 5 ? 'RELEVANT' : 'REVIEWED_NO_CRITERIA',
      detectedCategory: p === 5 ? 'FINANCIAL' : null,
    });
  }
  const reportIncomplete = auditExtractionCompleteness(20, pagesIncomplete, anchorsSupply, clausesSupply);
  assert(
    reportIncomplete.categoryStatuses.TECHNICAL.status === 'NOT_DETECTED_WITH_INSUFFICIENT_DISCOVERY',
    'Technical must be NOT_DETECTED_WITH_INSUFFICIENT_DISCOVERY when page coverage is incomplete'
  );
  assert(reportIncomplete.canProduceDefinitiveVerdict === false, 'Insufficient discovery MUST block definitive verdict');
  assert(reportIncomplete.verdictOverrideReason?.includes('incomplete discovery'), 'Must state incomplete discovery in override reason');

  // Scenario C: Tender where Technical criteria IS present in document anchors but NOT extracted
  // (Must BLOCK definitive verdict!)
  const pagesMissingExtraction: PageAuditItem[] = [
    { pageNumber: 1, disposition: 'REVIEWED_NO_CRITERIA' },
    { pageNumber: 14, disposition: 'RELEVANT', detectedCategory: 'FINANCIAL' },
    { pageNumber: 16, disposition: 'RELEVANT', detectedCategory: 'TECHNICAL' },
  ];
  const anchorsMissingExtraction: SectionAnchorAuditItem[] = [
    { anchorType: 'FINANCIAL_FORMAT', anchorName: 'Financial Turnover Criteria', pageNumber: 14, isReviewed: true },
    { anchorType: 'TECHNICAL_SPECS', anchorName: 'Technical Experience Criteria', pageNumber: 16, isReviewed: true },
  ];
  const clausesMissingTech: VerifiedClauseSummary[] = [
    { criterionType: 'FINANCIAL', sourcePage: 14, summary: 'Turnover Rs 69.78 Cr', materiality: 'MANDATORY' },
    // Technical criteria missing!
  ];
  const reportMissingTech = auditExtractionCompleteness(20, pagesMissingExtraction, anchorsMissingExtraction, clausesMissingTech);
  assert(reportMissingTech.categoryStatuses.TECHNICAL.status === 'PRESENT_BUT_NOT_EXTRACTED', 'Must detect PRESENT_BUT_NOT_EXTRACTED');
  assert(reportMissingTech.canProduceDefinitiveVerdict === false, 'Must block verdict when present criteria were not extracted');
  assert(reportMissingTech.verdictOverrideReason?.includes('TECHNICAL'), 'Must name TECHNICAL in override reason');

  // Scenario C2: Tender where Technical criteria is present, but page is UNREADABLE
  // (State 5: UNREADABLE_OR_UNRESOLVED)
  const pagesUnreadable: PageAuditItem[] = [
    { pageNumber: 1, disposition: 'REVIEWED_NO_CRITERIA' },
    { pageNumber: 14, disposition: 'RELEVANT', detectedCategory: 'FINANCIAL' },
    { pageNumber: 16, disposition: 'UNREADABLE', detectedCategory: 'TECHNICAL' },
  ];
  const reportUnreadable = auditExtractionCompleteness(20, pagesUnreadable, anchorsMissingExtraction, clausesMissingTech);
  assert(reportUnreadable.categoryStatuses.TECHNICAL.status === 'UNREADABLE_OR_UNRESOLVED', 'Must detect UNREADABLE_OR_UNRESOLVED');
  assert(reportUnreadable.canProduceDefinitiveVerdict === false, 'Unreadable pages must block verdict');

  // Scenario D: Corrigendum amending turnover threshold
  const clausesWithCorrigendum: VerifiedClauseSummary[] = [
    { criterionType: 'FINANCIAL', sourcePage: 14, summary: 'Turnover Rs 69.78 Cr', materiality: 'MANDATORY', parameterKey: 'turnover' },
    { criterionType: 'FINANCIAL', sourcePage: 55, summary: 'Amended Turnover Rs 55.00 Cr', materiality: 'MANDATORY', parameterKey: 'turnover', isAddendum: true },
  ];
  const reportCorrigendum = auditExtractionCompleteness(60, pagesSupply, anchorsSupply, clausesWithCorrigendum);
  assert(reportCorrigendum.detectedCorrigendaContradictions.length === 1, 'Must detect 1 corrigendum contradiction');
  assert(reportCorrigendum.detectedCorrigendaContradictions[0].corrigendumPage === 55, 'Corrigendum page must be 55');
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. EVALUATOR BRIDGE & EXPLICIT JV CONSORTIUM FORMULAS
// ─────────────────────────────────────────────────────────────────────────────
runTest('5. Evaluator Bridge & Explicit JV Consortium Formulas', () => {
  const verifiedClauses: VerifiedClauseInput[] = [
    {
      criterionType: 'FINANCIAL',
      clauseNumber: '3.1',
      sourcePage: 14,
      verbatimQuote: 'Average annual financial turnover shall not be less than Rs. 100.00 Crores',
      summary: 'Turnover Rs 100 Cr',
      materiality: 'MANDATORY',
      parameterKey: 'annual_turnover',
      extractedValue: {
        amount: 100.0,
        unit: 'Cr',
        yearRule: 'average',
        yearRange: 'last 3 years',
      },
    },
  ];

  // Scenario A: Desire Standalone Evaluation (Desire average is ₹271.94 Cr >= 100 Cr)
  const standaloneReport = runBridgeEligibilityEvaluation(verifiedClauses, {
    tenderTitle: 'Mega Water Scheme',
  });
  assert(standaloneReport.verdict === 'Eligible', 'Desire standalone should be ELIGIBLE for 100 Cr');

  // Scenario B: Tender-Specific JV Rules (Custom 40% Lead and 20% Partner extracted from tender)
  // Requirement: 100 Cr. Lead min (40%): 40 Cr. Partner min (20%): 20 Cr.
  // Desire avg: 271.94 Cr (>= 40 Cr). Partner avg: 30.00 Cr (>= 20 Cr).
  const qualifiedPartner: CompanyMasterProfile = {
    ...DESIRE_ENERGY_MASTER,
    id: 'comp-qual-01',
    name: 'Gujarat Infra Projects Ltd',
    year_wise_turnover: { 'FY 2022-23': 30.0, 'FY 2023-24': 30.0, 'FY 2024-25': 30.0 },
    three_year_average_turnover: 30.0,
  };
  const jvQualifiedCheck = evaluateJvConsortiumCompliance(
    DESIRE_ENERGY_MASTER,
    qualifiedPartner,
    [{ type: 'turnover', amount: 100.0, title: 'Turnover', quote: '', page: 14, amount_raw: '100 Cr', amount_unit: 'Cr', year_rule: 'average', year_range: '3 yrs', alternative_group_id: null }],
    [],
    {
      isJvPermitted: true,
      leadMinFinancialSharePercent: 0.40,
      partnerMinFinancialSharePercent: 0.20,
      financialCombinationFormula: 'ARITHMETIC_POOL',
      technicalCombinationFormula: 'COMBINED_EXPERIENCE',
      nonPoolableCredentials: [],
    }
  );
  assert(jvQualifiedCheck.isEligibleAsJv === true, 'Both partners meet tender-specific 40%/20% thresholds, JV must qualify');

  // Scenario C: JV Consortium where Partner FAILS tender-specific minimum threshold (< 20 Cr)
  // Partner has only 15 Cr average (< 20 Cr).
  const weakPartner: CompanyMasterProfile = {
    ...DESIRE_ENERGY_MASTER,
    id: 'comp-weak-01',
    name: 'Small Subcontractor Ltd',
    year_wise_turnover: { 'FY 2022-23': 15.0, 'FY 2023-24': 15.0, 'FY 2024-25': 15.0 },
    three_year_average_turnover: 15.0,
  };
  const jvPartnerFailCheck = evaluateJvConsortiumCompliance(
    DESIRE_ENERGY_MASTER,
    weakPartner,
    [{ type: 'turnover', amount: 100.0, title: 'Turnover', quote: '', page: 14, amount_raw: '100 Cr', amount_unit: 'Cr', year_rule: 'average', year_range: '3 yrs', alternative_group_id: null }],
    [],
    {
      isJvPermitted: true,
      leadMinFinancialSharePercent: 0.40,
      partnerMinFinancialSharePercent: 0.20,
      financialCombinationFormula: 'ARITHMETIC_POOL',
      technicalCombinationFormula: 'COMBINED_EXPERIENCE',
      nonPoolableCredentials: [],
    }
  );
  assert(jvPartnerFailCheck.isEligibleAsJv === false, 'Partner failing 20% minimum share must DISQUALIFY the JV');
  assert(jvPartnerFailCheck.disqualificationReason?.includes('20%'), 'Must state tender-specific 20% partner threshold failure');

  // Scenario D: Non-poolable credentials test (Technical experience must be met by Lead alone)
  const jvNonPoolableCheck = evaluateJvConsortiumCompliance(
    DESIRE_ENERGY_MASTER,
    qualifiedPartner,
    [{ type: 'turnover', amount: 100.0, title: 'Turnover', quote: '', page: 14, amount_raw: '100 Cr', amount_unit: 'Cr', year_rule: 'average', year_range: '3 yrs', alternative_group_id: null }],
    [],
    {
      isJvPermitted: true,
      leadMinFinancialSharePercent: 0.40,
      partnerMinFinancialSharePercent: 0.20,
      financialCombinationFormula: 'ARITHMETIC_POOL',
      technicalCombinationFormula: 'LEAD_ONLY',
      nonPoolableCredentials: ['technical_work_experience'],
    }
  );
  assert(jvNonPoolableCheck.technicalEvaluation.nonPoolableChecked === true, 'Non-poolable credentials must be enforced');
  assert(jvNonPoolableCheck.technicalEvaluation.formulaUsed === 'LEAD_ONLY', 'Formula must be LEAD_ONLY');

  // Scenario E: Dynamic extraction of tender-specific JV rules from verbatim clause
  const sampleJvClauses: VerifiedClauseInput[] = [
    {
      criterionType: 'OTHERS',
      sourcePage: 12,
      summary: 'Joint Venture Rules',
      verbatimQuote: 'In case of Joint Venture, lead partner shall meet at least 40% and each other partner shall meet at least 20% of minimum turnover. Similar work experience shall be satisfied by lead partner alone.',
      materiality: 'MANDATORY',
      parameterKey: 'jv_rules',
    },
  ];
  const extractedRules = extractTenderJvRules(sampleJvClauses);
  assert(extractedRules.leadMinFinancialSharePercent === 0.40, 'Must extract 40% lead share from tender quote');
  assert(extractedRules.partnerMinFinancialSharePercent === 0.20, 'Must extract 20% partner share from tender quote');
  assert(extractedRules.technicalCombinationFormula === 'LEAD_ONLY', 'Must extract LEAD_ONLY technical rule');

  // Scenario F: Ambiguous JV formula language (tender mentions JV but gives no formula)
  // NEVER assume automatic arithmetic pooling!
  const ambiguousJvClauses: VerifiedClauseInput[] = [
    {
      criterionType: 'OTHERS',
      sourcePage: 12,
      summary: 'Joint Venture General Rule',
      verbatimQuote: 'Joint Venture is permitted as per standard government guidelines.',
      materiality: 'MANDATORY',
      parameterKey: 'jv_rules',
    },
  ];
  const ambiguousRules = extractTenderJvRules(ambiguousJvClauses);
  assert(ambiguousRules.financialCombinationFormula === 'FORMULA_NOT_SPECIFIED', 'Ambiguous clause must yield FORMULA_NOT_SPECIFIED');
  assert(ambiguousRules.isFormulaAmbiguous === true, 'isFormulaAmbiguous must be true');

  const ambiguousJvCheck = evaluateJvConsortiumCompliance(
    DESIRE_ENERGY_MASTER,
    qualifiedPartner,
    [{ type: 'turnover', amount: 100.0, title: 'Turnover', quote: '', page: 14, amount_raw: '100 Cr', amount_unit: 'Cr', year_rule: 'average', year_range: '3 yrs', alternative_group_id: null }],
    [],
    ambiguousRules
  );
  assert(ambiguousJvCheck.isEligibleAsJv === false, 'Ambiguous formula must DISQUALIFY the JV; pooling never assumed');
  assert(ambiguousJvCheck.disqualificationReason?.includes('automatic arithmetic pooling is prohibited'), 'Must explain automatic pooling is prohibited');

  // Test that runBridgeEligibilityEvaluation sets NOT ELIGIBLE when JV fails
  const jvFailedReport = runBridgeEligibilityEvaluation(verifiedClauses, {
    tenderTitle: 'Mega Water Scheme',
    isJvBid: true,
    partnerMaster: weakPartner,
    customJvRules: { leadMinFinancialSharePercent: 0.40, partnerMinFinancialSharePercent: 0.20 },
  });
  assert(jvFailedReport.verdict.startsWith('Not eligible'), 'Report must state NOT ELIGIBLE when JV threshold fails');
  assert(jvFailedReport.verdict.includes('JV Disqualified'), 'Verdict detail must explain JV disqualification');
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. CORE FILE PRESERVATION & IMMUTABILITY
// ─────────────────────────────────────────────────────────────────────────────
runTest('6. Core Evaluator Files Untouched & Preserved', () => {
  assert(typeof DESIRE_ENERGY_MASTER.three_year_average_turnover === 'number', 'DESIRE_ENERGY_MASTER is intact');
  assert(DESIRE_ENERGY_MASTER.name.includes('DESIRE ENERGY'), 'Company name intact');
  assert(DESIRE_ENERGY_MASTER.three_year_average_turnover === 271.94, 'Desire turnover intact (271.94 Cr)');
});

console.log('\n================================================================================');
console.log(`TYPESCRIPT TEST SUITE FINISHED: ${passCount} Passed, ${failCount} Failed.`);
console.log('================================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
