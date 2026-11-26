/**
 * DESIRE TENDER — RADHANPUR RWSS TENDER RULES & SCENARIO EVALUATOR
 * Implements Stage 2B verified rules:
 * 1. 6-part taxonomy categorization (A through F)
 * 2. Deterministic price escalation multipliers (Page 26)
 * 3. Nested Boolean Expression: (SCENARIO_1 [Turnover >= 4Cr AND Experience >= 1yr]) OR (SCENARIO_2 [Turnover >= 10Cr])
 * 4. Tender-specific JV restriction (JV_ALLOWED = false)
 * 5. Experience verification gates (subcontractor ban, certificate authority rank)
 * 6. Separation of pre-qualification criteria from bid submission & contract terms
 */

export type AuditedCategory =
  | 'A. FINANCIAL_ELIGIBILITY'
  | 'B. TECHNICAL_ELIGIBILITY'
  | 'C. OTHER_ELIGIBILITY'
  | 'D. BID_SUBMISSION_CHECKLIST'
  | 'E. CONTRACT_TERMS'
  | 'F. TECHNICAL_SPECS_AND_SCOPE';

export type EvidenceState = 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED';

export interface AuditedCriterion {
  id: string;
  source_page: number;
  clause_number?: string | null;
  parameter_key: string;
  title: string;
  verbatim_quote: string;
  extracted_numeric_value?: number | null;
  extracted_unit?: string | null;
  audited_category: AuditedCategory;
  secondary_category?: AuditedCategory | null;
  materiality: 'MANDATORY' | 'MANDATORY_ALTERNATIVE' | 'DISQUALIFYING' | 'CONTRACTUAL' | 'STATUTORY' | 'INFORMATIONAL';
  evidence_state: EvidenceState;
  notes?: string;
}

// ─── 1. DETERMINISTIC PRICE ESCALATION FACTORS (PAGE 26) ─────────────────────

export const RADHANPUR_ESCALATION_FACTORS: Record<string, number> = {
  '2021-2022': 1.61, // Year -5
  '2022-2023': 1.46, // Year -4
  '2023-2024': 1.33, // Year -3
  '2024-2025': 1.21, // Year -2
  '2025-2026': 1.10, // Year -1
  '2026-2027': 1.00  // Base tender year
};

/**
 * Calculates escalated turnover deterministically according to Page 26 formula.
 * Applies exact compounding multipliers to each financial year.
 */
export function calculateEscalatedTurnovers(
  yearlyTurnoversCr: Record<string, number>
): {
  raw: Record<string, number>;
  escalated: Record<string, number>;
  sortedEscalated: number[];
  threeYearsPassedAt4Cr: boolean;
  threeYearsPassedAt10Cr: boolean;
} {
  const escalated: Record<string, number> = {};
  const values: number[] = [];

  for (const [fy, factor] of Object.entries(RADHANPUR_ESCALATION_FACTORS)) {
    if (fy === '2026-2027') continue; // Past 5 financial years: 2021-22 to 2025-26
    const rawVal = yearlyTurnoversCr[fy] || 0.0;
    const escVal = Number((rawVal * factor).toFixed(4));
    escalated[fy] = escVal;
    values.push(escVal);
  }

  // Sort descending
  values.sort((a, b) => b - a);
  // Need at least 3 years out of 5 meeting threshold (i.e. the 3rd highest value)
  const thirdHighest = values.length >= 3 ? values[2] : 0.0;

  return {
    raw: { ...yearlyTurnoversCr },
    escalated,
    sortedEscalated: values,
    threeYearsPassedAt4Cr: thirdHighest >= 4.0,
    threeYearsPassedAt10Cr: thirdHighest >= 10.0
  };
}

// ─── 2. NESTED SCENARIO LOGIC (SCENARIO_1 OR SCENARIO_2) ─────────────────────

