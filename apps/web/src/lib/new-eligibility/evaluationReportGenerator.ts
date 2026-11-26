/**
 * DESIRE TENDER — EVALUATION REPORT GENERATOR
 * Stage 3B: Structured Markdown and JSON Report Generator
 *
 * Grounded strictly in verified criteria and company records:
 * - Section A: Executive Summary & Dual Top Cards
 * - Section B: Financial Eligibility (Radhanpur Dual Scenarios, Escalation & 3-of-5 Audit)
 * - Section C: Technical Eligibility (Registrations, Licences & Prime Experience)
 * - Section D: Other Eligibility (Constitution, Blacklisting & Single-Entity Bidding)
 * - Section E: Proposal Readiness & Missing Submission Documents Checklist
 * - Section F: Post-Award Contract Terms & Asset Technical Scope (Informational)
 * - Section G: Complete Grounded Evidence Provenance Ledger
 * - Section H: Corrigenda Audit Status & Limitations
 */

import type { DualEvaluationReport, CriterionEvaluationItem } from './tenderRuleAdapter';

/**
 * Formats a CriterionStatus as a Markdown badge/tag.
 */
function formatStatusTag(status: string): string {
  switch (status) {
    case 'PASS':
      return '🟢 **PASS**';
    case 'FAIL':
      return '🔴 **FAIL**';
    case 'CANNOT_CHECK':
      return '🟡 **CANNOT CHECK (Missing Evidence)**';
    case 'INFO':
      return 'ℹ️ **INFO (Contractual/Informational)**';
    case 'READY':
      return '🟢 **READY**';
    case 'INCOMPLETE':
      return '🟠 **INCOMPLETE (Pending Bid Dossier)**';
    case 'QUALIFIED_AND_READY':
      return '🟢 **ELIGIBLE & READY FOR SUBMISSION**';
    case 'QUALIFIED_BUT_PROPOSAL_INCOMPLETE':
      return '🟡 **CORPORATE QUALIFIED — BID DOSSIER INCOMPLETE**';
    case 'DISQUALIFIED':
      return '🔴 **DISQUALIFIED**';
    case 'CANNOT_DETERMINE':
      return '⚪ **CANNOT DETERMINE (Incomplete Extraction/Data)**';
    default:
      return `**${status}**`;
  }
}

/**
 * Generates the full structured Markdown evaluation report.
 */
