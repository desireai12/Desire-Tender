/**
 * DESIRE TENDER — UNIVERSAL TENDER RULE ADAPTER & STATUS PROPAGATION
 * Stage 3B: Deterministic Eligibility Evaluation Engine
 *
 * Implements:
 * 1. Universal 4-state status model: PASS | FAIL | CANNOT_CHECK | INFO
 * 2. Deterministic Three-Valued Logic (AND, OR, N_OF_M) with INFO ignoring
 * 3. Dual Evaluation Results types: Corporate Qualification vs Proposal Readiness
 * 4. Extensible TenderRuleAdapter interface
 * 5. Evidence provenance tracking for all evaluated criteria
 */

import type { CompanyMasterProfile } from './companyMaster';

// ─── 1. UNIVERSAL 4-STATE STATUS MODEL ───────────────────────────────────────

export type CriterionStatus = 'PASS' | 'FAIL' | 'CANNOT_CHECK' | 'INFO';

export type CorporateQualificationStatus = 'PASS' | 'FAIL' | 'CANNOT_CHECK';

export type ProposalReadinessStatus = 'READY' | 'INCOMPLETE' | 'CANNOT_CHECK';

export type OverallTenderVerdict =
  | 'QUALIFIED_AND_READY'
  | 'QUALIFIED_BUT_PROPOSAL_INCOMPLETE'
  | 'DISQUALIFIED'
  | 'CANNOT_DETERMINE';

// ─── 2. DETERMINISTIC THREE-VALUED LOGIC PROPAGATION ─────────────────────────

/**
 * Evaluates an AND group according to deterministic three-valued logic.
 * Rules:
 *  - 'INFO' items are filtered out and do not affect the verdict.
 *  - If any mandatory criterion is 'FAIL', the group fails conclusively -> 'FAIL'.
 *  - If all mandatory criteria are 'PASS', the group passes -> 'PASS'.
 *  - If no criterion failed, but at least one is 'CANNOT_CHECK' -> 'CANNOT_CHECK'.
 *  - If the list of mandatory criteria is empty -> 'PASS'.
 */
export function propagateAnd(statuses: CriterionStatus[]): CriterionStatus {
  const active = statuses.filter(s => s !== 'INFO');
  if (active.length === 0) return 'INFO';

  if (active.some(s => s === 'FAIL')) {
    return 'FAIL';
  }
  if (active.every(s => s === 'PASS')) {
    return 'PASS';
  }
  return 'CANNOT_CHECK';
}

/**
 * Evaluates an OR group according to deterministic three-valued logic.
 * Rules:
 *  - 'INFO' items are filtered out.
 *  - If any branch is 'PASS', the requirement is satisfied -> 'PASS'.
 *  - If all branches are 'FAIL', the requirement is conclusively failed -> 'FAIL'.
 *  - If some branches failed and others are 'CANNOT_CHECK' -> 'CANNOT_CHECK'.
 *  - If empty -> 'INFO'.
 */
export function propagateOr(statuses: CriterionStatus[]): CriterionStatus {
  const active = statuses.filter(s => s !== 'INFO');
  if (active.length === 0) return 'INFO';

  if (active.some(s => s === 'PASS')) {
    return 'PASS';
  }
  if (active.every(s => s === 'FAIL')) {
    return 'FAIL';
  }
  return 'CANNOT_CHECK';
}

/**
 * Evaluates an N-of-M condition (e.g. 3 of 5 years meeting turnover).
 * Rules:
 *  - 'INFO' items are filtered out.
 *  - passCount >= n -> 'PASS'.
 *  - passCount + cannotCheckCount < n -> 'FAIL' (maximum possible remaining passes < n).
 *  - Otherwise -> 'CANNOT_CHECK'.
 */
export function propagateNOfM(
  statuses: CriterionStatus[],
  n: number,
  _totalMandatory?: number
): CriterionStatus {
  const active = statuses.filter(s => s !== 'INFO');
  const passCount = active.filter(s => s === 'PASS').length;
  const cannotCheckCount = active.filter(s => s === 'CANNOT_CHECK').length;

  if (passCount >= n) {
    return 'PASS';
  }
  if (passCount + cannotCheckCount < n) {
    return 'FAIL';
  }
  return 'CANNOT_CHECK';
}

// ─── 3. EVIDENCE & EVALUATION DATA CONTRACTS ─────────────────────────────────

export interface EvidenceProvenance {
  sourceDocument: string;
  pageOrLocation: string;
  exactRecordKey?: string;
  verified: boolean;
  notes?: string;
}

export interface CriterionEvaluationItem {
  id: string;
  title: string;
  category: string;
  status: CriterionStatus;
  quote: string;
  sourcePage: number | string;
  clauseNumber?: string | null;
  requiredCondition: string;
  actualAchieved: string;
  evidenceProvenance: EvidenceProvenance;
  missingField?: string;
  isGate: boolean;
  notes?: string;
}

