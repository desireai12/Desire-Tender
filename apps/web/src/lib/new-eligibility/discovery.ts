/**
 * Full-Document Structural Discovery Engine
 *
 * Responsibilities:
 *  1. Scans document pages to detect chapter headings, TOC, NIT headers, annexures, and qualification sections.
 *  2. Populates structural anchors in public.structural_anchors.
 *  3. Constructs the document_map JSONB for parent extraction_jobs, pinpointing eligibility page ranges.
 *  4. Ensures 100% of pages participate in document discovery (supporting 500-1,000 page tenders).
 *  5. Recognizes continued sections across page boundaries.
 */

import type { StructuralAnchorType } from './dbTypes';

export interface DiscoveredSection {
  anchorType: StructuralAnchorType;
  anchorName: string;
  sectionNumber?: string;
  pageNumber: number;
  confidence: number;
  isContinued?: boolean;
  metadata?: Record<string, unknown>;
}

export interface DocumentMapRange {
  startPage: number;
  endPage: number;
  title: string;
  category?: 'FINANCIAL' | 'TECHNICAL' | 'OTHERS' | 'GENERAL';
}

export interface DocumentMapResult {
  totalDiscoveredSections: number;
  qualificationPageRanges: DocumentMapRange[];
  nitPageRanges: DocumentMapRange[];
  annexurePageRanges: DocumentMapRange[];
  pageCoverage: {
    totalPages: number;
    mappedPagesCount: number;
    unmappedPages: number[];
    isFullyCovered: boolean;
  };
  sections: DiscoveredSection[];
}

// Regex patterns for Indian EPC and infrastructure tender layout detection
const ANCHOR_PATTERNS: Array<{
  type: StructuralAnchorType;
  pattern: RegExp;
  defaultConfidence: number;
  category?: 'FINANCIAL' | 'TECHNICAL' | 'OTHERS' | 'GENERAL';
}> = [
  {
    type: 'NIT_HEADER',
    pattern: /\b(?:NOTICE\s+INVITING\s+TENDER|N\.?I\.?T\.?|INVITATION\s+FOR\s+BIDS?|I\.?F\.?B\.?|BID\s+DATA\s+SHEET|B\.?D\.?S\.?)\b/i,
    defaultConfidence: 0.95,
    category: 'GENERAL',
  },
  {
    type: 'FINANCIAL_FORMAT',
    pattern: /\b(?:FINANCIAL\s+CRITERIA|ANNUAL\s+TURNOVER|NET\s+WORTH|FINANCIAL\s+CAPACITY|BANK\s+SOLVENCY|BID\s+CAPACITY|ANNEXURE\s*[-–—:]*\s*(?:FIN|F))\b/i,
    defaultConfidence: 0.96,
    category: 'FINANCIAL',
  },
  {
    type: 'TECHNICAL_SPECS',
    pattern: /\b(?:TECHNICAL\s+CRITERIA|SIMILAR\s+WORK|WORK\s+EXPERIENCE|TECHNICAL\s+SPECIFICATIONS?|SCOPE\s+OF\s+WORK|EMPLOYER'?S\s+REQUIREMENTS?)\b/i,
    defaultConfidence: 0.95,
    category: 'TECHNICAL',
  },
  {
    type: 'QUALIFICATION_CRITERIA',
    pattern: /\b(?:QUALIFICATION\s+CRITERIA|ELIGIBILITY\s+CRITERIA|PRE-?QUALIFICATION|MINIMUM\s+ELIGIBILITY|SECTION\s*[-–—:]*\s*(?:III|3|IV|4))\b/i,
    defaultConfidence: 0.98,
    category: 'GENERAL',
  },
  {
    type: 'TABLE_OF_CONTENTS',
    pattern: /\b(?:TABLE\s+OF\s+CONTENTS|INDEX|CONTENTS|BRIEF\s+DESCRIPTION\s+OF\s+SECTIONS)\b/i,
    defaultConfidence: 0.90,
    category: 'GENERAL',
  },
  {
    type: 'ANNEXURE',
    pattern: /\b(?:ANNEXURE\s*[-–—:]*\s*[A-Z0-9]+|SCHEDULE\s*[-–—:]*\s*[A-Z0-9]+|APPENDIX\s*[-–—:]*\s*[A-Z0-9]+)\b/i,
    defaultConfidence: 0.92,
    category: 'OTHERS',
  },
  {
    type: 'CHAPTER_HEADING',
    pattern: /\b(?:SECTION|CHAPTER|PART|VOLUME)\s*[-–—:]*\s*(?:[0-9]+|[I|V|X]+)\b/i,
    defaultConfidence: 0.80,
    category: 'GENERAL',
  },
];

const CONTINUATION_PATTERN = /\b(?:contd?\.?|continued|cont\.\.\.)\b/i;

/**
 * Analyzes page text lines to identify structural anchors across the document.
 * Detects section headings and continuation across page breaks.
 */
export function discoverPageAnchors(pageNumber: number, pageText: string): DiscoveredSection[] {
  if (!pageText || pageText.trim().length === 0) {
    return [];
  }

  const sections: DiscoveredSection[] = [];
  const lines = pageText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Check top 12 lines of each page for primary headings or continuation headers
  const headerLines = lines.slice(0, 12);

  for (const line of headerLines) {
    const isContinued = CONTINUATION_PATTERN.test(line);

    for (const { type, pattern, defaultConfidence, category } of ANCHOR_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        // Extract section number if present (e.g. "Section 3.1", "Annexure A")
        const sectionMatch = line.match(/\b(?:Section|Chapter|Annexure|Schedule|Part)\s*[-–—:]*\s*([A-Z0-9.]+)/i);
        const sectionNumber = sectionMatch ? sectionMatch[1] : undefined;

        const anchorName = line.slice(0, 140).trim();

        sections.push({
          anchorType: type,
          anchorName,
          sectionNumber,
          pageNumber,
          confidence: defaultConfidence,
          isContinued,
          metadata: {
            detectedSnippet: line,
            matchedKeyword: match[0],
            category,
          },
        });
        break; // Match one anchor pattern per line
      }
    }
  }

  return sections;
}

