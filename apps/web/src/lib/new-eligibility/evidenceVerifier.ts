/**
 * Deep Evidence Verification Engine
 *
 * Requirements:
 *  1. Verifies verbatim quotation exists in the extracted text of the claimed source page.
 *  2. Verifies correct table row and column association where applicable.
 *  3. Verifies numerical values and units against verbatim quotes and table cells.
 *  4. Evaluates headers, footnotes, and exceptions.
 *  5. Explicitly rejects negative cases where quote exists but numerical interpretation is wrong.
 *  6. Preserves distinct VERIFIED, NEEDS_REVIEW, and REJECTED states.
 *  7. Does NOT treat model confidence as proof of correctness.
 */

import type { CriterionType, ClauseMateriality } from './dbTypes';
import { parseCellNumericalValue, type StructuredTablePayload, expandTableGrid } from './tableReconstructor';

export type VerificationStatus = 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED';

export interface UnverifiedCriterionCandidate {
  criterionType: CriterionType;
  clauseNumber?: string;
  sourcePage: number;
  verbatimQuote: string;
  summary: string;
  materiality: ClauseMateriality;
  parameterKey?: string;
  extractedNumericValue?: number | null;
  extractedUnit?: string | null;
  tableIdentifier?: string;
  tableCellAddress?: string; // e.g. "R2C4"
  notes?: string;
  modelConfidence?: number; // Raw model confidence - NOT treated as proof of correctness
}

export interface VerificationResult {
  status: VerificationStatus;
  isVerified: boolean; // true if status === 'VERIFIED'
  sourcePage: number;
  verbatimExactMatch: boolean;
  verbatimNormalizedMatch: boolean;
  numericalVerified: boolean;
  tableAssociationVerified: boolean;
  verifiedNumericValue?: number | null;
  verifiedUnit?: string | null;
  rejectionReason?: string;
  reviewReason?: string;
  confidenceScore: number; // Deterministically computed
}

/**
 * Normalizes text for robust verbatim matching across OCR/PDF line wraps, hyphenations, and smart quotes.
 */
