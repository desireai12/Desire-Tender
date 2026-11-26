/**
 * DESIRE TENDER — STAGE 3B COMPREHENSIVE TEST SUITE (WITH PERSONNEL CORRECTIONS)
 *
 * Covers:
 * Part 1: Deterministic Engine Baseline & Boundary Tests (Tests 1 - 18)
 * Part 2: Personnel Qualification Verification & Status Propagation (8 Scenarios):
 *   P.1 All personnel verified and qualified -> Technical PASS, Corporate PASS
 *   P.2 Named personnel missing -> CANNOT_CHECK (unidentified proposed individual)
 *   P.3 CV missing but qualification independently verified through accepted evidence -> Technical PASS, Proposal INCOMPLETE
 *   P.4 CV submitted but qualifications insufficient -> FAIL
 *   P.5 Experience below required minimum -> FAIL
 *   P.6 Qualification certificate missing (and no independent accepted evidence) -> CANNOT_CHECK
 *   P.7 One personnel category unresolved while other technical criteria pass -> Technical CANNOT_CHECK
 *   P.8 Correct overall status propagation -> Group B CANNOT_CHECK prevents premature Corporate PASS
 */

import { DESIRE_ENERGY_MASTER, type CompanyMasterProfile } from '../apps/web/src/lib/new-eligibility/companyMaster';
import {
  propagateAnd,
  propagateOr,
  propagateNOfM,
  type CriterionStatus,
  type ProposalSubmissionRecord,
  type KeyPersonnelCredential,
} from '../apps/web/src/lib/new-eligibility/tenderRuleAdapter';
import {
  RadhanpurRuleAdapter,
  canonicalizeFinancialYear,
  RADHANPUR_ESCALATION_FACTORS,
} from '../apps/web/src/lib/new-eligibility/adapters/radhanpurAdapter';
import {
  DeterministicEvaluator,
  evaluateCompanyForRadhanpur,
} from '../apps/web/src/lib/new-eligibility/deterministicEvaluator';
import { generateMarkdownReport, generateJsonReport } from '../apps/web/src/lib/new-eligibility/evaluationReportGenerator';

