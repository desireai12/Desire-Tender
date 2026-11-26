/**
 * DESIRE TENDER — STAGE 2B FINAL CORRECTIONS TEST SUITE
 * Tests all 10 required verification scenarios against TypeScript modules:
 * 1. Scenario 1 passes (Turnover >= 4 Cr + Experience >= 1 yr)
 * 2. Scenario 1 fails due to insufficient experience (Turnover >= 4 Cr, Experience < 1 yr)
 * 3. Scenario 2 passes without water O&M experience (Turnover >= 10 Cr, Experience = 0)
 * 4. Both scenarios fail (Turnover < 4 Cr, or Turnover between 4 and 10 Cr with 0 experience)
 * 5. Turnover escalation multipliers are applied to the correct financial years
 * 6. JV is rejected for this specific tender (JV_ALLOWED = false)
 * 7. Subcontractor experience is excluded
 * 8. Experience certificate authority requirements are enforced
 * 9. Bid submission deadlines and EMD requirements are separated from eligibility
 * 10. Contract terms are not evaluated as prequalification criteria
 */

import {
  RADHANPUR_ESCALATION_FACTORS,
  calculateEscalatedTurnovers,
  evaluateRadhanpurScenarios,
  evaluateTenderJvEligibility,
  validateExperienceCertificate,
  isPrequalificationCriterion,
  RADHANPUR_TENDER_JV_POLICY,
  type AuditedCategory
} from '../apps/web/src/lib/new-eligibility/radhanpurEvaluationRules';

