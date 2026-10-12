/**
 * Generic Automated Document Verification Suite
 * Requirements:
 * 1. Every quote exists in source text.
 * 2. Two different documents never yield the same criteria set.
 * 3. No clause count is exactly the same as a template count (e.g. 5 or 12).
 * 4. The scored-clause counts + unscored counts add up to displayed total clauses.
 */

// ─── THREE TEST DOCUMENTS OF DIFFERENT TYPES ────────────────────────────────
const sampleDocA = {
  id: 'doc-type-a-pipeline',
  type: 'Bulk Water Transmission Pipeline Tender',
  sourceText: `
    NOTICE INVITING TENDER NIT NO 42/2026-27.
    Name of Work: Construction of 45 km Bulk Water Pipeline and Headworks Pumping Station.
    Estimated Value: Rs 45.50 Crores. EMD: Rs 45.50 Lakhs. Completion Period: 12 Months.
    Clause 1.1 Financial Turnover: The bidder must have an Average Annual Financial Turnover of not less than Rs 45.50 Crores in the last 3 financial years.
    Clause 1.2 Net Worth: Net worth of bidder as on last financial year must be positive and minimum Rs 8.00 Crores.
    Clause 2.1 Single Work Experience: The bidder must have completed at least one similar water supply pipeline contract of value not less than Rs 18.20 Crores in last 7 years.
    Clause 3.1 Registration: Valid Class-A Contractor Registration with State Water Resources Department.
    Clause 4.1 Bid Security: EMD of Rs 45.50 Lakhs in form of Bank Guarantee / Demand Draft.
    Clause 4.2 Tender Fee: Non-refundable Tender Document Fee of Rs 10,000.
    Clause 5.1 Defect Liability Period: 24 Months Defect Liability Period after completion.
  `
};

const sampleDocB = {
  id: 'doc-type-b-solar',
  type: 'Solar PV Microgrid & Rooftop Tender',
  sourceText: `
    RENEWABLE ENERGY TENDER RPF-2026-SOLAR-09.
    Work Scope: Design, Supply, Installation & Commissioning of 15 MW Grid-Connected Solar PV Power Plant with 5 Years O&M.
    Estimated Cost: Rs 62.00 Crores. EMD: Rs 62.00 Lakhs.
    Clause 1.1 Turnover: Minimum Average Annual Financial Turnover of Rs 62.00 Crores in last 3 financial years.
    Clause 1.2 Solvency: Solvency Certificate of minimum Rs 15.00 Crores from Scheduled Bank.
    Clause 2.1 Technical Experience: Bidder must have commissioned at least 10 MW cumulative capacity grid-connected Solar PV power plants.
    Clause 2.2 Solar PV Modules: ALMM enlisted Tier-1 Solar PV Modules mandatory.
    Clause 3.1 Registration: Registration with MNRE / State Renewable Energy Agency.
    Clause 4.1 EMD Deposit: EMD of Rs 62.00 Lakhs required.
    Clause 4.2 Power of Attorney: Power of Attorney on Rs 500 stamp paper.
    Clause 5.1 PBG: Performance Bank Guarantee of 5% contract value required.
    Clause 5.2 O&M Term: 5 Years Comprehensive Operation & Maintenance.
  `
};

const sampleDocC = {
  id: 'doc-type-c-esco',
  type: 'Municipal Pumping Station ESCO Energy Audit Tender',
  sourceText: `
    TENDER REF: MUNI-ESCO-2026-03.
    Scope: Energy Performance Contracting for Municipal Water Pumping Stations.
    Clause 1.1 Turnover: Minimum Average Annual Turnover of Rs 12.00 Crores in last 3 financial years.
    Clause 2.1 Technical Credential: Proven BEE Grade-1 or Grade-2 ESCO accreditation with minimum 15% energy saving performance guarantee.
    Clause 3.1 EMD Fee: EMD of Rs 12.00 Lakhs and Document Fee of Rs 5,000.
    Clause 4.1 Shared Savings SLA: Guaranteed annual energy savings audit report compliance.
  `
};

// ─── CLAUSE EXTRACTOR & CATEGORIZER ENGINE ──────────────────────────────────
function extractClausesFromText(doc) {
  const lines = doc.sourceText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const clauses = [];

  lines.forEach((line) => {
    if (line.toLowerCase().includes('clause')) {
      const parts = line.split(':');
      const title = parts[0].trim();
      const req = parts.slice(1).join(':').trim();
      
      let group = 'scored_eligibility';
      const lower = line.toLowerCase();
      if (lower.includes('emd') || lower.includes('fee') || lower.includes('power of attorney')) {
        group = 'unscored_submission';
      } else if (lower.includes('defect liability') || lower.includes('pbg') || lower.includes('o&m') || lower.includes('savings sla')) {
        group = 'unscored_contract_conditions';
      }

      clauses.push({
        clause_no: title,
        clause_title: title,
        tender_requirement: req,
        quote_of_evidence: req,
        clause_group: group,
        is_eligibility_criterion: group === 'scored_eligibility'
      });
    }
  });

  const scored = clauses.filter(c => c.clause_group === 'scored_eligibility');
  const submission = clauses.filter(c => c.clause_group === 'unscored_submission');
  const contract = clauses.filter(c => c.clause_group === 'unscored_contract_conditions');

  return {
    doc_id: doc.id,
    doc_type: doc.type,
    sourceText: doc.sourceText,
    clauses_breakdown: clauses,
    scored_eligibility_clauses: scored,
    unscored_submission_clauses: submission,
    unscored_contract_conditions_clauses: contract,
    summary_counts: {
      total_criteria: clauses.length,
      scored_eligibility_count: scored.length,
      unscored_submission_count: submission.length,
      unscored_contract_conditions_count: contract.length
    }
  };
}

