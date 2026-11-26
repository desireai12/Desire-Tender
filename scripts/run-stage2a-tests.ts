/**
 * DESIRE TENDER — STAGE 2A TEST RUNNER
 * Tests Gemini Vision Multimodal Client:
 * 1. Small text-based PDF (live Gemini extraction, criteria grouping, token & cost tracking)
 * 2. Scanned / degraded PDF (degradation detection & OCR fallback trigger)
 * 3. PDF with structured tables (table structure & headers extraction)
 * 4. Multi-page sample (20 pages: sequential 15-page batches with 2-page overlap, deduplication, page preservation)
 * 5. Stage 1 Safeguards confirmation (5-state absence logic & ambiguous JV rejection)
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  generateBatchPageRanges,
  validateExtractionSchema,
  reconcileClauses,
  reconcileAnchors,
  runOcrFallbackForPages,
  extractBatchWithGeminiVision,
  extractMultiBatchDocument,
  COST_PER_PROMPT_TOKEN,
  COST_PER_OUTPUT_TOKEN
} from '../apps/web/src/lib/new-eligibility/geminiVisionClient';
import {
  auditExtractionCompleteness,
  isCategoryIndicatedInTender,
  type PageAuditItem,
  type SectionAnchorAuditItem,
  type VerifiedClauseSummary
} from '../apps/web/src/lib/new-eligibility/completenessAuditor';
import {
  extractTenderJvRules,
  evaluateJvConsortiumCompliance,
  type VerifiedClauseInput
} from '../apps/web/src/lib/new-eligibility/evaluatorBridge';
import {
  DESIRE_ENERGY_MASTER,
  VINOD_H_PATEL_MASTER,
  type CompanyMasterProfile
} from '../apps/web/src/lib/new-eligibility/companyMaster';
import type { CriterionType } from '../apps/web/src/lib/new-eligibility/dbTypes';

// Load API key from apps/web/.env.local
let apiKey = process.env.GEMINI_API_KEY || '';
if (!apiKey) {
  const envPath = path.resolve('apps/web/.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, v] = trimmed.split('=');
        if (k.trim() === 'GEMINI_API_KEY') {
          apiKey = v.trim().replace(/^["']|["']$/g, '');
        }
      }
    }
  }
}

async function runStage2aTests() {
  console.log('\n======================================================================');
  console.log('   STAGE 2A: GEMINI VISION MULTIMODAL EXTRACTION TEST SUITE');
  console.log('======================================================================\n');

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  [PASS] ${msg}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] ${msg}`);
      failedTests++;
    }
  }

  // ── TEST 1: Small Text-Based PDF ──────────────────────────────────────────
  console.log('--- TEST 1: Small Text-Based PDF (2 pages) ---');
  const pdf1Path = path.resolve('test-fixtures/1_text_based.pdf');
  const pdf1Buf = fs.readFileSync(pdf1Path);

  console.log(`[TEST 1] Calling Gemini Vision with 1_text_based.pdf (${pdf1Buf.length} bytes)...`);
  const res1 = await extractMultiBatchDocument(pdf1Buf, 2, {
    apiKey,
    modelName: 'gemini-3.5-flash-lite'
  });

  assert(res1.totalBatches === 1, `Total batches is 1 (got ${res1.totalBatches})`);
  assert(res1.all_clauses.length >= 3, `Extracted ${res1.all_clauses.length} clauses (expected >= 3)`);

  const finClauses1 = res1.all_clauses.filter(c => c.criterion_type === 'FINANCIAL');
  const techClauses1 = res1.all_clauses.filter(c => c.criterion_type === 'TECHNICAL');
  const othClauses1 = res1.all_clauses.filter(c => c.criterion_type === 'OTHERS');

  assert(finClauses1.length >= 1, `Found ${finClauses1.length} financial criteria`);
  assert(techClauses1.length >= 1, `Found ${techClauses1.length} technical criteria`);
  assert(othClauses1.length >= 1, `Found ${othClauses1.length} other criteria`);

  // Verify page preservation (pages 1 and 2)
  const pagesFound1 = new Set(res1.all_clauses.map(c => c.source_page));
  assert(pagesFound1.has(1) || pagesFound1.has(2), `Source pages preserved correctly: [${Array.from(pagesFound1).join(', ')}]`);

  // Verify token usage and cost
  assert(res1.total_prompt_tokens > 0, `Prompt tokens recorded: ${res1.total_prompt_tokens}`);
  assert(res1.total_output_tokens > 0, `Output tokens recorded: ${res1.total_output_tokens}`);
  assert(res1.payable_cost_usd === 0.0, `Payable cost strictly $0.00 on Free Tier (got $${res1.payable_cost_usd})`);
  assert(res1.estimated_market_value_usd > 0, `Estimated market value: $${res1.estimated_market_value_usd.toFixed(6)}`);

  console.log(`[TEST 1 METRICS] Tokens: ${res1.total_prompt_tokens} in / ${res1.total_output_tokens} out | Market Value: $${res1.estimated_market_value_usd.toFixed(6)} | Payable: $${res1.payable_cost_usd.toFixed(2)}`);

  // ── TEST 2: Scanned / Degraded PDF ────────────────────────────────────────
  console.log('\n--- TEST 2: Scanned / Degraded PDF (OCR Fallback Verification) ---');
  const pdf2Path = path.resolve('test-fixtures/2_scanned_degraded.pdf');
  const pdf2Buf = fs.readFileSync(pdf2Path);

  const res2 = await extractBatchWithGeminiVision(
    pdf2Buf,
    { batchIndex: 0, startPage: 1, endPage: 1, isOverlap: false, overlapPages: [] },
    { apiKey, modelName: 'gemini-3.5-flash-lite' }
  );

  const isDegradedOrOcr =
    res2.status === 'OCR_FALLBACK_REQUIRED' ||
    res2.ocrFallbackPages.includes(1) ||
    res2.pages_processed.some(p => p.is_scanned_or_degraded);

  assert(isDegradedOrOcr, `Degraded/scanned page flagged for review or OCR fallback (status: ${res2.status})`);

  // Verify OCR fallback execution hook
  const ocrFallbackResult = await runOcrFallbackForPages([1], pdf2Buf);
  assert(ocrFallbackResult.ocrResults.length === 1, `OCR fallback processed ${ocrFallbackResult.ocrResults.length} page`);
  assert(ocrFallbackResult.ocrResults[0].pageNumber === 1, `OCR fallback page is 1`);

  // ── TEST 3: PDF Containing Tables ─────────────────────────────────────────
  console.log('\n--- TEST 3: PDF Containing Tables (Table Structure Extraction) ---');
  const pdf3Path = path.resolve('test-fixtures/3_tables.pdf');
  const pdf3Buf = fs.readFileSync(pdf3Path);

  const res3 = await extractBatchWithGeminiVision(
    pdf3Buf,
    { batchIndex: 0, startPage: 1, endPage: 1, isOverlap: false, overlapPages: [] },
    { apiKey, modelName: 'gemini-3.5-flash-lite' }
  );

  assert(res3.structured_tables.length >= 1, `Extracted ${res3.structured_tables.length} structured tables`);
  if (res3.structured_tables.length > 0) {
    const table = res3.structured_tables[0];
    assert(table.headers.length > 0 || table.rows.length > 0, `Table contains headers or rows (headers: ${table.headers.length}, rows: ${table.rows.length})`);
    assert(table.start_page === 1, `Table start page is 1`);
  }

  // ── TEST 4: Multi-page Sample (20 Pages with 15-page Batches & 2-page Overlap) ─
  console.log('\n--- TEST 4: Multi-page Sample (20 Pages, 15-page Batches, 2-page Overlap) ---');
  const ranges20 = generateBatchPageRanges(20, 15, 2);
  assert(ranges20.length === 2, `Generated exactly 2 batches for 20 pages (got ${ranges20.length})`);
  assert(ranges20[0].startPage === 1 && ranges20[0].endPage === 15, `Batch 0 covers pages 1 to 15`);
  assert(ranges20[1].startPage === 14 && ranges20[1].endPage === 20, `Batch 1 covers pages 14 to 20`);
  assert(ranges20[1].overlapPages.length === 2 && ranges20[1].overlapPages[0] === 14 && ranges20[1].overlapPages[1] === 15, `Batch 1 overlap contains pages 14 and 15`);

  const pdf4Path = path.resolve('test-fixtures/4_multipage_sample.pdf');
  const pdf4Buf = fs.readFileSync(pdf4Path);

  console.log(`[TEST 4] Calling extractMultiBatchDocument for 20 pages...`);
  const res4 = await extractMultiBatchDocument(pdf4Buf, 20, {
    apiKey,
    modelName: 'gemini-3.5-flash-lite',
    interBatchDelayMs: 500
  });

  assert(res4.batches.length === 2, `Executed 2 sequential batches (got ${res4.batches.length})`);

  // Check original page number preservation across batches
  const page18Clauses = res4.all_clauses.filter(c => c.source_page === 18);
  assert(page18Clauses.length >= 1, `Preserved original source_page 18 in Batch 1 (found ${page18Clauses.length} clause)`);

  const page3Clauses = res4.all_clauses.filter(c => c.source_page === 3);
  assert(page3Clauses.length >= 1, `Preserved original source_page 3 in Batch 0 (found ${page3Clauses.length} clause)`);

  // Check deduplication across overlap pages 14 & 15
  const page14Clauses = res4.all_clauses.filter(c => c.source_page === 14);
  const page15Clauses = res4.all_clauses.filter(c => c.source_page === 15);
  console.log(`[TEST 4 DEDUPLICATION] Clauses on overlap p14: ${page14Clauses.length}, p15: ${page15Clauses.length}`);
  // Overlap clauses should not be duplicated
  const quotesOn14 = page14Clauses.map(c => c.verbatim_quote.trim().toLowerCase());
  const uniqueQuotesOn14 = new Set(quotesOn14);
  assert(quotesOn14.length === uniqueQuotesOn14.size, `No duplicate clauses on overlap page 14 (${quotesOn14.length} unique)`);

  // Check Report order: Financial, Technical, Others
  let lastCatRank = 0;
  const catRanks: Record<CriterionType, number> = { FINANCIAL: 1, TECHNICAL: 2, OTHERS: 3 };
  let orderPreserved = true;
  for (const cl of res4.all_clauses) {
    const rank = catRanks[cl.criterion_type];
    if (rank < lastCatRank) {
      orderPreserved = false;
      break;
    }
    lastCatRank = rank;
  }
  assert(orderPreserved, `Clauses ordered by Financial -> Technical -> Others`);

  // Check Token & Cost accounting
  assert(res4.total_prompt_tokens > 0, `Total prompt tokens: ${res4.total_prompt_tokens}`);
  assert(res4.total_output_tokens > 0, `Total output tokens: ${res4.total_output_tokens}`);
  assert(res4.payable_cost_usd === 0.0, `Multi-batch payable cost strictly $0.00 on Free Tier (got $${res4.payable_cost_usd})`);
  assert(res4.estimated_market_value_usd > 0, `Total estimated market value: $${res4.estimated_market_value_usd.toFixed(6)}`);
  console.log(`[TEST 4 TOTALS] Batches: ${res4.totalBatches} | Tokens: ${res4.total_prompt_tokens} in / ${res4.total_output_tokens} out | Market Value: $${res4.estimated_market_value_usd.toFixed(6)} | Payable: $${res4.payable_cost_usd.toFixed(2)}`);

  // ── TEST 5: Stage 1 Safeguards Confirmation ───────────────────────────────
  console.log('\n--- TEST 5: Stage 1 Safeguards Confirmation ---');

  // 1. Five Category States in Completeness Auditor
  // State 1: PRESENT_AND_REVIEWED
  const audit10Pages: PageAuditItem[] = Array.from({ length: 10 }, (_, i) => ({
    pageNumber: i + 1,
    disposition: 'REVIEWED_NO_CRITERIA'
  }));
  audit10Pages[0].disposition = 'RELEVANT';
  const finClause: VerifiedClauseSummary = {
    criterionType: 'FINANCIAL',
    sourcePage: 1,
    summary: 'Turnover requirement',
    materiality: 'MANDATORY'
  };
  const rep1 = auditExtractionCompleteness(10, audit10Pages, [], [finClause]);
  assert(rep1.categoryStatuses.FINANCIAL.status === 'PRESENT_AND_REVIEWED', `Category state 1: PRESENT_AND_REVIEWED`);

  // State 2: ABSENT_FROM_TENDER (100% terminal pages reviewed, zero anchors, zero detected pages)
  const rep2 = auditExtractionCompleteness(10, audit10Pages, [], []);
  assert(rep2.categoryStatuses.FINANCIAL.status === 'ABSENT_FROM_TENDER', `Category state 2: ABSENT_FROM_TENDER (full coverage)`);

  // State 3: NOT_DETECTED_WITH_INSUFFICIENT_DISCOVERY (<100% pages reviewed)
  const incompletePages: PageAuditItem[] = Array.from({ length: 7 }, (_, i) => ({
    pageNumber: i + 1,
    disposition: 'REVIEWED_NO_CRITERIA'
  }));
  const rep3 = auditExtractionCompleteness(10, incompletePages, [], []);
  assert(rep3.categoryStatuses.FINANCIAL.status === 'NOT_DETECTED_WITH_INSUFFICIENT_DISCOVERY', `Category state 3: NOT_DETECTED_WITH_INSUFFICIENT_DISCOVERY (<100% coverage)`);

  // State 4: UNREADABLE_OR_UNRESOLVED (degraded/unreadable page present)
  const degradedPages: PageAuditItem[] = [...audit10Pages];
  degradedPages[2] = { pageNumber: 3, disposition: 'UNREADABLE', detectedCategory: 'FINANCIAL' };
  const rep4 = auditExtractionCompleteness(10, degradedPages, [], []);
  assert(rep4.categoryStatuses.FINANCIAL.status === 'UNREADABLE_OR_UNRESOLVED', `Category state 4: UNREADABLE_OR_UNRESOLVED (degraded page present)`);

  // State 5: PRESENT_BUT_NOT_EXTRACTED (anchor detected, but 0 clauses extracted)
  const finAnchor: SectionAnchorAuditItem = {
    anchorType: 'FINANCIAL_FORMAT',
    anchorName: 'Schedule of Financial Turnover',
    pageNumber: 4,
    isReviewed: true,
    category: 'FINANCIAL'
  };
  const rep5 = auditExtractionCompleteness(10, audit10Pages, [finAnchor], []);
  assert(rep5.categoryStatuses.FINANCIAL.status === 'PRESENT_BUT_NOT_EXTRACTED', `Category state 5: PRESENT_BUT_NOT_EXTRACTED (anchor found, 0 clauses)`);

  // 2. Ambiguous JV formula blocks pooling
  const ambiguousRules = extractTenderJvRules([
    {
      criterionType: 'OTHERS',
      sourcePage: 1,
      verbatimQuote: 'Joint venture may be considered as per department discretion.',
      summary: 'Joint venture conditions',
      materiality: 'MANDATORY'
    }
  ]);
  assert(ambiguousRules.financialCombinationFormula === 'FORMULA_NOT_SPECIFIED', `Ambiguous formula sets FORMULA_NOT_SPECIFIED`);

  const mockFinClause = [
    {
      title: 'Turnover',
      type: 'turnover' as const,
      amount: 50.0,
      amount_unit: 'Cr',
      amount_raw: '50.0 Cr',
      year_rule: 'average',
      year_range: 'last 3 years',
      alternative_group_id: null,
      quote: '50 Cr',
      page: 1
    }
  ];
  const jvResult = evaluateJvConsortiumCompliance(
    DESIRE_ENERGY_MASTER,
    VINOD_H_PATEL_MASTER as unknown as CompanyMasterProfile,
    mockFinClause,
    [],
    ambiguousRules
  );
  assert(jvResult.isEligibleAsJv === false, `Ambiguous formula rejects automatic pooling (isEligibleAsJv: false)`);
  assert(
    (jvResult.disqualificationReason || '').includes('does not specify an explicit') ||
    (jvResult.disqualificationReason || '').includes('automatic arithmetic pooling is prohibited'),
    `Disqualification reason confirms unstated formula: "${jvResult.disqualificationReason}"`
  );

  // ── FINAL SUMMARY ─────────────────────────────────────────────────────────
  console.log('\n======================================================================');
  console.log(`   STAGE 2A TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('======================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runStage2aTests().catch(err => {
  console.error('[FATAL ERROR IN TEST RUNNER]', err);
  process.exit(1);
});