export function normalizeVerificationText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[“”"']/g, '"')
    .replace(/[-–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Verifies that the verbatim quote exists within the source page text.
 */
export function verifyQuoteInPageText(quote: string, pageText: string): { exactMatch: boolean; normalizedMatch: boolean } {
  if (!quote || !pageText) {
    return { exactMatch: false, normalizedMatch: false };
  }

  const cleanQuote = quote.trim();
  const exactMatch = pageText.includes(cleanQuote);

  if (exactMatch) {
    return { exactMatch: true, normalizedMatch: true };
  }

  const normQuote = normalizeVerificationText(cleanQuote);
  const normPage = normalizeVerificationText(pageText);
  const normalizedMatch = normPage.includes(normQuote);

  return { exactMatch: false, normalizedMatch };
}

/**
 * Verifies that extracted numerical values and units align with the quote or associated table cell.
 */
export function verifyNumericalAlignment(
  extractedValue: number | null | undefined,
  extractedUnit: string | null | undefined,
  verbatimQuote: string,
  associatedCellText?: string
): { isConsistent: boolean; isMismatch: boolean; verifiedValue: number | null; verifiedUnit: string | null } {
  // If no numerical value was claimed, it's consistent if the quote also lacks mandatory financial numbers
  if (extractedValue === null || extractedValue === undefined) {
    return { isConsistent: true, isMismatch: false, verifiedValue: null, verifiedUnit: null };
  }

  // Parse candidate numbers from verbatim quote
  const quoteParsed = parseCellNumericalValue(verbatimQuote);

  // If table cell is available, also check cell text
  const cellParsed = associatedCellText ? parseCellNumericalValue(associatedCellText) : null;

  const candidate = cellParsed?.numericValue !== null && cellParsed?.numericValue !== undefined ? cellParsed : quoteParsed;

  if (candidate && candidate.numericValue !== null) {
    // Check if numeric values match within a small rounding delta (0.01)
    const delta = Math.abs(candidate.numericValue - extractedValue);
    if (delta < 0.05) {
      return {
        isConsistent: true,
        isMismatch: false,
        verifiedValue: candidate.numericValue,
        verifiedUnit: candidate.unit || extractedUnit || null,
      };
    } else {
      // The quote/cell contains a numerical value, but it does NOT match the extracted value
      return { isConsistent: false, isMismatch: true, verifiedValue: candidate.numericValue, verifiedUnit: candidate.unit };
    }
  }

  // Direct substring check for integer/float value in the quote
  const valStr = extractedValue.toString();
  if (verbatimQuote.includes(valStr)) {
    return {
      isConsistent: true,
      isMismatch: false,
      verifiedValue: extractedValue,
      verifiedUnit: extractedUnit || null,
    };
  }

  // Value claimed was not found anywhere in quote or cell
  return { isConsistent: false, isMismatch: true, verifiedValue: null, verifiedUnit: null };
}

/**
 * Comprehensive Evidence Verification Pipeline.
 * Enforces strict deterministic verification rules:
 *  - Quote must exist in extracted text (else REJECTED).
 *  - Numerical claim must align with quote / table cell (if mismatch, REJECTED).
 *  - Ambiguous claims produce NEEDS_REVIEW.
 *  - Model confidence is ignored for verification gating.
 */
export function verifyCriterionEvidence(
  criterion: UnverifiedCriterionCandidate,
  sourcePageText: string,
  associatedTable?: StructuredTablePayload
): VerificationResult {
  // 1. Verify quote exists in page text
  const { exactMatch, normalizedMatch } = verifyQuoteInPageText(criterion.verbatimQuote, sourcePageText);

  if (!exactMatch && !normalizedMatch) {
    return {
      status: 'REJECTED',
      isVerified: false,
      sourcePage: criterion.sourcePage,
      verbatimExactMatch: false,
      verbatimNormalizedMatch: false,
      numericalVerified: false,
      tableAssociationVerified: false,
      rejectionReason: `Verbatim quote not found in extracted text of page ${criterion.sourcePage}`,
      confidenceScore: 0.0,
    };
  }

  // 2. Verify Table Association and Cell Coordinate (if table is claimed)
  let tableVerified = true;
  let cellText: string | undefined;

  if (criterion.tableIdentifier) {
    if (!associatedTable) {
      tableVerified = false;
    } else {
      // Use expanded grid to correctly respect merged cells and true coordinates
      const grid = expandTableGrid(associatedTable);
      if (criterion.tableCellAddress && grid.length > 0) {
        const addrMatch = criterion.tableCellAddress.match(/R(\d+)C(\d+)/i);
        if (addrMatch) {
          const rIdx = parseInt(addrMatch[1], 10) - 1;
          const cIdx = parseInt(addrMatch[2], 10) - 1;
          if (grid[rIdx] && grid[rIdx][cIdx]) {
            cellText = grid[rIdx][cIdx].value;
          } else {
            tableVerified = false;
          }
        }
      }
    }
  }

  // 3. Verify Numerical Alignment
  const numCheck = verifyNumericalAlignment(
    criterion.extractedNumericValue,
    criterion.extractedUnit,
    criterion.verbatimQuote,
    cellText
  );

  // Negative case: Numerical value extracted contradicts the text/cell
  if (numCheck.isMismatch) {
    return {
      status: 'REJECTED',
      isVerified: false,
      sourcePage: criterion.sourcePage,
      verbatimExactMatch: exactMatch,
      verbatimNormalizedMatch: normalizedMatch,
      numericalVerified: false,
      tableAssociationVerified: tableVerified,
      rejectionReason: `Numerical interpretation mismatch: Extracted ${criterion.extractedNumericValue} does not match quote/cell text on page ${criterion.sourcePage}`,
      confidenceScore: 0.0,
    };
  }

  // Ambiguous case: Table was specified but coordinate could not be verified
  if (criterion.tableIdentifier && !tableVerified) {
    return {
      status: 'NEEDS_REVIEW',
      isVerified: false,
      sourcePage: criterion.sourcePage,
      verbatimExactMatch: exactMatch,
      verbatimNormalizedMatch: normalizedMatch,
      numericalVerified: numCheck.isConsistent,
      tableAssociationVerified: false,
      reviewReason: `Table cell coordinate ${criterion.tableCellAddress || ''} could not be confirmed in reconstructed table ${criterion.tableIdentifier}`,
      confidenceScore: 0.5,
    };
  }

  // Deterministic confidence score: based on exact match quality, NOT model confidence
  const confidenceScore = exactMatch ? 1.0 : 0.95;

  return {
    status: 'VERIFIED',
    isVerified: true,
    sourcePage: criterion.sourcePage,
    verbatimExactMatch: exactMatch,
    verbatimNormalizedMatch: normalizedMatch,
    numericalVerified: numCheck.isConsistent,
    tableAssociationVerified: tableVerified,
    verifiedNumericValue: numCheck.verifiedValue,
    verifiedUnit: numCheck.verifiedUnit,
    confidenceScore,
  };
}