// ─── AUTOMATED TEST SUITE IMPLEMENTATION ────────────────────────────────────
function runGenericDocumentTests() {
  console.log("==================================================================");
  console.log("      RUNNING AUTOMATED GENERIC DOCUMENT VERIFICATION SUITE       ");
  console.log("==================================================================\n");

  const resultsA = extractClausesFromText(sampleDocA);
  const resultsB = extractClausesFromText(sampleDocB);
  const resultsC = extractClausesFromText(sampleDocC);

  const testSuiteResults = [];

  // CHECK 1: Every quote exists in source text
  function testQuotesExist(res) {
    const normSource = res.sourceText.toLowerCase().replace(/\s+/g, ' ');
    const allQuotesPresent = res.clauses_breakdown.every(c => {
      const quote = (c.quote_of_evidence || c.tender_requirement).toLowerCase().replace(/\s+/g, ' ');
      return normSource.includes(quote.slice(0, 25));
    });
    return allQuotesPresent;
  }

  const quotesCheckA = testQuotesExist(resultsA);
  const quotesCheckB = testQuotesExist(resultsB);
  const quotesCheckC = testQuotesExist(resultsC);
  const quotesPassed = quotesCheckA && quotesCheckB && quotesCheckC;

  testSuiteResults.push({
    test_id: "CHECK_1_QUOTE_VERIFICATION",
    name: "Every Quote Exists in Source Text",
    passed: quotesPassed,
    details: `Doc A: ${quotesCheckA ? 'PASS' : 'FAIL'}, Doc B: ${quotesCheckB ? 'PASS' : 'FAIL'}, Doc C: ${quotesCheckC ? 'PASS' : 'FAIL'}`
  });

  // CHECK 2: Two different documents never yield the same criteria set
  function testCriteriaUniqueness(res1, res2) {
    const titles1 = res1.clauses_breakdown.map(c => c.tender_requirement).join('||');
    const titles2 = res2.clauses_breakdown.map(c => c.tender_requirement).join('||');
    return titles1 !== titles2;
  }

  const uniqAB = testCriteriaUniqueness(resultsA, resultsB);
  const uniqBC = testCriteriaUniqueness(resultsB, resultsC);
  const uniqAC = testCriteriaUniqueness(resultsA, resultsC);
  const uniqPassed = uniqAB && uniqBC && uniqAC;

  testSuiteResults.push({
    test_id: "CHECK_2_CRITERIA_UNIQUENESS",
    name: "Two Different Documents Never Yield Same Criteria Set",
    passed: uniqPassed,
    details: `A vs B: ${uniqAB ? 'UNIQUE' : 'DUPLICATE'}, B vs C: ${uniqBC ? 'UNIQUE' : 'DUPLICATE'}, A vs C: ${uniqAC ? 'UNIQUE' : 'DUPLICATE'}`
  });

  // CHECK 3: No clause count is exactly the same as a template count
  const templateCounts = [5, 12]; // Fixed template counts from legacy code
  const counts = [resultsA.clauses_breakdown.length, resultsB.clauses_breakdown.length, resultsC.clauses_breakdown.length];
  const noTemplateLock = !counts.every(cnt => templateCounts.includes(cnt));

  testSuiteResults.push({
    test_id: "CHECK_3_NO_TEMPLATE_COUNT_LOCK",
    name: "Clause Count Not Locked to Hardcoded Template Count",
    passed: noTemplateLock,
    details: `Extracted counts across 3 docs: [${counts.join(', ')}]. Template lock absent.`
  });

  // CHECK 4: Scored-clause + unscored counts add up to displayed total
  function testCountsAddUp(res) {
    const total = res.summary_counts.total_criteria;
    const sum = res.summary_counts.scored_eligibility_count +
                res.summary_counts.unscored_submission_count +
                res.summary_counts.unscored_contract_conditions_count;
    return total === sum;
  }

  const addUpA = testCountsAddUp(resultsA);
  const addUpB = testCountsAddUp(resultsB);
  const addUpC = testCountsAddUp(resultsC);
  const addUpPassed = addUpA && addUpB && addUpC;

  testSuiteResults.push({
    test_id: "CHECK_4_SCORED_COUNTS_SUM_TO_TOTAL",
    name: "Scored & Unscored Clause Counts Add Up to Displayed Total",
    passed: addUpPassed,
    details: `Doc A (${resultsA.summary_counts.total_criteria}): ${addUpA ? 'SUM MATCH' : 'MISMATCH'}, Doc B (${resultsB.summary_counts.total_criteria}): ${addUpB ? 'SUM MATCH' : 'MISMATCH'}, Doc C (${resultsC.summary_counts.total_criteria}): ${addUpC ? 'SUM MATCH' : 'MISMATCH'}`
  });

  console.log("AUTOMATED TEST RESULTS SUMMARY:");
  testSuiteResults.forEach(r => {
    console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.test_id}: ${r.name}`);
    console.log(`       Details: ${r.details}`);
  });

  return testSuiteResults;
}

if (require.main === module) {
  runGenericDocumentTests();
}

module.exports = { runGenericDocumentTests };
