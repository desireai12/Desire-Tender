import { selectQualificationAndNitPages } from './pdfTextSelector';
import { extractEligibilityClausesStrict } from './clauseExtractor';
import { buildNewEligibilityReport } from './evaluator';
import { NewEligibilityReport } from './types';
import { DESIRE_ENERGY_MASTER } from './companyMaster';

export * from './types';
export * from './companyMaster';
export * from './pdfTextSelector';
export * from './clauseExtractor';
export * from './evaluator';
export * from './reportRenderer';

export interface EvaluationOptions {
  filename?: string;
  projectCategory?: string;
  tenderTitle?: string;
}

/**
 * Main entrypoint for the new, separate eligibility evaluation module.
 *
 * EXTRACTION:
 * - Reads the qualification section and the NIT/BDS summary pages in full.
 * - Does not read every page for generic clauses.
 * - Asks the model for strict JSON in three groups: financial, technical, others.
 * - Every item includes: verbatim quote, page, title.
 * - Drops any item whose quote is not found in the extracted text.
 *
 * EVALUATION:
 * - Financial: arithmetic on the year-wise table. Shows the inputs.
 * - Technical: matches projects from the register by category, value or quantity, and date window. Shows the project used.
 * - Missing data is CANNOT CHECK and names the missing field. Never NOT MATCHING.
 * - Others: registration, licence, JV rule and blacklisting are gates. Everything else is unscored information.
 * - Verdict: Eligible / Not eligible (criterion) / Cannot determine (missing data). No percentages.
 *
 * REPORT:
 * - Three sections in this exact order: Financial, Technical, Others.
 * - Top card with one line per section.
 */
export async function runNewEligibilityEvaluation(
  pdfBuffer: Buffer,
  apiKey: string,
  options: EvaluationOptions = {}
): Promise<NewEligibilityReport> {
  const filename = options.filename || 'uploaded_tender.pdf';

  // 1. Focus extraction on NIT/BDS summary pages and qualification section
  const { combinedText, selectedPages, totalPages, allPagesText } = await selectQualificationAndNitPages(pdfBuffer);

  // 2. Extract clauses in strict JSON across financial, technical, others; verify verbatim quotes
  const { result: extracted, droppedCount, droppedItems } = await extractEligibilityClausesStrict(
    combinedText,
    allPagesText,
    filename,
    apiKey
  );

  // 3. Deterministically evaluate against master credentials, calculate arithmetic, match projects, check gates
  const report = buildNewEligibilityReport(
    extracted,
    filename,
    DESIRE_ENERGY_MASTER,
    {
      pages_read: selectedPages.map(p => p.pageNum),
      total_pages: totalPages,
      dropped_quotes_count: droppedCount,
      dropped_items: droppedItems
    }
  );

  return report;
}