export function generateMarkdownReport(report: DualEvaluationReport): string {
  const cq = report.corporateQualification;
  const pr = report.proposalReadiness;
  const s1 = cq.scenarioDetails?.scenario1;
  const s2 = cq.scenarioDetails?.scenario2;

  let md = '';

  md += `# TENDER ELIGIBILITY EVALUATION REPORT\n`;
  md += `## ${report.tenderTitle}\n\n`;
  md += `**Tender ID:** \`${report.tenderId}\`  \n`;
  md += `**Bidder Name:** **${report.bidderName}**  \n`;
  md += `**CIN:** \`${report.bidderCin}\`  \n`;
  md += `**Evaluation Timestamp:** \`${report.evaluatedAt}\`  \n`;
  md += `**Evaluation Standard:** Stage 3B Deterministic Eligibility Engine (Volume I Grounded)\n\n`;
  md += `---\n\n`;

  // ── SECTION A: EXECUTIVE SUMMARY & DUAL TOP CARDS ─────────────────────────
  md += `### SECTION A: EXECUTIVE SUMMARY & DUAL TOP CARDS\n\n`;
  md += `#### Overall Tender Status: ${formatStatusTag(report.overallVerdict)}\n`;
  md += `> ${report.overallVerdictText}\n\n`;

  md += `| Evaluation Dimension | Verdict Status | Summary Evaluation |\n`;
  md += `| :--- | :---: | :--- |\n`;
  md += `| **1. Corporate Qualification** | ${formatStatusTag(cq.status)} | ${cq.verdictSummary} |\n`;
  md += `| ↳ *A. Financial Eligibility* | ${formatStatusTag(cq.financialGroup.status)} | ${cq.financialGroup.summaryLine} |\n`;
  md += `| ↳ *B. Technical Eligibility* | ${formatStatusTag(cq.technicalGroup.status)} | ${cq.technicalGroup.summaryLine} |\n`;
  md += `| ↳ *C. Other Eligibility* | ${formatStatusTag(cq.otherGroup.status)} | ${cq.otherGroup.summaryLine} |\n`;
  md += `| **2. Proposal Readiness** | ${formatStatusTag(pr.status)} | ${pr.verdictSummary} |\n`;
  md += `| ↳ *D. Bid Submission Checklist* | ${formatStatusTag(pr.checklistGroup.status)} | ${pr.missingItems.length === 0 ? 'All submission instruments verified' : `Pending: ${pr.missingItems.join(', ')}`} |\n`;
  md += `| ↳ *E. Contract Terms* | ${formatStatusTag('INFO')} | Post-award PBG, DLP, SLA terms excluded from prequalification |\n`;
  md += `| ↳ *F. Scope & Specifications* | ${formatStatusTag('INFO')} | Asset O&M specifications excluded from prequalification |\n\n`;

  // ── SECTION B: FINANCIAL ELIGIBILITY ──────────────────────────────────────
  md += `### SECTION B: FINANCIAL ELIGIBILITY (PAGE 26 DUAL SCENARIOS)\n\n`;
  md += `**Overall Financial Status:** ${formatStatusTag(cq.financialGroup.status)}  \n`;
  md += `**Qualifying Scenario:** **${cq.qualifyingScenario}**\n\n`;

  md += `#### 1. Annual Financial Turnover & Compounding Escalation Audit\n\n`;
  md += `Compounding escalation multipliers from Page 26 applied to raw audited receipts:\n\n`;

  if (s1 && s1.adjustedTurnovers) {
    md += `| Financial Year | Raw Audited Turnover (₹ Cr) | Escalation Factor (P.26) | Adjusted Turnover (₹ Cr) | Meets S1 (₹4 Cr) | Meets S2 (₹10 Cr) | Audit Status |\n`;
    md += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n`;
    for (const [fy, a] of Object.entries(s1.adjustedTurnovers)) {
      const s2Pass = a.adjusted >= 9.9999;
      md += `| **${fy}** | ₹${a.raw.toFixed(2)} | ${a.multiplier.toFixed(2)}× | ₹${a.adjusted.toFixed(2)} | ${a.passed ? '✅ Yes' : '❌ No'} | ${s2Pass ? '✅ Yes' : '❌ No'} | ${formatStatusTag(a.status)} |\n`;
    }
    md += `\n`;
    md += `- **3rd Highest Adjusted Turnover ($T^*_3$):** **₹${s1.thirdHighestCr.toFixed(2)} Cr**  \n`;
    md += `- **Scenario 1 Threshold:** ₹4.00 Cr (Desire achieves **${(s1.thirdHighestCr / 4.0).toFixed(1)}×** the requirement)  \n`;
    md += `- **Scenario 2 Threshold:** ₹10.00 Cr (Desire achieves **${(s1.thirdHighestCr / 10.0).toFixed(1)}×** the requirement)  \n\n`;
  }

  md += `#### 2. Scenario-by-Scenario Evaluation\n\n`;
  if (s1) {
    md += `##### Scenario 1: Turnover >= ₹4.0 Cr in 3 of 5 Yrs AND Water O&M Experience >= 1.0 Yr\n`;
    md += `- **Scenario 1 Verdict:** ${formatStatusTag(s1.status)}\n`;
    md += `- **Turnover Condition:** ${formatStatusTag(s1.turnoverStatus)} (3 of 5 years exceed ₹4.0 Cr)\n`;
    md += `- **Water O&M Experience Condition:** ${formatStatusTag(s1.experienceStatus)} (${s1.experienceYears} Years achieved vs 1.0 Year required)\n`;
    md += `- **Traceability Details:** ${s1.details}\n\n`;
  }

  if (s2) {
    md += `##### Scenario 2: Turnover >= ₹10.0 Cr in 3 of 5 Yrs (Zero Experience Required)\n`;
    md += `- **Scenario 2 Verdict:** ${formatStatusTag(s2.status)}\n`;
    md += `- **Turnover Condition:** ${formatStatusTag(s2.turnoverStatus)} (3 of 5 years exceed ₹10.0 Cr)\n`;
    md += `- **Water O&M Experience Condition:** ℹ️ Not required under Scenario 2\n`;
    md += `- **Traceability Details:** ${s2.details}\n\n`;
  }

  // ── SECTION C: TECHNICAL ELIGIBILITY ──────────────────────────────────────
  md += `### SECTION C: TECHNICAL ELIGIBILITY (REGISTRATIONS, LICENCES, EXPERIENCE & PERSONNEL)\n\n`;
  md += `**Technical Status:** ${formatStatusTag(cq.technicalGroup.status)}  \n`;
  md += `> ${cq.technicalGroup.summaryLine}\n\n`;

  md += `| Criterion ID | Technical Requirement | Required Condition | Achieved by Desire Energy | Status |\n`;
  md += `| :--- | :--- | :--- | :--- | :---: |\n`;
  for (const crit of cq.technicalGroup.criteria) {
    md += `| **${crit.id}** | ${crit.title} | ${crit.requiredCondition} | ${crit.actualAchieved} | ${formatStatusTag(crit.status)} |\n`;
  }
  md += `\n`;

  // ── SECTION D: OTHER ELIGIBILITY ──────────────────────────────────────────
  md += `### SECTION D: OTHER ELIGIBILITY (CONSTITUTION, BLACKLISTING & JV RESTRICTION)\n\n`;
  md += `**Other Eligibility Status:** ${formatStatusTag(cq.otherGroup.status)}  \n`;
  md += `> ${cq.otherGroup.summaryLine}\n\n`;

  md += `| Criterion ID | Eligibility Gate | Tender Condition | Desire Energy Compliance | Status |\n`;
  md += `| :--- | :--- | :--- | :--- | :---: |\n`;
  for (const crit of cq.otherGroup.criteria) {
    md += `| **${crit.id}** | ${crit.title} | ${crit.requiredCondition} | ${crit.actualAchieved} | ${formatStatusTag(crit.status)} |\n`;
  }
  md += `\n`;

  // ── SECTION E: PROPOSAL READINESS CHECKLIST ───────────────────────────────
  md += `### SECTION E: PROPOSAL READINESS & SUBMISSION CHECKLIST (GROUP D)\n\n`;
  md += `**Proposal Readiness Status:** ${formatStatusTag(pr.status)}  \n`;
  md += `> **Important Safeguard:** Missing proposal documents below do NOT fail corporate qualification, but prevent issuing an unqualified submission-ready clearance until instruments are uploaded.\n\n`;

  md += `| Checklist Item | Document / Instrument Required | Value / Format | Current Readiness State | Status |\n`;
  md += `| :--- | :--- | :--- | :--- | :---: |\n`;
  for (const crit of pr.checklistGroup.criteria) {
    md += `| **${crit.id}** | ${crit.title} | ${crit.requiredCondition} | ${crit.actualAchieved} | ${formatStatusTag(crit.status)} |\n`;
  }
  md += `\n`;

  if (pr.missingItems.length > 0) {
    md += `> ⚠️ **Action Required for Bid Submission:**\n`;
    for (const item of pr.missingItems) {
      md += `> - Generate / Upload **${item}**\n`;
    }
    md += `\n`;
  }

  // ── SECTION F: CONTRACT TERMS & TECHNICAL SCOPE (INFORMATIONAL) ───────────
  md += `### SECTION F: POST-AWARD CONTRACT TERMS & TECHNICAL SCOPE (GROUPS E & F)\n\n`;
  md += `*The following clauses are purely informational or applicable post-award and have been excluded from prequalification scoring:*\n\n`;
  for (const crit of [...pr.contractTermsGroup.criteria, ...pr.technicalScopeGroup.criteria]) {
    md += `- **[${crit.id}] ${crit.title}** (Page ${crit.sourcePage}, ${crit.clauseNumber}): ${crit.actualAchieved}\n`;
  }
  md += `\n`;

  // ── SECTION G: COMPLETE EVIDENCE PROVENANCE LEDGER ────────────────────────
  md += `### SECTION G: GROUNDED EVIDENCE PROVENANCE LEDGER\n\n`;
  md += `Every figure and condition is traced to exact source documents and pages:\n\n`;
  md += `| ID | Source Page & Clause | Verbatim Tender Requirement Quote | Matched Company Evidence & Record Key |\n`;
  md += `| :--- | :--- | :--- | :--- |\n`;
  for (const crit of report.allCriteria) {
    md += `| **${crit.id}** | P.${crit.sourcePage} (${crit.clauseNumber || 'N/A'}) | *"${crit.quote.slice(0, 100)}${crit.quote.length > 100 ? '...' : ''}"* | **${crit.evidenceProvenance.sourceDocument}** (${crit.evidenceProvenance.pageOrLocation}) |\n`;
  }
  md += `\n`;

  // ── SECTION H: CORRIGENDA AUDIT STATUS ────────────────────────────────────
  md += `### SECTION H: CORRIGENDA AUDIT STATUS & LIMITATIONS\n\n`;
  md += `- **Internal Document Corrigenda:** \`${report.corrigendaStatus.internalDocumentStatus}\`\n`;
  md += `- **External Document Status:** \`${report.corrigendaStatus.separateDocumentStatus}\`\n`;
  md += `- **Portal Verification:** \`${report.corrigendaStatus.externalVerificationStatus}\`\n`;
  md += `> ${report.corrigendaStatus.summary}\n`;

  return md;
}

/**
 * Serializes the report to structured JSON.
 */
export function generateJsonReport(report: DualEvaluationReport): string {
  return JSON.stringify(report, null, 2);
}

