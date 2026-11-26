/**
 * Completeness Audit Engine
 *
 * Requirements:
 *  1. Every page and relevant section must have a recorded processing disposition.
 *  2. Evaluates presence of Financial, Technical, and Others categories dynamically.
 *  3. Distinguishes 5 distinct category states:
 *      - ABSENT_FROM_TENDER: Confirmed absent ONLY after complete full-document review with 100% terminal pages and zero unreadable/unreviewed sections.
 *      - NOT_DETECTED_WITH_INSUFFICIENT_DISCOVERY: Criteria not detected, but discovery is incomplete or pages are unreadable/unresolved. BLOCKS verdict!
 *      - PRESENT_BUT_NOT_EXTRACTED: Criteria present in tender structure/anchors but zero clauses extracted. BLOCKS verdict!
 *      - UNREADABLE_OR_UNRESOLVED: Criteria section has unreadable, failed, or exhausted retry pages. BLOCKS verdict!
 *      - PRESENT_AND_REVIEWED: Successfully extracted and verified. Does NOT block verdict.
 *  4. An uncertain discovery result must NEVER be treated as proof that a category does not exist.
 *  5. Reconciles corrigenda and addenda amendments.
 */

import type { PageDisposition, StructuralAnchorType, CriterionType } from './dbTypes';

export type CategoryAuditStatus =
  | 'ABSENT_FROM_TENDER'
  | 'NOT_DETECTED_WITH_INSUFFICIENT_DISCOVERY'
  | 'PRESENT_BUT_NOT_EXTRACTED'
  | 'UNREADABLE_OR_UNRESOLVED'
  | 'PRESENT_AND_REVIEWED';

export interface PageAuditItem {
  pageNumber: number;
  disposition: PageDisposition;
  hasQualificationCriteria?: boolean;
  hasTables?: boolean;
  detectedCategory?: string | null;
}

export interface SectionAnchorAuditItem {
  anchorType: StructuralAnchorType;
  anchorName: string;
  pageNumber: number;
  isReviewed: boolean;
  category?: 'FINANCIAL' | 'TECHNICAL' | 'OTHERS' | 'GENERAL';
}

export interface VerifiedClauseSummary {
  criterionType: CriterionType;
  clauseNumber?: string;
  sourcePage: number;
  summary: string;
  materiality: string;
  parameterKey?: string;
  isAddendum?: boolean;
}

export interface CategoryEvaluationResult {
  category: CriterionType;
  status: CategoryAuditStatus;
  clauseCount: number;
  explanation: string;
}

export interface CompletenessAuditReport {
  isComplete: boolean;
  canProduceDefinitiveVerdict: boolean;
  verdictOverrideReason?: string;
  totalPages: number;
  terminalPagesCount: number;
  unreadablePagesCount: number;
  failedPagesCount: number;
  isDiscoveryComplete: boolean;
  categoryStatuses: Record<CriterionType, CategoryEvaluationResult>;
  unreviewedQualificationSections: SectionAnchorAuditItem[];
  missingOrUnresolvedCategories: CriterionType[];
  detectedCorrigendaContradictions: Array<{
    parameterKey: string;
    originalQuote: string;
    amendedQuote: string;
    corrigendumPage: number;
  }>;
  auditNotes: string[];
}

/**
 * Determines whether a specific criterion category is indicated in the tender document's structural anchors or page metadata.
 */
export function isCategoryIndicatedInTender(
  category: CriterionType,
  anchors: SectionAnchorAuditItem[],
  pages: PageAuditItem[]
): boolean {
  if (category === 'FINANCIAL') {
    const hasFinAnchor = anchors.some(a =>
      a.anchorType === 'FINANCIAL_FORMAT' ||
      /\b(?:financial|turnover|net\s*worth|solvency|bid\s*capacity|fin\b)\b/i.test(a.anchorName)
    );
    const hasFinPage = pages.some(p => p.detectedCategory?.toUpperCase() === 'FINANCIAL');
    return hasFinAnchor || hasFinPage;
  }

  if (category === 'TECHNICAL') {
    const hasTechAnchor = anchors.some(a =>
      a.anchorType === 'TECHNICAL_SPECS' ||
      /\b(?:technical|similar\s*work|experience|plant|equipment|machinery|key\s*personnel)\b/i.test(a.anchorName)
    );
    const hasTechPage = pages.some(p => p.detectedCategory?.toUpperCase() === 'TECHNICAL');
    return hasTechAnchor || hasTechPage;
  }

  // OTHERS category
  const hasOtherAnchor = anchors.some(a => a.anchorType === 'ANNEXURE' || a.anchorType === 'SCHEDULE');
  const hasOtherPage = pages.some(p => p.detectedCategory?.toUpperCase() === 'OTHERS');
  return hasOtherAnchor || hasOtherPage;
}

export const isCategoryPresentInTender = isCategoryIndicatedInTender;

/**
 * Runs a comprehensive completeness audit across document pages, structural anchors, and verified clauses.
 * Enforces strict discovery gating before any category can be certified as ABSENT_FROM_TENDER.
 */
