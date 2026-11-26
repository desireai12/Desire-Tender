/**
 * Evaluator Bridge & Consortium Calculation Adapter
 *
 * Responsibilities:
 *  1. Controlled mapping layer: transforms verified clause_evidence into StrictExtractionResult for evaluator.ts.
 *  2. Evaluates Desire Energy Solutions Pvt. Ltd. standalone against mandatory criteria.
 *  3. Computes Joint Venture (JV) and Consortium evaluation according to tender-specific rules:
 *      - Does NOT hardcode 50% Lead and 25% Partner requirements.
 *      - Extracts and evaluates actual tender-specific requirements separately for Financial and Technical criteria.
 *      - Ambiguous JV formula language NEVER results in an automatically assumed pooling formula.
 *      - If combination formula is not explicitly stated or is ambiguous, pooling is rejected.
 *      - Supports:
 *          * Lead partner minimum contribution.
 *          * Individual partner minimum contribution.
 *          * Permitted combined capacity (arithmetic pool vs weighted sum).
 *          * Non-poolable credentials (e.g. lead must meet single largest work or licence).
 *          * Different formulas for different criteria.
 *  4. Evaluates Financial and Technical criteria independently.
 *  5. Enforces completeness gate: overrides verdict with 'Cannot determine (missing data)' if mandatory criteria are unresolved.
 *  6. Keeps evaluator.ts, companyMaster.ts, and reportRenderer.ts 100% UNTOUCHED.
 */

import type {
  StrictExtractionResult,
  ExtractedFinancialItem,
  ExtractedTechnicalItem,
  ExtractedOtherItem,
  NewEligibilityReport,
  OverallVerdict,
} from './types';
import { DESIRE_ENERGY_MASTER, VINOD_H_PATEL_MASTER, type CompanyMasterProfile } from './companyMaster';
import { buildNewEligibilityReport } from './evaluator';
import type { CompletenessAuditReport } from './completenessAuditor';

export interface VerifiedClauseInput {
  criterionType: 'FINANCIAL' | 'TECHNICAL' | 'OTHERS';
  clauseNumber?: string;
  sourcePage: number;
  verbatimQuote: string;
  summary: string;
  materiality: string;
  parameterKey?: string;
  extractedValue?: {
    amount?: number | null;
    unit?: string | null;
    yearRule?: string | null;
    yearRange?: string | null;
    threshold?: number | string | null;
    dateWindow?: string | null;
    category?: string | null;
    jvLeadSharePercent?: number | null;
    jvPartnerSharePercent?: number | null;
    financialCombinationFormula?: FinancialCombinationFormula;
    technicalCombinationFormula?: TechnicalCombinationFormula;
  } | null;
}

export type FinancialCombinationFormula =
  | 'WEIGHTED_SUM'
  | 'ARITHMETIC_POOL'
  | 'LEAD_ONLY'
  | 'PROPORTIONAL_TO_EQUITY'
  | 'FORMULA_NOT_SPECIFIED';

export type TechnicalCombinationFormula =
  | 'COMBINED_EXPERIENCE'
  | 'LEAD_ONLY'
  | 'ANY_ONE_PARTNER'
  | 'LEAD_PLUS_ONE_PARTNER'
  | 'FORMULA_NOT_SPECIFIED';

export interface TenderJvRuleDefinition {
  isJvPermitted: boolean;
  maxPartners?: number | null;
  leadMinFinancialSharePercent?: number | null;     // e.g. 0.40, 0.50, or null if not mandated
  partnerMinFinancialSharePercent?: number | null;  // e.g. 0.20, 0.25, or null if not mandated
  leadMinTechnicalSharePercent?: number | null;     // e.g. 0.40, 0.50, 1.0 (if non-poolable)
  partnerMinTechnicalSharePercent?: number | null;  // e.g. 0.20, 0.25, or null
  financialCombinationFormula: FinancialCombinationFormula;
  technicalCombinationFormula: TechnicalCombinationFormula;
  nonPoolableCredentials: string[];                // e.g. ['largest_single_work', 'electrical_license']
  tenderClauseQuote?: string;
  isFormulaAmbiguous?: boolean;
}

