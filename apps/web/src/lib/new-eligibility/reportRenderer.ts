import {
  TopCardSummary,
  OverallVerdict,
  EvaluationStatus,
  FinancialEvaluationItem,
  TechnicalEvaluationItem,
  OtherEvaluationItem
} from './types';

export interface RenderReportInput {
  tender_title: string;
  tender_reference?: string;
  filename: string;
  verdict: OverallVerdict;
  top_card: TopCardSummary;
  sections: {
    financial: {
      status: EvaluationStatus;
      items: FinancialEvaluationItem[];
    };
    technical: {
      status: EvaluationStatus;
      items: TechnicalEvaluationItem[];
    };
    others: {
      status: EvaluationStatus;
      gates: OtherEvaluationItem[];
      unscored_information: OtherEvaluationItem[];
    };
  };
}

/**
 * Renders the clean plain-text / markdown format of all three sections and the top card.
 * Strict order: Top Card, Section 1: Financial, Section 2: Technical, Section 3: Others, Overall Verdict.
 */
export function renderTextReport(report: RenderReportInput): string {
  const lines: string[] = [];

  lines.push('================================================================================');
  lines.push(`TENDER ELIGIBILITY EVALUATION REPORT`);
  lines.push(`Title: ${report.tender_title}`);
  if (report.tender_reference) lines.push(`Reference: ${report.tender_reference}`);
  lines.push(`Document: ${report.filename}`);
  lines.push('================================================================================');
  lines.push('');

  // ─── TOP CARD ─────────────────────────────────────────────────────────────
  lines.push('--------------------------------------------------------------------------------');
  lines.push('TOP CARD SUMMARY');
  lines.push('--------------------------------------------------------------------------------');
  lines.push(`Financial: [${report.top_card.financial.status}] ${report.top_card.financial.summary_line}`);
  lines.push(`Technical: [${report.top_card.technical.status}] ${report.top_card.technical.summary_line}`);
  lines.push(`Others:    [${report.top_card.others.status}] ${report.top_card.others.summary_line}`);
  lines.push('--------------------------------------------------------------------------------');
  lines.push('');

  // ─── SECTION 1: FINANCIAL ─────────────────────────────────────────────────
  lines.push('================================================================================');
  lines.push(`SECTION 1: FINANCIAL [${report.sections.financial.status}]`);
  lines.push('================================================================================');

  if (report.sections.financial.items.length === 0) {
    lines.push('No financial eligibility clauses specified in tender document.');
  } else {
    report.sections.financial.items.forEach((item, idx) => {
      lines.push(`[1.${idx + 1}] ${item.title.toUpperCase()}`);
      lines.push(`  Page: ${item.page}`);
      lines.push(`  Type: ${item.type} | Rule: ${item.year_rule} | Range: ${item.year_range}`);
      if (item.required_amount !== null) {
        lines.push(`  Required Amount: ₹${item.required_amount} ${item.required_unit || 'Cr'}`);
      }
      lines.push(`  Verbatim Quote: "${item.quote}"`);
      lines.push(`  Arithmetic & Inputs: ${item.inputs_shown}`);
      lines.push(`  Status: [${item.status}]`);
      lines.push(`  Evaluation: ${item.evaluation_notes}`);
      lines.push('');
    });
  }

  // ─── SECTION 2: TECHNICAL ─────────────────────────────────────────────────
  lines.push('================================================================================');
  lines.push(`SECTION 2: TECHNICAL [${report.sections.technical.status}]`);
  lines.push('================================================================================');

  if (report.sections.technical.items.length === 0) {
    lines.push('No technical experience clauses specified in tender document.');
  } else {
    report.sections.technical.items.forEach((item, idx) => {
      lines.push(`[2.${idx + 1}] ${item.title.toUpperCase()}`);
      lines.push(`  Page: ${item.page}`);
      lines.push(`  Type: ${item.type} | Date Window: ${item.date_window}`);
      if (item.threshold !== null && item.threshold !== undefined) {
        lines.push(`  Required Threshold: ${item.threshold} ${item.unit || ''}`);
      }
      if (item.alternatives && item.alternatives.length > 0) {
        lines.push(`  Alternatives: ${item.alternatives.join(' | ')}`);
      }
      lines.push(`  Verbatim Quote: "${item.quote}"`);
      lines.push(`  Project Used: ${item.project_used}`);
      lines.push(`  Status: [${item.status}]`);
      lines.push(`  Evaluation: ${item.evaluation_notes}`);
      lines.push('');
    });
  }

  // ─── SECTION 3: OTHERS ────────────────────────────────────────────────────
  lines.push('================================================================================');
  lines.push(`SECTION 3: OTHERS [${report.sections.others.status}]`);
  lines.push('================================================================================');

  lines.push('--- A. ELIGIBILITY GATES (Registration, Licence, JV Rule, Blacklisting) ---');
  if (report.sections.others.gates.length === 0) {
    lines.push('No specific gate clauses identified in document.');
  } else {
    report.sections.others.gates.forEach((gate, idx) => {
      lines.push(`[3.A.${idx + 1}] Gate: ${gate.title.toUpperCase()} (${gate.category})`);
      lines.push(`  Page: ${gate.page}`);
      lines.push(`  Verbatim Quote: "${gate.quote}"`);
      lines.push(`  Gate Status: [${gate.status}]`);
      lines.push(`  Notes: ${gate.evaluation_notes}`);
      lines.push('');
    });
  }

  lines.push('--- B. UNSCORED INFORMATION (Submissions & Contract Terms) ---');
  if (report.sections.others.unscored_information.length === 0) {
    lines.push('No submission or contract term clauses captured.');
  } else {
    report.sections.others.unscored_information.forEach((info, idx) => {
      lines.push(`[3.B.${idx + 1}] Info: ${info.title} (${info.category})`);
      lines.push(`  Page: ${info.page}`);
      lines.push(`  Verbatim Quote: "${info.quote}"`);
      lines.push(`  Details: ${info.evaluation_notes}`);
      lines.push('');
    });
  }

  // ─── VERDICT ──────────────────────────────────────────────────────────────
  lines.push('================================================================================');
  lines.push(`OVERALL VERDICT: ${report.verdict}`);
  lines.push('================================================================================');

  return lines.join('\n');
}
