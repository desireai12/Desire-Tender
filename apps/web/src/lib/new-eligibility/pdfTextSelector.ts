// ─── FOCUSED PDF TEXT SELECTOR & QUOTE VERIFIER ────────────────────────────

export interface SelectedPage {
  pageNum: number;
  text: string;
}

export interface TextSelectionResult {
  combinedText: string;
  selectedPages: SelectedPage[];
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
      const uint8Array = new Uint8Array(pdfBuffer.buffer, pdfBuffer.byteOffset, pdfBuffer.byteLength);
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

  // 3. If still empty, fallback to zero-dependency stream text parser
  if (!fullText || fullText.trim().length === 0) {
    try {
      const zlib = require('zlib');
      const str = pdfBuffer.toString('latin1');
      let pureText = '';
      const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
      let match;
      const chunks: string[] = [];
      let cur = '';
      while ((match = streamRegex.exec(str)) !== null) {
        let decompressed = '';
        try {
          decompressed = zlib.inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1');
        } catch {
          decompressed = match[1];
        }
        const textMatches = decompressed.match(/\(([^)]+)\)\s*Tj/g) || [];
        for (const m of textMatches) cur += m.replace(/^\(/, '').replace(/\)\s*Tj$/, '') + ' ';
        const arrayMatches = decompressed.match(/\[([^\]]+)\]\s*TJ/g) || [];
        for (const m of arrayMatches) {
          const parts = m.match(/\(([^)]+)\)/g) || [];
          for (const p of parts) cur += p.slice(1, -1) + ' ';
        }
        if (cur.length > 800) {
          chunks.push(cur.trim());
          pureText += cur + '\n';
          cur = '';
        }
      }
      if (cur.trim()) {
        chunks.push(cur.trim());
        pureText += cur;
      }
      if (pureText.trim().length > 20) {
        fullText = pureText.trim();
        rawPages = chunks.map((c, idx) => ({ text: c, num: idx + 1 }));
        total = chunks.length;
      }
    } catch (zlibErr) {
      console.warn('[PDF_SELECTOR] zlib stream extraction error:', zlibErr);
    }
  }

  // 4. Last fallback: readable ASCII/UTF-8 extraction
  if (!fullText || fullText.trim().length === 0) {
    const rawStr = pdfBuffer.toString('utf-8');
    const printable = rawStr.replace(/[^\x20-\x7E\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim();
    if (printable.length >= 50) {
      fullText = printable;
      rawPages = [{ text: printable, num: 1 }];
    }
  }

  const scoredPages: Array<{ pageNum: number; text: string; score: number }> = [];

  const HIGH_VALUE_KEYWORDS = [
    /\bturnover\b/i,
    /\bnet\s*worth\b/i,
    /\bsolvency\b/i,
    /\bbid\s*capacity\b/i,
    /\bsimilar\s*work\b/i,
    /\btechnical\s*criteria\b/i,
    /\bfinancial\s*criteria\b/i,
    /\bqualification\s*criteria\b/i,
    /\beligibility\s*criteria\b/i,
    /\bcontractor\s*registration\b/i,
    /\bclass\s*aa\b/i,
    /\bblacklisting\b/i,
    /\bjoint\s*venture\b/i,
    /\bcrore[s]?\b/i
  ];

  for (let i = 0; i < rawPages.length; i++) {
    const pageNum = rawPages[i].num || (i + 1);
    const pText = (rawPages[i].text || '').trim();

    if (pText.length < 20) continue;

    // Check for Qualification / Eligibility / Evaluation criteria
    const hasQualPattern = QUALIFICATION_PATTERNS.some(rx => rx.test(pText));
    const matchingKeywords = HIGH_VALUE_KEYWORDS.filter(kw => kw.test(pText));
    const isPureBoilerplate = BOILERPLATE_EXCLUSION_PATTERNS.some(rx => rx.test(pText)) && !hasQualPattern;

    if (isPureBoilerplate) continue;

    // Send only pages belonging to the qualification section
    if (hasQualPattern || matchingKeywords.length >= 2) {
      let score = 30;
      if (hasQualPattern) score += 40;
      score += matchingKeywords.length * 10;
      scoredPages.push({ pageNum, text: pText, score });
    }
  }

  // Fallback: If no qualification pages matched with strict filter, search for single keyword matches
  if (scoredPages.length === 0 && rawPages.length > 0) {
    for (let i = 0; i < rawPages.length; i++) {
      const pageNum = rawPages[i].num || (i + 1);
      const pText = (rawPages[i].text || '').trim();
      const hasAnyKw = HIGH_VALUE_KEYWORDS.some(kw => kw.test(pText));
      if (hasAnyKw) {
        scoredPages.push({ pageNum, text: pText, score: 10 });
      }
    }
  }

  // Budget cap: Cap to top 20 most relevant pages to avoid token / quota limits on large tender documents
  let finalPages: Array<{ pageNum: number; text: string }> = [];
  if (scoredPages.length > 20) {
    const earlyPages = scoredPages.filter(p => p.pageNum <= 3);
    const otherPages = scoredPages.filter(p => p.pageNum > 3);
    otherPages.sort((a, b) => b.score - a.score);
    const topOthers = otherPages.slice(0, 20 - earlyPages.length);
    finalPages = [...earlyPages, ...topOthers];
  } else {
    finalPages = scoredPages;
  }

  // Sort selected pages in chronological order
  finalPages.sort((a, b) => a.pageNum - b.pageNum);

  // Format combined text with distinct page banners, capped at 30,000 chars (~7,500 tokens)
  let charCount = 0;
  const pageChunks: string[] = [];
  for (const p of finalPages) {
    const banner = `=== [PAGE ${p.pageNum}] ===\n${p.text}`;
    if (charCount + banner.length > 30000 && pageChunks.length >= 2) {
      break;
    }
    pageChunks.push(banner);
    charCount += banner.length;
  }

  const combinedText = pageChunks.join('\n\n');

  return {
    combinedText,
    selectedPages: finalPages.map(p => ({ pageNum: p.pageNum, text: p.text })),
    totalPages: total,
    allPagesText: fullText
  };
}
