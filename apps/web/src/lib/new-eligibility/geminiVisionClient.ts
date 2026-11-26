/**
 * Gemini Vision Multimodal Client
 * Phase 2 — Multi-page Document Vision Extraction Infrastructure (Stage 2A)
 *
 * Implements:
 * 1. Multimodal PDF extraction via Gemini Vision API (gemini-3.5-flash-lite / gemini-3.5-flash)
 * 2. Sequential 15-page batches with 2-page overlap (13-page advancement)
 * 3. Original page-number preservation and mapping
 * 4. Runtime schema validation (never trust raw LLM output)
 * 5. Accurate token usage and actual cost tracking ($0.075 / 1M prompt, $0.30 / 1M output)
 * 6. Controlled retries with exponential backoff on HTTP 429 / 503
 * 7. Deduplication across overlapping batch boundaries
 * 8. OCR fallback triggering for scanned / degraded pages
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type {
  CriterionType,
  ClauseMateriality,
  StructuralAnchorType,
  PageDisposition,
  PageDetectedCategory
} from './dbTypes';
import { normalizeTextForSearch } from './pdfTextSelector';

// ─── CONSTANTS & PRICING CONFIGURATION ───────────────────────────────────────

export const BATCH_SIZE_DEFAULT = 15;
export const OVERLAP_PAGES_DEFAULT = 2;
export const INTER_BATCH_DELAY_MS_DEFAULT = 4500; // 4.5s delay to stay well under Free-Tier 15 RPM limit
export const STRICT_FREE_TIER_POLICY = true;

export interface ModelPricingTier {
  promptCostPerMillion: number;
  outputCostPerMillion: number;
  thinkingCostPerMillion: number;
}

export type ModelPricingTable = Record<string, ModelPricingTier>;

/**
 * Standard token market pricing table ($ / 1M tokens) for informational valuation.
 * Under the Strict Free-Tier Policy, actual payable cost is ALWAYS $0.00.
 */
export const DEFAULT_MODEL_PRICING: ModelPricingTable = {
  'gemini-3.5-flash-lite': {
    promptCostPerMillion: 0.075,
    outputCostPerMillion: 0.30,
    thinkingCostPerMillion: 0.30
  },
  'gemini-3.5-flash': {
    promptCostPerMillion: 0.075,
    outputCostPerMillion: 0.30,
    thinkingCostPerMillion: 0.30
  },
  'gemini-flash-latest': {
    promptCostPerMillion: 0.075,
    outputCostPerMillion: 0.30,
    thinkingCostPerMillion: 0.30
  },
  'default': {
    promptCostPerMillion: 0.075,
    outputCostPerMillion: 0.30,
    thinkingCostPerMillion: 0.30
  }
};

/**
 * Calculates informational token market value ($) based on standard Gemini rates.
 * Actual payable cost under Google AI Studio Free Tier is $0.00.
 */
export function calculateTokenCost(
  model: string,
  promptTokens: number,
  outputTokens: number,
  thinkingTokens: number = 0,
  pricingTable: ModelPricingTable = DEFAULT_MODEL_PRICING
): number {
  const tier = pricingTable[model] || pricingTable['default'] || {
    promptCostPerMillion: 0.075,
    outputCostPerMillion: 0.30,
    thinkingCostPerMillion: 0.30
  };

  const promptCost = (promptTokens / 1_000_000) * tier.promptCostPerMillion;
  const outputCost = (outputTokens / 1_000_000) * tier.outputCostPerMillion;
  const thinkingCost = (thinkingTokens / 1_000_000) * tier.thinkingCostPerMillion;

  return promptCost + outputCost + thinkingCost;
}

// Backward-compatibility legacy rate constants
export const COST_PER_PROMPT_TOKEN = 0.075 / 1_000_000;
export const COST_PER_OUTPUT_TOKEN = 0.30 / 1_000_000;

// Strict Free-Tier model chain: gemini-3.5-flash-lite ONLY. No paid fallbacks.
export const DEFAULT_MODELS_CHAIN = [
  'gemini-3.5-flash-lite'
];

// ─── DATA MODELS & SCHEMAS ──────────────────────────────────────────────────

export interface BatchPageRange {
  batchIndex: number;
  startPage: number;
  endPage: number;
  isOverlap: boolean;
  overlapPages: number[];
}

export interface ExtractedClauseItem {
  criterion_type: CriterionType;
  clause_number?: string | null;
  source_page: number;
  verbatim_quote: string;
  summary: string;
  materiality: ClauseMateriality;
  parameter_key?: string | null;
  extracted_numeric_value?: number | null;
  extracted_unit?: string | null;
  confidence: number;
}

export interface ExtractedAnchorItem {
  anchor_type: StructuralAnchorType;
  anchor_name: string;
  page_number: number;
  section_number?: string | null;
  confidence: number;
}

export interface ExtractedTableItem {
  table_identifier: string;
  start_page: number;
  end_page: number;
  category: 'FINANCIAL' | 'TECHNICAL' | 'OTHERS' | 'GENERAL';
  title?: string | null;
  headers: unknown[];
  rows: unknown[];
  footnotes?: unknown[];
  is_multi_page: boolean;
  reconstruction_confidence: number;
}