export function auditExtractionCompleteness(
  totalPages: number,
  pages: PageAuditItem[],
  anchors: SectionAnchorAuditItem[],
  clauses: VerifiedClauseSummary[]
): CompletenessAuditReport {
  const auditNotes: string[] = [];

  // 1. Audit Page Dispositions
  const unreadablePages = pages.filter(p => p.disposition === 'UNREADABLE');
  const failedPages = pages.filter(p => p.disposition === 'FAILED' || p.disposition === 'NEEDS_REVIEW_EXHAUSTED');
  const terminalPages = pages.filter(p =>
    ['RELEVANT', 'REVIEWED_NO_CRITERIA', 'NEEDS_REVIEW_EXHAUSTED', 'UNREADABLE', 'FAILED'].includes(p.disposition)
  );

  if (unreadablePages.length > 0) {
    auditNotes.push(`${unreadablePages.length} page(s) marked UNREADABLE (scanned/degraded).`);
  }
  if (failedPages.length > 0) {
    auditNotes.push(`${failedPages.length} page(s) exhausted retries without completion.`);
  }

  // 2. Audit Structural Qualification Anchors
  const unreviewedAnchors: SectionAnchorAuditItem[] = [];
  const qualAnchors = anchors.filter(a =>
    a.anchorType === 'QUALIFICATION_CRITERIA' ||
    a.anchorType === 'NIT_HEADER' ||
    a.anchorType === 'FINANCIAL_FORMAT' ||
    a.anchorType === 'TECHNICAL_SPECS'
  );

  for (const anchor of qualAnchors) {
    const pageItem = pages.find(p => p.pageNumber === anchor.pageNumber);
    const hasClausesOnPage = clauses.some(c => c.sourcePage === anchor.pageNumber);
    const isDispositionReviewed = pageItem?.disposition === 'RELEVANT' || pageItem?.disposition === 'REVIEWED_NO_CRITERIA';

    if (!isDispositionReviewed && !hasClausesOnPage) {
      unreviewedAnchors.push({ ...anchor, isReviewed: false });
      auditNotes.push(`Qualification section "${anchor.anchorName}" on page ${anchor.pageNumber} was not fully reviewed.`);
    }
  }

  // 3. Evaluate Full Document Discovery Completeness
  // Discovery is complete ONLY when:
  //  - All pages 1..totalPages are accounted for in terminal states
  //  - No unreviewed qualification anchors exist
  //  - No unreadable or failed pages exist that could conceal unextracted criteria
  const isAllPagesTerminal = totalPages > 0 && terminalPages.length >= totalPages;
  const isZeroUnreviewedAnchors = unreviewedAnchors.length === 0;
  const isZeroUnreadableOrFailed = unreadablePages.length === 0 && failedPages.length === 0;

  const isDiscoveryComplete = isAllPagesTerminal && isZeroUnreviewedAnchors && isZeroUnreadableOrFailed;

  // 4. Dynamic Category Status Evaluation (Financial, Technical, Others)
  const categories: CriterionType[] = ['FINANCIAL', 'TECHNICAL', 'OTHERS'];
  const categoryStatuses = {} as Record<CriterionType, CategoryEvaluationResult>;
  const missingOrUnresolvedCategories: CriterionType[] = [];

  for (const cat of categories) {
    const catClauses = clauses.filter(c => c.criterionType === cat);
    const isIndicated = isCategoryIndicatedInTender(cat, anchors, pages);

    if (catClauses.length > 0) {
      // Category is present and successfully extracted/verified
      categoryStatuses[cat] = {
        category: cat,
        status: 'PRESENT_AND_REVIEWED',
        clauseCount: catClauses.length,
        explanation: `${cat} criteria successfully extracted and verified (${catClauses.length} clause(s)).`,
      };
    } else if (isIndicated) {
      // Category is indicated in tender structure, but 0 clauses were extracted
      const catAnchors = anchors.filter(a =>
        (cat === 'FINANCIAL' && (a.anchorType === 'FINANCIAL_FORMAT' || /financial|turnover/i.test(a.anchorName))) ||
        (cat === 'TECHNICAL' && (a.anchorType === 'TECHNICAL_SPECS' || /technical|similar/i.test(a.anchorName)))
      );
      const catAnchorPages = catAnchors.map(a => a.pageNumber);
      const hasUnresolvedCategoryPage = unreadablePages.concat(failedPages).some(p =>
        catAnchorPages.includes(p.pageNumber) || (pages.find(pg => pg.pageNumber === p.pageNumber)?.detectedCategory?.toUpperCase() === cat)
      );

      if (hasUnresolvedCategoryPage) {
        categoryStatuses[cat] = {
          category: cat,
          status: 'UNREADABLE_OR_UNRESOLVED',
          clauseCount: 0,
          explanation: `${cat} qualification section present but page(s) are unreadable or failed extraction.`,
        };
        missingOrUnresolvedCategories.push(cat);
        auditNotes.push(`${cat} qualification pages are unreadable or unresolved.`);
      } else {
        categoryStatuses[cat] = {
          category: cat,
          status: 'PRESENT_BUT_NOT_EXTRACTED',
          clauseCount: 0,
          explanation: `${cat} qualification section identified in document structure, but no criteria were extracted.`,
        };
        missingOrUnresolvedCategories.push(cat);
        auditNotes.push(`${cat} criteria present in tender structure but missing from extraction.`);
      }
    } else {
      // Neither clauses nor structural anchors were detected for this category
      if (isDiscoveryComplete) {
        // Certified ABSENT only after complete full-document review
        categoryStatuses[cat] = {
          category: cat,
          status: 'ABSENT_FROM_TENDER',
          clauseCount: 0,
          explanation: `${cat} qualification criteria confirmed absent from tender after complete full-document review.`,
        };
        auditNotes.push(`${cat} criteria confirmed absent after complete document coverage.`);
      } else {
        // Discovery was incomplete (unreviewed pages, gaps, or unreadable pages exist).
        // Cannot claim absence!
        categoryStatuses[cat] = {
          category: cat,
          status: 'NOT_DETECTED_WITH_INSUFFICIENT_DISCOVERY',
          clauseCount: 0,
          explanation: `${cat} criteria not detected, but discovery is incomplete (${totalPages - terminalPages.length} unreviewed or degraded pages). Absence cannot be verified.`,
        };
        missingOrUnresolvedCategories.push(cat);
        auditNotes.push(`${cat} criteria not detected, but discovery is incomplete. Absence cannot be certified.`);
      }
    }
  }

  // 5. Corrigenda & Addenda Contradiction Reconciliation
  const contradictions: CompletenessAuditReport['detectedCorrigendaContradictions'] = [];
  const addendaClauses = clauses.filter(c => c.isAddendum || c.clauseNumber?.toLowerCase().includes('corrigend'));

  for (const addendum of addendaClauses) {
    if (addendum.parameterKey) {
      const original = clauses.find(c => c.parameterKey === addendum.parameterKey && c !== addendum);
      if (original) {
        contradictions.push({
          parameterKey: addendum.parameterKey,
          originalQuote: original.summary,
          amendedQuote: addendum.summary,
          corrigendumPage: addendum.sourcePage,
        });
        auditNotes.push(`Corrigendum on page ${addendum.sourcePage} amends parameter "${addendum.parameterKey}". Precedence applies.`);
      }
    }
  }

  // 6. Final Completeness & Definitive Verdict Gate
  // A tender MUST have at least one valid reviewed category across Financial, Technical, or Others.
  const totalExtractedClauses = clauses.length;
  const hasAtLeastOneCategoryReviewed = categories.some(cat => categoryStatuses[cat]?.status === 'PRESENT_AND_REVIEWED');

  const hasUnreadableInCriticalSection = unreadablePages.some(p =>
    qualAnchors.some(a => Math.abs(a.pageNumber - p.pageNumber) <= 3)
  );

  const canProduceDefinitiveVerdict =
    hasAtLeastOneCategoryReviewed &&
    totalExtractedClauses > 0 &&
    missingOrUnresolvedCategories.length === 0 &&
    unreviewedAnchors.length === 0 &&
    !hasUnreadableInCriticalSection &&
    failedPages.length === 0;

  let verdictOverrideReason: string | undefined;

  if (!canProduceDefinitiveVerdict) {
    if (missingOrUnresolvedCategories.length > 0) {
      const reasons = missingOrUnresolvedCategories.map(cat => {
        const stat = categoryStatuses[cat]?.status;
        if (stat === 'NOT_DETECTED_WITH_INSUFFICIENT_DISCOVERY') {
          return `${cat} criteria absence uncertain due to incomplete discovery`;
        }
        return `${cat} criteria unresolved`;
      });
      verdictOverrideReason = `Incomplete extraction: ${reasons.join(' & ')}.`;
    } else if (unreviewedAnchors.length > 0) {
      verdictOverrideReason = 'Incomplete extraction: One or more qualification sections were not fully reviewed.';
    } else if (hasUnreadableInCriticalSection) {
      verdictOverrideReason = 'Incomplete extraction: Scanned or unreadable pages detected in qualification sections.';
    } else if (!hasAtLeastOneCategoryReviewed) {
      verdictOverrideReason = 'Incomplete extraction: No qualification criteria extracted from document.';
    } else {
      verdictOverrideReason = 'Incomplete extraction: Unresolved document processing errors prevent definitive verdict.';
    }
  }

  return {
    isComplete: canProduceDefinitiveVerdict,
    canProduceDefinitiveVerdict,
    verdictOverrideReason,
    totalPages,
    terminalPagesCount: terminalPages.length,
    unreadablePagesCount: unreadablePages.length,
    failedPagesCount: failedPages.length,
    isDiscoveryComplete,
    categoryStatuses,
    unreviewedQualificationSections: unreviewedAnchors,
    missingOrUnresolvedCategories,
    detectedCorrigendaContradictions: contradictions,
    auditNotes,
  };
}
