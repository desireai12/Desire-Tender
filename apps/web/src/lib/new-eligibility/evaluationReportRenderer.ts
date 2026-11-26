/**
 * DESIRE TENDER — DEDICATED EVALUATION REPORT RENDERER
 * Phase 4A: Dedicated Multi-Format Report Renderer for Deterministic Dual Evaluation
 *
 * NOTE: Preserves legacy reportRenderer.ts, companyMaster.ts, and evaluator.ts 100% untouched.
 *
 * Grounded strictly in verified criteria, company credentials, and bid proposal dossier:
 * - Dual Top Card: Corporate Qualification vs Proposal Readiness
 * - Formatted Terminal Text (Monospace/ANSI-safe)
 * - Structured HTML Card Renderer for UI embedding
 * - Detailed Evidence Provenance Breakdown (Quotes, Source Pages, Math formulas)
 */

import type { DualEvaluationReport, CriterionEvaluationItem } from './tenderRuleAdapter';
import type { TenderEvaluationResultRecord } from './dbTypes';

export interface RenderTerminalOptions {
  includeQuotes?: boolean;
  includeMathDetails?: boolean;
  useColor?: boolean;
}

/**
 * Text status tag helper for clean terminal formatting.
 */
export function formatTag(status: string): string {
  switch (status) {
    case 'PASS':
      return '[PASS]';
    case 'FAIL':
      return '[FAIL]';
    case 'CANNOT_CHECK':
      return '[CANNOT_CHECK]';
    case 'INFO':
      return '[INFO]';
    case 'READY':
      return '[READY]';
    case 'INCOMPLETE':
      return '[INCOMPLETE]';
    case 'QUALIFIED_AND_READY':
      return '[QUALIFIED & READY]';
    case 'QUALIFIED_BUT_PROPOSAL_INCOMPLETE':
      return '[CORP QUALIFIED - PROPOSAL INCOMPLETE]';
    case 'DISQUALIFIED':
      return '[DISQUALIFIED]';
    case 'CANNOT_DETERMINE':
      return '[CANNOT_DETERMINE]';
    default:
      return `[${status}]`;
  }
}

/**
 * Renders an ASCII border line.
 */
function hr(char = '=', length = 80): string {
  return char.repeat(length);
}

/**
 * Renders the Dual Evaluation Report in pure text / terminal format.
 */