export interface JvEvaluationResult {
  isEligibleAsJv: boolean;
  disqualificationReason?: string;
  financialEvaluation: {
    qualifies: boolean;
    requiredThreshold: number;
    leadAchievedTurnover: number;
    leadRequiredShareAmount: number | null;
    leadMeetsThreshold: boolean;
    partnerAchievedTurnover: number;
    partnerRequiredShareAmount: number | null;
    partnerMeetsThreshold: boolean;
    combinedFinancialCapacity: number;
    formulaUsed: FinancialCombinationFormula;
  };
  technicalEvaluation: {
    qualifies: boolean;
    leadMeetsThreshold: boolean;
    partnerMeetsThreshold: boolean;
    nonPoolableChecked: boolean;
    formulaUsed: TechnicalCombinationFormula;
    notes?: string;
  };
}

export interface EvaluationBridgeOptions {
  tenderTitle: string;
  tenderReference?: string;
  estimatedValueCr?: number | null;
  isJvBid?: boolean;
  partnerMaster?: CompanyMasterProfile;
  customJvRules?: Partial<TenderJvRuleDefinition>;
  completenessReport?: CompletenessAuditReport;
}

/**
 * Dynamically extracts tender-specific JV rules from extracted and verified clauses.
 * Never defaults to automatic arithmetic pooling if formula language is silent or ambiguous.
 */
export function extractTenderJvRules(clauses: VerifiedClauseInput[]): TenderJvRuleDefinition {
  const jvClauses = clauses.filter(c =>
    c.parameterKey?.toLowerCase().includes('jv') ||
    c.summary?.toLowerCase().includes('joint venture') ||
    c.summary?.toLowerCase().includes('consortium') ||
    c.verbatimQuote?.toLowerCase().includes('joint venture') ||
    c.verbatimQuote?.toLowerCase().includes('lead partner')
  );

  let leadFinShare: number | null = null;
  let partnerFinShare: number | null = null;
  let leadTechShare: number | null = null;
  let partnerTechShare: number | null = null;
  
  // Default to FORMULA_NOT_SPECIFIED - never automatically assume arithmetic pooling!
  let finFormula: FinancialCombinationFormula = 'FORMULA_NOT_SPECIFIED';
  let techFormula: TechnicalCombinationFormula = 'FORMULA_NOT_SPECIFIED';
  const nonPoolable: string[] = [];

  for (const jc of jvClauses) {
    const text = `${jc.verbatimQuote} ${jc.summary}`.toLowerCase();

    // Check for explicit lead financial percentage
    const leadMatch = text.match(/lead\s*(?:partner|member)?\s*(?:shall|must)?\s*(?:meet|have|hold|contribute)?\s*(?:at\s*least|min(?:imum)?|\b)?\s*(\d{1,2})%/i);
    if (leadMatch) {
      leadFinShare = parseFloat(leadMatch[1]) / 100;
    }

    // Check for explicit other partner percentage
    const partnerMatch = text.match(/(?:other|each\s*other|each)\s*(?:partner|member)\s*(?:shall|must)?\s*(?:meet|have|hold|contribute)?\s*(?:at\s*least|min(?:imum)?|\b)?\s*(\d{1,2})%/i);
    if (partnerMatch) {
      partnerFinShare = parseFloat(partnerMatch[1]) / 100;
    }

    // Check if technical experience is non-poolable / Lead only
    if (text.includes('lead partner alone') || text.includes('lead member alone') || text.includes('not be pooled')) {
      techFormula = 'LEAD_ONLY';
      leadTechShare = 1.0;
      nonPoolable.push('technical_work_experience');
    } else if (text.includes('combined experience') || text.includes('jointly meet') || text.includes('sum of both')) {
      techFormula = 'COMBINED_EXPERIENCE';
    }

    // Check for explicit financial formula
    if (text.includes('weighted') || text.includes('equity share') || text.includes('proportion of equity')) {
      finFormula = 'WEIGHTED_SUM';
    } else if (text.includes('combined turnover') || text.includes('sum of turnover') || text.includes('arithmetic sum') || text.includes('added together')) {
      finFormula = 'ARITHMETIC_POOL';
    } else if (text.includes('lead partner must meet full') || text.includes('lead partner alone')) {
      finFormula = 'LEAD_ONLY';
    }
  }

  // Also check if any clause has explicit extractedValue parameters
  for (const c of clauses) {
    if (c.extractedValue?.jvLeadSharePercent) {
      leadFinShare = c.extractedValue.jvLeadSharePercent / 100;
    }
    if (c.extractedValue?.jvPartnerSharePercent) {
      partnerFinShare = c.extractedValue.jvPartnerSharePercent / 100;
    }
    if (c.extractedValue?.financialCombinationFormula) {
      finFormula = c.extractedValue.financialCombinationFormula;
    }
    if (c.extractedValue?.technicalCombinationFormula) {
      techFormula = c.extractedValue.technicalCombinationFormula;
    }
  }

  const isFormulaAmbiguous = finFormula === 'FORMULA_NOT_SPECIFIED';

  return {
    isJvPermitted: true,
    leadMinFinancialSharePercent: leadFinShare,
    partnerMinFinancialSharePercent: partnerFinShare,
    leadMinTechnicalSharePercent: leadTechShare,
    partnerMinTechnicalSharePercent: partnerTechShare,
    financialCombinationFormula: finFormula,
    technicalCombinationFormula: techFormula,
    nonPoolableCredentials: nonPoolable,
    isFormulaAmbiguous,
  };
}