/**
 * Consolidates discovered sections into high-priority document map ranges.
 * Accounts for 100% of pages and identifies any unmapped pages.
 */
export function buildDocumentMap(sections: DiscoveredSection[], totalPages: number): DocumentMapResult {
  // Sort sections by page number ascending
  const sortedSections = [...sections].sort((a, b) => a.pageNumber - b.pageNumber);

  // Find distinct major boundary pages
  const boundaryPages = Array.from(new Set(sortedSections.map(s => s.pageNumber))).sort((a, b) => a - b);

  const buildRanges = (list: DiscoveredSection[]): DocumentMapRange[] => {
    return list.map((sec) => {
      const startPage = sec.pageNumber;
      // End page is the next boundary section page, or startPage + 15, bounded by totalPages
      const nextBoundary = boundaryPages.find(p => p > startPage);
      const endPage = nextBoundary ? Math.min(nextBoundary, totalPages) : Math.min(startPage + 15, totalPages);
      
      const cat = (sec.metadata?.category as 'FINANCIAL' | 'TECHNICAL' | 'OTHERS' | 'GENERAL') || 'GENERAL';

      return {
        startPage,
        endPage,
        title: sec.anchorName,
        category: cat,
      };
    });
  };

  const qualSections = sortedSections.filter(s =>
    s.anchorType === 'QUALIFICATION_CRITERIA' ||
    s.anchorType === 'FINANCIAL_FORMAT' ||
    s.anchorType === 'TECHNICAL_SPECS'
  );
  const nitSections = sortedSections.filter(s => s.anchorType === 'NIT_HEADER');
  const annexureSections = sortedSections.filter(s => s.anchorType === 'ANNEXURE');

  const qualRanges = buildRanges(qualSections);
  const nitRanges = buildRanges(nitSections);
  const annexRanges = buildRanges(annexureSections);

  // Compute 100% page coverage
  const allRanges = [...qualRanges, ...nitRanges, ...annexRanges];
  const mappedPageSet = new Set<number>();

  for (const r of allRanges) {
    for (let p = r.startPage; p <= r.endPage; p++) {
      if (p <= totalPages) {
        mappedPageSet.add(p);
      }
    }
  }

  const unmappedPages: number[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (!mappedPageSet.has(p)) {
      unmappedPages.push(p);
    }
  }

  return {
    totalDiscoveredSections: sortedSections.length,
    qualificationPageRanges: qualRanges,
    nitPageRanges: nitRanges,
    annexurePageRanges: annexRanges,
    pageCoverage: {
      totalPages,
      mappedPagesCount: mappedPageSet.size,
      unmappedPages,
      isFullyCovered: unmappedPages.length === 0,
    },
    sections: sortedSections,
  };
}