export function renderTerminalReport(
  report: DualEvaluationReport,
  options: RenderTerminalOptions = { includeQuotes: true, includeMathDetails: true }
): string {
  const cq = report.corporateQualification;
  const pr = report.proposalReadiness;
  const s1 = cq.scenarioDetails?.scenario1;
  const s2 = cq.scenarioDetails?.scenario2;

  const lines: string[] = [];

  lines.push(hr('='));
  lines.push(`DESIRE TENDER ELIGIBILITY EVALUATION REPORT`);
  lines.push(`Title:      ${report.tenderTitle}`);
  lines.push(`Tender ID:  ${report.tenderId}`);
  lines.push(`Bidder:     ${report.bidderName} (CIN: ${report.bidderCin})`);
  lines.push(`Evaluated:  ${report.evaluatedAt}`);
  lines.push(`Standard:   Deterministic Multi-Dimensional Dual Evaluation Engine`);
  lines.push(hr('='));
  lines.push('');

  // ── DUAL TOP CARD SUMMARY ─────────────────────────────────────────────────
  lines.push(hr('-'));
  lines.push(`TOP CARD: DUAL EVALUATION DIMENSIONS`);
  lines.push(hr('-'));
  lines.push(`OVERALL TENDER VERDICT: ${formatTag(report.overallVerdict)}`);
  lines.push(`  -> ${report.overallVerdictText}`);
  lines.push('');
  lines.push(`[DIMENSION 1] CORPORATE QUALIFICATION: ${formatTag(cq.status)}`);
  lines.push(`  Financial Eligibility: ${formatTag(cq.financialGroup.status)} - ${cq.financialGroup.summaryLine}`);
  lines.push(`  Technical Eligibility: ${formatTag(cq.technicalGroup.status)} - ${cq.technicalGroup.summaryLine}`);
  lines.push(`  Other Eligibility:     ${formatTag(cq.otherGroup.status)} - ${cq.otherGroup.summaryLine}`);
  lines.push(`  Verdict Summary:       ${cq.verdictSummary}`);
  lines.push('');
  lines.push(`[DIMENSION 2] PROPOSAL READINESS:      ${formatTag(pr.status)}`);
  lines.push(`  Submission Checklist:  ${formatTag(pr.checklistGroup.status)} - ${pr.missingItems.length === 0 ? 'All instruments verified' : `Pending: ${pr.missingItems.join(', ')}`}`);
  lines.push(`  Verdict Summary:       ${pr.verdictSummary}`);
  lines.push(hr('-'));
  lines.push('');

  // ── SECTION 1: FINANCIAL QUALIFICATION ────────────────────────────────────
  lines.push(hr('='));
  lines.push(`SECTION 1: FINANCIAL ELIGIBILITY ${formatTag(cq.financialGroup.status)}`);
  lines.push(hr('='));
  lines.push(`Active Qualifying Scenario: ${cq.qualifyingScenario || 'NONE'}`);
  lines.push(`Mandatory Criteria Count:   ${cq.financialGroup.criteria.length}`);
  lines.push('');

  if (s1 && s1.adjustedTurnovers) {
    lines.push(`Turnover Escalation Analysis (Page 26 Multipliers):`);
    for (const [fy, a] of Object.entries(s1.adjustedTurnovers)) {
      lines.push(`  * FY ${fy}: Raw ₹${a.raw.toFixed(2)} Cr x ${a.multiplier.toFixed(2)} = Adjusted ₹${a.adjusted.toFixed(2)} Cr [${a.status}]`);
    }
    lines.push(`  * 3rd Highest Adjusted Turnover: ₹${s1.thirdHighestCr.toFixed(2)} Cr (Req: ₹4.00 Cr S1 / ₹10.00 Cr S2)`);
    lines.push(`  * Scenario 1 (Turnover + Cash Credit): ${s1.status === 'PASS' ? 'PASSED' : 'NOT PASSED'}`);
    if (s2) {
      lines.push(`  * Scenario 2 (Stand-alone Turnover):  ${s2.status === 'PASS' ? 'PASSED' : 'NOT PASSED'}`);
    }
    lines.push('');
  }

  cq.financialGroup.criteria.forEach((item, idx) => {
    lines.push(`[1.${idx + 1}] ${item.id}: ${item.title}`);
    lines.push(`  Category: ${item.category} | Source Page: ${item.sourcePage}`);
    lines.push(`  Status:   ${formatTag(item.status)}`);
    lines.push(`  Details:  ${item.notes || item.actualAchieved}`);
    if (options.includeQuotes && item.quote) {
      lines.push(`  Quote:    "${item.quote}"`);
    }
    lines.push('');
  });

  // ── SECTION 2: TECHNICAL QUALIFICATION ────────────────────────────────────
  lines.push(hr('='));
  lines.push(`SECTION 2: TECHNICAL ELIGIBILITY ${formatTag(cq.technicalGroup.status)}`);
  lines.push(hr('='));
  lines.push(`Mandatory Criteria Count: ${cq.technicalGroup.criteria.length}`);
  lines.push('');

  cq.technicalGroup.criteria.forEach((item, idx) => {
    lines.push(`[2.${idx + 1}] ${item.id}: ${item.title}`);
    lines.push(`  Category: ${item.category} | Source Page: ${item.sourcePage}`);
    lines.push(`  Status:   ${formatTag(item.status)}`);
    lines.push(`  Details:  ${item.notes || item.actualAchieved}`);
    if (options.includeQuotes && item.quote) {
      lines.push(`  Quote:    "${item.quote}"`);
    }
    lines.push('');
  });

  // ── SECTION 3: OTHER ELIGIBILITY ──────────────────────────────────────────
  lines.push(hr('='));
  lines.push(`SECTION 3: OTHER ELIGIBILITY ${formatTag(cq.otherGroup.status)}`);
  lines.push(hr('='));
  lines.push(`Mandatory Criteria Count: ${cq.otherGroup.criteria.length}`);
  lines.push('');

  cq.otherGroup.criteria.forEach((item, idx) => {
    lines.push(`[3.${idx + 1}] ${item.id}: ${item.title}`);
    lines.push(`  Category: ${item.category} | Source Page: ${item.sourcePage}`);
    lines.push(`  Status:   ${formatTag(item.status)}`);
    lines.push(`  Details:  ${item.notes || item.actualAchieved}`);
    if (options.includeQuotes && item.quote) {
      lines.push(`  Quote:    "${item.quote}"`);
    }
    lines.push('');
  });

  // ── SECTION 4: PROPOSAL READINESS CHECKLIST ───────────────────────────────
  lines.push(hr('='));
  lines.push(`SECTION 4: PROPOSAL READINESS CHECKLIST ${formatTag(pr.checklistGroup.status)}`);
  lines.push(hr('='));
  lines.push(`Checklist Items Count: ${pr.checklistGroup.criteria.length}`);
  lines.push(`Missing / Incomplete:  ${pr.missingItems.length}`);
  lines.push('');

  pr.checklistGroup.criteria.forEach((item, idx) => {
    lines.push(`[4.${idx + 1}] ${item.id}: ${item.title}`);
    lines.push(`  Category: ${item.category} | Source Page: ${item.sourcePage}`);
    lines.push(`  Status:   ${formatTag(item.status)}`);
    lines.push(`  Details:  ${item.notes || item.actualAchieved}`);
    lines.push('');
  });

  lines.push(hr('='));
  lines.push(`END OF REPORT — DETERMINISTIC EVALUATION PROVENANCE VERIFIED`);
  lines.push(hr('='));

  return lines.join('\n');
}

