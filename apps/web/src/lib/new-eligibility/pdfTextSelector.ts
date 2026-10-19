// ─── FOCUSED PDF TEXT SELECTOR & QUOTE VERIFIER ────────────────────────────

export interface SelectedPage {
  pageNum: number;
  text: string;
}

export interface TextSelectionResult {
  combinedText: string;
  selectedPages: SelectedPage[];
  pagesSent?: number[];
  totalPages: number;
  allPagesText: string; // Used for verbatim quote verification
}

/**
 * Normalizes text for verbatim quote matching (collapses multiple spaces, tabs, newlines).
 */
export function normalizeTextForSearch(str: string): string {
  if (!str) return '';
  return str
    .replace(/\r\n/g, ' ')
    .replace(/[\r\n\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Verifies whether a quote exists verbatim inside the extracted text.
 */
export function verifyQuoteInExtractedText(quote: string, fullText: string): boolean {
  if (!quote || quote.trim().length === 0) return false;
  const normQuote = normalizeTextForSearch(quote);
  const normFull = normalizeTextForSearch(fullText);

  // Exact normalized substring check
  if (normFull.includes(normQuote)) return true;

  // If quote is long (e.g. > 40 chars), also test if a substantial core (first 35 chars or 80%) matches
  if (normQuote.length > 50) {
    const head35 = normQuote.slice(0, 35);
    const tail35 = normQuote.slice(-35);
    if (normFull.includes(head35) && normFull.includes(tail35)) return true;
  }

  return false;
}

const NIT_BDS_PATTERNS = [
  /notice\s+inviting\s+tender/i,
  /\bnit\b/i,
  /bid\s+data\s+sheet/i,
  /\bbds\b/i,
  /press\s+notice/i,
  /invitation\s+for\s+bids?/i,
  /tender\s+notice/i,
  /tender\s+summary/i,
  /key\s+dates/i,
  /schedule\s+of\s+tender/i,
  /letter\s+of\s+invitation/i
];

const QUALIFICATION_PATTERNS = [
  /qualification\s+criteria/i,
  /eligibility\s+criteria/i,
  /pre-?qualification/i,
  /minimum\s+eligibility/i,
  /technical\s+capacity/i,
  /financial\s+capacity/i,
  /financial\s+turnover/i,
  /annual\s+turnover/i,
  /net\s+worth/i,
  /solvency/i,
  /bid\s+capacity/i,
  /single\s+work/i,
  /similar\s+work/i,
  /joint\s+venture/i,
  /consortium/i,
  /contractor\s+registration/i,
  /registration\s+class/i,
  /electrical\s+licen[cs]e/i,
  /blacklisting/i,
  /debarment/i,
  /section\s+(?:iii|3|iv|4|1)/i
];

const BOILERPLATE_EXCLUSION_PATTERNS = [
  /boilerplate\s+administrative/i,
  /accounting\s+guidelines\s*\.\.\.\s*financial\s+auditing/i,
  /engineering\s+standards\s*\.\.\.\s*technical\s+specifications/i,
  /general\s+conditions\s+of\s+contract/i,
  /dispute\s+resolution\s+and\s+arbitration/i,
  /labour\s+welfare\s+and\s+safety\s+measures/i
];

/**
 * Extracts and selects only the qualification section and NIT/BDS summary pages in full.
 * Does not read every page for generic boilerplate clauses.
 */
export async function selectQualificationAndNitPages(pdfBuffer: Buffer): Promise<TextSelectionResult> {
  let rawPages: Array<{ text: string; num?: number }> = [];
  let fullText = '';
  let total = 1;

  // 1. Use unpdf extractor (standard serverless ESM/WASM PDF engine)
  try {
    const modName = 'unpdf';
    const unpdf = await import(/* webpackIgnore: true */ modName).catch(() => null);
    if (unpdf && unpdf.getDocumentProxy && unpdf.extractText) {
      const uint8Array = new Uint8Array(pdfBuffer.byteLength);
      uint8Array.set(pdfBuffer);
      const pdf = await unpdf.getDocumentProxy(uint8Array);
      total = pdf.numPages || 1;
      const { text, totalPages } = await unpdf.extractText(pdf, { mergePages: false });
      if (Array.isArray(text)) {
        rawPages = text.map((t, idx) => ({ text: (t || '').trim(), num: idx + 1 }));
        fullText = text.join('\n\n');
      } else if (typeof text === 'string') {
        fullText = text.trim();
      }
      if (totalPages) total = totalPages;
    }
  } catch (unpdfErr: any) {
    console.warn(`[PDF_SELECTOR] unpdf extraction warning: ${unpdfErr?.message || unpdfErr}`);
  }

  // 2. If page-level extraction was not returned directly, synthesize page boundaries from fullText
  if (fullText && rawPages.length === 0) {
    const pageChunks = fullText.split(/\f|\n(?=Page\s+\d+|\bSECTION\s+\d+)/i);
    rawPages = pageChunks.map((chunk, idx) => ({
      text: chunk,
      num: idx + 1
    }));
  }

  // 3. Last fallback: readable ASCII/UTF-8 extraction
  if (!fullText || fullText.trim().length === 0) {
    const rawStr = pdfBuffer.toString('utf-8');
    const printable = rawStr.replace(/[^\x20-\x7E\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim();
    if (printable.length >= 50) {
      fullText = printable;
      rawPages = [{ text: printable, num: 1 }];
    }
  }

  // ── PAGE FINDER: Score each page by specified keywords ──
  // turnover, net worth, solvency, bid capacity, similar work, experience, O&M, eligibility, qualification, registration, joint venture, blacklist
  const KEYWORD_WEIGHTS: Array<{ rx: RegExp; weight: number }> = [
    { rx: /\bturnover\b/i, weight: 15 },
    { rx: /\bnet\s*worth\b/i, weight: 15 },
    { rx: /\bsolvency\b/i, weight: 15 },
    { rx: /\bbid\s*capacity\b/i, weight: 15 },
    { rx: /\bsimilar\s*work\b/i, weight: 15 },
    { rx: /\bexperience\b/i, weight: 10 },
    { rx: /\bo&m\b|\boperation\s*&\s*maintenance\b|\boperation\s*and\s*maintenance\b/i, weight: 10 },
    { rx: /\beligibility\b/i, weight: 10 },
    { rx: /\bqualification\b/i, weight: 10 },
    { rx: /\bregistration\b/i, weight: 10 },
    { rx: /\bjoint\s*venture\b/i, weight: 10 },
    { rx: /\bblacklist(?:ing|ed)?\b|\bdebar(?:red|ment)?\b/i, weight: 10 }
  ];

  const pageScores: Array<{ pageNum: number; text: string; score: number }> = [];

  for (let i = 0; i < rawPages.length; i++) {
    const pageNum = rawPages[i].num || (i + 1);
    const pText = (rawPages[i].text || '').trim();
    if (pText.length < 15) continue;

    let score = 0;
    for (const kw of KEYWORD_WEIGHTS) {
      if (kw.rx.test(pText)) {
        score += kw.weight;
      }
    }
    pageScores.push({ pageNum, text: pText, score });
  }

  // Sort by score descending to find the top pages
  const scoredOnly = pageScores.filter(p => p.score > 0).sort((a, b) => b.score - a.score);
  
  // Pick top pages (take top 15 distinct hot spots across all chapters)
  const topPages = scoredOnly.slice(0, 15);

  // Send top pages plus two pages on each side (context padding = 2)
  const selectedPageNums = new Set<number>();

  // Include NIT/BDS summary front pages (Page 1-3)
  for (let p = 1; p <= Math.min(3, total); p++) {
    selectedPageNums.add(p);
  }

  for (const tp of topPages) {
    for (let offset = -2; offset <= 2; offset++) {
      const targetPage = tp.pageNum + offset;
      if (targetPage >= 1 && targetPage <= total) {
        selectedPageNums.add(targetPage);
      }
    }
  }

  // Fallback: If no pages scored, take first 5 pages
  if (selectedPageNums.size === 0) {
    for (let p = 1; p <= Math.min(5, total); p++) {
      selectedPageNums.add(p);
    }
  }

  // Sort selected page numbers ascending
  const sortedPageNums = Array.from(selectedPageNums).sort((a, b) => a - b);

  // Map page numbers to text
  const pageMap = new Map<number, string>();
  for (const rp of rawPages) {
    const num = rp.num || 1;
    pageMap.set(num, rp.text);
  }

  // Within the token budget: cap combined characters to token budget (65,000 chars)
  const MAX_CHARS = 65000;
  let charCount = 0;
  const finalPages: Array<{ pageNum: number; text: string }> = [];
  const pageChunks: string[] = [];

  for (const pageNum of sortedPageNums) {
    const pText = pageMap.get(pageNum) || '';
    const banner = `=== [PAGE ${pageNum}] ===\n${pText}`;
    if (charCount + banner.length > MAX_CHARS && finalPages.length >= 3) {
      break;
    }
    finalPages.push({ pageNum, text: pText });
    pageChunks.push(banner);
    charCount += banner.length;
  }

  const pagesSent = finalPages.map(p => p.pageNum);

  // Log the page numbers sent
  console.log(`[PAGE_FINDER] Selected ${pagesSent.length} pages within budget (${charCount} chars): [${pagesSent.join(', ')}]`);

  const combinedText = pageChunks.join('\n\n');

  return {
    combinedText,
    selectedPages: finalPages,
    pagesSent,
    totalPages: total,
    allPagesText: fullText
  };
}