async function runStage3bTests() {
  console.log('================================================================================');
  console.log('   DESIRE TENDER: STAGE 3B DETERMINISTIC EVALUATION TEST SUITE');
  console.log('   WITH MANDATORY PERSONNEL QUALIFICATION & PROPAGATION CORRECTIONS');
  console.log('================================================================================\n');

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

  const adapter = new RadhanpurRuleAdapter();

  // Helper fixture: fully qualified personnel roster
  const fullyQualifiedPersonnel: KeyPersonnelCredential[] = [
    {
      role: 'project_manager',
      name: 'Er. Rajesh Sharma',
      qualification: 'B.E. Civil & MBA in Project Management',
      yearsOfExperience: 10,
      hasQualificationCertificate: true,
      hasCvDocument: true,
    },
    {
      role: 'maintenance_engineer',
      name: 'Er. Amit Patel',
      qualification: 'Degree in Electrical Engineering',
      yearsOfExperience: 6,
      hasQualificationCertificate: true,
      hasCvDocument: true,
    },
    {
      role: 'asst_maintenance_engineer',
      name: 'Er. Suresh Joshi',
      qualification: 'Diploma in Mechanical Engineering',
      yearsOfExperience: 3,
      hasQualificationCertificate: true,
      hasCvDocument: true,
    },
    {
      role: 'plant_operator',
      name: 'Mr. Dinesh Kumar',
      qualification: 'ITI Fitter / Electrical Trade Certificate',
      yearsOfExperience: 4,
      hasQualificationCertificate: true,
      hasCvDocument: true,
    },
  ];

  // ── TEST 1: Exact threshold S1 (T*_3 == 4.0000 Cr, Exp = 1 yr) -> PASS ──────
  console.log('--- TEST 1: Exact Threshold S1 (T*_3 == 4.0000 Cr, Exp = 1.0 yr) ---');
  const exactS1Profile: CompanyMasterProfile = {
    ...DESIRE_ENERGY_MASTER,
    year_wise_turnover: {
      '2021-2022': 4.0 / 1.61,
      '2022-2023': 4.0 / 1.46,
      '2023-2024': 4.0 / 1.33,
      '2024-2025': 1.0,
      '2025-2026': 1.0,
    },
  };
  const res1 = adapter.evaluateFinancial(exactS1Profile);
  assert(res1.scenario1.turnoverStatus === 'PASS', 'Scenario 1 turnover is PASS at exactly 4.0000 Cr');
  assert(res1.scenario1.experienceStatus === 'PASS', 'Scenario 1 experience is PASS');
  assert(res1.scenario1.status === 'PASS', 'Scenario 1 overall is PASS');

  // ── TEST 2: Sub-penny below S1 (T*_3 == 3.9999 Cr) -> FAIL ──────────────────
  console.log('\n--- TEST 2: Sub-penny Below S1 (T*_3 == 3.9999 Cr) ---');
  const subS1Profile: CompanyMasterProfile = {
    ...DESIRE_ENERGY_MASTER,
    year_wise_turnover: {
      '2021-2022': 3.9999 / 1.61,
      '2022-2023': 3.9999 / 1.46,
      '2023-2024': 3.9999 / 1.33,
      '2024-2025': 1.0,
      '2025-2026': 1.0,
    },
  };
  const res2 = adapter.evaluateFinancial(subS1Profile);
  assert(res2.scenario1.turnoverStatus === 'FAIL', 'Scenario 1 turnover FAILS at 3.9999 Cr');
  assert(res2.scenario1.status === 'FAIL', 'Scenario 1 overall FAILS due to sub-penny turnover shortage');

  // ── TEST 3: Exact threshold S2 (T*_3 == 10.0000 Cr, Exp = 0) -> PASS ────────
  console.log('\n--- TEST 3: Exact Threshold S2 (T*_3 == 10.0000 Cr, Exp = 0) ---');
  const exactS2Profile: CompanyMasterProfile = {
    ...DESIRE_ENERGY_MASTER,
    year_wise_turnover: {
      '2021-2022': 10.0 / 1.61,
      '2022-2023': 10.0 / 1.46,
      '2023-2024': 10.0 / 1.33,
      '2024-2025': 2.0,
      '2025-2026': 2.0,
    },
    project_register: [],
  };
  const res3 = adapter.evaluateFinancial(exactS2Profile);
  assert(res3.scenario2.turnoverStatus === 'PASS', 'Scenario 2 turnover PASSES at exactly 10.0000 Cr');
  assert(res3.scenario2.status === 'PASS', 'Scenario 2 PASSES without any experience');
  assert(res3.group.status === 'PASS', 'Financial group PASSES via Scenario 2 alone');

  // ── TEST 4: Sub-penny below S2 (T*_3 == 9.9999 Cr) -> FAIL ──────────────────
  console.log('\n--- TEST 4: Sub-penny Below S2 (T*_3 == 9.9999 Cr, Exp = 0) ---');
  const subS2Profile: CompanyMasterProfile = {
    ...DESIRE_ENERGY_MASTER,
    year_wise_turnover: {
      '2021-2022': 9.9999 / 1.61,
      '2022-2023': 9.9999 / 1.46,
      '2023-2024': 9.9999 / 1.33,
      '2024-2025': 2.0,
      '2025-2026': 2.0,
    },
    project_register: [],
  };
  const res4 = adapter.evaluateFinancial(subS2Profile);
  assert(res4.scenario2.turnoverStatus === 'FAIL', 'Scenario 2 turnover FAILS at 9.9999 Cr');
  assert(res4.scenario2.status === 'FAIL', 'Scenario 2 FAILS');
  assert(res4.group.status === 'FAIL', 'Financial group FAILS when both S1 (no exp) and S2 (short turnover) fail');

  // ── TEST 5: Baseline Desire Energy Credentials (Without Personnel) ───────────
  console.log('\n--- TEST 5: Baseline Desire Energy Profile (Unnominated Personnel) ---');
  const baselineReport = evaluateCompanyForRadhanpur(DESIRE_ENERGY_MASTER);
  assert(baselineReport.corporateQualification.financialGroup.status === 'PASS', 'Financial Group is PASS (both S1 and S2 met)');
  assert(baselineReport.corporateQualification.otherGroup.status === 'PASS', 'Other Eligibility Group is PASS (Pvt Ltd, clean blacklisting, single entity)');
  assert(
    baselineReport.corporateQualification.technicalGroup.status === 'CANNOT_CHECK',
    'Technical Eligibility is CANNOT_CHECK because key personnel are unnominated in corporate master'
  );
  assert(
    baselineReport.corporateQualification.status === 'CANNOT_CHECK',
    'Corporate Qualification is NOT confirmed as PASS while technical personnel remain unresolved'
  );
  assert(
    baselineReport.overallVerdict === 'CANNOT_DETERMINE',
    'Overall verdict is CANNOT_DETERMINE when corporate qualification has unresolved technical criteria'
  );

  // ── TEST 6: Missing 1 Financial Year with 3 Qualifying Available -> PASS ─────
  console.log('\n--- TEST 6: Missing 1 Financial Year with 3 Qualifying Available ---');
  const missing1YearProfile: CompanyMasterProfile = {
    ...DESIRE_ENERGY_MASTER,
    year_wise_turnover: {
      '2021-2022': 5.0,
      '2022-2023': 5.0,
      '2023-2024': 5.0,
      '2024-2025': 1.0,
    },
  };
  const res6 = adapter.evaluateFinancial(missing1YearProfile);
  assert(res6.scenario1.turnoverStatus === 'PASS', 'Turnover passes 3-of-5 condition despite 1 missing year');

  // ── TEST 7: Missing 2 Financial Years with Only 3 Available -> PASS ──────────
  console.log('\n--- TEST 7: Missing 2 Financial Years with Only 3 Available ---');
  const missing2YearsProfile: CompanyMasterProfile = {
    ...DESIRE_ENERGY_MASTER,
    year_wise_turnover: {
      '2021-2022': 5.0,
      '2022-2023': 5.0,
      '2023-2024': 5.0,
    },
  };
  const res7 = adapter.evaluateFinancial(missing2YearsProfile);
  assert(res7.scenario1.turnoverStatus === 'PASS', 'Turnover passes 3-of-5 condition with exactly 3 qualifying years');

  // ── TEST 8: Missing > 2 Financial Years (< 3 Available) -> CANNOT_CHECK ──────
  console.log('\n--- TEST 8: Missing > 2 Financial Years (< 3 Available) ---');
  const missing3YearsProfile: CompanyMasterProfile = {
    ...DESIRE_ENERGY_MASTER,
    year_wise_turnover: {
      '2021-2022': 5.0,
      '2022-2023': 5.0,
    },
  };
  const res8 = adapter.evaluateFinancial(missing3YearsProfile);
  assert(res8.scenario1.turnoverStatus === 'CANNOT_CHECK', 'Turnover is CANNOT_CHECK when only 2 years available');

  // ── TEST 9: Unverified CA Certificate -> CANNOT_CHECK ───────────────────────
  console.log('\n--- TEST 9: Unverified CA Certificate ---');
  const unverifiedCaProfile: CompanyMasterProfile = {
    ...DESIRE_ENERGY_MASTER,
    // @ts-ignore
    ca_verified: false,
  };
  const res9 = adapter.evaluateFinancial(unverifiedCaProfile);
  assert(res9.scenario1.turnoverStatus === 'CANNOT_CHECK', 'Turnover is CANNOT_CHECK when CA certificate is unverified');
  assert(res9.group.status === 'CANNOT_CHECK', 'Financial group is CANNOT_CHECK when CA certificate is unverified');

  // ── TEST 10: One OR Branch PASS, Other CANNOT_CHECK -> PASS ─────────────────
  console.log('\n--- TEST 10: One OR Branch PASS, Other CANNOT_CHECK -> PASS ---');
  const orPass = propagateOr(['CANNOT_CHECK', 'PASS']);
  assert(orPass === 'PASS', 'propagateOr([CANNOT_CHECK, PASS]) returns PASS');

  // ── TEST 11: Both OR Branches FAIL -> FAIL ──────────────────────────────────
  console.log('\n--- TEST 11: Both OR Branches FAIL -> FAIL ---');
  const orFail = propagateOr(['FAIL', 'FAIL']);
  assert(orFail === 'FAIL', 'propagateOr([FAIL, FAIL]) returns FAIL');

  // ── TEST 12: One Mandatory Child FAIL in AND Group -> FAIL ──────────────────
  console.log('\n--- TEST 12: One Mandatory Child FAIL in AND Group -> FAIL ---');
  const andFail = propagateAnd(['PASS', 'FAIL', 'PASS']);
  assert(andFail === 'FAIL', 'propagateAnd([PASS, FAIL, PASS]) returns FAIL');

  // ── TEST 13: One Child CANNOT_CHECK in AND Group -> CANNOT_CHECK ────────────
  console.log('\n--- TEST 13: One Child CANNOT_CHECK in Otherwise Passing AND Group -> CANNOT_CHECK ---');
  const andCannotCheck = propagateAnd(['PASS', 'PASS', 'CANNOT_CHECK']);
  assert(andCannotCheck === 'CANNOT_CHECK', 'propagateAnd([PASS, PASS, CANNOT_CHECK]) returns CANNOT_CHECK');

  // ── TEST 14: Group C does not show PASS if any item is CANNOT_CHECK ─────────
  console.log('\n--- TEST 14: Group C Does Not Show PASS if Any Item is CANNOT_CHECK ---');
  const unverifiedBlacklistingProfile: CompanyMasterProfile = {
    ...DESIRE_ENERGY_MASTER,
    blacklisting: {
      is_blacklisted: false,
      has_affidavit: false,
      details: 'Declaration missing',
    },
  };
  const res14 = adapter.evaluateOtherEligibility(unverifiedBlacklistingProfile);
  assert(res14.status === 'CANNOT_CHECK', 'Group C returns CANNOT_CHECK if blacklisting affidavit is missing');
  assert(res14.status !== 'PASS', 'Group C NEVER shows PASS when any mandatory item is CANNOT_CHECK');

  // ── TEST 15: Radhanpur JV Prohibition Enforced (jvAllowed: false) ────────────
  console.log('\n--- TEST 15: Radhanpur JV Prohibition Enforced ---');
  assert(adapter.jvPolicy.isJvPermitted === false, 'Radhanpur JV policy strictly disallows JV (isJvPermitted: false)');
  assert(
    adapter.jvPolicy.prohibitionReason.includes('bidder own name and style'),
    'Prohibition reason cites single entity requirement'
  );

  // ── TEST 16: Subcontractor Experience Rejected ──────────────────────────────
  console.log('\n--- TEST 16: Subcontractor Experience Rejected ---');
  const subContractorProfile: CompanyMasterProfile = {
    ...DESIRE_ENERGY_MASTER,
    project_register: [
      {
        project_id: 'SUB-PRJ-01',
        project_name: 'Subcontracted pipeline project',
        client: 'Executive Engineer, GWSSB',
        category: 'Water Supply Pipeline',
        scope_tags: ['water supply', 'pipeline'],
        contract_value_cr: 10.0,
        desire_share_pct: 49,
        desire_value_cr: 4.9,
        execution_value_cr: 4.9,
        start_date: '01/01/2022',
        actual_completion_date: '01/01/2024',
        completion_year: 2024,
        certificate_ref: 'Cert-01',
        source_file: 'test.pdf',
        is_verified: true,
        jv_partner: 'Lead Partner (51%)',
        scope_summary: 'Subcontracted water supply work',
      },
    ],
  };
  const res16 = adapter.evaluateTechnical(subContractorProfile);
  const expItem = res16.criteria.find(c => c.id === 'CRIT_04');
  assert(expItem?.status === 'FAIL', 'Subcontracted / JV experience is rejected for CRIT_04');

  // ── TEST 17: Certificate Authority Rank Requirement Enforced ─────────────────
  console.log('\n--- TEST 17: Certificate Authority Rank Requirement Enforced ---');
  const invalidAuthorityProfile: CompanyMasterProfile = {
    ...DESIRE_ENERGY_MASTER,
    project_register: [
      {
        project_id: 'AUTH-PRJ-01',
        project_name: 'Water Supply O&M',
        client: 'Junior Engineer, Sub-division Patan',
        category: 'Water Supply',
        scope_tags: ['water supply', 'water'],
        contract_value_cr: 5.0,
        desire_share_pct: 100,
        desire_value_cr: 5.0,
        execution_value_cr: 5.0,
        start_date: '01/01/2022',
        actual_completion_date: '01/01/2024',
        completion_year: 2024,
        certificate_ref: 'Cert-02',
        source_file: 'test.pdf',
        is_verified: true,
        scope_summary: 'Water supply O&M 2 years',
      },
    ],
  };
  const res17 = adapter.evaluateTechnical(invalidAuthorityProfile);
  const expItem17 = res17.criteria.find(c => c.id === 'CRIT_04');
  assert(expItem17?.status === 'FAIL', 'Experience certificate from non-executive engineer is rejected');

  // ── TEST 18: Contract Terms INFO & Dual Separation ──────────────────────────
  console.log('\n--- TEST 18: Contract Terms INFO & Dual Separation ---');
  const completeSubmission: ProposalSubmissionRecord = {
    tenderFeePaid: true,
    tenderFeeInstrumentRef: 'DD No. 987654 Kotak Bank',
    emdSubmitted: true,
    emdInstrumentRef: 'BG No. BG2026/001 Kotak Bank',
    formHSubmitted: true,
    formHNotarizedStampValue: 300,
    form6LitigationSubmitted: true,
    personnelCredentials: fullyQualifiedPersonnel,
  };
  const fullReadyReport = evaluateCompanyForRadhanpur(DESIRE_ENERGY_MASTER, completeSubmission);
  assert(fullReadyReport.corporateQualification.status === 'PASS', 'Corporate Qualification PASS when personnel credentials provided');
  assert(fullReadyReport.proposalReadiness.status === 'READY', 'Proposal Readiness is READY when instruments and CVs attached');
  assert(fullReadyReport.overallVerdict === 'QUALIFIED_AND_READY', 'Overall verdict is QUALIFIED_AND_READY');

  const contractGroup = fullReadyReport.proposalReadiness.contractTermsGroup;
  assert(contractGroup.status === 'INFO', 'Contract terms group status is INFO');
  assert(contractGroup.criteria.every(c => c.status === 'INFO'), 'All contract terms criteria are INFO');

  // ============================================================================
  // PART 2: DEDICATED PERSONNEL QUALIFICATION TESTS (8 MANDATORY SCENARIOS)
  // ============================================================================
  console.log('\n================================================================================');
  console.log('   PART 2: MANDATORY PERSONNEL QUALIFICATION REGRESSION SUITE (8 SCENARIOS)');
  console.log('================================================================================');

  // P.1: All personnel verified and qualified
  console.log('\n--- PERSONNEL SCENARIO 1: All Personnel Verified and Qualified ---');
  const p1Submission: ProposalSubmissionRecord = {
    personnelCredentials: fullyQualifiedPersonnel,
  };
  const p1Tech = adapter.evaluateTechnical(DESIRE_ENERGY_MASTER, p1Submission);
  assert(p1Tech.status === 'PASS', 'Technical Eligibility is PASS when all personnel are verified & qualified');
  const p1Manager = p1Tech.criteria.find(c => c.id === 'CRIT_15');
  const p1Supervisor = p1Tech.criteria.find(c => c.id === 'CRIT_16');
  const p1Asst = p1Tech.criteria.find(c => c.id === 'CRIT_17');
  const p1Operator = p1Tech.criteria.find(c => c.id === 'CRIT_18');
  assert(p1Manager?.status === 'PASS', 'O&M Manager qualification passes (10 yrs, B.E.+MBA)');
  assert(p1Supervisor?.status === 'PASS', 'Maintenance Engineer qualification passes (6 yrs, Degree)');
  assert(p1Asst?.status === 'PASS', 'Asst Engineer qualification passes (3 yrs, Diploma)');
  assert(p1Operator?.status === 'PASS', 'Plant Operator qualification passes (4 yrs, ITI)');

  // P.2: Named personnel missing (unidentified proposed individual)
  console.log('\n--- PERSONNEL SCENARIO 2: Named Personnel Missing (Unidentified Individuals) ---');
  const p2Submission: ProposalSubmissionRecord = {
    personnelCredentials: [], // Empty personnel
  };
  const p2Tech = adapter.evaluateTechnical(DESIRE_ENERGY_MASTER, p2Submission);
  assert(p2Tech.status === 'CANNOT_CHECK', 'Technical Eligibility is CANNOT_CHECK when personnel are unnominated');
  const p2Manager = p2Tech.criteria.find(c => c.id === 'CRIT_15');
  assert(p2Manager?.status === 'CANNOT_CHECK', 'Unnominated O&M Manager evaluates to CANNOT_CHECK');
  assert(p2Manager?.actualAchieved.includes('unidentified'), 'Explains proposed individual is unidentified');

  // P.3: CV missing but qualification independently verified through accepted evidence
  console.log('\n--- PERSONNEL SCENARIO 3: CV Missing But Qualification Verified Via Accepted Evidence ---');
  const p3Personnel: KeyPersonnelCredential[] = [
    {
      role: 'project_manager',
      name: 'Er. Suresh Kumar',
      qualification: 'B.E. Mechanical & MBA',
      yearsOfExperience: 8,
      hasQualificationCertificate: false,
      hasCvDocument: false, // Physical CV document missing!
      hasIndependentVerifiedEvidence: true, // But verified through accepted employer/client records!
      independentEvidenceDetails: 'GWSSB Approved Key Personnel on Chhotaudepur Project (Outward No. 667/2025)',
    },
    ...fullyQualifiedPersonnel.slice(1),
  ];
  const p3Submission: ProposalSubmissionRecord = {
    personnelCredentials: p3Personnel,
  };
  const p3Tech = adapter.evaluateTechnical(DESIRE_ENERGY_MASTER, p3Submission);
  const p3Manager = p3Tech.criteria.find(c => c.id === 'CRIT_15');
  assert(p3Manager?.status === 'PASS', 'Personnel Technical Qualification PASSES through accepted independent evidence despite missing CV');
  assert(p3Tech.status === 'PASS', 'Overall Technical Eligibility PASSES when qualification is verified through accepted evidence');
  // Check proposal readiness: CV dossier should be flagged incomplete because physical CV document is missing
  const p3Report = adapter.evaluate(DESIRE_ENERGY_MASTER, p3Submission);
  assert(p3Report.proposalReadiness.status === 'INCOMPLETE', 'Proposal Readiness is INCOMPLETE because physical CV is still pending');
  assert(p3Report.proposalReadiness.missingItems.includes('Key Personnel CVs Dossier'), 'Proposal readiness lists missing CV dossier');

  // P.4: CV submitted but qualifications insufficient
  console.log('\n--- PERSONNEL SCENARIO 4: CV Submitted But Qualifications Insufficient ---');
  const p4Personnel: KeyPersonnelCredential[] = [
    {
      role: 'project_manager',
      name: 'Mr. Ramesh Gupta',
      qualification: 'Bachelor of Commerce (B.Com)', // Non-engineering, non-management
      yearsOfExperience: 10,
      hasQualificationCertificate: true,
      hasCvDocument: true,
    },
    ...fullyQualifiedPersonnel.slice(1),
  ];
  const p4Submission: ProposalSubmissionRecord = {
    personnelCredentials: p4Personnel,
  };
  const p4Tech = adapter.evaluateTechnical(DESIRE_ENERGY_MASTER, p4Submission);
  const p4Manager = p4Tech.criteria.find(c => c.id === 'CRIT_15');
  assert(p4Manager?.status === 'FAIL', 'Manager FAILS when qualification is insufficient (B.Com instead of B.E./MBA)');
  assert(p4Tech.status === 'FAIL', 'Technical Eligibility FAILS when a mandatory personnel qualification fails');

  // P.5: Experience below the required minimum
  console.log('\n--- PERSONNEL SCENARIO 5: Experience Below Required Minimum ---');
  const p5Personnel: KeyPersonnelCredential[] = [
    {
      role: 'project_manager',
      name: 'Er. Vikas Sharma',
      qualification: 'B.E. Civil',
      yearsOfExperience: 4, // 4 yrs < 7 yrs required!
      hasQualificationCertificate: true,
      hasCvDocument: true,
    },
    ...fullyQualifiedPersonnel.slice(1),
  ];
  const p5Submission: ProposalSubmissionRecord = {
    personnelCredentials: p5Personnel,
  };
  const p5Tech = adapter.evaluateTechnical(DESIRE_ENERGY_MASTER, p5Submission);
  const p5Manager = p5Tech.criteria.find(c => c.id === 'CRIT_15');
  assert(p5Manager?.status === 'FAIL', 'Manager FAILS when experience is below minimum (4 yrs < 7 yrs)');
  assert(p5Tech.status === 'FAIL', 'Technical Eligibility FAILS due to insufficient experience');

  // P.6: Qualification certificate missing (and no independent accepted evidence)
  console.log('\n--- PERSONNEL SCENARIO 6: Qualification Certificate Missing ---');
  const p6Personnel: KeyPersonnelCredential[] = [
    {
      role: 'maintenance_engineer',
      name: 'Er. Manoj Verma',
      qualification: 'Diploma in Electrical Engineering',
      yearsOfExperience: 6,
      hasQualificationCertificate: false, // Certificate missing
      hasCvDocument: true,
      hasIndependentVerifiedEvidence: false, // No accepted independent evidence
    },
    fullyQualifiedPersonnel[0],
    fullyQualifiedPersonnel[2],
    fullyQualifiedPersonnel[3],
  ];
  const p6Submission: ProposalSubmissionRecord = {
    personnelCredentials: p6Personnel,
  };
  const p6Tech = adapter.evaluateTechnical(DESIRE_ENERGY_MASTER, p6Submission);
  const p6Supervisor = p6Tech.criteria.find(c => c.id === 'CRIT_16');
  assert(p6Supervisor?.status === 'CANNOT_CHECK', 'Supervisor is CANNOT_CHECK when certificate is missing');
  assert(p6Tech.status === 'CANNOT_CHECK', 'Technical Eligibility is CANNOT_CHECK when certificate is unverified');

  // P.7: One personnel category unresolved while other technical criteria pass
  console.log('\n--- PERSONNEL SCENARIO 7: One Personnel Category Unresolved While Others Pass ---');
  // Manager PASS, Supervisor PASS, Asst Engineer PASS, but Plant Operator missing
  const p7Personnel: KeyPersonnelCredential[] = [
    fullyQualifiedPersonnel[0],
    fullyQualifiedPersonnel[1],
    fullyQualifiedPersonnel[2],
    // Operator omitted!
  ];
  const p7Submission: ProposalSubmissionRecord = {
    personnelCredentials: p7Personnel,
  };
  const p7Tech = adapter.evaluateTechnical(DESIRE_ENERGY_MASTER, p7Submission);
  const p7Operator = p7Tech.criteria.find(c => c.id === 'CRIT_18');
  assert(p7Operator?.status === 'CANNOT_CHECK', 'Plant Operator is CANNOT_CHECK when omitted');
  assert(p7Tech.status === 'CANNOT_CHECK', 'Technical Eligibility propagates to CANNOT_CHECK despite 6 other criteria passing');

  // P.8: Correct overall status propagation
  console.log('\n--- PERSONNEL SCENARIO 8: Correct Overall Status Propagation ---');
  // When Technical is CANNOT_CHECK, Corporate Qualification must not be confirmed as PASS
  const p8Report = adapter.evaluate(DESIRE_ENERGY_MASTER, p7Submission);
  assert(p8Report.corporateQualification.financialGroup.status === 'PASS', 'Financial is PASS');
  assert(p8Report.corporateQualification.otherGroup.status === 'PASS', 'Other is PASS');
  assert(p8Report.corporateQualification.technicalGroup.status === 'CANNOT_CHECK', 'Technical is CANNOT_CHECK');
  assert(
    p8Report.corporateQualification.status === 'CANNOT_CHECK',
    'Corporate Qualification propagates to CANNOT_CHECK (never PASS when technical personnel unresolved)'
  );
  assert(
    p8Report.overallVerdict === 'CANNOT_DETERMINE',
    'Overall Verdict is CANNOT_DETERMINE when corporate qualification is unresolved'
  );

  // ── REPORT FORMATTING & PROVENANCE ──────────────────────────────────────────
  console.log('\n--- REPORT FORMATTING & PROVENANCE TEST ---');
  const testReport = adapter.evaluate(DESIRE_ENERGY_MASTER, completeSubmission);
  const mdReport = generateMarkdownReport(testReport);
  assert(mdReport.includes('SECTION C: TECHNICAL ELIGIBILITY'), 'Markdown report contains Section C');
  assert(mdReport.includes('CRIT_15'), 'Section C contains CRIT_15 (O&M Manager)');
  assert(mdReport.includes('CRIT_16'), 'Section C contains CRIT_16 (Maintenance Engineer)');
  assert(mdReport.includes('CRIT_17'), 'Section C contains CRIT_17 (Asst Engineer)');
  assert(mdReport.includes('CRIT_18'), 'Section C contains CRIT_18 (Plant Operators)');

  const jsonReport = generateJsonReport(testReport);
  const parsed = JSON.parse(jsonReport);
  assert(parsed.tenderId === 'RADHANPUR_RWSS_2026_2030', 'JSON report serializes valid tender ID');
  assert(parsed.corporateQualification.status === 'PASS', 'JSON report serializes valid corporate status');

  console.log('\n================================================================================');
  console.log(`   STAGE 3B TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================================\n');

  if (failedTests > 0) {
    throw new Error(`Stage 3B test suite failed with ${failedTests} failure(s).`);
  }
}

runStage3bTests().catch(err => {
  console.error(err);
  process.exit(1);
});