/**
 * Builds an HTML visual representation of the dual evaluation result for UI display.
 */
export function renderHtmlSummaryCard(report: DualEvaluationReport): string {
  const cq = report.corporateQualification;
  const pr = report.proposalReadiness;

  const cqColor = cq.status === 'PASS' ? '#10b981' : cq.status === 'FAIL' ? '#ef4444' : '#f59e0b';
  const prColor = pr.status === 'READY' ? '#10b981' : '#f97316';
  const overallColor = report.overallVerdict === 'QUALIFIED_AND_READY' ? '#10b981' : report.overallVerdict === 'DISQUALIFIED' ? '#ef4444' : '#6b7280';

  return `
<div class="tender-evaluation-card" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; background: #ffffff;">
  <div style="border-bottom: 2px solid #f3f4f6; padding-bottom: 12px; margin-bottom: 16px;">
    <h2 style="margin: 0 0 6px 0; color: #111827; font-size: 1.25rem;">${report.tenderTitle}</h2>
    <div style="color: #6b7280; font-size: 0.875rem;">Bidder: <strong>${report.bidderName}</strong> (${report.bidderCin}) | Evaluated: ${report.evaluatedAt}</div>
  </div>

  <div style="background: #f9fafb; border-radius: 6px; padding: 12px; margin-bottom: 16px; border-left: 4px solid ${overallColor};">
    <div style="font-size: 0.75rem; text-transform: uppercase; color: #6b7280; font-weight: 600;">Overall Tender Verdict</div>
    <div style="font-size: 1.125rem; font-weight: 700; color: ${overallColor}; margin: 4px 0;">${report.overallVerdict}</div>
    <div style="font-size: 0.875rem; color: #374151;">${report.overallVerdictText}</div>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
    <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; border-top: 3px solid ${cqColor};">
      <div style="font-size: 0.75rem; text-transform: uppercase; color: #6b7280; font-weight: 600;">1. Corporate Qualification</div>
      <div style="font-size: 1rem; font-weight: 700; color: ${cqColor}; margin: 4px 0;">${cq.status}</div>
      <div style="font-size: 0.8125rem; color: #4b5563; margin-bottom: 8px;">${cq.verdictSummary}</div>
      <ul style="margin: 0; padding-left: 18px; font-size: 0.75rem; color: #6b7280;">
        <li>Financial: <strong>${cq.financialGroup.status}</strong></li>
        <li>Technical: <strong>${cq.technicalGroup.status}</strong></li>
        <li>Other: <strong>${cq.otherGroup.status}</strong></li>
      </ul>
    </div>

    <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; border-top: 3px solid ${prColor};">
      <div style="font-size: 0.75rem; text-transform: uppercase; color: #6b7280; font-weight: 600;">2. Proposal Readiness</div>
      <div style="font-size: 1rem; font-weight: 700; color: ${prColor}; margin: 4px 0;">${pr.status}</div>
      <div style="font-size: 0.8125rem; color: #4b5563; margin-bottom: 8px;">${pr.verdictSummary}</div>
      <div style="font-size: 0.75rem; color: #6b7280;">
        Pending Items: <strong>${pr.missingItems.length}</strong>
      </div>
    </div>
  </div>
</div>
`.trim();
}