export interface ScenarioEvaluationResult {
  scenario1: {
    turnoverPassed: boolean;
    experiencePassed: boolean;
    passed: boolean;
    details: string;
  };
  scenario2: {
    turnoverPassed: boolean;
    passed: boolean;
    details: string;
  };
  overallPassed: boolean;
  qualifyingScenario: 'SCENARIO_1' | 'SCENARIO_2' | 'BOTH' | 'NONE';
  nestedExpression: string;
}

/**
 * Evaluates the nested Boolean expression:
 * (SCENARIO_1 [Turnover >= 4.0 Cr AND Experience >= 1.0 Yr]) OR (SCENARIO_2 [Turnover >= 10.0 Cr])
 */
export function evaluateRadhanpurScenarios(
  yearlyTurnoversCr: Record<string, number>,
  waterOmExperienceYears: number
): ScenarioEvaluationResult {
  const turnoverMetrics = calculateEscalatedTurnovers(yearlyTurnoversCr);

  // Scenario 1: Turnover >= 4 Cr in 3 of 5 years AND Water O&M Experience >= 1 year
  const s1Turnover = turnoverMetrics.threeYearsPassedAt4Cr;
  const s1Exp = waterOmExperienceYears >= 1.0;
  const s1Passed = s1Turnover && s1Exp;
  const s1Details = `Turnover 3-of-5 >= 4Cr: ${s1Turnover ? 'PASS' : 'FAIL'} (${turnoverMetrics.sortedEscalated[2]?.toFixed(2) || '0.00'} Cr) AND Experience >= 1 yr: ${s1Exp ? 'PASS' : 'FAIL'} (${waterOmExperienceYears} yrs)`;

  // Scenario 2: Turnover >= 10 Cr in 3 of 5 years (No prior O&M experience required)
  const s2Turnover = turnoverMetrics.threeYearsPassedAt10Cr;
  const s2Passed = s2Turnover;
  const s2Details = `Turnover 3-of-5 >= 10Cr: ${s2Turnover ? 'PASS' : 'FAIL'} (${turnoverMetrics.sortedEscalated[2]?.toFixed(2) || '0.00'} Cr) [Experience not required]`;

  const overall = s1Passed || s2Passed;
  let qualifying: 'SCENARIO_1' | 'SCENARIO_2' | 'BOTH' | 'NONE' = 'NONE';
  if (s1Passed && s2Passed) qualifying = 'BOTH';
  else if (s1Passed) qualifying = 'SCENARIO_1';
  else if (s2Passed) qualifying = 'SCENARIO_2';

  return {
    scenario1: {
      turnoverPassed: s1Turnover,
      experiencePassed: s1Exp,
      passed: s1Passed,
      details: s1Details
    },
    scenario2: {
      turnoverPassed: s2Turnover,
      passed: s2Passed,
      details: s2Details
    },
    overallPassed: overall,
    qualifyingScenario: qualifying,
    nestedExpression: `(SCENARIO_1: [Turnover >= 4.0 Cr AND Experience >= 1.0 Yr] -> ${s1Passed ? 'TRUE' : 'FALSE'}) OR (SCENARIO_2: [Turnover >= 10.0 Cr] -> ${s2Passed ? 'TRUE' : 'FALSE'}) => Overall: ${overall ? 'ELIGIBLE' : 'INELIGIBLE'}`
  };
}

// ─── 3. TENDER-SPECIFIC JV RESTRICTION ───────────────────────────────────────

export interface TenderJvPolicy {
  tenderId: string;
  jvAllowed: boolean;
  prohibitionReason: string;
  sourceEvidence: {
    pageNumber: number;
    clauseNumber: string;
    verbatimQuote: string;
  };
}

export const RADHANPUR_TENDER_JV_POLICY: TenderJvPolicy = {
  tenderId: 'RADHANPUR_RWSS_2026_2030',
  jvAllowed: false,
  prohibitionReason: "Tender Volume I mandates qualification in bidder's own name and style. Forms strictly accommodate only Individual, Partnership, or Limited Company/Corporation. Arithmetic pooling across consortium partners is prohibited.",
  sourceEvidence: {
    pageNumber: 25,
    clauseNumber: 'Clause 4.2 & Form-5 Item 6 (p. 36)',
    verbatimQuote: 'To qualify, each bidder in the same name and style should have achieved the following performances... Bid is submitted as: a) An individual/ proprietary firm, b) A partnership firm, c) A limited Company or Corporation.'
  }
};