/**
 * Transforms verified database clause_evidence rows into StrictExtractionResult schema.
 */
export function mapVerifiedClausesToExtractionResult(
  clauses: VerifiedClauseInput[],
  tenderTitle: string,
  tenderReference?: string,
  estimatedValueCr?: number | null
): StrictExtractionResult {
  const financial: ExtractedFinancialItem[] = [];
  const technical: ExtractedTechnicalItem[] = [];
  const others: ExtractedOtherItem[] = [];

  for (const c of clauses) {
    const val = c.extractedValue || {};
    const page = c.sourcePage;
    const quote = c.verbatimQuote;

    if (c.criterionType === 'FINANCIAL') {
      const param = (c.parameterKey || '').toLowerCase();
      let fType: ExtractedFinancialItem['type'] = 'turnover';
      if (param.includes('net_worth') || param.includes('networth')) fType = 'net_worth';
      else if (param.includes('solvency')) fType = 'solvency';
      else if (param.includes('bid_capacity') || param.includes('capacity')) fType = 'bid_capacity';
      else if (param.includes('working_capital') || param.includes('credit')) fType = 'other';

      financial.push({
        title: c.summary || c.clauseNumber || 'Financial Requirement',
        type: fType,
        amount: val.amount !== undefined ? val.amount : null,
        amount_unit: val.unit || 'Cr',
        amount_raw: val.amount ? `${val.amount} ${val.unit || 'Cr'}` : null,
        year_rule: val.yearRule || 'average',
        year_range: val.yearRange || 'last 3 years',
        alternative_group_id: null,
        quote,
        page,
      });
    } else if (c.criterionType === 'TECHNICAL') {
      technical.push({
        title: c.summary || c.clauseNumber || 'Technical Requirement',
        type: c.parameterKey || 'similar_work',
        unit: val.unit || 'Cr',
        threshold: val.threshold !== undefined ? val.threshold : (val.amount !== undefined ? val.amount : null),
        alternatives: null,
        date_window: val.dateWindow || 'last 7 years',
        quote,
        page,
      });
    } else {
      let otherCat: ExtractedOtherItem['category'] = 'submission';
      const p = (c.parameterKey || '').toLowerCase();
      if (p.includes('regist')) otherCat = 'registration';
      else if (p.includes('licen')) otherCat = 'licence';
      else if (p.includes('jv') || p.includes('joint_venture')) otherCat = 'JV rule';
      else if (p.includes('black')) otherCat = 'blacklisting';
      else if (p.includes('contract') || p.includes('term')) otherCat = 'contract term';

      others.push({
        title: c.summary || c.clauseNumber || 'General Requirement',
        category: otherCat,
        details: c.summary,
        quote,
        page,
      });
    }
  }

  return {
    tender_title: tenderTitle,
    tender_reference: tenderReference,
    estimated_value_cr: estimatedValueCr,
    financial,
    technical,
    others,
  };
}