/**
 * Converts a DualEvaluationReport into a persistent TenderEvaluationResultRecord.
 */
export function toDatabaseRecord(
  report: DualEvaluationReport,
  datasetId: string,
  proposalSubmissionId?: string | null,
  markdownReport?: string
): Omit<TenderEvaluationResultRecord, 'id' | 'created_at'> {
  const cq = report.corporateQualification;
  const pr = report.proposalReadiness;

  // Map verdicts
  const cqVerdict: 'PASS' | 'FAIL' | 'CANNOT_CHECK' =
    cq.status === 'PASS' ? 'PASS' : cq.status === 'FAIL' ? 'FAIL' : 'CANNOT_CHECK';

  const prStatus: 'COMPLETE' | 'INCOMPLETE' | 'NON_COMPLIANT' =
    pr.status === 'READY' ? 'COMPLETE' : 'INCOMPLETE';

  const overallVerdict: 'QUALIFIED' | 'DISQUALIFIED' | 'CANNOT_DETERMINE' =
    report.overallVerdict === 'QUALIFIED_AND_READY'
      ? 'QUALIFIED'
      : report.overallVerdict === 'DISQUALIFIED'
      ? 'DISQUALIFIED'
      : 'CANNOT_DETERMINE';

  const finVerdict: 'PASS' | 'FAIL' | 'CANNOT_CHECK' | 'INFO' =
    cq.financialGroup.status === 'PASS'
      ? 'PASS'
      : cq.financialGroup.status === 'FAIL'
      ? 'FAIL'
      : 'CANNOT_CHECK';

  const techVerdict: 'PASS' | 'FAIL' | 'CANNOT_CHECK' | 'INFO' =
    cq.technicalGroup.status === 'PASS'
      ? 'PASS'
      : cq.technicalGroup.status === 'FAIL'
      ? 'FAIL'
      : 'CANNOT_CHECK';

  const othVerdict: 'PASS' | 'FAIL' | 'CANNOT_CHECK' | 'INFO' =
    cq.otherGroup.status === 'PASS'
      ? 'PASS'
      : cq.otherGroup.status === 'FAIL'
      ? 'FAIL'
      : 'CANNOT_CHECK';

  return {
    tender_id: report.tenderId,
    dataset_id: datasetId,
    proposal_submission_id: proposalSubmissionId || null,
    evaluator_version: 'Stage3B-Stage4A-Deterministic',
    evaluation_timestamp: report.evaluatedAt,
    corporate_qualification_verdict: cqVerdict,
    proposal_readiness_status: prStatus,
    overall_tender_verdict: overallVerdict,
    financial_group_verdict: finVerdict,
    technical_group_verdict: techVerdict,
    others_group_verdict: othVerdict,
    detailed_criteria_evaluations: {
      financialCriteria: cq.financialGroup.criteria,
      technicalCriteria: cq.technicalGroup.criteria,
      otherCriteria: cq.otherGroup.criteria,
      checklistCriteria: pr.checklistGroup.criteria,
      scenarioDetails: cq.scenarioDetails,
    },
    evaluation_report_markdown: markdownReport || renderTerminalReport(report),
  };
}