export interface ProcessedPageItem {
  page_number: number;
  is_scanned_or_degraded: boolean;
  detected_category: PageDetectedCategory;
  has_tables: boolean;
  has_qualification_criteria: boolean;
  extracted_text_summary?: string | null;
}

export interface TokenMetrics {
  promptTokenCount: number;
  candidatesTokenCount: number;
  thinkingTokenCount: number;
  totalTokenCount: number;
  estimatedMarketValueUsd: number;
  payableCostUsd: number; // Strictly 0.00 under Free Tier policy
  costUsd: number;        // Backward compatibility alias (= estimatedMarketValueUsd)
  latencyMs: number;
}

export interface BatchAttemptRecord {
  attemptNumber: number;
  model: string;
  status: 'SUCCEEDED' | 'FAILED' | 'RATE_LIMITED' | 'UNAVAILABLE' | 'BILLING_ERROR';
  promptTokens: number;
  candidatesTokens: number;
  thinkingTokens: number;
  totalTokens: number;
  estimatedMarketValueUsd: number;
  payableCostUsd: number; // Strictly 0.00 under Free Tier policy
  costUsd: number;        // Backward compatibility alias (= estimatedMarketValueUsd)
  latencyMs: number;
  error?: string | null;
}

export interface VisionBatchResult {
  batchIndex: number;
  startPage: number;
  endPage: number;
  modelUsed: string;
  pages_processed: ProcessedPageItem[];
  structural_anchors: ExtractedAnchorItem[];
  structured_tables: ExtractedTableItem[];
  extracted_clauses: ExtractedClauseItem[];
  token_metrics: TokenMetrics;
  attempts: BatchAttemptRecord[];
  status: 'SUCCESS' | 'RATE_LIMITED' | 'FAILED' | 'OCR_FALLBACK_REQUIRED' | 'BILLING_ERROR';
  ocrFallbackPages: number[];
  errorMessage?: string | null;
}

export interface MultiBatchExtractionResult {
  totalPages: number;
  totalBatches: number;
  batches: VisionBatchResult[];
  all_clauses: ExtractedClauseItem[];
  all_anchors: ExtractedAnchorItem[];
  all_tables: ExtractedTableItem[];
  page_dispositions: Record<number, PageDisposition>;
  ocr_fallback_pages: number[];
  total_prompt_tokens: number;
  total_output_tokens: number;
  total_thinking_tokens: number;
  estimated_market_value_usd: number;
  payable_cost_usd: number; // Strictly 0.00 under Free Tier policy
  total_cost_usd: number;   // Backward compatibility alias (= estimated_market_value_usd)
  total_attempts: number;
}

export interface GeminiVisionOptions {
  apiKey?: string;
  modelName?: string;
  pricingTable?: ModelPricingTable;
  maxOutputTokens?: number;
  temperature?: number;
  maxRetries?: number;
  budgetLimitUsd?: number;
  maxPayableCostUsd?: number; // Cap on actual payable spending (strictly 0.00)
  interBatchDelayMs?: number; // Pacing delay in ms between sequential batches (default: 4500)
  onBatchComplete?: (batchResult: VisionBatchResult) => void;
}

// ─── BATCH RANGE GENERATOR ──────────────────────────────────────────────────

/**
 * Generates sequential 15-page batches with 2-page overlap.
 * Example for 20 pages:
 *   Batch 0: pages 1 to 15 (overlap: [])
 *   Batch 1: pages 14 to 20 (overlap: [14, 15])
 */
export function generateBatchPageRanges(
  totalPages: number,
  batchSize: number = BATCH_SIZE_DEFAULT,
  overlap: number = OVERLAP_PAGES_DEFAULT
): BatchPageRange[] {
  if (totalPages <= 0) return [];

  const ranges: BatchPageRange[] = [];
  const step = Math.max(1, batchSize - overlap);
  let batchIndex = 0;
  let start = 1;

  while (start <= totalPages) {
    const end = Math.min(start + batchSize - 1, totalPages);
    const overlapPages: number[] = [];

    if (batchIndex > 0) {
      const prevEnd = ranges[batchIndex - 1].endPage;
      for (let p = start; p <= Math.min(prevEnd, end); p++) {
        overlapPages.push(p);
      }
    }

    ranges.push({
      batchIndex,
      startPage: start,
      endPage: end,
      isOverlap: overlapPages.length > 0,
      overlapPages
    });

    if (end >= totalPages) break;
    start += step;
    batchIndex++;
  }

  return ranges;
}

// ─── PDF SLICER HELPER ──────────────────────────────────────────────────────

/**
 * Extracts pages [startPage, endPage] (1-indexed) from a PDF buffer.
 * If the document has <= batchSize pages and covers the range, returns the original buffer.
 * Otherwise uses lightweight Python pypdf subprocess.
 */