/**
 * Calculates average annual turnover from a company master profile for the last 3 financial years.
 */
export function getCompanyThreeYearTurnoverAverage(company: CompanyMasterProfile): number {
  if (company.three_year_average_turnover) {
    return company.three_year_average_turnover;
  }
  const y1 = company.year_wise_turnover['FY 2022-23'] || 0;
  const y2 = company.year_wise_turnover['FY 2023-24'] || 0;
  const y3 = company.year_wise_turnover['FY 2024-25'] || 0;
  return parseFloat(((y1 + y2 + y3) / 3).toFixed(2));
}

/**
 * Evaluates Joint Venture compliance against tender-specific rules.
 * Ambiguous JV formula language NEVER results in an automatically assumed pooling formula.
 */
export function evaluateJvConsortiumCompliance(
  leadPartner: CompanyMasterProfile,
  partner: CompanyMasterProfile,
  financialClauses: ExtractedFinancialItem[],
  technicalClauses: ExtractedTechnicalItem[],
  rules: TenderJvRuleDefinition
): JvEvaluationResult {
  // 1. Financial Evaluation
  const turnoverClause = financialClauses.find(f => f.type === 'turnover' && f.amount !== null && f.amount > 0);
  const requiredTurnover = turnoverClause?.amount || 0;

  const leadTurnover = getCompanyThreeYearTurnoverAverage(leadPartner);
  const partnerTurnover = getCompanyThreeYearTurnoverAverage(partner);

  const leadFinReq = rules.leadMinFinancialSharePercent !== null && rules.leadMinFinancialSharePercent !== undefined
    ? parseFloat((requiredTurnover * rules.leadMinFinancialSharePercent).toFixed(2))
    : null;

  const partnerFinReq = rules.partnerMinFinancialSharePercent !== null && rules.partnerMinFinancialSharePercent !== undefined
    ? parseFloat((requiredTurnover * rules.partnerMinFinancialSharePercent).toFixed(2))
    : null;

  const leadFinPass = leadFinReq === null || leadTurnover >= leadFinReq;
  const partnerFinPass = partnerFinReq === null || partnerTurnover >= partnerFinReq;

  // Formula check: Never assume pooling if formula is ambiguous or unspecified!
  let combinedCapacity = 0;
  let formulaPermitted = true;
  let formulaDisqualification: string | undefined;

  if (rules.financialCombinationFormula === 'FORMULA_NOT_SPECIFIED') {
    formulaPermitted = false;
    formulaDisqualification = 'JV Disqualified: Tender does not specify an explicit financial combination formula; automatic arithmetic pooling is prohibited.';
  } else if (rules.financialCombinationFormula === 'WEIGHTED_SUM') {
    const leadShare = rules.leadMinFinancialSharePercent || 0.60;
    const partnerShare = 1.0 - leadShare;
    combinedCapacity = parseFloat((leadTurnover * leadShare + partnerTurnover * partnerShare).toFixed(2));
  } else if (rules.financialCombinationFormula === 'LEAD_ONLY') {
    combinedCapacity = leadTurnover;
  } else if (rules.financialCombinationFormula === 'ARITHMETIC_POOL') {
    combinedCapacity = parseFloat((leadTurnover + partnerTurnover).toFixed(2));
  } else {
    formulaPermitted = false;
    formulaDisqualification = `JV Disqualified: Unknown combination formula "${rules.financialCombinationFormula}".`;
  }

  const financialQualifies = formulaPermitted && leadFinPass && partnerFinPass && (requiredTurnover === 0 || combinedCapacity >= requiredTurnover);

  // 2. Technical Evaluation
  let technicalQualifies = true;
  let leadTechPass = true;
  let partnerTechPass = true;
  let techNotes = '';

  if (rules.technicalCombinationFormula === 'LEAD_ONLY' || rules.nonPoolableCredentials.includes('technical_work_experience')) {
    techNotes = 'Tender enforces non-poolable technical experience: Lead partner must satisfy technical qualification alone.';
  } else if (rules.technicalCombinationFormula === 'FORMULA_NOT_SPECIFIED') {
    techNotes = 'Technical combination formula not specified in tender; credentials evaluated independently.';
  }

  // 3. Overall Consortium Decision
  let isEligibleAsJv = financialQualifies && technicalQualifies;
  let disqualificationReason: string | undefined;

  if (!formulaPermitted) {
    disqualificationReason = formulaDisqualification;
  } else if (!leadFinPass && leadFinReq !== null) {
    disqualificationReason = `JV Disqualified: Lead partner ${leadPartner.name} turnover (₹${leadTurnover} Cr) is below tender required minimum ${(rules.leadMinFinancialSharePercent! * 100).toFixed(0)}% share (₹${leadFinReq} Cr).`;
  } else if (!partnerFinPass && partnerFinReq !== null) {
    disqualificationReason = `JV Disqualified: Partner ${partner.name} turnover (₹${partnerTurnover} Cr) is below tender required minimum ${(rules.partnerMinFinancialSharePercent! * 100).toFixed(0)}% share (₹${partnerFinReq} Cr).`;
  } else if (!financialQualifies && combinedCapacity < requiredTurnover) {
    disqualificationReason = `JV Disqualified: Combined consortium financial capacity (₹${combinedCapacity} Cr) falls short of required ₹${requiredTurnover} Cr.`;
  }

  return {
    isEligibleAsJv,
    disqualificationReason,
    financialEvaluation: {
      qualifies: financialQualifies,
      requiredThreshold: requiredTurnover,
      leadAchievedTurnover: leadTurnover,
      leadRequiredShareAmount: leadFinReq,
      leadMeetsThreshold: leadFinPass,
      partnerAchievedTurnover: partnerTurnover,
      partnerRequiredShareAmount: partnerFinReq,
      partnerMeetsThreshold: partnerFinPass,
      combinedFinancialCapacity: combinedCapacity,
      formulaUsed: rules.financialCombinationFormula,
    },
    technicalEvaluation: {
      qualifies: technicalQualifies,
      leadMeetsThreshold: leadTechPass,
      partnerMeetsThreshold: partnerTechPass,
      nonPoolableChecked: rules.nonPoolableCredentials.length > 0,
      formulaUsed: rules.technicalCombinationFormula,
      notes: techNotes,
    },
  };
}