/**
 * Enforces tender-specific JV rules without modifying generic JV engine.
 */
export function evaluateTenderJvEligibility(
  isJvSubmission: boolean,
  tenderPolicy: TenderJvPolicy = RADHANPUR_TENDER_JV_POLICY
): { allowed: boolean; reason?: string } {
  if (isJvSubmission && !tenderPolicy.jvAllowed) {
    return {
      allowed: false,
      reason: `Tender Disqualification: Joint Venture / Consortium bidding is strictly prohibited under ${tenderPolicy.tenderId}. ${tenderPolicy.prohibitionReason}`
    };
  }
  return { allowed: true };
}

// ─── 4. EXPERIENCE VERIFICATION GATES (SUBCONTRACTOR & ISSUING AUTHORITY) ───

export interface ExperienceCertificateRecord {
  projectName: string;
  clientName: string;
  clientAuthorityRank: string; // e.g. "Executive Engineer", "Chief Officer", "Private Project Manager"
  isSubcontractorOrSublet: boolean;
  durationYears: number;
  completedBetween2021And2026: boolean;
}

/**
 * Enforces experience rules from Clause 4.2.2 Notes (Page 27):
 * 1. Subcontractor / sublet work is strictly prohibited.
 * 2. Issuing authority must not be below Executive Engineer or Nagarpalika Chief Officer.
 * 3. Must be completed within 2021-22 to 2025-26.
 */
export function validateExperienceCertificate(
  cert: ExperienceCertificateRecord
): { valid: boolean; disqualificationReason?: string } {
  if (cert.isSubcontractorOrSublet) {
    return {
      valid: false,
      disqualificationReason: 'Disqualified: Experience as sub-contractor or sublet work is explicitly prohibited under Clause 4.2.2 Note 3 & 4 (Page 27).'
    };
  }

  const validAuthorities = ['executive engineer', 'superintending engineer', 'chief engineer', 'chief officer'];
  const rankLower = cert.clientAuthorityRank.trim().toLowerCase();
  const isValidAuthority = validAuthorities.some(auth => rankLower.includes(auth));

  if (!isValidAuthority) {
    return {
      valid: false,
      disqualificationReason: `Disqualified: Client certificate issuing officer rank "${cert.clientAuthorityRank}" does not meet mandatory requirement of not below Executive Engineer or Nagarpalika Chief Officer (Clause 4.2.2 Note 4, Page 27).`
    };
  }

  if (!cert.completedBetween2021And2026) {
    return {
      valid: false,
      disqualificationReason: 'Disqualified: Experience must have been completed within the last 5 financial years (2021-22 to 2025-26) as per Clause 4.2.2 Note 2 (Page 27).'
    };
  }

  return { valid: true };
}

// ─── 5. TAXONOMY FILTERING (SEPARATION OF QUALIFICATION FROM CONTRACT TERMS) ─

export const PREQUALIFICATION_CATEGORIES: AuditedCategory[] = [
  'A. FINANCIAL_ELIGIBILITY',
  'B. TECHNICAL_ELIGIBILITY',
  'C. OTHER_ELIGIBILITY'
];

export const SUBMISSION_AND_CONTRACT_CATEGORIES: AuditedCategory[] = [
  'D. BID_SUBMISSION_CHECKLIST',
  'E. CONTRACT_TERMS',
  'F. TECHNICAL_SPECS_AND_SCOPE'
];

/**
 * Ensures that Contract Terms (Group E) and Submission items (Group D)
 * are NEVER treated as pre-qualification hurdles in the evaluation engine.
 */
export function isPrequalificationCriterion(category: AuditedCategory): boolean {
  return PREQUALIFICATION_CATEGORIES.includes(category);
}