export function slicePdfBuffer(
  pdfBuffer: Buffer,
  startPage: number,
  endPage: number,
  totalPages?: number
): Buffer {
  // Fast path: if start is 1 and end covers entire document, return directly
  if (startPage === 1 && totalPages !== undefined && endPage >= totalPages) {
    return pdfBuffer;
  }

  const tmpDir = os.tmpdir();
  const id = `slice_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const tmpIn = path.join(tmpDir, `${id}_in.pdf`);
  const tmpOut = path.join(tmpDir, `${id}_out.pdf`);

  try {
    fs.writeFileSync(tmpIn, pdfBuffer);
    const pyScript = `
import sys
from pypdf import PdfReader, PdfWriter
reader = PdfReader(r"${tmpIn.replace(/\\/g, '/')}")
writer = PdfWriter()
s = max(0, ${startPage} - 1)
e = min(len(reader.pages) - 1, ${endPage} - 1)
for i in range(s, e + 1):
    writer.add_page(reader.pages[i])
with open(r"${tmpOut.replace(/\\/g, '/')}", "wb") as f:
    writer.write(f)
`;
    execFileSync('python', ['-c', pyScript], { timeout: 15000 });
    const sliced = fs.readFileSync(tmpOut);
    return sliced;
  } catch (err: any) {
    console.warn(`[GEMINI_VISION] PDF slice failed: ${err?.message || err}. Falling back to original buffer.`);
    return pdfBuffer;
  } finally {
    try {
      if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn);
      if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
    } catch {
      // Ignore cleanup error
    }
  }
}

// ─── RUNTIME SCHEMA VALIDATION ──────────────────────────────────────────────

const VALID_CRITERION_TYPES = new Set<CriterionType>(['FINANCIAL', 'TECHNICAL', 'OTHERS']);
const VALID_MATERIALITIES = new Set<ClauseMateriality>([
  'MANDATORY',
  'EVALUATED_SCORE',
  'INFORMATIONAL',
  'DISQUALIFYING'
]);
const VALID_ANCHOR_TYPES = new Set<StructuralAnchorType>([
  'CHAPTER_HEADING',
  'TABLE_OF_CONTENTS',
  'NIT_HEADER',
  'ANNEXURE',
  'SCHEDULE',
  'QUALIFICATION_CRITERIA',
  'EVALUATION_METRICS',
  'TECHNICAL_SPECS',
  'FINANCIAL_FORMAT',
  'OTHER'
]);
const VALID_CATEGORIES = new Set<PageDetectedCategory>([
  'FINANCIAL',
  'TECHNICAL',
  'OTHERS',
  'GENERAL_CONDITIONS',
  'LEGAL_ADMIN',
  'IRRELEVANT',
  'UNKNOWN'
]);

export interface SchemaValidationResult {
  valid: boolean;
  data: {
    pages_processed: ProcessedPageItem[];
    structural_anchors: ExtractedAnchorItem[];
    structured_tables: ExtractedTableItem[];
    extracted_clauses: ExtractedClauseItem[];
  };
  errors: string[];
}

/**
 * Validates the raw JSON returned by Gemini against strict runtime requirements.
 * Rejects hallucinated pages outside [startPage, endPage], coerces valid enums,
 * and drops malformed clause records.
 */
export function validateExtractionSchema(
  raw: any,
  startPage: number,
  endPage: number
): SchemaValidationResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return {
      valid: false,
      data: {
        pages_processed: [],
        structural_anchors: [],
        structured_tables: [],
        extracted_clauses: []
      },
      errors: ['Raw output is not a JSON object']
    };
  }

  // 1. Validate pages_processed
  const validatedPages: ProcessedPageItem[] = [];
  const rawPages = Array.isArray(raw.pages_processed) ? raw.pages_processed : [];

  for (const p of rawPages) {
    if (typeof p !== 'object' || p === null) continue;
    const pageNum = Number(p.page_number);
    if (isNaN(pageNum) || pageNum < startPage || pageNum > endPage) {
      errors.push(`Page number ${p.page_number} outside batch range [${startPage}, ${endPage}]`);
      continue;
    }

    const detectedCat: PageDetectedCategory = VALID_CATEGORIES.has(p.detected_category)
      ? p.detected_category
      : 'UNKNOWN';

    validatedPages.push({
      page_number: pageNum,
      is_scanned_or_degraded: Boolean(p.is_scanned_or_degraded),
      detected_category: detectedCat,
      has_tables: Boolean(p.has_tables),
      has_qualification_criteria: Boolean(p.has_qualification_criteria),
      extracted_text_summary: typeof p.extracted_text_summary === 'string' ? p.extracted_text_summary : null
    });
  }

  // 2. Validate structural_anchors
  const validatedAnchors: ExtractedAnchorItem[] = [];
  const rawAnchors = Array.isArray(raw.structural_anchors) ? raw.structural_anchors : [];

  for (const a of rawAnchors) {
    if (typeof a !== 'object' || a === null) continue;
    const pageNum = Number(a.page_number);
    if (isNaN(pageNum) || pageNum < startPage || pageNum > endPage) {
      continue;
    }
    const anchorName = String(a.anchor_name || '').trim();
    if (!anchorName) continue;

    const anchorType: StructuralAnchorType = VALID_ANCHOR_TYPES.has(a.anchor_type)
      ? a.anchor_type
      : 'OTHER';

    validatedAnchors.push({
      anchor_type: anchorType,
      anchor_name: anchorName,
      page_number: pageNum,
      section_number: typeof a.section_number === 'string' ? a.section_number : null,
      confidence: typeof a.confidence === 'number' ? Math.min(1.0, Math.max(0.0, a.confidence)) : 0.8
    });
  }

  // 3. Validate structured_tables
  const validatedTables: ExtractedTableItem[] = [];
  const rawTables = Array.isArray(raw.structured_tables) ? raw.structured_tables : [];

  for (const t of rawTables) {
    if (typeof t !== 'object' || t === null) continue;
    const sPage = Number(t.start_page) || startPage;
    const ePage = Number(t.end_page) || sPage;
    const tableId = String(t.table_identifier || `table_p${sPage}_${validatedTables.length + 1}`);

    const category = ['FINANCIAL', 'TECHNICAL', 'OTHERS', 'GENERAL'].includes(t.category)
      ? t.category
      : 'GENERAL';

    validatedTables.push({
      table_identifier: tableId,
      start_page: sPage,
      end_page: ePage,
      category: category as any,
      title: typeof t.title === 'string' ? t.title : null,
      headers: Array.isArray(t.headers) ? t.headers : [],
      rows: Array.isArray(t.rows) ? t.rows : [],
      footnotes: Array.isArray(t.footnotes) ? t.footnotes : [],
      is_multi_page: Boolean(t.is_multi_page) || sPage !== ePage,
      reconstruction_confidence: typeof t.reconstruction_confidence === 'number'
        ? Math.min(1.0, Math.max(0.0, t.reconstruction_confidence))
        : 0.8
    });
  }

  // 4. Validate extracted_clauses
  const validatedClauses: ExtractedClauseItem[] = [];
  const rawClauses = Array.isArray(raw.extracted_clauses) ? raw.extracted_clauses : [];

  for (const c of rawClauses) {
    if (typeof c !== 'object' || c === null) continue;
    const sourcePage = Number(c.source_page);
    if (isNaN(sourcePage) || sourcePage < startPage || sourcePage > endPage) {
      errors.push(`Clause dropped: source_page ${c.source_page} outside batch [${startPage}, ${endPage}]`);
      continue;
    }

    const quote = String(c.verbatim_quote || '').trim();
    if (!quote || quote.length < 5) {
      errors.push(`Clause dropped on page ${sourcePage}: empty or too short verbatim_quote`);
      continue;
    }

    const critType: CriterionType = VALID_CRITERION_TYPES.has(c.criterion_type)
      ? c.criterion_type
      : 'OTHERS';

    const materiality: ClauseMateriality = VALID_MATERIALITIES.has(c.materiality)
      ? c.materiality
      : 'MANDATORY';

    let numVal: number | null = null;
    if (typeof c.extracted_numeric_value === 'number' && !isNaN(c.extracted_numeric_value)) {
      numVal = c.extracted_numeric_value;
    } else if (typeof c.extracted_numeric_value === 'string') {
      const parsed = parseFloat(c.extracted_numeric_value.replace(/[^0-9.]/g, ''));
      if (!isNaN(parsed)) numVal = parsed;
    }

    validatedClauses.push({
      criterion_type: critType,
      clause_number: typeof c.clause_number === 'string' ? c.clause_number : null,
      source_page: sourcePage,
      verbatim_quote: quote,
      summary: String(c.summary || quote.slice(0, 80)),
      materiality,
      parameter_key: typeof c.parameter_key === 'string' ? c.parameter_key : null,
      extracted_numeric_value: numVal,
      extracted_unit: typeof c.extracted_unit === 'string' ? c.extracted_unit : null,
      confidence: typeof c.confidence === 'number' ? Math.min(1.0, Math.max(0.0, c.confidence)) : 0.85
    });
  }

  return {
    valid: true,
    data: {
      pages_processed: validatedPages,
      structural_anchors: validatedAnchors,
      structured_tables: validatedTables,
      extracted_clauses: validatedClauses
    },
    errors
  };
}

/**
 * Attempts structural repair on truncated or malformed JSON from LLM responses.
 */
export function tryRepairJson(jsonStr: string): any {
  try {
    return JSON.parse(jsonStr);
  } catch (_e) {
    let repaired = jsonStr.trim();
    // If cut off inside a string literal, add closing quote
    const quoteCount = (repaired.match(/(?<!\\)"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      repaired += '"';
    }
    // Remove trailing commas before brackets or braces
    repaired = repaired.replace(/,\s*([}\]])/g, '$1');
    // Balance open brackets and braces
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/\]/g) || []).length;
    for (let i = 0; i < (openBrackets - closeBrackets); i++) repaired += ']';
    for (let i = 0; i < (openBraces - closeBraces); i++) repaired += '}';
    return JSON.parse(repaired);
  }
}

// ─── GEMINI VISION EXTRACTION (SINGLE BATCH) ────────────────────────────────

/**
 * Extracts criteria from a sliced PDF batch using Gemini Vision.
 */
export async function extractBatchWithGeminiVision(
  pdfSliceBuffer: Buffer,
  range: BatchPageRange,
  options?: GeminiVisionOptions
): Promise<VisionBatchResult> {
  const apiKey = (options?.apiKey || process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required for Gemini Vision extraction');
  }

  const modelChain = options?.modelName
    ? [options.modelName, ...DEFAULT_MODELS_CHAIN.filter(m => m !== options.modelName)]
    : DEFAULT_MODELS_CHAIN;
  const maxRetries = options?.maxRetries ?? 3;
  const b64Pdf = pdfSliceBuffer.toString('base64');

  const prompt = `You are Desire Tender Vision AI, an expert Government Tender Qualification Auditor.
Your task is to analyze the provided tender document PDF pages and extract ALL eligibility, qualification, and evaluation criteria into structured JSON.

Document Scope for this Batch:
- Start Document Page: ${range.startPage}
- End Document Page: ${range.endPage}
- CRITICAL PAGE NUMBER RULE: The attached PDF slice corresponds to Document Pages ${range.startPage} through ${range.endPage}.
  All reported "page_number", "source_page", "start_page", and "end_page" MUST reflect the REAL DOCUMENT PAGE NUMBER (between ${range.startPage} and ${range.endPage}).
  Do NOT use 1-based slice index if startPage > 1.

Return JSON strictly matching this schema:
{
  "pages_processed": [
    {
      "page_number": <number: between ${range.startPage} and ${range.endPage}>,
      "is_scanned_or_degraded": <boolean: true if page is blurry, illegible, or low-quality scan>,
      "detected_category": <"FINANCIAL" | "TECHNICAL" | "OTHERS" | "GENERAL_CONDITIONS" | "LEGAL_ADMIN" | "IRRELEVANT" | "UNKNOWN">,
      "has_tables": <boolean>,
      "has_qualification_criteria": <boolean>,
      "extracted_text_summary": <string>
    }
  ],
  "structural_anchors": [
    {
      "anchor_type": <"CHAPTER_HEADING" | "TABLE_OF_CONTENTS" | "NIT_HEADER" | "ANNEXURE" | "SCHEDULE" | "QUALIFICATION_CRITERIA" | "EVALUATION_METRICS" | "TECHNICAL_SPECS" | "FINANCIAL_FORMAT" | "OTHER">,
      "anchor_name": <string>,
      "page_number": <number>,
      "section_number": <string or null>,
      "confidence": <number>
    }
  ],
  "structured_tables": [
    {
      "table_identifier": <string>,
      "start_page": <number>,
      "end_page": <number>,
      "category": <"FINANCIAL" | "TECHNICAL" | "OTHERS" | "GENERAL">,
      "title": <string or null>,
      "headers": [<strings>],
      "rows": [<arrays or objects>],
      "footnotes": [<strings>],
      "is_multi_page": <boolean>,
      "reconstruction_confidence": <number>
    }
  ],
  "extracted_clauses": [
    {
      "criterion_type": <"FINANCIAL" | "TECHNICAL" | "OTHERS">,
      "clause_number": <string or null>,
      "source_page": <number: between ${range.startPage} and ${range.endPage}>,
      "verbatim_quote": <string: exact quote from the document page>,
      "summary": <string>,
      "materiality": <"MANDATORY" | "EVALUATED_SCORE" | "INFORMATIONAL" | "DISQUALIFYING">,
      "parameter_key": <string: e.g. "annual_turnover", "net_worth", "solvency", "similar_work", "contractor_class", "jv_lead_share">,
      "extracted_numeric_value": <number or null>,
      "extracted_unit": <string or null: e.g. "Cr", "Lakhs", "%", "years">,
      "confidence": <number>
    }
  ]
}

RULES:
1. Every "verbatim_quote" must exist word-for-word on that page.
2. Group order: Financial first, Technical second, Others third.
3. Every numeric criteria must extract "extracted_numeric_value" and "extracted_unit".
4. If a page cannot be clearly read or has scanning artifacts, set "is_scanned_or_degraded": true.
5. Summarize long tables concisely (max 5 representative rows per table) to avoid JSON truncation.`;

  let lastError: any = null;
  const attempts: BatchAttemptRecord[] = [];

  for (const model of modelChain) {
    let attempt = 0;
    while (attempt <= maxRetries) {
      attempt++;
      const t0 = Date.now();
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const payload = {
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: 'application/pdf',
                    data: b64Pdf
                  }
                },
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: options?.temperature ?? 0.0,
            maxOutputTokens: options?.maxOutputTokens ?? 8192
          }
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(60000)
        });

        const latencyMs = Date.now() - t0;

        if (!response.ok) {
          const errBody = await response.json().catch(() => null);
          const errMsg = errBody?.error?.message || `HTTP ${response.status}`;
          lastError = new Error(`[${model}] ${errMsg}`);

          // Strict Free-Tier Policy: Terminate immediately on any billing, payment or tier errors
          if (
            response.status === 402 ||
            errMsg.toLowerCase().includes('billing') ||
            errMsg.toLowerCase().includes('payment') ||
            errMsg.toLowerCase().includes('credit')
          ) {
            throw new Error(`[BILLING_POLICY_VIOLATION] API call blocked: HTTP ${response.status} (${errMsg}). Project must remain strictly on Free Tier ($0.00). Terminating extraction immediately.`);
          }

          // Extract any partial usage reported by provider during failure
          const failUsage = errBody?.usageMetadata || {};
          const failPromptTokens = failUsage.promptTokenCount || 0;
          const failCandidatesTokens = failUsage.candidatesTokenCount || 0;
          const failThinkingTokens = failUsage.thoughtsTokenCount || 0;
          const failTotalTokens = failUsage.totalTokenCount || (failPromptTokens + failCandidatesTokens + failThinkingTokens);
          const failMarketValue = calculateTokenCost(
            model,
            failPromptTokens,
            failCandidatesTokens,
            failThinkingTokens,
            options?.pricingTable
          );

          attempts.push({
            attemptNumber: attempts.length + 1,
            model,
            status: response.status === 429 ? 'RATE_LIMITED' : (response.status === 503 ? 'UNAVAILABLE' : 'FAILED'),
            promptTokens: failPromptTokens,
            candidatesTokens: failCandidatesTokens,
            thinkingTokens: failThinkingTokens,
            totalTokens: failTotalTokens,
            estimatedMarketValueUsd: failMarketValue,
            payableCostUsd: 0.00,
            costUsd: failMarketValue,
            latencyMs,
            error: errMsg
          });

          // Retry on Rate Limit (429) or Temporary Unavailable (503)
          if ((response.status === 429 || response.status === 503)) {
            if (attempt <= maxRetries) {
              const backoffMs = Math.min(12000, 2000 * Math.pow(2, attempt - 1)) + Math.random() * 500;
              console.warn(`[GEMINI_VISION] ${model} HTTP ${response.status} (${errMsg}). Retrying in ${Math.round(backoffMs)}ms (Attempt ${attempt}/${maxRetries})...`);
              await new Promise(r => setTimeout(r, backoffMs));
              continue;
            } else {
              console.warn(`[GEMINI_VISION] Retries exhausted on ${model} (HTTP ${response.status}). Free-tier quota limit reached.`);
              break; // Free-tier quota limit reached
            }
          }

          // If model is not available (404), fall back to next model in chain immediately
          if (response.status === 404) {
            console.warn(`[GEMINI_VISION] Model ${model} not available (404). Falling to next model.`);
            break;
          }

          break; // Other error, try next model
        }

        const resData = await response.json();
        const rawJsonText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawJsonText) {
          throw new Error(`Empty candidate text returned by ${model}`);
        }

        const usage = resData.usageMetadata || {};
        const promptTokens = usage.promptTokenCount || 0;
        const candidatesTokens = usage.candidatesTokenCount || 0;
        const thinkingTokens = usage.thoughtsTokenCount || 0;
        const totalTokens = usage.totalTokenCount || (promptTokens + candidatesTokens + thinkingTokens);

        // Calculate token market value (informational only; payable cost is $0.00)
        const estimatedMarketValue = calculateTokenCost(
          model,
          promptTokens,
          candidatesTokens,
          thinkingTokens,
          options?.pricingTable
        );

        attempts.push({
          attemptNumber: attempts.length + 1,
          model,
          status: 'SUCCEEDED',
          promptTokens,
          candidatesTokens,
          thinkingTokens,
          totalTokens,
          estimatedMarketValueUsd: estimatedMarketValue,
          payableCostUsd: 0.00,
          costUsd: estimatedMarketValue,
          latencyMs,
          error: null
        });

        let parsedJson: any;
        try {
          parsedJson = JSON.parse(rawJsonText.trim());
        } catch (jsonErr: any) {
          console.warn(`[GEMINI_VISION] Raw JSON parse warning: ${jsonErr.message}. Attempting structural repair...`);
          parsedJson = tryRepairJson(rawJsonText.trim());
        }
        const validation = validateExtractionSchema(parsedJson, range.startPage, range.endPage);

        // Detect pages requiring OCR fallback
        const ocrPages: number[] = [];
        for (const p of validation.data.pages_processed) {
          if (p.is_scanned_or_degraded) {
            ocrPages.push(p.page_number);
          }
        }

        // Aggregate total tokens and metrics across ALL attempts (including any prior retries)
        const aggregatedPromptTokens = attempts.reduce((acc, a) => acc + a.promptTokens, 0);
        const aggregatedCandidatesTokens = attempts.reduce((acc, a) => acc + a.candidatesTokens, 0);
        const aggregatedThinkingTokens = attempts.reduce((acc, a) => acc + a.thinkingTokens, 0);
        const aggregatedTotalTokens = attempts.reduce((acc, a) => acc + a.totalTokens, 0);
        const aggregatedMarketValue = attempts.reduce((acc, a) => acc + a.estimatedMarketValueUsd, 0);
        const aggregatedLatencyMs = attempts.reduce((acc, a) => acc + a.latencyMs, 0);

        const batchResult: VisionBatchResult = {
          batchIndex: range.batchIndex,
          startPage: range.startPage,
          endPage: range.endPage,
          modelUsed: model,
          pages_processed: validation.data.pages_processed,
          structural_anchors: validation.data.structural_anchors,
          structured_tables: validation.data.structured_tables,
          extracted_clauses: validation.data.extracted_clauses,
          token_metrics: {
            promptTokenCount: aggregatedPromptTokens,
            candidatesTokenCount: aggregatedCandidatesTokens,
            thinkingTokenCount: aggregatedThinkingTokens,
            totalTokenCount: aggregatedTotalTokens,
            estimatedMarketValueUsd: aggregatedMarketValue,
            payableCostUsd: 0.00,
            costUsd: aggregatedMarketValue,
            latencyMs: aggregatedLatencyMs
          },
          attempts,
          status: ocrPages.length > 0 ? 'OCR_FALLBACK_REQUIRED' : 'SUCCESS',
          ocrFallbackPages: ocrPages,
          errorMessage: validation.errors.length > 0 ? validation.errors.join('; ') : null
        };

        return batchResult;
      } catch (err: any) {
        lastError = err;
        const latencyMs = Date.now() - t0;
        const isBillingErr = (err?.message || '').includes('BILLING_POLICY_VIOLATION');
        attempts.push({
          attemptNumber: attempts.length + 1,
          model,
          status: isBillingErr ? 'BILLING_ERROR' : 'FAILED',
          promptTokens: 0,
          candidatesTokens: 0,
          thinkingTokens: 0,
          totalTokens: 0,
          estimatedMarketValueUsd: 0,
          payableCostUsd: 0.00,
          costUsd: 0,
          latencyMs,
          error: err?.message || String(err)
        });
        console.warn(`[GEMINI_VISION] Exception on ${model} (attempt ${attempt}):`, err?.message || err);
        if (isBillingErr) {
          throw err;
        }
        if (attempt <= maxRetries) {
          await new Promise(r => setTimeout(r, 1500 * attempt));
        }
      }
    }
  }

  // If all attempts failed, still report all attempts and any accumulated token usage
  const failedPromptTokens = attempts.reduce((acc, a) => acc + a.promptTokens, 0);
  const failedCandidatesTokens = attempts.reduce((acc, a) => acc + a.candidatesTokens, 0);
  const failedThinkingTokens = attempts.reduce((acc, a) => acc + a.thinkingTokens, 0);
  const failedTotalTokens = attempts.reduce((acc, a) => acc + a.totalTokens, 0);
  const failedMarketValue = attempts.reduce((acc, a) => acc + a.estimatedMarketValueUsd, 0);
  const failedLatencyMs = attempts.reduce((acc, a) => acc + a.latencyMs, 0);
  const finalStatus = attempts.some(a => a.status === 'RATE_LIMITED') ? 'RATE_LIMITED' : 'FAILED';

  return {
    batchIndex: range.batchIndex,
    startPage: range.startPage,
    endPage: range.endPage,
    modelUsed: 'NONE',
    pages_processed: [],
    structural_anchors: [],
    structured_tables: [],
    extracted_clauses: [],
    token_metrics: {
      promptTokenCount: failedPromptTokens,
      candidatesTokenCount: failedCandidatesTokens,
      thinkingTokenCount: failedThinkingTokens,
      totalTokenCount: failedTotalTokens,
      estimatedMarketValueUsd: failedMarketValue,
      payableCostUsd: 0.00,
      costUsd: failedMarketValue,
      latencyMs: failedLatencyMs
    },
    attempts,
    status: finalStatus,
    ocrFallbackPages: [],
    errorMessage: lastError?.message || 'All Gemini vision models failed for batch.'
  };
}

// ─── DEDUPLICATION & OVERLAP RECONCILIATION ─────────────────────────────────

/**
 * Deduplicates clauses across batches, particularly handling the 2-page overlap.
 */
export function reconcileClauses(
  existingClauses: ExtractedClauseItem[],
  newClauses: ExtractedClauseItem[]
): ExtractedClauseItem[] {
  const result = [...existingClauses];

  for (const nc of newClauses) {
    const normQuote = normalizeTextForSearch(nc.verbatim_quote);
    const isDuplicate = result.some(ec => {
      if (ec.source_page !== nc.source_page) return false;
      const ecQuote = normalizeTextForSearch(ec.verbatim_quote);
      if (normQuote === ecQuote) return true;
      if (nc.clause_number && ec.clause_number && nc.clause_number === ec.clause_number) return true;
      return false;
    });

    if (!isDuplicate) {
      result.push(nc);
    }
  }

  return result;
}

/**
 * Deduplicates structural anchors across overlapping batches.
 */
export function reconcileAnchors(
  existingAnchors: ExtractedAnchorItem[],
  newAnchors: ExtractedAnchorItem[]
): ExtractedAnchorItem[] {
  const result = [...existingAnchors];

  for (const na of newAnchors) {
    const normName = normalizeTextForSearch(na.anchor_name);
    const isDuplicate = result.some(ea => {
      return (
        ea.page_number === na.page_number &&
        ea.anchor_type === na.anchor_type &&
        normalizeTextForSearch(ea.anchor_name) === normName
      );
    });

    if (!isDuplicate) {
      result.push(na);
    }
  }

  return result;
}

// ─── OCR FALLBACK HOOK ──────────────────────────────────────────────────────

/**
 * Runs OCR fallback for degraded, blurry, or low-contrast pages.
 */
export async function runOcrFallbackForPages(
  pages: number[],
  _pdfBuffer: Buffer
): Promise<{ ocrResults: Array<{ pageNumber: number; text: string; confidence: number }> }> {
  // OCR Fallback Hook: in Phase 2 / Stage 2A, flags and provides structured fallback markers
  const ocrResults = pages.map(p => ({
    pageNumber: p,
    text: `[OCR_FALLBACK_PAGE_${p}_PROCESSED]`,
    confidence: 0.75
  }));
  return { ocrResults };
}

// ─── MULTI-BATCH DOCUMENT EXTRACTION ────────────────────────────────────────

/**
 * Main entry point: extracts an entire document using sequential 15-page batches
 * with 2-page overlap, runtime validation, token cost tracking, and overlap deduplication.
 */
export async function extractMultiBatchDocument(
  pdfBuffer: Buffer,
  totalPages: number,
  options?: GeminiVisionOptions
): Promise<MultiBatchExtractionResult> {
  const ranges = generateBatchPageRanges(totalPages, BATCH_SIZE_DEFAULT, OVERLAP_PAGES_DEFAULT);
  const batches: VisionBatchResult[] = [];

  let accumulatedClauses: ExtractedClauseItem[] = [];
  let accumulatedAnchors: ExtractedAnchorItem[] = [];
  const accumulatedTables: ExtractedTableItem[] = [];
  const pageDispositions: Record<number, PageDisposition> = {};
  const ocrFallbackPagesSet = new Set<number>();

  let totalPromptTokens = 0;
  let totalOutputTokens = 0;
  let totalThinkingTokens = 0;
  let totalMarketValue = 0;

  const interBatchDelayMs = options?.interBatchDelayMs ?? INTER_BATCH_DELAY_MS_DEFAULT;

  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];

    // Pre-request budget check: Estimate next batch market value before initiating API call
    const estimatedBatchPromptTokens = (range.endPage - range.startPage + 1) * 520 + 500;
    const estimatedBatchOutputTokens = 3000;
    const estimatedBatchCost = calculateTokenCost(
      options?.modelName || DEFAULT_MODELS_CHAIN[0],
      estimatedBatchPromptTokens,
      estimatedBatchOutputTokens,
      0,
      options?.pricingTable
    );

    if (options?.budgetLimitUsd && (totalMarketValue + estimatedBatchCost > options.budgetLimitUsd)) {
      console.warn(
        `[GEMINI_VISION] Pre-request market value limit enforced: Next batch estimate ($${estimatedBatchCost.toFixed(5)}) ` +
        `would exceed limit of $${options.budgetLimitUsd} (current: $${totalMarketValue.toFixed(5)}). Halting before request.`
      );
      break;
    }

    // 1. Slice PDF buffer for this batch
    const sliceBuf = slicePdfBuffer(pdfBuffer, range.startPage, range.endPage, totalPages);

    // 2. Call Gemini Vision
    const batchResult = await extractBatchWithGeminiVision(sliceBuf, range, options);
    batches.push(batchResult);

    // 3. Accumulate token metrics
    totalPromptTokens += batchResult.token_metrics.promptTokenCount;
    totalOutputTokens += batchResult.token_metrics.candidatesTokenCount;
    totalThinkingTokens += batchResult.token_metrics.thinkingTokenCount;
    totalMarketValue += batchResult.token_metrics.estimatedMarketValueUsd;

    // 4. Record page dispositions
    for (const p of batchResult.pages_processed) {
      if (p.is_scanned_or_degraded) {
        pageDispositions[p.page_number] = 'NEEDS_REVIEW';
        ocrFallbackPagesSet.add(p.page_number);
      } else if (p.has_qualification_criteria) {
        pageDispositions[p.page_number] = 'RELEVANT';
      } else {
        // Do not prematurely mark REVIEWED_NO_CRITERIA if already marked RELEVANT in previous overlap
        if (!pageDispositions[p.page_number] || pageDispositions[p.page_number] === 'PENDING') {
          pageDispositions[p.page_number] = 'PROCESSING';
        }
      }
    }

    // 5. Reconcile / Deduplicate clauses and anchors across overlaps
    accumulatedClauses = reconcileClauses(accumulatedClauses, batchResult.extracted_clauses);
    accumulatedAnchors = reconcileAnchors(accumulatedAnchors, batchResult.structural_anchors);

    // 6. Accumulate tables
    for (const tbl of batchResult.structured_tables) {
      accumulatedTables.push(tbl);
    }

    if (options?.onBatchComplete) {
      options.onBatchComplete(batchResult);
    }

    // 7. Check if rate limited or failed: halt multi-batch and preserve partial results
    if (batchResult.status === 'RATE_LIMITED' || batchResult.status === 'FAILED') {
      console.warn(`[GEMINI_VISION] Batch ${range.batchIndex + 1} finished with status ${batchResult.status}. Halting extraction early to preserve quota and partial results.`);
      break;
    }

    // 8. Inter-batch pacing delay to respect Free-Tier rate limit (15 RPM)
    if (i < ranges.length - 1 && interBatchDelayMs > 0) {
      console.log(`[GEMINI_VISION] Pacing delay: waiting ${interBatchDelayMs}ms before next batch to respect Free-Tier rate limit (15 RPM)...`);
      await new Promise(r => setTimeout(r, interBatchDelayMs));
    }
  }

  // Sort accumulated clauses by category order: Financial, Technical, Others
  const categoryOrder: Record<CriterionType, number> = {
    FINANCIAL: 1,
    TECHNICAL: 2,
    OTHERS: 3
  };

  accumulatedClauses.sort((a, b) => {
    const catDiff = categoryOrder[a.criterion_type] - categoryOrder[b.criterion_type];
    if (catDiff !== 0) return catDiff;
    return a.source_page - b.source_page;
  });

  return {
    totalPages,
    totalBatches: batches.length,
    batches,
    all_clauses: accumulatedClauses,
    all_anchors: accumulatedAnchors,
    all_tables: accumulatedTables,
    page_dispositions: pageDispositions,
    ocr_fallback_pages: Array.from(ocrFallbackPagesSet).sort((a, b) => a - b),
    total_prompt_tokens: totalPromptTokens,
    total_output_tokens: totalOutputTokens,
    total_thinking_tokens: totalThinkingTokens,
    estimated_market_value_usd: totalMarketValue,
    payable_cost_usd: 0.00,
    total_cost_usd: totalMarketValue,
    total_attempts: batches.reduce((acc, b) => acc + b.attempts.length, 0)
  };
}