async function runStage2bTests() {
  console.log('======================================================================');
  console.log('   STAGE 2B: FINAL CORRECTIONS TEST SUITE (10 TEST CASES)');
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

  // ── TEST 1: Scenario 1 passes ─────────────────────────────────────────────
  console.log('--- TEST 1: Scenario 1 Passes (Turnover >= 4 Cr + Experience >= 1 yr) ---');
  // Raw turnovers: 3 Cr, 3 Cr, 3 Cr in past years.
  // With escalation:
  // 2021-22: 3 * 1.61 = 4.83 Cr
  // 2022-23: 3 * 1.46 = 4.38 Cr
  // 2023-24: 3 * 1.33 = 3.99 Cr
  // 2024-25: 3.5 * 1.21 = 4.235 Cr
  // 2025-26: 3.8 * 1.10 = 4.18 Cr
  // 3 of 5 exceed 4.0 Cr! And experience = 2.5 years.
  const sampleTurnover1 = {
    '2021-2022': 3.0,
    '2022-2023': 3.0,
    '2023-2024': 3.0,
    '2024-2025': 3.5,
    '2025-2026': 3.8
  };
  const res1 = evaluateRadhanpurScenarios(sampleTurnover1, 2.5);
  assert(res1.scenario1.passed === true, 'Scenario 1 passed when Turnover >= 4 Cr and Experience >= 1 yr');
  assert(res1.scenario2.passed === false, 'Scenario 2 is false (Turnover does not reach 10 Cr)');
  assert(res1.overallPassed === true, 'Overall evaluation is ELIGIBLE via Scenario 1');
  assert(res1.qualifyingScenario === 'SCENARIO_1', 'Qualifying scenario identified as SCENARIO_1');

  // ── TEST 2: Scenario 1 fails due to insufficient experience ────────────────
  console.log('\n--- TEST 2: Scenario 1 Fails Due to Insufficient Experience ---');
  // Same turnover (meets 4 Cr threshold), but only 0.5 years of experience (< 1.0 year required)
  const res2 = evaluateRadhanpurScenarios(sampleTurnover1, 0.5);
  assert(res2.scenario1.turnoverPassed === true, 'Turnover meets 4 Cr threshold');
  assert(res2.scenario1.experiencePassed === false, 'Experience check fails (0.5 yrs < 1.0 yr required)');
  assert(res2.scenario1.passed === false, 'Scenario 1 FAILS due to insufficient experience');
  assert(res2.overallPassed === false, 'Overall evaluation is INELIGIBLE when both S1 and S2 fail');

  // ── TEST 3: Scenario 2 passes without water O&M experience ─────────────────
  console.log('\n--- TEST 3: Scenario 2 Passes Standalone Without Water O&M Experience ---');
  // High turnover: 10 Cr in 3 of 5 years, but 0.0 years of prior water O&M experience
  const sampleTurnoverHigh = {
    '2021-2022': 7.0, // 7 * 1.61 = 11.27 Cr
    '2022-2023': 7.5, // 7.5 * 1.46 = 10.95 Cr
    '2023-2024': 8.0, // 8 * 1.33 = 10.64 Cr
    '2024-2025': 9.0, // 9 * 1.21 = 10.89 Cr
    '2025-2026': 9.5  // 9.5 * 1.10 = 10.45 Cr
  };
  const res3 = evaluateRadhanpurScenarios(sampleTurnoverHigh, 0.0);
  assert(res3.scenario2.turnoverPassed === true, 'Turnover meets 10 Cr threshold in 3 of 5 years');
  assert(res3.scenario2.passed === true, 'Scenario 2 PASSES without requiring water O&M experience');
  assert(res3.scenario1.passed === false, 'Scenario 1 fails due to 0 experience');
  assert(res3.overallPassed === true, 'Overall evaluation is ELIGIBLE via Scenario 2');
  assert(res3.qualifyingScenario === 'SCENARIO_2', 'Qualifying scenario identified as SCENARIO_2');

  // ── TEST 4: Both scenarios fail ───────────────────────────────────────────
  console.log('\n--- TEST 4: Both Scenarios Fail ---');
  // Low turnover (under 4 Cr) and zero experience
  const sampleTurnoverLow = {
    '2021-2022': 1.5,
    '2022-2023': 1.5,
    '2023-2024': 1.5,
    '2024-2025': 1.5,
    '2025-2026': 1.5
  };
  const res4 = evaluateRadhanpurScenarios(sampleTurnoverLow, 0.0);
  assert(res4.scenario1.passed === false, 'Scenario 1 fails (Turnover < 4 Cr)');
  assert(res4.scenario2.passed === false, 'Scenario 2 fails (Turnover < 10 Cr)');
  assert(res4.overallPassed === false, 'Overall evaluation is INELIGIBLE');
  assert(res4.qualifyingScenario === 'NONE', 'Qualifying scenario is NONE');

  // ── TEST 5: Turnover escalation multipliers applied to correct years ──────
  console.log('\n--- TEST 5: Turnover Escalation Multipliers Mapped to Correct Financial Years ---');
  assert(RADHANPUR_ESCALATION_FACTORS['2021-2022'] === 1.61, 'FY 2021-2022 multiplier is 1.61 (Year -5)');
  assert(RADHANPUR_ESCALATION_FACTORS['2022-2023'] === 1.46, 'FY 2022-2023 multiplier is 1.46 (Year -4)');
  assert(RADHANPUR_ESCALATION_FACTORS['2023-2024'] === 1.33, 'FY 2023-2024 multiplier is 1.33 (Year -3)');
  assert(RADHANPUR_ESCALATION_FACTORS['2024-2025'] === 1.21, 'FY 2024-2025 multiplier is 1.21 (Year -2)');
  assert(RADHANPUR_ESCALATION_FACTORS['2025-2026'] === 1.10, 'FY 2025-2026 multiplier is 1.10 (Year -1)');
  assert(RADHANPUR_ESCALATION_FACTORS['2026-2027'] === 1.00, 'Base Year 2026-2027 multiplier is 1.00');

  // Verify deterministic arithmetic without AI approximation
  const testCalc = calculateEscalatedTurnovers({
    '2021-2022': 10.0,
    '2022-2023': 10.0,
    '2023-2024': 10.0,
    '2024-2025': 10.0,
    '2025-2026': 10.0
  });
  assert(testCalc.escalated['2021-2022'] === 16.10, '10 Cr in 2021-22 escalates to exactly 16.10 Cr');
  assert(testCalc.escalated['2025-2026'] === 11.00, '10 Cr in 2025-26 escalates to exactly 11.00 Cr');

  // ── TEST 6: JV rejected for this specific tender ──────────────────────────
  console.log('\n--- TEST 6: Tender-Specific JV Restriction Enforced ---');
  assert(RADHANPUR_TENDER_JV_POLICY.jvAllowed === false, 'Radhanpur tender policy has jvAllowed = false');
  assert(RADHANPUR_TENDER_JV_POLICY.sourceEvidence.pageNumber === 25, 'JV prohibition cites Page 25');
  const jvCheck = evaluateTenderJvEligibility(true, RADHANPUR_TENDER_JV_POLICY);
  assert(jvCheck.allowed === false, 'JV submission is rejected for Radhanpur RWSS');
  assert((jvCheck.reason || '').includes('strictly prohibited'), 'Rejection reason states strict prohibition');

  const soloCheck = evaluateTenderJvEligibility(false, RADHANPUR_TENDER_JV_POLICY);
  assert(soloCheck.allowed === true, 'Single entity in own legal capacity is accepted');

  // ── TEST 7: Subcontractor experience is excluded ───────────────────────────
  console.log('\n--- TEST 7: Subcontractor Experience Excluded ---');
  const subconExp = {
    projectName: 'Piped Water Supply Scheme',
    clientName: 'GWSSB Sub-division',
    clientAuthorityRank: 'Executive Engineer',
    isSubcontractorOrSublet: true, // Subcontractor!
    durationYears: 3.0,
    completedBetween2021And2026: true
  };
  const subconCheck = validateExperienceCertificate(subconExp);
  assert(subconCheck.valid === false, 'Subcontractor experience is rejected');
  assert((subconCheck.disqualificationReason || '').includes('sub-contractor or sublet work is explicitly prohibited'), 'Disqualification cites Clause 4.2.2 Note 3 & 4 (Page 27)');

  // ── TEST 8: Experience certificate authority requirements enforced ────────
  console.log('\n--- TEST 8: Experience Certificate Authority Requirements Enforced ---');
  const privateCert = {
    projectName: 'Water Treatment Plant O&M',
    clientName: 'Private Real Estate Developers Ltd',
    clientAuthorityRank: 'Private Project Manager', // Not EE or Nagarpalika Chief Officer!
    isSubcontractorOrSublet: false,
    durationYears: 2.0,
    completedBetween2021And2026: true
  };
  const privateCheck = validateExperienceCertificate(privateCert);
  assert(privateCheck.valid === false, 'Certificate from non-executive engineer authority rejected');
  assert((privateCheck.disqualificationReason || '').includes('Executive Engineer or Nagarpalika Chief Officer'), 'Disqualification enforces Clause 4.2.2 Note 4 issuing authority rule');

  const validGovtCert = {
    projectName: 'Water Treatment Plant O&M',
    clientName: 'GWSSB Public Health Works Division',
    clientAuthorityRank: 'Executive Engineer',
    isSubcontractorOrSublet: false,
    durationYears: 2.0,
    completedBetween2021And2026: true
  };
  const govtCheck = validateExperienceCertificate(validGovtCert);
  assert(govtCheck.valid === true, 'Certificate signed by Executive Engineer is accepted');

  // ── TEST 9: Bid submission checklist separated from eligibility ───────────
  console.log('\n--- TEST 9: Bid Submission Checklist Separated from Eligibility ---');
  const tenderFeeCat: AuditedCategory = 'D. BID_SUBMISSION_CHECKLIST';
  assert(isPrequalificationCriterion(tenderFeeCat) === false, 'Bid submission checklist (Group D) is NOT evaluated as prequalification eligibility');

  // ── TEST 10: Contract terms not evaluated as prequalification criteria ─────
  console.log('\n--- TEST 10: Contract Terms Not Evaluated as Prequalification Criteria ---');
  const contractTermCat: AuditedCategory = 'E. CONTRACT_TERMS';
  const techSpecsCat: AuditedCategory = 'F. TECHNICAL_SPECS_AND_SCOPE';
  assert(isPrequalificationCriterion(contractTermCat) === false, 'Contract Terms (Security deposit, retention, SLA penalties, LD) are NOT evaluated as prequalification criteria');
  assert(isPrequalificationCriterion(techSpecsCat) === false, 'Technical specifications and equipment lists are NOT evaluated as prequalification criteria');

  const finEligCat: AuditedCategory = 'A. FINANCIAL_ELIGIBILITY';
  const techEligCat: AuditedCategory = 'B. TECHNICAL_ELIGIBILITY';
  const otherEligCat: AuditedCategory = 'C. OTHER_ELIGIBILITY';
  assert(isPrequalificationCriterion(finEligCat) === true, 'Group A is evaluated as prequalification criterion');
  assert(isPrequalificationCriterion(techEligCat) === true, 'Group B is evaluated as prequalification criterion');
  assert(isPrequalificationCriterion(otherEligCat) === true, 'Group C is evaluated as prequalification criterion');

  // ── FINAL SUMMARY ─────────────────────────────────────────────────────────
  console.log('\n======================================================================');
  console.log(`   STAGE 2B FINAL CORRECTIONS TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('======================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runStage2bTests().catch(err => {
  console.error('[FATAL ERROR IN TEST SUITE]', err);
  process.exit(1);
});