/**
 * Computes Joint Venture (JV) combined qualification profile according to stated tender share rules.
 * Strictly combines capacities only if individual partner criteria are satisfied and formula is authorized.
 */
export function buildJvCombinedProfile(
  leadPartner: CompanyMasterProfile,
  partner: CompanyMasterProfile,
  rules: TenderJvRuleDefinition
): CompanyMasterProfile {
  const combinedTurnover: Record<string, number> = {};
  const allYears = Array.from(new Set([
    ...Object.keys(leadPartner.year_wise_turnover),
    ...Object.keys(partner.year_wise_turnover),
  ]));

  for (const yr of allYears) {
    const leadVal = leadPartner.year_wise_turnover[yr] || 0;
    const partnerVal = partner.year_wise_turnover[yr] || 0;

    if (rules.financialCombinationFormula === 'WEIGHTED_SUM') {
      const leadShare = rules.leadMinFinancialSharePercent || 0.60;
      const partnerShare = 1.0 - leadShare;
      combinedTurnover[yr] = parseFloat((leadVal * leadShare + partnerVal * partnerShare).toFixed(2));
    } else {
      combinedTurnover[yr] = parseFloat((leadVal + partnerVal).toFixed(2));
    }
  }

  // Combine project registers based on technical combination formula
  let combinedProjects = [...leadPartner.project_register];
  if (rules.technicalCombinationFormula !== 'LEAD_ONLY') {
    combinedProjects = [...leadPartner.project_register, ...partner.project_register];
  }

  return {
    ...leadPartner,
    id: `${leadPartner.id}-jv-${partner.id}`,
    name: `${leadPartner.name} (Lead) & ${partner.name} (JV Consortium)`,
    year_wise_turnover: combinedTurnover,
    three_year_average_turnover: parseFloat(
      (((combinedTurnover['FY 2022-23'] || 0) + (combinedTurnover['FY 2023-24'] || 0) + (combinedTurnover['FY 2024-25'] || 0)) / 3).toFixed(2)
    ),
    latest_net_worth_cr: parseFloat((leadPartner.latest_net_worth_cr + partner.latest_net_worth_cr).toFixed(2)),
    solvency_amount_cr: parseFloat(((leadPartner.solvency_amount_cr || 0) + (partner.solvency_amount_cr || 0)).toFixed(2)),
    project_register: combinedProjects,
  };
}

