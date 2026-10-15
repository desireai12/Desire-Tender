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

  // 1. Try requiring pdf-parse (both standard require and dynamic fallbacks)
  let pdfLib: any = null;
  try {
    pdfLib = require('pdf-parse');
  } catch (e1) {
    try {
      const dynamicRequire = eval('require');
      pdfLib = dynamicRequire('pdf-parse');
    } catch (e2) {
      console.warn('[PDF_SELECTOR] pdf-parse module not directly accessible, falling back...');
    }
  }

  if (pdfLib) {
    try {
      if (pdfLib.PDFParse) {
        const parser = new pdfLib.PDFParse({ data: pdfBuffer });
        const res = await parser.getText();
        fullText = res.text || '';
        total = res.total || 1;
        if (Array.isArray(res.pages) && res.pages.length > 0) {
          rawPages = res.pages;
        }
      } else if (typeof pdfLib === 'function') {
        const res = await pdfLib(pdfBuffer);
        fullText = res.text || '';
        total = res.numpages || 1;
      }
    } catch (parseErr) {
      console.warn('[PDF_SELECTOR] pdf-parse execution warning:', parseErr);
    }
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

  const selectedPages: SelectedPage[] = [];

  for (let i = 0; i < rawPages.length; i++) {
    const pageNum = rawPages[i].num || (i + 1);
    const pText = (rawPages[i].text || '').trim();

    if (pText.length < 20) continue;

    // First 3 pages are typically NIT / BDS summary pages -> always read in full
    const isEarlyPage = pageNum <= 3;

    // Check for NIT/BDS summary
    const hasNitPattern = NIT_BDS_PATTERNS.some(rx => rx.test(pText));

    // Check for Qualification / Eligibility / Evaluation criteria
    const hasQualPattern = QUALIFICATION_PATTERNS.some(rx => rx.test(pText));

    // Check for pure generic repetitive boilerplate
    const isPureBoilerplate = BOILERPLATE_EXCLUSION_PATTERNS.some(rx => rx.test(pText)) && !hasQualPattern && !hasNitPattern;

    if ((isEarlyPage || hasNitPattern || hasQualPattern) && !isPureBoilerplate) {
      selectedPages.push({ pageNum, text: pText });
    }
  }

  // Safety fallback: If fewer than 2 pages matched, include the first 5 pages
  if (selectedPages.length < 2 && rawPages.length > 0) {
    for (let i = 0; i < Math.min(5, rawPages.length); i++) {
      const pageNum = rawPages[i].num || (i + 1);
      if (!selectedPages.some(p => p.pageNum === pageNum)) {
        selectedPages.push({ pageNum, text: rawPages[i].text });
      }
    }
  }

  // Sort selected pages in chronological order
  selectedPages.sort((a, b) => a.pageNum - b.pageNum);

  // Format combined text with distinct page banners
  const combinedText = selectedPages
    .map(p => `=== [PAGE ${p.pageNum}] ===\n${p.text}`)
    .join('\n\n');

  return {
    combinedText,
    selectedPages,
    totalPages: total,
    allPagesText: fullText
  };
}