export interface GroupEvaluationResult {
  groupKey: string;
  groupTitle: string;
  status: CriterionStatus;
  summaryLine: string;
  criteria: CriterionEvaluationItem[];
}

export interface YearTurnoverAudit {
  raw: number;
  multiplier: number;
  adjusted: number;
  passed: boolean;
  verified: boolean;
  status: CriterionStatus;
  sourceRecord?: string;
}

export interface FinancialScenarioDetail {
  name: string;
  status: CriterionStatus;
  turnoverStatus: CriterionStatus;
  experienceStatus: CriterionStatus;
  details: string;
  adjustedTurnovers: Record<string, YearTurnoverAudit>;
  thirdHighestCr: number;
  thresholdCr: number;
  experienceYears: number;
  requiredExperienceYears: number;
}

export interface CorporateQualificationResult {
  status: CorporateQualificationStatus;
  verdictSummary: string;
  financialGroup: GroupEvaluationResult;
  technicalGroup: GroupEvaluationResult;
  otherGroup: GroupEvaluationResult;
  qualifyingScenario?: 'SCENARIO_1' | 'SCENARIO_2' | 'BOTH' | 'NONE';
  scenarioDetails?: {
    scenario1: FinancialScenarioDetail;
    scenario2: FinancialScenarioDetail;
  };
}

export interface ProposalReadinessResult {
  status: ProposalReadinessStatus;
  verdictSummary: string;
  checklistGroup: GroupEvaluationResult;
  contractTermsGroup: GroupEvaluationResult;
  technicalScopeGroup: GroupEvaluationResult;
  missingItems: string[];
  readyItems: string[];
}

export interface CorrigendaAuditStatus {
  internalDocumentStatus: string;
  separateDocumentStatus: string;
  externalVerificationStatus: string;
  summary: string;
}

export interface DualEvaluationReport {
  tenderId: string;
  tenderTitle: string;
  bidderName: string;
  bidderCin: string;
  evaluatedAt: string;
  overallVerdict: OverallTenderVerdict;
  overallVerdictText: string;
  corporateQualification: CorporateQualificationResult;
  proposalReadiness: ProposalReadinessResult;
  allCriteria: CriterionEvaluationItem[];
  corrigendaStatus: CorrigendaAuditStatus;
}

// ─── 4. PROPOSAL SUBMISSION RECORD CONTRACT ───────────────────────────────────

export interface KeyPersonnelCredential {
  role: 'project_manager' | 'maintenance_engineer' | 'asst_maintenance_engineer' | 'plant_operator';
  name?: string;
  qualification?: string; // e.g. 'B.E. Civil', 'MBA', 'Diploma in Mechanical', 'ITI'
  yearsOfExperience?: number;
  hasQualificationCertificate?: boolean;
  hasCvDocument?: boolean;
  hasIndependentVerifiedEvidence?: boolean;
  independentEvidenceDetails?: string;
}

export interface ProposalSubmissionRecord {
  tenderFeePaid?: boolean;
  tenderFeeInstrumentRef?: string;
  emdSubmitted?: boolean;
  emdInstrumentRef?: string;
  formHNotarizedStampValue?: number; // e.g. 300
  formHSubmitted?: boolean;
  form6LitigationSubmitted?: boolean;
  form8ExperienceSubmitted?: boolean;
  form9CommitmentsSubmitted?: boolean;
  namedPersonnel?: {
    projectManagerCV?: boolean;
    electricalEngineerCV?: boolean;
    civilSupervisorCV?: boolean;
    operatorsCV?: boolean;
  };
  personnelCredentials?: KeyPersonnelCredential[];
}

// ─── 5. TENDER RULE ADAPTER CONTRACT ─────────────────────────────────────────

export interface TenderRuleAdapter {
  readonly tenderId: string;
  readonly tenderTitle: string;
  readonly jvPolicy: {
    isJvPermitted: boolean;
    prohibitionReason?: string;
    sourceEvidence?: string;
  };

  evaluateFinancial(company: CompanyMasterProfile): {
    group: GroupEvaluationResult;
    scenario1: FinancialScenarioDetail;
    scenario2: FinancialScenarioDetail;
  };

  evaluateTechnical(
    company: CompanyMasterProfile,
    submission?: Partial<ProposalSubmissionRecord>
  ): GroupEvaluationResult;

  evaluateOtherEligibility(company: CompanyMasterProfile): GroupEvaluationResult;

  evaluateProposalReadiness(
    company: CompanyMasterProfile,
    submission?: Partial<ProposalSubmissionRecord>
  ): ProposalReadinessResult;

  evaluate(
    company: CompanyMasterProfile,
    submission?: Partial<ProposalSubmissionRecord>
  ): DualEvaluationReport;
}