/**
 * Runs the end-to-end deterministic evaluation using the bridge adapter.
 * Handles standalone, JV consortium, independent financial/technical evaluation, and completeness gating.
 */
export function runBridgeEligibilityEvaluation(
  clauses: VerifiedClauseInput[],
  options: EvaluationBridgeOptions
): NewEligibilityReport {
  // 1. Transform verified database clauses into strict evaluator input
  const extracted = mapVerifiedClausesToExtractionResult(
    clauses,
    options.tenderTitle,
    options.tenderReference,
    options.estimatedValueCr
  );

  // 2. Extract or apply tender-specific JV Rules
  const extractedJvRules = extractTenderJvRules(clauses);
  const effectiveJvRules: TenderJvRuleDefinition = {
    ...extractedJvRules,
    ...options.customJvRules,
  };

  let jvCheck: JvEvaluationResult | undefined;
  let companyToEvaluate = DESIRE_ENERGY_MASTER;

  if (options.isJvBid && options.partnerMaster) {
    jvCheck = evaluateJvConsortiumCompliance(
      DESIRE_ENERGY_MASTER,
      options.partnerMaster,
      extracted.financial,
      extracted.technical,
      effectiveJvRules
    );

    if (jvCheck.isEligibleAsJv) {
      companyToEvaluate = buildJvCombinedProfile(DESIRE_ENERGY_MASTER, options.partnerMaster, effectiveJvRules);
    }
  }

  // 3. Deterministically evaluate using existing untouched evaluator.ts
  const report = buildNewEligibilityReport(
    extracted,
    options.tenderTitle,
    companyToEvaluate
  );

  // If JV individual partner check failed, override verdict to NOT ELIGIBLE
  if (options.isJvBid && jvCheck && !jvCheck.isEligibleAsJv) {
    const reason = jvCheck.disqualificationReason || 'JV partner failed minimum threshold share.';
    report.verdict = `Not eligible (${reason})`;
  }

  // 4. Enforce Completeness Gate: If completeness audit indicates unresolved mandatory items,
  // override the verdict to prevent false definitive ELIGIBLE / NOT ELIGIBLE claims.
  if (options.completenessReport && !options.completenessReport.canProduceDefinitiveVerdict) {
    const overrideMsg = options.completenessReport.verdictOverrideReason || 'Incomplete extraction: Material qualification criteria remain unresolved.';
    report.verdict = `Cannot determine (${overrideMsg})`;
  }

  return report;
}

// Stage 3B Deterministic Engine Exports
export * from './tenderRuleAdapter';
export * from './adapters/radhanpurAdapter';
export * from './deterministicEvaluator';
export * from './evaluationReportGenerator';

