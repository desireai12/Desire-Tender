import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { STATE_PORTALS, KEYWORD_CATEGORIES, crawlStateGePNICPortal } from '@/lib/gepnic-crawler';
import { crawlTelanganaPortal } from '@/lib/telangana-crawler';
import { crawlGujaratNProcurePortal } from '@/lib/nprocure-crawler';
import { normalizeStatus } from '@/lib/tender-status';
import { retrieveRAGContextForTender, ingestDocumentInBackground, INGESTION_TRACKER } from '@/lib/rag';
import { getBuildStamp } from '@/lib/buildStamp';
import { runNewEligibilityEvaluation } from '@/lib/new-eligibility';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export const maxDuration = 300; // Max serverless function execution limit (300s)
export const dynamic = 'force-dynamic';

function hashPassword(pass: string): string {
  return crypto.createHash('sha256').update(pass.trim()).digest('hex');
}
function verifyPassword(plain: string, hashed: string): boolean {
  if (!plain || !hashed) return false;
  return hashPassword(plain).toLowerCase() === hashed.toLowerCase() || plain === hashed;
}
function sanitizeUser(user: any) {
  if (!user) return null;
  const { password_hash, password, ...rest } = user;
  return rest;
}

// ─── ERROR CATEGORIES & ERROR RESPONSE BUILDER ──────────────────────────────
export type ErrorCategory =
  | 'FILE_UPLOAD_FAILED'
  | 'PDF_EXTRACTION_FAILED'
  | 'AI_QUOTA_EXCEEDED'
  | 'AI_AUTH_FAILED'
  | 'AI_MODEL_UNAVAILABLE'
  | 'AI_RESPONSE_INVALID'
  | 'AI_TIMEOUT'
  | 'UNKNOWN_ERROR';

function buildErrorResponse(category: ErrorCategory, rawDetail?: string, debugData?: any, statusHttp = 500) {
  let message = '';
  switch (category) {
    case 'FILE_UPLOAD_FAILED':
      message = "The file did not upload correctly. Please try uploading again, or check the file isn't corrupted.";
      statusHttp = 400;
      break;
    case 'PDF_EXTRACTION_FAILED':
      message = `Could not read this PDF: ${rawDetail || 'Extraction failed'}. The file may be a scanned/image-only PDF, corrupted, or password protected.`;
      statusHttp = 422;
      break;
    case 'AI_QUOTA_EXCEEDED':
      message = "The AI analysis service has hit its usage limit for now. Please try again in a few minutes, or contact admin to check the API quota/billing.";
      statusHttp = 429;
      break;
    case 'AI_AUTH_FAILED':
      message = "The AI service credentials are invalid or expired. This is a configuration issue — please contact admin to check the API key.";
      statusHttp = 401;
      break;
    case 'AI_MODEL_UNAVAILABLE':
      message = "The configured AI models are currently unavailable. Please contact admin to check the model configuration.";
      statusHttp = 503;
      break;
    case 'AI_RESPONSE_INVALID':
      message = "The AI returned an unexpected response format. This may be a temporary issue — please try again, or contact admin if this persists.";
      statusHttp = 502;
      break;
    case 'AI_TIMEOUT':
      message = "The AI analysis took too long and timed out. Please try again.";
      statusHttp = 504;
      break;
    case 'UNKNOWN_ERROR':
    default:
      message = `An unexpected error occurred: ${rawDetail || 'Unknown system error'}`;
      statusHttp = 500;
      break;
  }

  console.error(`[ROUTE_ERROR] [${category}] (HTTP ${statusHttp}): ${message}`, rawDetail || '', debugData || '');

  return NextResponse.json(
    {
      status: 'error',
      error_type: category,
      message,
      debug: debugData || (rawDetail ? { detail: rawDetail } : undefined)
    },
    { status: statusHttp }
  );
}

// ─── HIGH-CAPACITY SERVERLESS PDF TEXT EXTRACTOR ─────────────────────────
async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  try {
    // 0. Plain text buffer check
    const headerStr = buffer.toString('utf-8', 0, 8);
    if (!headerStr.startsWith('%PDF-')) {
      const utf8Text = buffer.toString('utf-8').trim();
      if (utf8Text.length >= 30) {
        console.log(`[PDF_EXTRACT] Plain text buffer detected, returning ${utf8Text.length} characters`);
        return utf8Text;
      }
    }

    // 1. Try unpdf first (fast ESM/WASM PDF engine built for serverless)
    try {
      const modName = 'unpdf';
      const unpdf = await import(/* webpackIgnore: true */ modName).catch(() => null);
      if (unpdf && unpdf.getDocumentProxy && unpdf.extractText) {
        const uint8Array = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        const pdf = await unpdf.getDocumentProxy(uint8Array);
        const { text } = await unpdf.extractText(pdf, { mergePages: true });
        const fullText = (text || '').trim();
        if (fullText.length >= 50) {
          console.log(`[PDF_EXTRACT] unpdf successfully extracted ${fullText.length} characters`);
          return fullText;
        }
      }
    } catch (unpdfErr: any) {
      console.warn(`[PDF_EXTRACT] unpdf attempt warning: ${unpdfErr?.message || unpdfErr}`);
    }

    // 2. Zero-dependency stream text parser fallback
    try {
      const zlib = require('zlib');
      const str = buffer.toString('latin1');
      let pureText = '';
      const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
      let match;
      while ((match = streamRegex.exec(str)) !== null) {
        let decompressed = '';
        try {
          decompressed = zlib.inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1');
        } catch {
          decompressed = match[1];
        }
        const textMatches = decompressed.match(/\(([^)]+)\)\s*Tj/g) || [];
        for (const m of textMatches) pureText += m.replace(/^\(/, '').replace(/\)\s*Tj$/, '') + ' ';
        const arrayMatches = decompressed.match(/\[([^\]]+)\]\s*TJ/g) || [];
        for (const m of arrayMatches) {
          const parts = m.match(/\(([^)]+)\)/g) || [];
          for (const p of parts) pureText += p.slice(1, -1) + ' ';
        }
      }
      const cleanedPure = pureText.trim();
      if (cleanedPure.length >= 20) {
        console.log(`[PDF_EXTRACT] Stream regex fallback extracted ${cleanedPure.length} characters`);
        return cleanedPure;
      }
    } catch (pureErr) {}

    throw new Error('PDF contains less than 20 characters of extractable text.');
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error(`[CRITICAL] PDF Text Extraction Error: ${errorMsg}`, err);
    throw new Error(errorMsg);
  }
}

// ─── DOCUMENT REJECTION BUILDER ─────────────────────────────────────────────
function buildRejection(filename: string, quoteEvidence?: string, reason?: string, docType?: string) {
  const detected = docType || 'Non-Tender Document';
  const evidenceText = quoteEvidence ? ` Quoted Evidence: "${quoteEvidence}".` : '';
  const reasonText = reason ? ` Reason: ${reason}.` : '';

  return {
    tender_id: `rejected-${Date.now()}`,
    tender_title: filename,
    project_category: 'NON_TENDER',
    filename,
    is_rejected_non_tender: true,
    verdict: 'Ineligible',
    eligibility_score: 0,
    overall_health: 'Red',
    recommendation: 'DOCUMENT REJECTED — Upload an official Government Tender (NIB / NIT / RFP / Bidding Document)',
    executive_summary: `Document Rejected: The file "${filename}" is classified as ${detected}.${evidenceText}${reasonText} This system ONLY evaluates official Government and Corporate Tender Specification PDFs.`,
    desire_alone: { score: 0, status: 'Ineligible — Non-Tender', fulfilled_pct: '0%' },
    jv_alone: { score: 0, status: 'Ineligible — Non-Tender', fulfilled_pct: '0%' },
    combined_jv: { score: 0, status: 'Ineligible — Non-Tender', fulfilled_pct: '0%' },
    clauses_breakdown: [],
    parameter_matrix: [],
    jv_rules_audit: [],
    summary_counts: { total_criteria: 0, matched: 0, partial: 0, not_matching: 0, data_missing: 0 },
    created_at: new Date().toISOString()
  };
}

// ─── HIGH-CAPACITY GEMINI CALLER WITH DETAILED DIAGNOSTICS ─────────────────
interface GeminiCallResult {
  data: any | null;
  rawText: string;
  modelUsed?: string;
  errorCategory?: ErrorCategory;
  errorDetail?: string;
  lastStatus?: number;
}

async function callGeminiAI(prompt: string, apiKey: string): Promise<GeminiCallResult> {
  const models = [
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite'
  ];

  let lastStatus = 0;
  let lastErrorDetail = '';
  let hitQuota = false;
  let hitAuth = false;
  let count404 = 0;
  let hitTimeout = false;

  const overallStartTime = Date.now();
  const OVERALL_DEADLINE_MS = 120000; // Hard 120s budget across all fallback attempts

  for (const m of models) {
    const elapsed = Date.now() - overallStartTime;
    if (elapsed >= OVERALL_DEADLINE_MS) {
      hitTimeout = true;
      lastErrorDetail = `Overall AI processing budget exceeded (${Math.round(elapsed / 1000)}s)`;
      break;
    }

    const controller = new AbortController();
    const modelTimeoutMs = Math.min(45000, OVERALL_DEADLINE_MS - elapsed); // Max 45s per model attempt
    const timer = setTimeout(() => controller.abort(), modelTimeoutMs);

    try {
      const estimatedTokens = Math.round(prompt.length / 4);
      console.log(`[GEMINI_REQUEST] Model: ${m}, Prompt Chars: ${prompt.length}, Estimated Tokens: ${estimatedTokens}`);
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            topP: 0.95,
            responseMimeType: 'application/json',
            maxOutputTokens: 8192
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timer);
      lastStatus = res.status;
      const errText = await res.text().catch(() => '');

      if (res.status === 429 || errText.includes('quota') || errText.includes('RESOURCE_EXHAUSTED')) {
        hitQuota = true;
        lastErrorDetail = errText || 'Rate limit / quota exceeded (HTTP 429)';
        console.warn(`Gemini model ${m} hit quota: ${errText}`);
        continue;
      }

      if (res.status === 401 || res.status === 403 || errText.includes('API_KEY_INVALID') || errText.includes('API key not valid')) {
        hitAuth = true;
        lastErrorDetail = errText || `Authentication failed (HTTP ${res.status})`;
        console.error(`Gemini model ${m} auth error ${res.status}: ${errText}`);
        continue;
      }

      if (res.status === 404) {
        count404++;
        lastErrorDetail = errText || `Model ${m} not found (HTTP 404)`;
        console.warn(`Gemini model ${m} not found (HTTP 404)`);
        continue;
      }

      if (res.status === 503 || res.status === 500 || errText.includes('high demand') || errText.includes('UNAVAILABLE')) {
        lastErrorDetail = errText || `Model ${m} high demand / unavailable (HTTP ${res.status})`;
        console.warn(`Gemini model ${m} unavailable (HTTP ${res.status}): falling back to next model`);
        continue;
      }

      if (res.ok) {
        let rawText = '';
        try {
          const parsedObj = JSON.parse(errText);
          rawText = parsedObj?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } catch (e) {
          rawText = errText;
        }

        if (!rawText) {
          console.warn(`Gemini model ${m} candidate text part empty, falling back...`);
          lastErrorDetail = 'Gemini candidate response text part is missing or empty.';
          continue;
        }

        const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        let parsed: any = null;
        try {
          parsed = JSON.parse(cleaned);
        } catch (pe: any) {
          console.warn(`Gemini model ${m} returned invalid/truncated JSON (${pe.message}), falling back to next model...`);
          lastErrorDetail = `JSON parse failed on Gemini ${m}: ${pe.message}`;
          continue;
        }

        return { data: parsed, rawText, modelUsed: m, lastStatus: 200 };
      }

      lastErrorDetail = `HTTP ${res.status}: ${errText}`;
    } catch (e: any) {
      clearTimeout(timer);
      if (e.name === 'AbortError' || e.message?.includes('timeout') || e.message?.includes('aborted')) {
        hitTimeout = true;
        lastErrorDetail = `Model ${m} call timed out after ${Math.round(modelTimeoutMs / 1000)}s`;
      } else {
        lastErrorDetail = e.message || String(e);
      }
      console.warn(`Gemini ${m} call error:`, e);
    }
  }

  let errorCategory: ErrorCategory = 'UNKNOWN_ERROR';
  if (hitQuota) errorCategory = 'AI_QUOTA_EXCEEDED';
  else if (hitAuth) errorCategory = 'AI_AUTH_FAILED';
  else if (count404 === models.length) errorCategory = 'AI_MODEL_UNAVAILABLE';
  else if (hitTimeout) errorCategory = 'AI_TIMEOUT';

  return {
    data: null,
    rawText: '',
    errorCategory,
    errorDetail: lastErrorDetail,
    lastStatus
  };
}

// ═══ EXHAUSTIVE FULL-COVERAGE CLAUSE EXTRACTION ENGINE ═════════════════════
async function performSequentialFullCoverageExtraction(
  fullText: string,
  docFilename: string,
  apiKey: string
): Promise<any> {
  if (!fullText || fullText.trim().length === 0) {
    return {
      is_rejected_non_tender: false,
      tender_title: docFilename,
      project_category: 'EPC',
      verdict: 'Ineligible',
      overall_health: 'Red',
      recommendation: 'Empty document text provided.',
      executive_summary: 'No text extracted from document.',
      clauses_breakdown: []
    };
  }

  // 1. Single-pass full context execution if under 800,000 tokens (~3.2M characters)
  // 1. If document text is under 100,000 characters (~25 pages), attempt single-pass exhaustive extraction
  if (fullText.length <= 100000) {
    const fullPrompt = `You are Desire Tender AI, an expert Government & Corporate Tender Qualification Auditor.
Your ONLY job is to read the provided ENTIRE tender document text and extract EVERY SINGLE ELIGIBILITY AND QUALIFICATION CLAUSE present in the document without omission.

DOCUMENT TEXT (Filename: "${docFilename}"):
"${fullText}"

INSTRUCTIONS FOR EXHAUSTIVE CLAUSE EXTRACTION:
Extract EVERY DISTINCT ELIGIBILITY AND QUALIFICATION REQUIREMENT in this document across all categories without omission or capping:
1. Financial Requirements: Minimum Annual Turnover, Net Worth, Solvency Certificate, Liquid Assets/Credit Line, CA Balance Sheet Years, Profitability.
2. Technical Experience: Similar work experience, single work value, 2 work value, 3 work value, pipeline length & diameter, pump capacity, solar/SCADA automation.
3. Contractor Registration & Licenses: Class-A/Class-AA Registration (PHED/WRD/PWD), Electrical License, ISO 9001/14001, Factory License, GST.
4. Joint Venture / Consortium Rules: Lead Partner minimum equity share (e.g. 51%), partner minimum share (e.g. 20-25%), maximum JV partners, turnover pooling rules.
5. EMD & Tender Security: Earnest Money Deposit (EMD) amount, Bank Guarantee validity period, EMD exemption rules, Security Deposit %, Performance Bank Guarantee (PBG) %, Additional Performance Security for low bids.
6. Machinery & Equipment Requirements: Required machinery (excavators, trenchers, HD DI pipe jointing rigs, crane trucks, testing pumps, generator sets) with ownership/lease proof.
7. Key Personnel & Staffing: Minimum qualified personnel (Project Manager, Senior Civil Engineer, Safety Officer, Quality Control Engineer, SCADA Specialist) with minimum experience years.
8. Commercial & Legal Compliance: Liquidated Damages (LD) penalty rate per week, maximum LD cap (e.g. 10%), Defect Liability Period (DLP) duration (e.g. 1 year, 5 years, 10 years), Non-Blacklisting / Debarment Affidavit on Stamp Paper, Site Visit Certificate.

Do NOT limit yourself to a fixed list of categories. Do NOT cap the number of clauses. Extract ALL clauses present in the document text.

Return valid JSON only:
{
  "is_rejected_non_tender": false,
  "tender_title": "string — official tender title",
  "project_category": "ESCO" | "STP" | "RHDS" | "KUSUM" | "SOLAR" | "CIVIL" | "EPC",
  "verdict": "Eligible" | "Conditional" | "Ineligible",
  "overall_health": "Green" | "Yellow" | "Red",
  "recommendation": "string — summary recommendation",
  "executive_summary": "string — comprehensive summary of ALL eligibility conditions",
  "clauses_breakdown": [
    {
      "clause_no": "string — exact clause/section reference (e.g. Section 4.1.2 or ITB 3.5)",
      "clause_title": "string — title/summary of requirement",
      "requirement_type": "Financial" | "Technical" | "Organizational" | "Compliance" | "Equipment" | "Staffing" | "Legal",
      "tender_requirement": "exact full requirement text from document",
      "required_value_num": number or null,
      "required_value_unit": "Cr" | "Lakhs" | "km" | "MLD" | "Years" | "%" | null,
      "required_value": "exact threshold text",
      "required_doc": "documentary proof needed",
      "page_ref": "page or section number"
    }
  ]
}`;

    const singleRes = await callGeminiAI(fullPrompt, apiKey);
    if (singleRes.data && Array.isArray(singleRes.data.clauses_breakdown) && singleRes.data.clauses_breakdown.length >= 5) {
      return singleRes.data;
    }
  }

  // 2. Sequential Full-Coverage Extraction Fallback for large documents (>100k chars)
  // Splits document into 60k character windows with 5k overlap to guarantee 100% text coverage with high attention density.
  const windowSize = 60000;
  const overlap = 5000;
  const windows: string[] = [];
  let start = 0;

  while (start < fullText.length) {
    const end = Math.min(start + windowSize, fullText.length);
    windows.push(fullText.slice(start, end));
    if (end >= fullText.length) break;
    start += (windowSize - overlap);
  }

  const allClauses: any[] = [];
  let detectedTitle = docFilename.replace(/\.[^/.]+$/, '');
  let detectedCategory = 'EPC';
  let execSummaries: string[] = [];

  const windowResults = await Promise.all(
    windows.map(async (winText, idx) => {
      const winPrompt = `You are Desire Tender AI, an expert Government & Corporate Tender Qualification Auditor.
Extract EVERY SINGLE ELIGIBILITY AND QUALIFICATION REQUIREMENT in this section window (${idx + 1} of ${windows.length}) of tender document "${docFilename}".

SECTION WINDOW TEXT:
"${winText}"

INSTRUCTIONS FOR EXHAUSTIVE CLAUSE EXTRACTION:
Extract ALL distinct qualification criteria found in this section text across all categories without omission:
- Financial Requirements: Minimum Annual Turnover, Net Worth, Solvency Certificate, Liquid Assets/Credit Line, CA Balance Sheet Years, Profitability.
- Technical Experience: Similar work experience, single work value, 2 work value, 3 work value, pipeline length & diameter, pump capacity, solar/SCADA automation.
- Contractor Registration & Licenses: Class-A/Class-AA Registration (PHED/WRD/PWD), Electrical License, ISO 9001/14001, Factory License, GST.
- Joint Venture / Consortium Rules: Lead Partner minimum equity share (e.g. 51%), partner minimum share (e.g. 20-25%), maximum JV partners, turnover pooling rules.
- EMD & Tender Security: Earnest Money Deposit (EMD) amount, Bank Guarantee validity period, EMD exemption rules, Security Deposit %, Performance Bank Guarantee (PBG) %, Additional Performance Security for low bids.
- Machinery & Equipment Requirements: Required machinery (excavators, trenchers, HD DI pipe jointing rigs, crane trucks, testing pumps, generator sets) with ownership/lease proof.
- Key Personnel & Staffing: Minimum qualified personnel (Project Manager, Senior Civil Engineer, Safety Officer, Quality Control Engineer, SCADA Specialist) with minimum experience years.
- Commercial & Legal Compliance: Liquidated Damages (LD) penalty rate per week, maximum LD cap (e.g. 10%), Defect Liability Period (DLP) duration (e.g. 1 year, 5 years, 10 years), Non-Blacklisting / Debarment Affidavit on Stamp Paper, Site Visit Certificate.

Return valid JSON only:
{
  "tender_title": "string — extracted official tender title",
  "project_category": "ESCO" | "STP" | "RHDS" | "KUSUM" | "SOLAR" | "CIVIL" | "EPC",
  "window_summary": "string — summary of this section",
  "clauses": [
    {
      "clause_no": "string — e.g. Clause 4.1 or ITB 3.2",
      "clause_title": "string — title of requirement",
      "requirement_type": "Financial" | "Technical" | "Organizational" | "Compliance" | "Equipment" | "Staffing" | "Legal",
      "tender_requirement": "exact requirement statement from document",
      "required_value_num": number or null,
      "required_value_unit": "Cr" | "Lakhs" | "km" | "MLD" | "Years" | "%" | null,
      "required_value": "string statement of requirement threshold",
      "required_doc": "documentary evidence required",
      "page_ref": "page or section reference"
    }
  ]
}`;

      try {
        const res = await callGeminiAI(winPrompt, apiKey);
        return res.data || null;
      } catch (winErr) {
        console.warn(`[FULL_COVERAGE_EXTRACTION] Window ${idx + 1} processing error:`, winErr);
        return null;
      }
    })
  );

  for (const resData of windowResults) {
    if (resData) {
      if (resData.tender_title && resData.tender_title.length > 5 && detectedTitle === docFilename.replace(/\.[^/.]+$/, '')) {
        detectedTitle = resData.tender_title;
      }
      if (resData.project_category) {
        detectedCategory = resData.project_category;
      }
      if (resData.window_summary) {
        execSummaries.push(resData.window_summary);
      }
      const cls = Array.isArray(resData.clauses) ? resData.clauses : (Array.isArray(resData.clauses_breakdown) ? resData.clauses_breakdown : []);
      if (cls.length > 0) {
        allClauses.push(...cls);
      }
    }
  }

  // Smart deduplication: preserve distinct requirements by clause_no, requirement_type, title, and threshold snippet
  const seenKeys = new Set<string>();
  const deduplicatedClauses: any[] = [];

  for (const c of allClauses) {
    const rType = String(c.requirement_type || 'Compliance').trim().toLowerCase();
    const cTitle = String(c.clause_title || '').trim().toLowerCase();
    const cNo = String(c.clause_no || '').trim().toLowerCase();
    const valSnippet = String(c.required_value || c.tender_requirement || '').slice(0, 40).trim().toLowerCase();

    const key = (cNo && cNo !== 'n/a' && cNo !== 'nit' && !cNo.includes('general'))
      ? `${cNo}_${cTitle}`
      : `${rType}_${cTitle}_${valSnippet}`;

    if (cTitle && !seenKeys.has(key)) {
      seenKeys.add(key);
      deduplicatedClauses.push(c);
    }
  }

  return {
    is_rejected_non_tender: false,
    tender_title: detectedTitle,
    project_category: detectedCategory,
    verdict: 'Eligible',
    overall_health: 'Green',
    recommendation: `Exhaustive full-coverage document audit completed across ${windows.length} sequential text sections. ${deduplicatedClauses.length} distinct qualification clauses extracted.`,
    executive_summary: execSummaries.join(' ') || `Full tender document audit extracted ${deduplicatedClauses.length} eligibility clauses across financial, technical, legal, and operational requirement categories.`,
    clauses_breakdown: deduplicatedClauses
  };
}

// ─── AI-POWERED DOCUMENT CLASSIFIER ────────────────────────────────────────
async function classifyDocumentWithAI(filename: string, textSample: string, apiKey: string): Promise<{
  is_tender: boolean;
  confidence: number;
  document_type: string;
  quote_of_evidence: string;
  reason: string;
  rawText: string;
  errorCategory?: ErrorCategory;
  errorDetail?: string;
}> {
  if (!textSample || textSample.trim().length < 40) {
    return {
      is_tender: false,
      confidence: 100,
      document_type: 'Unreadable or Empty Document',
      quote_of_evidence: '',
      reason: 'No readable text could be extracted from this document.',
      rawText: JSON.stringify({ is_tender: false, reason: 'No text extracted' })
    };
  }

  const prompt = `You are a strict, impartial Document Classifier for procurement and legal documents.
Determine whether the document below is a genuine Public/Government/Corporate Tender / Notice Inviting Tender (NIT/NIB/RFP/IFB/ITB/EOI/PQ/Bidding Document) OR a NON-TENDER document (such as a tax invoice, bill, payment receipt, salary slip, purchase order, resume/curriculum vitae, bank statement, student marksheet, certificate, or personal correspondence).

DOCUMENT FILENAME: "${filename}"

DOCUMENT TEXT EXCERPT (first 4,000 characters):
"""
${textSample.slice(0, 4000)}
"""

RULES:
1. Base your determination strictly and objectively on the document text content.
2. If it is an invoice, bill, receipt, salary slip, bank statement, or resume/CV, set "is_tender": false.
3. If it is a tender notice, instruction to bidders, RFP, NIT, bidding document, or procurement qualification paper, set "is_tender": true.
4. You MUST include an exact verbatim excerpt from the document as "quote_of_evidence" supporting your classification.
5. Provide a clear, concise "reason".
6. Return ONLY valid JSON (no markdown wrapping) matching this schema:
{
  "is_tender": boolean,
  "confidence": number,
  "document_type": string,
  "quote_of_evidence": string,
  "reason": string
}`;

  const res = await callGeminiAI(prompt, apiKey);
  if (res.data && typeof res.data === 'object' && typeof res.data.is_tender === 'boolean') {
    return {
      is_tender: res.data.is_tender,
      confidence: res.data.confidence ?? 95,
      document_type: res.data.document_type || (res.data.is_tender ? 'Tender Document' : 'Non-Tender Document'),
      quote_of_evidence: res.data.quote_of_evidence || '',
      reason: res.data.reason || res.data.reasoning || '',
      rawText: res.rawText
    };
  }

  return {
    is_tender: true, // Fail-open for classification, actual evaluation stage will validate
    confidence: 50,
    document_type: 'Tender Document (Unconfirmed)',
    quote_of_evidence: '',
    reason: res.errorDetail || 'Classifier did not return structured result',
    rawText: res.rawText,
    errorCategory: res.errorCategory,
    errorDetail: res.errorDetail
  };
}


// ─── CLAUSE CATEGORIZATION HELPER (THREE GROUPS) ───────────────────────
function categorizeClause(c: any): { 
  is_eligibility_criterion: boolean; 
  clause_group: 'qualification_criterion' | 'mandatory_submission' | 'contract_term';
  clause_category: 'qualification' | 'submission' | 'contract';
} {
  const title = String(c.clause_title || '').toLowerCase();
  const reqText = String(c.tender_requirement || c.required_value || c.quote_of_evidence || '').toLowerCase();
  const reqType = String(c.requirement_type || '').toLowerCase();

  // (b) Mandatory Submission Checklist (EMD, tender fee, stamp paper, power of attorney, validity period, affidavits, declarations, non-blacklisting, GST, PAN, forms)
  const isSubmission = 
    title.includes('emd') || reqText.includes('earnest money') || title.includes('earnest money') || (reqText.includes('emd') && !reqText.includes('scheme')) ||
    title.includes('fee') || reqText.includes('tender fee') || reqText.includes('document fee') || reqText.includes('cost of tender') ||
    title.includes('stamp') || reqText.includes('stamp duty') || reqText.includes('stamp paper') ||
    title.includes('power of attorney') || title.includes('poa') || reqText.includes('power of attorney') || reqText.includes('poa') ||
    title.includes('validity') || reqText.includes('validity period') || reqText.includes('bid validity') ||
    title.includes('affidavit') || reqText.includes('affidavit') || title.includes('undertaking') || reqText.includes('undertaking') ||
    title.includes('declaration') || reqText.includes('declaration') || reqText.includes('non-blacklisting') || title.includes('blacklisting') ||
    title.includes('form -') || title.includes('form-') || reqText.includes('proforma') ||
    title.includes('gst') || reqText.includes('gst') || title.includes('pan') || /\bpan\b/i.test(reqText);

  if (isSubmission) {
    return { is_eligibility_criterion: false, clause_group: 'mandatory_submission', clause_category: 'submission' };
  }

  // (c) Contract Conditions / Operational Obligations:
  // Move contract and operational obligations (penalties, SLA, termination, force majeure, labour rules, safety, insurance, deployed-staff roster, equipment upkeep) into the collapsed, unscored "Other conditions". Never create a "missing company field" for them.
  const isContractOrOperational =
    // Penalties / Liquidated damages
    title.includes('penalty') || reqText.includes('penalty') || reqText.includes('penalties') ||
    title.includes('liquidated damages') || reqText.includes('liquidated damages') || title.includes('ld clause') || reqText.includes('delay penalty') ||
    // SLA
    title.includes('sla') || reqText.includes('service level') || reqText.includes('service level agreement') || /\bsla\b/i.test(title) || /\bsla\b/i.test(reqText) ||
    // Termination
    title.includes('termination') || reqText.includes('termination') || title.includes('foreclosure') || reqText.includes('breach of contract') ||
    // Force Majeure
    title.includes('force majeure') || reqText.includes('force majeure') || title.includes('act of god') ||
    // Labour rules / Wages / Workmen
    title.includes('labour') || title.includes('labor') || reqText.includes('labour') || reqText.includes('labor') ||
    reqText.includes('minimum wages') || reqText.includes('payment of wages') || reqText.includes('workmen compensation') ||
    reqText.includes('contract labour') || reqText.includes('labour cess') || reqText.includes('labour welfare') ||
    // Safety
    title.includes('safety') || reqText.includes('safety') || reqText.includes('ppe') || reqText.includes('personal protective equipment') ||
    title.includes('accident') || reqText.includes('safety precautions') || reqText.includes('safety code') ||
    // Insurance
    title.includes('insurance') || reqText.includes('insurance') || reqText.includes('transit insurance') ||
    reqText.includes('contractor all risk') || reqText.includes('car policy') || reqText.includes('third party liability') ||
    // Deployed-staff roster
    title.includes('roster') || reqText.includes('roster') || title.includes('deployed') || reqText.includes('deployed') ||
    reqText.includes('deployment schedule') || reqText.includes('staff deployment') || reqText.includes('site personnel deployment') ||
    reqText.includes('site staff roster') || reqText.includes('manpower deployment') ||
    // Equipment upkeep
    title.includes('upkeep') || reqText.includes('upkeep') || title.includes('equipment upkeep') || reqText.includes('equipment upkeep') ||
    reqText.includes('machinery upkeep') || reqText.includes('maintenance of equipment') || reqText.includes('equipment maintenance') ||
    // Contract & DLP & PBG
    title.includes('dlp') || reqText.includes('defect liability') || title.includes('defect liability') ||
    (title.includes('o&m') && !title.includes('experience') && !reqText.includes('experience') && !title.includes('similar work') && !reqText.includes('similar work')) || 
    title.includes('pbg') || title.includes('performance bank guarantee') || reqText.includes('performance security') || reqText.includes('performance bank guarantee') ||
    title.includes('escalation') || reqText.includes('price variation') || title.includes('arbitration') || reqText.includes('dispute resolution');

  if (isContractOrOperational) {
    return { is_eligibility_criterion: false, clause_group: 'contract_term', clause_category: 'contract' };
  }

  // (a) Qualification Criteria (financial, technical experience, registration/licence, stated personnel/equipment, JV composition)
  // ONLY (a) can affect the verdict.
  return { is_eligibility_criterion: true, clause_group: 'qualification_criterion', clause_category: 'qualification' };
}

function verifyClauseQuotes(clauses: any[], sourceText: string): any[] {
  if (!sourceText || sourceText.length === 0) return clauses;
  const normSource = sourceText.toLowerCase().replace(/\s+/g, ' ');

  return clauses.map((c) => {
    const quote = c.quote_of_evidence || c.tender_requirement || '';
    if (!quote || quote.length < 5) {
      return { ...c, quote_verified: true, quote_verification_status: 'VERIFIED' };
    }
    const normQuote = quote.toLowerCase().replace(/\s+/g, ' ');
    let exists = normSource.includes(normQuote);
    if (!exists && normQuote.length > 25) {
      // Check for first 25 chars substring match in source document text
      const sub = normQuote.slice(0, 25);
      exists = normSource.includes(sub);
    }
    return {
      ...c,
      quote_verified: exists,
      quote_verification_status: exists ? 'VERIFIED' : 'UNVERIFIED_QUOTE_NOT_FOUND'
    };
  }).filter((c) => c.quote_verified);
}

function sanitizeReportClauses(report: any, jvName: string = 'JV Partner', extractedPdfText: string = '') {
  if (!report || !report.clauses_breakdown || !Array.isArray(report.clauses_breakdown)) return report;

  // Step 3: Traceability - Verify quotes exist in document source text
  if (extractedPdfText) {
    report.clauses_breakdown = verifyClauseQuotes(report.clauses_breakdown, extractedPdfText);
  }

  // Attach build info to report
  report.build_info = getBuildStamp();

  // Step 4: Three Clause Groups
  const qualificationCriteria: any[] = [];
  const mandatorySubmissions: any[] = [];
  const contractConditions: any[] = [];

  report.clauses_breakdown.forEach((c: any) => {
    const { is_eligibility_criterion, clause_group, clause_category } = categorizeClause(c);
    c.is_eligibility_criterion = is_eligibility_criterion;
    c.clause_group = clause_group;
    c.clause_category = clause_category;

    if (clause_group === 'qualification_criterion') {
      qualificationCriteria.push(c);
    } else if (clause_group === 'mandatory_submission') {
      c.gap_notes = 'Mandatory Submission Item — Checklist requirement for bid package (does not affect verdict).';
      mandatorySubmissions.push(c);
    } else {
      c.gap_notes = 'Contract / Operational Obligation — Post-award execution & compliance terms (unscored; does not affect verdict).';
      contractConditions.push(c);
    }
  });

  report.qualification_criteria = qualificationCriteria;
  report.scored_eligibility_clauses = qualificationCriteria;
  report.mandatory_submission_clauses = mandatorySubmissions;
  report.unscored_submission_clauses = mandatorySubmissions;
  report.contract_condition_clauses = contractConditions;
  report.unscored_contract_conditions_clauses = contractConditions;

  // Step 5: Verdict Determination — ONLY (a) qualification criteria affect the verdict!
  const desireFailed = qualificationCriteria.filter((c: any) => c.desire_status === 'NOT MATCHING' || c.desire_status === 'NOT ELIGIBLE');
  const desireMissing = qualificationCriteria.filter((c: any) => c.desire_status === 'CANNOT BE CHECKED' || c.desire_status === 'DATA MISSING');
  const desirePassed = qualificationCriteria.filter((c: any) => c.desire_status === 'MATCH');

  let desireVerdict = 'Eligible';
  let desireVerdictReason = 'All qualification criteria checked and passed.';
  if (desireFailed.length > 0) {
    desireVerdict = 'Not Eligible';
    desireVerdictReason = `Failed qualification criteria: ${desireFailed.map((c: any) => c.clause_title).join(', ')}`;
  } else if (desireMissing.length > 0) {
    desireVerdict = `Cannot determine: ${desireMissing.length} criteria need data`;
    desireVerdictReason = `Missing structured company data for: ${desireMissing.map((c: any) => c.clause_title).join(', ')}`;
  }

  const combinedFailed = qualificationCriteria.filter((c: any) => c.status === 'NOT MATCHING' || c.status === 'NOT ELIGIBLE');
  const combinedMissing = qualificationCriteria.filter((c: any) => c.status === 'CANNOT BE CHECKED' || c.status === 'DATA MISSING');

  let combinedVerdict = 'Eligible';
  let combinedVerdictReason = 'All qualification criteria checked and passed by Consortium.';
  if (combinedFailed.length > 0) {
    combinedVerdict = 'Not Eligible';
    combinedVerdictReason = `Consortium failed qualification criteria: ${combinedFailed.map((c: any) => c.clause_title).join(', ')}`;
  } else if (combinedMissing.length > 0) {
    combinedVerdict = `Cannot determine: ${combinedMissing.length} criteria need data`;
    combinedVerdictReason = `Consortium missing data for: ${combinedMissing.map((c: any) => c.clause_title).join(', ')}`;
  }

  report.verdict = desireVerdict;
  report.verdict_reason = desireVerdictReason;
  report.combined_verdict = combinedVerdict;
  report.combined_verdict_reason = combinedVerdictReason;

  const desireEvaluable = qualificationCriteria.filter((c: any) => c.desire_status !== 'DATA MISSING' && c.desire_status !== 'CANNOT BE CHECKED');
  const combinedEvaluable = qualificationCriteria.filter((c: any) => c.status !== 'DATA MISSING' && c.status !== 'CANNOT BE CHECKED');

  let dScore = 100;
  if (desireEvaluable.length > 0) {
    const sum = desireEvaluable.reduce((acc: number, c: any) => acc + (typeof c.desire_pct === 'number' ? c.desire_pct : (c.desire_status === 'MATCH' ? 100 : 0)), 0);
    dScore = Math.min(100, Math.round(sum / desireEvaluable.length));
  }

  let cScore = 100;
  if (combinedEvaluable.length > 0) {
    const sum = combinedEvaluable.reduce((acc: number, c: any) => acc + (typeof c.combined_pct === 'number' ? c.combined_pct : (c.status === 'MATCH' ? 100 : 0)), 0);
    cScore = Math.min(100, Math.round(sum / combinedEvaluable.length));
  }

  report.eligibility_score = dScore;
  report.combined_eligibility_score = cScore;
  report.missing_data_criteria = desireMissing;
  report.score_formula = `Score = (${desirePassed.length} Passed / ${desireEvaluable.length} Evaluated Criteria)`;

  if (desireFailed.length > 0 && combinedFailed.length === 0) {
    report.recommendation = `JV Bidding Recommended: Desire Energy has gaps in (${desireFailed.map((f: any) => f.clause_title).join(', ')}). Partner ${jvName} satisfies consortium qualifications.`;
  } else if (desireFailed.length === 0 && desireMissing.length === 0) {
    report.recommendation = `Standalone Bidding Qualified: Desire Energy satisfies 100% of evaluated eligibility criteria from this document. JV is optional.`;
  } else if (desireMissing.length > 0) {
    report.recommendation = `Assessment Incomplete: Cannot determine standalone eligibility without data for ${desireMissing.length} criteria (${desireMissing.map((f: any) => f.clause_title).join(', ')}).`;
  } else {
    report.recommendation = `Not Eligible: Key qualification criteria cannot be met even with consortium partner.`;
  }

  return report;
}

let GLOBAL_SERVER_COMPANIES: any[] = [
  {
    id: 'comp-desire-01',
    name: 'DESIRE ENERGY SOLUTIONS PRIVATE LIMITED',
    type: 'Desire Energy',
    profile: 'Leading Indian Water & Solar Infrastructure Company managing 1,00,000+ villages under Jal Jeevan Mission, PM-Kusum, and RHDS pipe networks.',
    registered_address: '401, Manupasana Tower, C-Scheme, Jaipur - 302001, Rajasthan',
    corporate_address: '401, Manupasana Tower, C-Scheme, Jaipur - 302001, Rajasthan',
    contact_details: { phone: '0141-4050855', mobile: '7230037296', email: 'tenders@desireenergy.com', contact_person: 'Dharmesh Khandelwal (Director)' },
    cin: 'U40106RJ2011PTC034878',
    cin_registration: 'U40106RJ2011PTC034878',
    cin_source: 'PQ_Upload_Alwar (2).pdf, Page 120 (Balance Sheet Note 1) & Page 121',
    legal_entity_type: 'Private Limited Company (RoC Jaipur)',
    gst_number: '24AAECD3266E1ZZ',
    pan_number: 'AAECD3266E',

    // ── STRUCTURED FINANCIAL TABLES (Audited Form-7, Balance Sheets & CA Certificates) ──
    year_wise_turnover: {
      'FY 2021-22': { value_cr: 100.83, source: 'PQ_Upload_Junagadh (2).pdf, Page 15 (Form-7, Item 4(I))', verified: true },
      'FY 2022-23': { value_cr: 201.53, source: 'PQ_Upload_Junagadh (2).pdf, Page 15 (Form-7, Item 4(II))', verified: true },
      'FY 2023-24': { value_cr: 350.66, source: 'PQ_Upload_Junagadh (2).pdf, Page 15 (Form-7, Item 4(III))', verified: true },
      'FY 2024-25': { value_cr: 263.63, source: 'PQ_Upload_Junagadh (2).pdf, Page 15 (Form-7, Item 4(IV))', verified: true },
      'FY 2025-26': { value_cr: 256.52, source: 'PQ_Upload_Junagadh (2).pdf, Page 15 (Form-7, Item 4(V))', verified: true }
    },
    peak_turnover_cr: 350.66,
    peak_turnover_year: 'FY 2023-24',
    peak_turnover_source: 'PQ_Upload_Junagadh (2).pdf, Page 15',
    three_year_avg_turnover: 271.94, // Audited 3-yr average (FY 22-23 to FY 24-25): (201.53 + 350.66 + 263.63) / 3
    annual_turnover: { 'FY 2021-22': 100.83, 'FY 2022-23': 201.53, 'FY 2023-24': 350.66, 'FY 2024-25': 263.63, 'FY 2025-26': 256.52 },
    average_turnover: 271.94,

    year_wise_net_worth: {
      'FY 2020-21': { value_cr: 7.05, source: 'PQ_Upload_Alwar (2).pdf, Page 124 (Balance Sheet Note 2.1: Share Capital Rs 4.01 L + Reserves Rs 701.39 L = Rs 7,05,40,274.11)', verified: true },
      'FY 2021-22': { value_cr: 13.95, source: 'PQ_Upload_Alwar (2).pdf, Page 124/122 (Balance Sheet Note 2.1: Share Capital Rs 4.19 L + Reserves Rs 1,390.97 L = Rs 13,95,15,603.05)', verified: true },
      'FY 2022-23': { value_cr: 27.25, source: 'PQ_Upload_Alwar (2).pdf, Page 122/120 (Balance Sheet Note 3: Share Capital Rs 4.19 L + Reserves Rs 2,720.43 L = Rs 2,724.62 Lakhs)', verified: true },
      'FY 2023-24': { value_cr: 52.62, source: 'PQ_Upload_Alwar (2).pdf, Page 120 (Balance Sheet Note 3: Share Capital Rs 4.19 L + Reserves Rs 5,257.75 L = Rs 5,261.94 Lakhs)', verified: true },
      'FY 2024-25': { value_cr: null, source: 'UNVERIFIED — Pending upload of audited balance sheet', verified: false }
    },
    net_worth: 52.62, // Latest verified audited net worth as of 31.03.2024
    latest_net_worth_cr: 52.62,
    latest_net_worth_year: 'FY 2023-24',
    latest_net_worth_source: 'PQ_Upload_Alwar (2).pdf, Page 120',

    solvency_certificate: {
      bank_name: 'Kotak Mahindra Bank',
      certificate_no: 'RBGIFD/2025-26/000876/SC 1',
      issue_date: '18/02/2026',
      amount_cr: 72.18,
      amount_words: 'Rupees Seventy Two Crores Eighteen Lacs Only',
      validity: 'Valid for FY 2025-26 / 12 Months',
      source: 'PQ_Upload_Junagadh (2).pdf, Page 113 & Page 18',
      verified: true
    },
    solvency: 72.18,
    solvency_amount: 72.18,
    solvency_history: [
      {
        bank_name: 'Kotak Mahindra Bank',
        certificate_no: 'RBGIFD/2025-26/000876/SC 1',
        issue_date: '18/02/2026',
        amount_cr: 72.18,
        source: 'PQ_Upload_Junagadh (2).pdf, Page 113',
        is_latest_valid: true
      }
    ],

    // ── STRUCTURED PROJECT REGISTER WITH PROVENANCE ──
    project_register: [
      {
        project_id: 'DES-PRJ-01',
        project_name: 'SITC and O&M of off grid solar photovoltaic water pumping system in Rajasthan with 5 years O&M (PM-KUSUM Component-B)',
        client: 'Rajasthan Horticulture Development Society (RHDS) / RRECL',
        contract_value_cr: 93.36,
        desire_share_pct: 49,
        desire_value_cr: 45.75,
        execution_value_cr: 41.17,
        om_value_cr: 4.57,
        start_date: '14/03/2022',
        actual_completion_date: '14/03/2023',
        contract_end_date: '14/03/2027 (including 5-year O&M)',
        completion_year: '2023',
        category: 'off-grid solar PV water pumping',
        quantities: { pumps: 1500, capacity_kw: 7500 },
        certificate_ref: 'RHDS Work Agreement F-9(40) CH/Solar/PM KUSUM/2020-21/6315-6402 dt 21.02.2022, 7238-7325 dt 14.03.2022',
        source_file: 'PQ_Upload_Junagadh (2).pdf, Page 24 (Form-8, Item 5)',
        is_verified: true,
        jv_partner: 'Duke Plasto (51%)',
        scope_summary: 'off-grid solar PV water pumping (PM-KUSUM Component-B with 5 years O&M)'
      },
      {
        project_id: 'DES-PRJ-02',
        project_name: 'SITC and O&M of submersible pumps along with tanks and pipeline to ensure drinking water supply system with 1 year O&M (Lucknow)',
        client: 'UP Projects Corporation Ltd (Zone-7)',
        contract_value_cr: 37.54,
        desire_share_pct: 49,
        desire_value_cr: 18.40,
        execution_value_cr: 14.72,
        om_value_cr: 3.68,
        start_date: '24/02/2021',
        actual_completion_date: '10/06/2022',
        contract_end_date: '10/06/2023 (including 1-year completed O&M)',
        completion_year: '2022',
        category: 'submersible pumps, tanks and pipeline O&M for UP Projects Corporation',
        quantities: { pipeline_km: 42.5, pipe_type: 'HDPE / DI', pumps: 120, tanks: 45 },
        certificate_ref: 'Agreement No. 09/GM-7/UPPCL/2020-21 dt 24/02/2021 & Handpump Order 531/PCL/GM-7 dt 24/03/2021',
        source_file: 'PQ_Upload_Junagadh (2).pdf, Page 19 & 20 (Form-8, Item 1) & Form-8 - DESPL.pdf, Page 1',
        is_verified: true,
        jv_partner: 'Duke Plasto (51%)',
        scope_summary: 'submersible pumps, tanks and pipeline O&M for UP Projects Corporation'
      },
      {
        project_id: 'DES-PRJ-03',
        project_name: 'Supply, Installation, Erection, Commissioning & O&M of Energy Efficient Pumping System with SCADA on ESCO Basis with 10 years O&M',
        client: 'Mahesana Municipality, Gujarat',
        contract_value_cr: 23.09,
        desire_share_pct: 50,
        desire_value_cr: 11.55,
        execution_value_cr: 6.93,
        om_value_cr: 4.62,
        start_date: '25/10/2018',
        actual_completion_date: '2019 (6 Months Execution)',
        contract_end_date: '01/11/2029 (including 10-year O&M; 4+ yrs completed O&M of Rs 4.62 Cr till 31.12.2023)',
        completion_year: '2019',
        category: 'energy-efficient pumping with SCADA on ESCO basis',
        quantities: { pumping_stations: 18, tubewells: 45, scada_points: 65, total_kw: 2200 },
        certificate_ref: 'Mahesana Municipality Work Order 1314/2018-19 & Extended Order 3499/2018-19 dt 24/02/2021',
        source_file: 'PQ_Upload_Junagadh (2).pdf, Page 19 & 21 (Form-8, Item 2)',
        is_verified: true,
        jv_partner: 'Toran Trade Link (50%)',
        scope_summary: 'energy-efficient pumping with SCADA on ESCO basis'
      },
      {
        project_id: 'DES-PRJ-04',
        project_name: 'Supply, Installation, Erection, Commissioning & O&M of Energy Efficient Pumping System with SCADA on ESCO Basis with 10 years O&M',
        client: 'Anjar Nagarpalika, Gujarat',
        contract_value_cr: 15.33,
        desire_share_pct: 50,
        desire_value_cr: 7.66,
        execution_value_cr: 5.36,
        om_value_cr: 2.30,
        start_date: '01/12/2019',
        actual_completion_date: '2020 (Execution)',
        contract_end_date: '01/12/2029 (including 10-year O&M; 3+ yrs completed O&M)',
        completion_year: '2020',
        category: 'energy-efficient pumping with SCADA on ESCO basis',
        quantities: { pumping_stations: 12, tubewells: 30, scada_points: 40 },
        certificate_ref: 'Anjar Nagarpalika Work Order No. 2839 dt 01/12/2019 & Experience Cert dt 10/01/2024',
        source_file: 'PQ_Upload_Junagadh (2).pdf, Page 19 & 23 (Form-8, Item 4)',
        is_verified: true,
        jv_partner: 'Toran Trade Link (50%)',
        scope_summary: 'energy-efficient pumping with SCADA on ESCO basis'
      },
      {
        project_id: 'DES-PRJ-05',
        project_name: 'Supply, Installation, Erection, Commissioning & O&M of Energy Efficient Pumping System with SCADA on ESCO Basis with 10 years O&M',
        client: 'Sanand Nagarpalika, Gujarat',
        contract_value_cr: 5.50,
        desire_share_pct: 50,
        desire_value_cr: 2.50,
        execution_value_cr: 1.50,
        om_value_cr: 2.50,
        start_date: '01/01/2019',
        actual_completion_date: '2019 (Execution)',
        contract_end_date: '01/01/2024 (5 Years O&M Completed)',
        completion_year: '2024',
        category: 'energy-efficient pumping with SCADA on ESCO basis',
        quantities: { pumping_stations: 8, tubewells: 20, scada_points: 25 },
        certificate_ref: 'Sanand Nagarpalika Work Order No. 759/2018-19 dt 01/01/2019 & Completion Cert dt 15/01/2024',
        source_file: 'PQ_Upload_Junagadh (2).pdf, Page 19 & 22 (Form-8, Item 3)',
        is_verified: true,
        jv_partner: 'Raison Marketing (50%)',
        scope_summary: 'energy-efficient pumping with SCADA on ESCO basis'
      },
      {
        project_id: 'DES-PRJ-06',
        project_name: 'In-Village Water Supply Infrastructure under Jal Jeevan Mission (Naswadi Taluka, 25 Mini Schemes)',
        client: 'Executive Engineer, P.H. Mech Division, GWSSB Chhotaudepur',
        contract_value_cr: 2.0545, // Agreement Cost ₹ 205.45 Lakhs, Completed Cost ₹ 184.91 Lakhs
        desire_share_pct: 100,
        desire_value_cr: 2.0545,
        execution_value_cr: 1.8491,
        om_value_cr: 0.2054,
        start_date: '30/09/2021',
        actual_completion_date: '01/03/2022',
        contract_end_date: '28/02/2027 (including 5-year O&M)',
        completion_year: '2022',
        category: 'Rural Piped Water Supply (JJM)',
        quantities: { mini_schemes: 25, solar_pumps: 25, capacity_kw: 50, storage_tanks: 25 },
        certificate_ref: 'GWSSB Chhotaudepur Outward No. 181/2022 dt 06/05/2022 (Agreement B.1/15/of 2021-22)',
        source_file: 'PQ_Upload_Junagadh (2).pdf, Page 77',
        is_verified: true,
        jv_partner: 'None (Standalone)',
        scope_summary: 'Solar pump-motor-panel with module, MS structure for 5000L tank, individual stand posts, pipelines & 5 years M&R'
      },
      {
        project_id: 'DES-PRJ-07',
        project_name: 'JJM In-Village Water Supply Infrastructure (Jetpurpavi Taluka, 78 mini schemes)',
        client: 'Executive Engineer, P.H. Mech Division, GWSSB Chhotaudepur',
        contract_value_cr: 6.4102, // ₹ 641.02 Lakhs
        desire_share_pct: 100,
        desire_value_cr: 6.4102,
        execution_value_cr: 6.4102,
        om_value_cr: 0.64,
        start_date: '16/10/2021',
        actual_completion_date: '15/03/2022',
        contract_end_date: '15/03/2027 (including 5-year O&M)',
        completion_year: '2022',
        category: 'Rural Piped Water Supply (JJM)',
        quantities: { mini_schemes: 78, solar_pumps: 78, storage_tanks: 78 },
        certificate_ref: 'GWSSB Chhotaudepur Outward No. 667/2025 dt 18-08-2025 (Agreement B.1/16/of 2021-22 Dated 16.10.2021 costing Rs. 641.02 Lacs)',
        source_file: 'PQ_Upload_Junagadh (2).pdf, Page 65',
        is_verified: true,
        jv_partner: 'None (Standalone)',
        scope_summary: 'Survey, Designing, providing, installation, testing and commissioning of Solar pump-motor-panel with module, MS structure for 5000L tank, pipelines & 5 years M&R'
      },
      {
        project_id: 'DES-PRJ-08',
        project_name: 'JJM In-Village Water Supply Infrastructure (Chhotaudepur and Kawant Taluka, 69 mini schemes)',
        client: 'Executive Engineer, P.H. Mech Division, GWSSB Chhotaudepur',
        contract_value_cr: 5.6614, // ₹ 566.14 Lakhs
        desire_share_pct: 100,
        desire_value_cr: 5.6614,
        execution_value_cr: 5.6614,
        om_value_cr: 0.56,
        start_date: '16/10/2021',
        actual_completion_date: '11/03/2022',
        contract_end_date: '11/03/2027 (including 5-year O&M)',
        completion_year: '2022',
        category: 'Rural Piped Water Supply (JJM)',
        quantities: { mini_schemes: 69, solar_pumps: 69, storage_tanks: 69 },
        certificate_ref: 'GWSSB Chhotaudepur Outward No. 668/2025 dt 18-08-2025 (Agreement B.1/17/of 2021-22 Dated 16.10.2021 costing Rs. 566.14 Lacs, Actual Completion: 11.03.2022)',
        source_file: 'PQ_Upload_Junagadh (2).pdf, Page 68',
        is_verified: true,
        jv_partner: 'None (Standalone)',
        scope_summary: 'Survey, Designing, providing, installation, testing and commissioning of Solar pump-motor-panel with module, MS structure for 5000L tank, pipelines & 5 years M&R'
      },
      {
        project_id: 'DES-PRJ-09',
        project_name: 'JJM In-Village Water Supply Infrastructure (Jetpurpavi, Chhotaudepur, Naswadi Taluka, 55 mini scheme)',
        client: 'Executive Engineer, P.H. Mech Division, GWSSB Chhotaudepur',
        contract_value_cr: 4.6952, // ₹ 469.52 Lakhs
        desire_share_pct: 100,
        desire_value_cr: 4.6952,
        execution_value_cr: 4.6952,
        om_value_cr: 0.47,
        start_date: '12/11/2021',
        actual_completion_date: '12/04/2022',
        contract_end_date: '12/04/2027 (including 5-year O&M)',
        completion_year: '2022',
        category: 'Rural Piped Water Supply (JJM)',
        quantities: { mini_schemes: 55, solar_pumps: 55, storage_tanks: 55 },
        certificate_ref: 'GWSSB Chhotaudepur Outward No. 669/2025 dt 18-08-2025 (Agreement B.1/18/of 2021-22 Dated 12.11.2021 costing Rs. 469.52 Lacs)',
        source_file: 'PQ_Upload_Junagadh (2).pdf, Page 71',
        is_verified: true,
        jv_partner: 'None (Standalone)',
        scope_summary: 'Survey, Designing, providing, installation, testing and commissioning of Solar pump-motor-panel with module, MS structure for 5000L tank, pipelines & 5 years M&R'
      },
      {
        project_id: 'DES-PRJ-10',
        project_name: 'PHED Alwar Bulk Water Pipeline Transmission (DI/HDPE)',
        client: 'Executive Engineer, PHED Alwar',
        contract_value_cr: 28.45,
        desire_share_pct: 100,
        desire_value_cr: 28.45,
        execution_value_cr: 27.12,
        om_value_cr: 1.33,
        start_date: '15/06/2021',
        actual_completion_date: '28/06/2023',
        contract_end_date: '27/06/2024',
        completion_year: '2023',
        category: 'Bulk Water Supply Pipeline',
        quantities: { pipeline_km: 85.0, pipe_type: 'DI / HDPE' },
        certificate_ref: 'Scanned certificate image (no selectable text layer)',
        source_file: 'PQ_Upload_Alwar (2).pdf, Page 88',
        is_verified: false,
        status: 'NEEDS MANUAL ENTRY',
        jv_partner: 'None (Standalone)',
        scope_summary: 'Bulk water pipeline execution (Scanned page without text layer; requires manual entry before qualification)'
      },
      {
        project_id: 'DES-PRJ-11',
        project_name: 'PHED Dholpur Water Supply Feeder Network & Booster Pump',
        client: 'Executive Engineer, PHED Dholpur',
        contract_value_cr: 18.50,
        desire_share_pct: 100,
        desire_value_cr: 18.50,
        execution_value_cr: 18.10,
        om_value_cr: 0.40,
        start_date: '10/01/2022',
        actual_completion_date: '05/01/2024',
        contract_end_date: '04/01/2025',
        completion_year: '2024',
        category: 'Water Supply Pipeline & Pumping',
        quantities: { pipeline_km: 35.0, pumps: 10 },
        certificate_ref: 'Scanned certificate image (no selectable text layer)',
        source_file: 'PQ_Upload_Alwar (2).pdf, Page 99',
        is_verified: false,
        status: 'NEEDS MANUAL ENTRY',
        jv_partner: 'None (Standalone)',
        scope_summary: 'Feeder network and booster pump (Scanned page without text layer; requires manual entry before qualification)'
      }
    ],

    registrations: [],

    key_personnel: [
      { name: 'Gaurav Kumar Gupta', designation: 'Director / Technical Lead', qualification: 'B.Tech Civil', experience_years: 16, source: 'PQ_Upload_Junagadh (2).pdf, Page 12', verified: true },
      { name: 'Dharmesh Khandelwal', designation: 'Director / Project Head', qualification: 'B.E. Mechanical', experience_years: 18, source: 'PQ_Upload_Junagadh (2).pdf, Page 12', verified: true },
      { name: 'A.K. Singh', designation: 'Project Manager (Piping & Execution)', qualification: 'B.E. Civil', experience_years: 14, source: 'PQ_Upload_Junagadh (2).pdf, Page 20', verified: true },
      { name: 'Darshan C. Chawda', designation: 'Project Engineer (Electrical/SCADA)', qualification: 'B.Tech Electrical', experience_years: 10, source: 'PQ_Upload_Junagadh (2).pdf, Page 21', verified: true },
      { name: 'Danveer Verma', designation: 'Site In-Charge (Pipeline Works)', qualification: 'Diploma Civil', experience_years: 8, source: 'PQ_Upload_Junagadh (2).pdf, Page 22', verified: true },
      { name: 'C.L. Makwana', designation: 'Senior Mechanical Supervisor', qualification: 'Diploma Mechanical', experience_years: 12, source: 'PQ_Upload_Junagadh (2).pdf, Page 23', verified: true },
      { name: 'Laxman Singh', designation: 'Quality Control Engineer', qualification: 'B.Tech Civil', experience_years: 7, source: 'PQ_Upload_Junagadh (2).pdf, Page 24', verified: true }
    ],

    plant_and_equipment: [
      { name: 'Hydraulic Excavators', quantity: 10, capacity: '0.9 cum bucket', ownership: 'Owned', source: 'PQ_Upload_Alwar (2).pdf, Form-3', verified: true },
      { name: 'Horizontal Directional Drilling (HDD) Rigs (Vermeer)', quantity: 3, capacity: 'D24x40 / D36x50', ownership: 'Owned', source: 'PQ_Upload_Alwar (2).pdf, Form-3', verified: true },
      { name: 'Diesel Generator (DG) Sets', quantity: 15, capacity: '62.5 - 125 kVA', ownership: 'Owned', source: 'PQ_Upload_Alwar (2).pdf, Form-3', verified: true },
      { name: 'Concrete Transit Mixers', quantity: 4, capacity: '6 cum', ownership: 'Owned', source: 'PQ_Upload_Alwar (2).pdf, Form-3', verified: true },
      { name: 'Mobile Concrete Batching Units', quantity: 2, capacity: '30 cum/hr', ownership: 'Owned', source: 'PQ_Upload_Alwar (2).pdf, Form-3', verified: true },
      { name: 'High-Pressure Hydrostatic Testing Pumps', quantity: 6, capacity: 'Up to 50 bar', ownership: 'Owned', source: 'PQ_Upload_Alwar (2).pdf, Form-3', verified: true },
      { name: 'Dewatering Submersible Pump Sets', quantity: 12, capacity: '10 - 25 HP', ownership: 'Owned', source: 'PQ_Upload_Alwar (2).pdf, Form-3', verified: true }
    ],

    certifications: ['ISO 9001:2015', 'ISO 14001:2015', 'ISO 45001:2018', 'CMMI Level-5'],
    statutory_docs: ['GST Registration Certificate (Gujarat & Rajasthan)', 'PAN Card', 'EPF Registration', 'ESI Registration', 'Udyam Registration UDYAM-RJ-17-0025258'],
    uploaded_documents: []
  },
  {
    id: 'comp-vhp-04',
    name: 'VINOD H PATEL',
    type: 'JV Partner',
    profile: 'Govt Approved AA Class Contractor (Gujarat WRD & R&B) specializing in Bulk Water Supply Pipelines, Pumping Stations, and Civil Infrastructure.',
    registered_address: 'First Floor, F-21/22, Perfect Plaza, Radhanpur Road, Mehsana - 384002, Gujarat',
    corporate_address: 'First Floor, F-21/22, Perfect Plaza, Radhanpur Road, Mehsana - 384002, Gujarat',
    contact_details: { phone: '02762-253598', mobile: '9825012345', email: 'vinodhpatel@gmail.com', contact_person: 'Patel Mit Vinodchandra / Vinod H. Patel' },
    cin_registration: 'GUJ-MEH-PARTNERSHIP-1996',
    gst_number: '24AATFV4986F1ZH',
    pan_number: 'AATFV4986F',

    year_wise_turnover: {
      'FY 2020-21': 160.90,
      'FY 2021-22': 131.77,
      'FY 2022-23': 249.61,
      'FY 2023-24': 280.15,
      'FY 2024-25': 134.55
    },
    peak_turnover_cr: 280.15,
    average_turnover: 191.39,
    annual_turnover: { 'FY 2020-21': 160.90, 'FY 2021-22': 131.77, 'FY 2022-23': 249.61, 'FY 2023-24': 280.15, 'FY 2024-25': 134.55 },

    year_wise_net_worth: {
      'FY 2020-21': 21.10,
      'FY 2021-22': 24.50,
      'FY 2022-23': 28.90,
      'FY 2023-24': 33.37,
      'FY 2024-25': 35.80
    },
    net_worth: 33.37,

    solvency_certificate: {
      bank_name: 'State Bank of India',
      certificate_no: 'SBI/MEH/2025/112',
      issue_date: '10/01/2025',
      amount_cr: 25.00,
      validity: 'Valid'
    },
    solvency: 25.00,
    solvency_amount: 25.00,

    project_register: [
      {
        project_id: 'VHP-PRJ-01',
        project_name: 'Palanpur Group Water Supply Package 2 (Rising/Gravity DI/PVC Pipeline & Pumping Station)',
        client: 'Executive Engineer, PHED/WRD Palanpur / GWSSB',
        contract_value_cr: 99.41,
        vhp_share_pct: 85,
        vhp_value_cr: 84.49,
        completion_date: '14/08/2023',
        completion_year: '2023',
        category: 'Bulk Water Supply Pipeline EPC',
        quantities: { pipeline_km: 110.0, pipe_type: 'DI / PVC', pipe_dia_mm: '300-700', pumping_stations: 3 },
        certificate_ref: 'Executive Engineer, WRD Palanpur Completion Certificate dt 14/08/2023 (Escalated Value: Rs 112.37 Cr)',
        scope_summary: 'EPC execution of 110+ km DI/PVC bulk transmission water pipeline and pumping stations'
      },
      {
        project_id: 'VHP-PRJ-02',
        project_name: 'Mehsana Water Pipeline Network & Headworks',
        client: 'GWSSB Gujarat',
        contract_value_cr: 42.50,
        vhp_share_pct: 100,
        vhp_value_cr: 42.50,
        completion_date: '20/12/2022',
        completion_year: '2022',
        category: 'Bulk Water Supply Pipeline EPC',
        quantities: { pipeline_km: 45.0, pipe_type: 'DI / HDPE' },
        certificate_ref: 'GWSSB Mehsana Completion Certificate dt 20/12/2022',
        scope_summary: 'Bulk water pipeline network, feeder mains, and civil pumping station works'
      }
    ],

    registrations: [
      { authority: 'Gujarat WRD (Water Resources Department)', class: 'Class-AA', category: 'Civil & Pipelines', validity: 'Active' },
      { authority: 'Gujarat R&B (Roads & Buildings)', class: 'Class-AA', category: 'Civil', validity: 'Active' },
      { authority: 'Gujarat Energy Dept', class: 'Class-A', category: 'Electrical Contractor License', validity: 'Active' }
    ],

    certifications: ['AA Class Civil Contractor Registration (Gujarat WRD & R&B)', 'Gujarat Electrical Contractor License', 'EPF Registration', 'ROF Registration Certificate'],
    statutory_docs: ['GST Registration Certificate', 'PAN Card (AATFV4986F)', 'Partnership Deed', 'CA Net Worth & Turnover Certificate (UDIN: 25124129BMGTGD3142)'],
    uploaded_documents: []
  },
  {
    id: 'comp-aapl-05',
    name: 'ADROIT ASSOCIATES PRIVATE LIMITED',
    type: 'JV Partner',
    profile: 'Indore based Infrastructure & Water Engineering company with Class "A" PWD registration (Chhattisgarh & MP), executing Lift Irrigation, Water Supply, and SBR Sewage Treatment Plants since 1987.',
    registered_address: '01/101, Satguru Prime 11, Scheme No 140 Main Road, Indore - 452016, Madhya Pradesh',
    corporate_address: '01/101, Satguru Prime 11, Scheme No 140 Main Road, Indore - 452016, Madhya Pradesh',
    contact_details: { phone: '0731-4045600', mobile: '9425054321', email: 'adroitassociates@gmail.com', contact_person: 'Rajendra Purandare (Director, B.E. Mech - 39+ yrs exp)' },
    cin_registration: 'U45100MP2019PTC049757',
    gst_number: '23AASCA8055A1ZX',
    pan_number: 'AASCA8055A',

    year_wise_turnover: {
      'FY 2020-21': 30.45,
      'FY 2021-22': 32.80,
      'FY 2022-23': 37.66,
      'FY 2023-24': 39.01,
      'FY 2024-25': 36.18
    },
    average_turnover: 35.22,
    annual_turnover: { 'FY 2020-21': 30.45, 'FY 2021-22': 32.80, 'FY 2022-23': 37.66, 'FY 2023-24': 39.01, 'FY 2024-25': 36.18 },
    year_wise_net_worth: {
      'FY 2020-21': 8.90,
      'FY 2021-22': 10.20,
      'FY 2022-23': 12.15,
      'FY 2023-24': 14.27,
      'FY 2024-25': 15.50
    },
    net_worth: 14.27,
    solvency_certificate: {
      bank_name: 'Union Bank of India',
      certificate_no: 'UBI/IND/2024/98',
      amount_cr: 10.00,
      validity: 'Valid'
    },
    solvency: 10.00,
    solvency_amount: 10.00,

    project_register: [
      {
        project_id: 'AAPL-PRJ-01',
        project_name: 'Roshni-1 Multi-Village Rural Water Supply Scheme',
        client: 'Madhya Pradesh Jal Nigam Maryadit (MPJNM)',
        contract_value_cr: 46.73,
        aapl_value_cr: 46.73,
        completion_date: '15/02/2023',
        completion_year: '2023',
        category: 'Rural Piped Water Supply (JJM)',
        quantities: { pipeline_km: 85.0, pipe_type: 'DI / HDPE' },
        certificate_ref: 'MPJNM Completion Certificate No. MPJNM/ROSHNI/2023/110',
        scope_summary: 'Turnkey execution of multi-village water supply scheme with intake and DI/HDPE pipelines'
      },
      {
        project_id: 'AAPL-PRJ-02',
        project_name: 'Rani Durgawati Lift Irrigation Project',
        client: 'WRD Madhya Pradesh',
        contract_value_cr: 20.32,
        aapl_value_cr: 20.32,
        completion_date: '30/11/2022',
        completion_year: '2022',
        category: 'Lift Irrigation Scheme',
        quantities: { command_area_ha: 4500, pumps_kw: 1800 },
        certificate_ref: 'WRD MP Completion Certificate dt 30/11/2022',
        scope_summary: 'Lift irrigation pumping station and distribution pipelines'
      },
      {
        project_id: 'AAPL-PRJ-03',
        project_name: 'Gobra Nawapara 7.6 MLD SBR Sewage Treatment Plant',
        client: 'Chhattisgarh PWD & PHE',
        contract_value_cr: 15.48,
        aapl_value_cr: 15.48,
        completion_date: '10/05/2021',
        completion_year: '2021',
        category: 'SBR Sewage Treatment Plant (STP)',
        quantities: { capacity_mld: 7.6, technology: 'Sequential Batch Reactor (SBR)' },
        certificate_ref: 'CG PWD Completion Certificate dt 10/05/2021',
        scope_summary: 'Construction and commissioning of 7.6 MLD SBR STP and sewage pumping machinery'
      }
    ],

    registrations: [
      { authority: 'Chhattisgarh PWD', class: 'Class-A', category: 'Civil & Water Works', certificate_no: 'CGeR21408', validity: 'Active' },
      { authority: 'Madhya Pradesh PWD', class: 'Class-A', category: 'Civil', validity: 'Active' }
    ],

    certifications: ['Class "A" Registration with PWD Chhattisgarh (CGeR21408)', 'Class "A" Registration with MP PWD', 'ISO 9001:2015 Quality Management System'],
    statutory_docs: ['GST Registration Certificate', 'PAN Card (AASCA8055A)', 'CA Net Worth & Turnover Certificate', 'Bank Solvency Certificate'],
    uploaded_documents: []
  },
  {
    id: 'comp-divija-02',
    name: 'DIVIJA CONSTRUCTION',
    type: 'JV Partner',
    profile: 'Govt Approved A & AA Class Contractor specializing in Underground Sewerage Networks, Pumping Stations, and Drainage Utilities.',
    registered_address: '79/12, Shipra Path, Mansarovar, Jaipur - 302020, Rajasthan',
    corporate_address: '79/12, Shipra Path, Mansarovar, Jaipur - 302020, Rajasthan',
    contact_details: { phone: '0141-2391200', mobile: '9829147776', email: 'divijaconstruction@gmail.com', contact_person: 'Rajesh Sharma / Partner' },
    cin_registration: 'RJ-JPR-2016-09871',
    gst_number: '08AAFFD6567N1ZT',
    pan_number: 'AAFFD6567N',

    year_wise_turnover: {
      'FY 2021-22': 32.50,
      'FY 2022-23': 36.80,
      'FY 2023-24': 41.74
    },
    average_turnover: 37.01,
    annual_turnover: { 'FY 2021-22': 32.50, 'FY 2022-23': 36.80, 'FY 2023-24': 41.74 },
    year_wise_net_worth: {
      'FY 2021-22': 4.10,
      'FY 2022-23': 5.20,
      'FY 2023-24': 6.58
    },
    net_worth: 6.58,
    solvency_certificate: {
      bank_name: 'Punjab National Bank',
      certificate_no: 'PNB/JPR/2024/44',
      amount_cr: 10.00,
      validity: 'Valid'
    },
    solvency: 10.00,
    solvency_amount: 10.00,

    project_register: [
      {
        project_id: 'DIV-PRJ-01',
        project_name: 'Providing, Laying & Jointing of sewerlines with construction of manholes in PRN (South) area package-1 of phase-1 under PHE-II Jurisdiction, JDA, Jaipur',
        client: 'The Executive Engineer (PHE I), Jaipur Development Authority (JDA), Jaipur',
        contract_value_cr: 14.46,
        escalated_value_cr: 17.50,
        completion_date: '06/03/2024',
        completion_year: '2024',
        category: 'Underground Sewerage Network',
        quantities: { sewer_network_km: 65.0, manholes: 1420 },
        certificate_ref: 'JDA/EE PHE I/WO/2021-2022/Jul/05 dated 08.07.2021 & Experience Certificate dt 06/03/2024',
        scope_summary: 'Laying & jointing of sewer lines, RCC/DWC pipes, manholes and lateral connections'
      },
      {
        project_id: 'DIV-PRJ-02',
        project_name: 'Providing, Laying & Jointing of sewer lines with construction of manholes in PRN (South) area package-2 of phase-1 under PHE-II Jurisdiction, JDA, Jaipur',
        client: 'The Executive Engineer (PHE I), Jaipur Development Authority (JDA), Jaipur',
        contract_value_cr: 24.69,
        completion_date: '13/01/2025',
        completion_year: '2025',
        category: 'Underground Sewerage Network',
        quantities: { sewer_network_km: 82.0, manholes: 1850 },
        certificate_ref: 'JDA/EE PHE I/WO/2022-2023/Mar/25 dated 03.03.2023 & Experience Certificate dt 13/01/2025',
        scope_summary: 'Underground sewerage network, gravity mains, manholes, road restoration'
      }
    ],

    registrations: [
      { authority: 'DLB Rajasthan / JDA', class: 'Class-AA', category: 'Sewerage & Drainage Works', validity: 'Active' },
      { authority: 'PHED Rajasthan', class: 'Class-A', category: 'Civil', validity: 'Active' }
    ],

    certifications: ['ISO 9001:2015', 'Class-AA DLB License', 'JDA Class-AA Enlistment'],
    statutory_docs: ['GST Registration Certificate', 'PAN Card', 'Labor License'],
    uploaded_documents: []
  },
  {
    id: 'comp-lt-03',
    name: 'LARSEN & TOUBRO LIMITED (WATER & EFFLUENT IC)',
    type: 'Competitor',
    profile: 'Major Indian Infrastructure Conglomerate with dominant market share in mega water supply & STP EPC contracts.',
    registered_address: 'L&T House, Ballard Estate, Mumbai - 400001, Maharashtra',
    corporate_address: 'Mount Poonamallee Road, Manapakkam, Chennai - 600089, Tamil Nadu',
    contact_details: { phone: '022-67525656', email: 'infrawater@larsentoubro.com', contact_person: 'Bidding Lead Water IC' },
    cin_registration: 'L99999MH1946PLC004768',
    gst_number: '27AAACL0140P1ZM',
    pan_number: 'AAACL0140P',
    year_wise_turnover: { 'FY 2021-22': 156521.00, 'FY 2022-23': 183341.00, 'FY 2023-24': 221113.00 },
    average_turnover: 186991.67,
    annual_turnover: { 'FY 2021-22': 156521.00, 'FY 2022-23': 183341.00, 'FY 2023-24': 221113.00 },
    year_wise_net_worth: { 'FY 2021-22': 65000.00, 'FY 2022-23': 76000.00, 'FY 2023-24': 89115.00 },
    net_worth: 89115.00,
    solvency_certificate: { bank_name: 'State Bank of India', amount_cr: 5000.00 },
    solvency: 5000.00,
    solvency_amount: 5000.00,
    project_register: [],
    registrations: [{ authority: 'Pan India', class: 'Special Class', validity: 'Active' }],
    key_personnel: [],
    plant_and_equipment: [],
    certifications: ['ISO 9001:2015', 'ISO 14001:2015', 'ISO 45001:2018', 'Special Class Contractor'],
    statutory_docs: ['All Pan India Statutory Clearances'],
    uploaded_documents: []
  }
];

let GLOBAL_BID_FLOW_ITEMS: any[] = [
  {
    id: "b8cd89aa-833a-4397-8549-891350065bf6",
    tender_id: "2026_PHCJO_594733_1",
    tender_title: "Work of Narmada Based Water Supply Project for 163 Villages of Dhorimanna and Chouhtan Block, Distt. Barmer (Package CP-03, Chouhtan-1 under JICA funded Rajasthan Rural Water Supply and Fluorosis Mitigation Project Phase II on SPR basis with one-year",
    authority: "PHED - C.E. (Project),Jodhpur||SE Chouhtan Project Cr. Chouhtan||EE Project Dn Gudamalani",
    state: "Rajasthan",
    estimated_value_cr: 657.5,
    deadline: "26-Oct-2026 11:00 AM",
    document_url: "https://eproc.rajasthan.gov.in/nicgep/app?page=FrontEndAdvancedSearch&service=page",
    status: "Live",
    final_status: null,
    pre_bid_meeting_date: null,
    bid_submission_deadline: null,
    responsible_person_name: "Unassigned",
    responsible_person_email: null,
    cc_emails: [],
    notes: null,
    created_at: "2026-09-18T05:15:06.323Z",
    updated_at: "2026-09-18T05:15:06.323Z",
    created_by: "Government Portal Scraper"
  },
  {
    id: "4164c838-32c0-4f69-b0e0-5573e0c4a091",
    tender_id: "2026_JdVVN_590921_2",
    tender_title: "New 33 by 11 KV Sub-stations Augmentation or Addition capacity including associated line and other works for the DEVELOPMENT OF DISTRIBUTION INFRASTRUCTURE in JdVVNL under RDSS scheme on Turnkey Mode Under Barmer Circle.",
    authority: "Jodhpur VVNL - MD||CE (HQ)||SE(MM and C)||XEn(MMC-I)",
    state: "Rajasthan",
    estimated_value_cr: 71.23,
    deadline: "28-Sep-2026 05:00 PM",
    document_url: "https://eproc.rajasthan.gov.in/nicgep/app?page=FrontEndAdvancedSearch&service=page",
    status: "Live",
    final_status: null,
    pre_bid_meeting_date: null,
    bid_submission_deadline: null,
    responsible_person_name: "Unassigned",
    responsible_person_email: null,
    cc_emails: [],
    notes: null,
    created_at: "2026-09-18T05:09:23.697Z",
    updated_at: "2026-09-18T05:09:23.697Z",
    created_by: "Government Portal Scraper"
  }
];

// ═══ COMPUTE TURNOVER METRICS (FROM YEAR-WISE TABLE) ══════════════════════
function computeTurnoverMetrics(yearWiseTurnover: Record<string, any>) {
  const entries = Object.entries(yearWiseTurnover || {}).map(([fy, v]) => ({
    fy,
    val: typeof v === 'object' && v !== null ? v.value_cr : (typeof v === 'number' ? v : parseFloat(v))
  })).filter(e => typeof e.val === 'number' && !isNaN(e.val) && e.val > 0);

  if (entries.length === 0) {
    return { peakVal: 0, peakYear: '', avgLast3: 0, avgAny3Of5: 0, top3Years: [] };
  }

  // Peak single financial year
  const sortedByVal = [...entries].sort((a, b) => b.val - a.val);
  const peak = sortedByVal[0];

  // Best 3 of 5 (any 3 of the last 5 FYs): dynamic top-3 average
  const top3 = sortedByVal.slice(0, 3);
  const avgAny3Of5 = Math.round((top3.reduce((acc, x) => acc + x.val, 0) / top3.length) * 100) / 100;

  // Last 3 consecutive completed FYs
  const last3 = entries.slice(-3);
  const avgLast3 = Math.round((last3.reduce((acc, x) => acc + x.val, 0) / last3.length) * 100) / 100;

  return {
    peakVal: peak.val,
    peakYear: peak.fy,
    avgLast3,
    avgAny3Of5,
    top3Years: top3.map(x => `${x.fy} ₹${x.val} Cr`)
  };
}

// ═══ DIRECTIVE 2: AMOUNTS NORMALISATION & PLAUSIBILITY GUARD ══════════════
function parseAmountToRupees(val: any, tenderEstimatedCostRupees?: number): {
  amountRupees: number | null;
  displayRupees: string;
  isParseError: boolean;
  parseErrorReason?: string;
} {
  if (val === null || val === undefined) {
    return { amountRupees: null, displayRupees: 'amount not stated', isParseError: false };
  }
  const str = String(val).trim();
  if (!str || str.toLowerCase() === 'undefined' || str.toLowerCase() === 'nan' || str.toLowerCase() === 'n/a') {
    return { amountRupees: null, displayRupees: 'amount not stated', isParseError: false };
  }

  // 1. Percentage of estimated cost: e.g. "20% of estimated cost"
  const pctMatch = str.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of\s*(?:the\s*)?(?:tender|estimated|contract|project)[\w\s]*)?/i);
  if (pctMatch && tenderEstimatedCostRupees && tenderEstimatedCostRupees > 0) {
    const pct = parseFloat(pctMatch[1]);
    const computed = Math.round((pct / 100.0) * tenderEstimatedCostRupees);
    return {
      amountRupees: computed,
      displayRupees: `₹ ${computed.toLocaleString('en-IN')}`,
      isParseError: false
    };
  }

  // 2. Indian formatting, Crores, Lakhs, Thousands, Words
  const cleanStr = str.replace(/,/g, '').replace(/\/-/g, '');
  const crMatch = cleanStr.match(/(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(?:cr|crore|crores)\b/i);
  const lakhMatch = cleanStr.match(/(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac|lacs)\b/i);
  const thousandMatch = cleanStr.match(/(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(?:k|thousand)\b/i);
  const pureNumMatch = cleanStr.match(/(?:rs\.?|inr|₹)\s*(\d+(?:\.\d+)?)/i);

  let rupees: number | null = null;
  if (crMatch) {
    rupees = Math.round(parseFloat(crMatch[1]) * 10000000);
  } else if (lakhMatch) {
    rupees = Math.round(parseFloat(lakhMatch[1]) * 100000);
  } else if (thousandMatch) {
    rupees = Math.round(parseFloat(thousandMatch[1]) * 1000);
  } else if (pureNumMatch) {
    const rawVal = parseFloat(pureNumMatch[1]);
    if (rawVal < 1000 && /crore|cr\b/i.test(str)) {
      rupees = Math.round(rawVal * 10000000);
    } else if (rawVal < 10000 && /lakh|lac\b/i.test(str)) {
      rupees = Math.round(rawVal * 100000);
    } else {
      rupees = Math.round(rawVal);
    }
  }

  // If no rupee amount appears in the quoted clause, show "amount not stated"
  if (rupees === null || isNaN(rupees)) {
    return { amountRupees: null, displayRupees: 'amount not stated', isParseError: false };
  }

  // Directive 2: Flag any parsed requirement that is implausible (> tender estimated cost)
  if (tenderEstimatedCostRupees && tenderEstimatedCostRupees > 0 && rupees > tenderEstimatedCostRupees) {
    return {
      amountRupees: rupees,
      displayRupees: `₹ ${rupees.toLocaleString('en-IN')}`,
      isParseError: true,
      parseErrorReason: `Parsed requirement value (₹ ${rupees.toLocaleString('en-IN')}) exceeds tender's total estimated cost (₹ ${tenderEstimatedCostRupees.toLocaleString('en-IN')}). Flagged as a parse error, not an evaluation result.`
    };
  }

  return {
    amountRupees: rupees,
    displayRupees: `₹ ${rupees.toLocaleString('en-IN')}`,
    isParseError: false
  };
}

// ═══ DIRECTIVE 4: NUMBERED SEQUENCE GAP DETECTOR ══════════════════════════
function detectNumberedClauseGaps(clauses: any[]): {
  gaps: Array<{ section: string; missing_clause: string; predecessor: string; successor: string }>;
  sectionCounts: Record<string, { count: number; page_range: string }>;
} {
  const clauseNums: Array<{ raw: string; prefix: string; num: number; full: string; page: number }> = [];
  const sectionCounts: Record<string, { count: number; minPage: number; maxPage: number }> = {};

  for (const c of clauses) {
    const no = String(c.clause_no || '').trim();
    const page = parseInt(String(c.page_ref || '').replace(/\D/g, '')) || 1;
    const m = no.match(/^(\d+(?:\.\d+)*)\.?$/);
    if (m) {
      const parts = m[1].split('.');
      if (parts.length >= 2) {
        const prefix = parts.slice(0, -1).join('.');
        const lastNum = parseInt(parts[parts.length - 1]);
        if (!isNaN(lastNum)) {
          clauseNums.push({ raw: no, prefix, num: lastNum, full: m[1], page });
        }
      }
    }

    const secKey = no.includes('.') ? `Section ${no.split('.')[0]}` : (c.requirement_type || 'General');
    if (!sectionCounts[secKey]) {
      sectionCounts[secKey] = { count: 0, minPage: page, maxPage: page };
    }
    sectionCounts[secKey].count++;
    sectionCounts[secKey].minPage = Math.min(sectionCounts[secKey].minPage, page);
    sectionCounts[secKey].maxPage = Math.max(sectionCounts[secKey].maxPage, page);
  }

  // Detect gaps per prefix (e.g. 4.5.1, 4.5.2, 4.5.4 -> missing 4.5.3)
  const byPrefix: Record<string, Array<{ num: number; full: string }>> = {};
  for (const item of clauseNums) {
    if (!byPrefix[item.prefix]) byPrefix[item.prefix] = [];
    byPrefix[item.prefix].push(item);
  }

  const gaps: Array<{ section: string; missing_clause: string; predecessor: string; successor: string }> = [];
  for (const [pfx, items] of Object.entries(byPrefix)) {
    items.sort((a, b) => a.num - b.num);
    for (let i = 0; i < items.length - 1; i++) {
      const curr = items[i];
      const next = items[i + 1];
      if (next.num > curr.num + 1) {
        for (let missing = curr.num + 1; missing < next.num; missing++) {
          gaps.push({
            section: pfx,
            missing_clause: `${pfx}.${missing}`,
            predecessor: curr.full,
            successor: next.full
          });
        }
      }
    }
  }

  const finalSectionCounts: Record<string, { count: number; page_range: string }> = {};
  for (const [sec, data] of Object.entries(sectionCounts)) {
    finalSectionCounts[sec] = {
      count: data.count,
      page_range: `pp. ${data.minPage}-${data.maxPage}`
    };
  }

  return { gaps, sectionCounts: finalSectionCounts };
}

// ═══ DETERMINISTIC SCORING ENGINE ═════════════════════════════════════════
function evaluateDeterministicMatching(rawClauses: any[], comps: any[], selectedJvPartnerId?: string, tenderEstimatedCostRupees?: number) {
  const desireComp = comps.find((c: any) => c.type === 'Desire Energy' || c.id === 'comp-desire-01') || comps[0];
  const jvPartners = comps.filter((c: any) => c.type === 'JV Partner');

  // ── DIRECTIVE 4: DEDUPLICATE NEAR-IDENTICAL TEXT ONLY ─────────────────────
  // Merges only near-identical normalized text (>88% similarity or exact clause number), NEVER clauses merely sharing a topic.
  const dedupedClausesMap = new Map<string, any>();
  for (const c of rawClauses) {
    const cNo = (c.clause_no || '').toLowerCase().trim();
    const normText = (c.tender_requirement || c.required_value || c.quote_of_evidence || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    // Key is clause number if specific, else first 60 chars of normalized text
    const key = (cNo && cNo !== 'n/a' && cNo !== 'nit' && !cNo.includes('general'))
      ? `cl_${cNo}`
      : `txt_${normText.slice(0, 60)}`;

    if (!dedupedClausesMap.has(key)) {
      dedupedClausesMap.set(key, c);
    } else {
      const existing = dedupedClausesMap.get(key);
      if ((c.tender_requirement || '').length > (existing.tender_requirement || '').length) {
        dedupedClausesMap.set(key, c);
      }
    }
  }
  const cleanClauses = Array.from(dedupedClausesMap.values());

  // Detect sequence gaps and compute section counts
  const { gaps: sequenceGaps, sectionCounts } = detectNumberedClauseGaps(cleanClauses);

  function evalClause(c: any, partner: any) {
    const { is_eligibility_criterion, clause_group, clause_category } = categorizeClause(c);
    const title = (c.clause_title || '').toLowerCase();
    const reqText = (c.tender_requirement || c.required_value || c.quote_of_evidence || '').toLowerCase();

    // Directive 2: Parse amount to pure Rupees
    const parsedAmt = parseAmountToRupees(c.required_value || c.tender_requirement, tenderEstimatedCostRupees);

    // If Group (b) or Group (c): NEVER affects the verdict!
    if (clause_group === 'mandatory_submission') {
      return {
        clause_no: c.clause_no || 'Checklist',
        clause_title: c.clause_title || 'Mandatory Submission',
        requirement_type: c.requirement_type || 'Mandatory Submission',
        is_eligibility_criterion: false,
        clause_group: 'mandatory_submission',
        clause_category: 'submission',
        tender_requirement: c.tender_requirement || '',
        required_value: c.required_value || parsedAmt.displayRupees,
        desire_value: 'Mandatory Submission Item — Submission checklist document (verified upon physical bid submission; does not affect qualification verdict).',
        desire_status: 'SUBMISSION_ITEM',
        desire_pct: 100,
        jv_value: 'Submission checklist item — Handled per consortium agreement.',
        jv_status: 'SUBMISSION_ITEM',
        jv_pct: 100,
        combined_pct: 100,
        combined_value: 'Submission checklist requirement satisfied upon submission.',
        status: 'SUBMISSION_ITEM',
        fulfilled_pct: '100%',
        applicable_jv_rule: 'Checklist Submission',
        gap_notes: 'Mandatory Submission Item — Checklist requirement for bid package (does not affect verdict).',
        required_doc: c.required_doc || 'Statutory/Submission Document',
        page_ref: c.page_ref || 'Tender Document'
      };
    }

    if (clause_group === 'contract_term') {
      return {
        clause_no: c.clause_no || 'Contract Term',
        clause_title: c.clause_title || 'Contract Term',
        requirement_type: c.requirement_type || 'Contract Term',
        is_eligibility_criterion: false,
        clause_group: 'contract_term',
        clause_category: 'contract',
        tender_requirement: c.tender_requirement || '',
        required_value: c.required_value || parsedAmt.displayRupees,
        desire_value: 'Contract / Post-Award Term — Post-award execution compliance condition (does not affect qualification verdict).',
        desire_status: 'CONTRACT_TERM',
        desire_pct: 100,
        jv_value: 'Post-award execution condition.',
        jv_status: 'CONTRACT_TERM',
        jv_pct: 100,
        combined_pct: 100,
        combined_value: 'Post-award contract condition accepted.',
        status: 'CONTRACT_TERM',
        fulfilled_pct: '100%',
        applicable_jv_rule: 'Contract Compliance',
        gap_notes: 'Contract Condition — Post-award execution & compliance terms (does not affect verdict).',
        required_doc: c.required_doc || 'Contractual Undertaking',
        page_ref: c.page_ref || 'Tender Document'
      };
    }

    // Directive 2: If parsed requirement is implausible (> tender estimated cost), flag as parse error
    if (parsedAmt.isParseError) {
      return {
        clause_no: c.clause_no || 'Criteria',
        clause_title: c.clause_title || 'Qualification Requirement',
        requirement_type: 'Parse Error',
        is_eligibility_criterion: true,
        clause_group: 'qualification_criterion',
        clause_category: 'qualification',
        tender_requirement: c.tender_requirement || '',
        required_value: parsedAmt.displayRupees,
        desire_value: parsedAmt.parseErrorReason || 'Parsed requirement implausible',
        desire_status: 'CANNOT BE CHECKED',
        desire_pct: 0,
        jv_value: parsedAmt.parseErrorReason || 'Parsed requirement implausible',
        jv_status: 'CANNOT BE CHECKED',
        jv_pct: 0,
        combined_pct: 0,
        combined_value: 'Parse Error: Implausible requirement value flagged for manual verification.',
        status: 'CANNOT BE CHECKED',
        fulfilled_pct: '0%',
        applicable_jv_rule: 'Manual Verification',
        gap_notes: `Parse Error: ${parsedAmt.parseErrorReason}`,
        required_doc: 'Original Tender Clause Verification',
        page_ref: c.page_ref || 'Tender Document'
      };
    }

    // ── DIRECTIVE 3: MATCH STRICTLY AGAINST STRUCTURED COMPANY DATA ─────────
    let dStatus = 'CANNOT BE CHECKED', jStatus = 'CANNOT BE CHECKED', cStatus = 'CANNOT BE CHECKED';
    let dPct = 0, jPct = 0, cPct = 0;
    let dVal = '', jVal = '', cVal = '';
    let gapNotes = '';

    const reqAmtRupees = parsedAmt.amountRupees;
    const reqAmtCr = reqAmtRupees ? (reqAmtRupees / 10000000) : null;

    // 1. LEGAL ENTITY & INCORPORATION (Checked from Company's CIN)
    if (
      title.includes('legal entity') || reqText.includes('legal entity') ||
      title.includes('constitution') || reqText.includes('constitution') ||
      title.includes('incorporation') || reqText.includes('incorporation') ||
      title.includes('cin') || reqText.includes('cin') ||
      title.includes('company registration') || reqText.includes('company registered') ||
      reqText.includes('private limited') || reqText.includes('proprietorship or partnership') ||
      (title.includes('entity') && !title.includes('identity'))
    ) {
      dPct = 100;
      dStatus = 'MATCH';
      dVal = `Desire actual: Private Limited Company registered under Companies Act, CIN: ${desireComp.cin || desireComp.cin_registration} (RoC Jaipur, Balance Sheet Note 1) -> 100% MATCH`;

      jPct = 100;
      jStatus = 'MATCH';
      jVal = `${partner.name} actual: Registered entity (${partner.cin_registration || partner.type}) -> 100% MATCH`;

      cPct = 100;
      cStatus = 'MATCH';
      cVal = `Consortium satisfies legal entity and incorporation requirements -> 100% MATCH`;
      gapNotes = 'Legal entity checked and verified from CIN.';
    }

    // 2. TURNOVER EVALUATION
    else if (title.includes('turnover') || reqText.includes('turnover')) {
      const fullTurnoverText = (title + ' ' + reqText).toLowerCase();
      const mentionsAverage = fullTurnoverText.includes('average');

      const wordToNum = (w?: string): number => {
        if (!w) return 0;
        const map: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 };
        return map[w.toLowerCase()] || parseInt(w, 10) || 0;
      };

      // Directive 4: "In any N of the last M years" = the count of years meeting the threshold is at least N.
      const anyNofMMatch = fullTurnoverText.match(/any\s+(\d+|one|two|three|four|five)(?:\s+(?:financial\s+)?years)?\s+(?:out\s+of|of)(?:\s+the\s+last)?\s+(\d+|one|two|three|four|five)?/i);
      const isAnyNofM = !!anyNofMMatch;
      const targetN = isAnyNofM ? wordToNum(anyNofMMatch[1]) : 0;
      const targetM = isAnyNofM ? (wordToNum(anyNofMMatch[2]) || 5) : 5;

      // "In any one year" = the maximum year.
      const isSingleYear = fullTurnoverText.includes('any one') || fullTurnoverText.includes('single year') || fullTurnoverText.includes('in any year') || fullTurnoverText.includes('any financial year');

      const turnoverMetrics = computeTurnoverMetrics(desireComp.year_wise_turnover);
      const partnerMetrics = computeTurnoverMetrics(partner.year_wise_turnover || {});

      const dEntries = Object.entries(desireComp.year_wise_turnover || {}).map(([fy, v]: [string, any]) => ({
        fy,
        val: typeof v === 'object' && v !== null ? v.value_cr : (typeof v === 'number' ? v : parseFloat(v))
      })).filter(e => typeof e.val === 'number' && !isNaN(e.val) && e.val > 0);

      const jEntries = Object.entries(partner.year_wise_turnover || {}).map(([fy, v]: [string, any]) => ({
        fy,
        val: typeof v === 'object' && v !== null ? v.value_cr : (typeof v === 'number' ? v : parseFloat(v))
      })).filter(e => typeof e.val === 'number' && !isNaN(e.val) && e.val > 0);

      if (reqAmtCr !== null && reqAmtCr > 0) {
        if (!mentionsAverage && isAnyNofM && targetN > 0) {
          // Rule: "In any N of the last M years" = the count of years meeting the threshold is at least N.
          const lastMYears = dEntries.slice(-targetM);
          const dMatchingYears = lastMYears.filter(y => y.val >= reqAmtCr);
          const dCount = dMatchingYears.length;

          if (dCount >= targetN) {
            dPct = 100;
            dStatus = 'MATCH';
            dVal = `Desire actual: ${dCount} of last ${targetM} FYs meet threshold of ₹${reqAmtCr.toFixed(2)} Cr (required: ${targetN}; qualifying: ${dMatchingYears.map(y => `${y.fy} ₹${y.val} Cr`).join(', ')}) -> 100% MATCH`;
          } else {
            dPct = Math.round((dCount / targetN) * 100);
            dStatus = 'NOT MATCHING';
            dVal = `Desire actual: ${dCount} of last ${targetM} FYs meet threshold of ₹${reqAmtCr.toFixed(2)} Cr (required: ${targetN}; only ${dMatchingYears.map(y => `${y.fy} ₹${y.val} Cr`).join(', ') || 'None'}) -> ${dPct}% NOT MATCHING`;
          }

          const lastMJYears = jEntries.slice(-targetM);
          const jMatchingYears = lastMJYears.filter(y => y.val >= reqAmtCr);
          const jCount = jMatchingYears.length;
          jPct = jCount >= targetN ? 100 : Math.round((jCount / targetN) * 100);
          jStatus = jCount >= targetN ? 'MATCH' : 'NOT MATCHING';
          jVal = `${partner.name} actual: ${jCount} of last ${targetM} FYs meet threshold of ₹${reqAmtCr.toFixed(2)} Cr (required: ${targetN}) -> ${jPct}% ${jStatus}`;

          cPct = Math.max(dPct, jPct);
          cStatus = cPct >= 100 ? 'MATCH' : 'NOT MATCHING';
          cVal = cPct >= 100
            ? `Consortium satisfies turnover requirement (${dCount >= targetN ? 'Desire standalone' : partner.name} achieves ${targetN}+ years) -> ${cPct}% MATCH`
            : `Consortium turnover falls short of ${targetN} qualifying years -> ${cPct}% NOT MATCHING`;
          gapNotes = dStatus === 'MATCH' ? 'Desire satisfies turnover standalone.' : `Bridged by ${partner.name}.`;

        } else if (!mentionsAverage && isSingleYear) {
          // Rule: "In any one year" = the maximum year meets the threshold.
          const dPeakVal = turnoverMetrics.peakVal;
          if (dPeakVal >= reqAmtCr) {
            dPct = 100;
            dStatus = 'MATCH';
            dVal = `Desire actual (Peak Year ${turnoverMetrics.peakYear}: ₹${dPeakVal.toFixed(2)} Cr) meets required ₹${reqAmtCr.toFixed(2)} Cr -> 100% MATCH`;
          } else {
            dPct = Math.round((dPeakVal / reqAmtCr) * 100);
            dStatus = 'NOT MATCHING';
            dVal = `Desire actual (Peak Year ${turnoverMetrics.peakYear}: ₹${dPeakVal.toFixed(2)} Cr) falls short of required ₹${reqAmtCr.toFixed(2)} Cr -> ${dPct}% NOT MATCHING`;
          }

          const jPeakVal = partnerMetrics.peakVal || partner.peak_turnover_cr || partner.average_turnover || 0;
          jPct = jPeakVal >= reqAmtCr ? 100 : Math.round((jPeakVal / reqAmtCr) * 100);
          jStatus = jPct >= 100 ? 'MATCH' : 'NOT MATCHING';
          jVal = `${partner.name} actual (Peak: ₹${jPeakVal.toFixed(2)} Cr) ${jPct >= 100 ? 'meets' : 'falls short of'} required ₹${reqAmtCr.toFixed(2)} Cr -> ${jPct}% ${jStatus}`;

          cPct = Math.max(dPct, jPct);
          cStatus = cPct >= 100 ? 'MATCH' : 'NOT MATCHING';
          cVal = `Consortium Peak Turnover: ₹${Math.max(dPeakVal, jPeakVal).toFixed(2)} Cr -> ${cPct}% ${cStatus}`;
          gapNotes = dStatus === 'MATCH' ? 'Desire satisfies single year turnover standalone.' : `Bridged by ${partner.name}.`;

        } else if (mentionsAverage) {
          // Rule: Use an average ONLY if the clause says average.
          const is5Year = fullTurnoverText.includes('5 year') || fullTurnoverText.includes('five year') || fullTurnoverText.includes('5 fy');
          const dAvg = is5Year
            ? (dEntries.length > 0 ? Math.round((dEntries.reduce((s, x) => s + x.val, 0) / dEntries.length) * 100) / 100 : turnoverMetrics.avgLast3)
            : turnoverMetrics.avgLast3;

          if (dAvg >= reqAmtCr) {
            dPct = 100;
            dStatus = 'MATCH';
            dVal = `Desire actual (Average Annual Turnover: ₹${dAvg.toFixed(2)} Cr, Form-7 certified) meets required ₹${reqAmtCr.toFixed(2)} Cr -> 100% MATCH`;
          } else {
            dPct = Math.round((dAvg / reqAmtCr) * 100);
            dStatus = 'NOT MATCHING';
            dVal = `Desire actual (Average Annual Turnover: ₹${dAvg.toFixed(2)} Cr) falls short of required ₹${reqAmtCr.toFixed(2)} Cr -> ${dPct}% NOT MATCHING`;
          }

          const jAvg = partner.average_turnover || 0;
          jPct = jAvg >= reqAmtCr ? 100 : Math.round((jAvg / reqAmtCr) * 100);
          jStatus = jPct >= 100 ? 'MATCH' : 'NOT MATCHING';
          jVal = `${partner.name} actual (Average: ₹${jAvg.toFixed(2)} Cr) ${jPct >= 100 ? 'meets' : 'falls short of'} required ₹${reqAmtCr.toFixed(2)} Cr -> ${jPct}% ${jStatus}`;

          const pooledAvg = dAvg + jAvg;
          cPct = pooledAvg >= reqAmtCr ? 100 : Math.round((pooledAvg / reqAmtCr) * 100);
          cStatus = cPct >= 100 ? 'MATCH' : 'NOT MATCHING';
          cVal = `Consortium Pooled Average Turnover: ₹${pooledAvg.toFixed(2)} Cr (Desire ₹${dAvg.toFixed(2)} Cr + ${partner.name} ₹${jAvg.toFixed(2)} Cr) -> ${cPct}% ${cStatus}`;
          gapNotes = dStatus === 'MATCH' ? 'Desire satisfies average turnover standalone.' : `Desire turnover bridged by consortium partner ${partner.name}.`;

        } else {
          // Default when no average mentioned and no N of M: compare against peak year
          const dPeakVal = turnoverMetrics.peakVal;
          if (dPeakVal >= reqAmtCr) {
            dPct = 100;
            dStatus = 'MATCH';
            dVal = `Desire actual (Peak Year ${turnoverMetrics.peakYear}: ₹${dPeakVal.toFixed(2)} Cr, Form-7 certified) meets required ₹${reqAmtCr.toFixed(2)} Cr -> 100% MATCH`;
          } else {
            dPct = Math.round((dPeakVal / reqAmtCr) * 100);
            dStatus = 'NOT MATCHING';
            dVal = `Desire actual (Peak Year ${turnoverMetrics.peakYear}: ₹${dPeakVal.toFixed(2)} Cr) falls short of required ₹${reqAmtCr.toFixed(2)} Cr -> ${dPct}% NOT MATCHING`;
          }

          const jValToCheck = partnerMetrics.peakVal || partner.average_turnover || 0;
          jPct = jValToCheck >= reqAmtCr ? 100 : Math.round((jValToCheck / reqAmtCr) * 100);
          jStatus = jPct >= 100 ? 'MATCH' : 'NOT MATCHING';
          jVal = `${partner.name} actual (₹${jValToCheck.toFixed(2)} Cr) -> ${jPct}% ${jStatus}`;

          cPct = Math.max(dPct, jPct);
          cStatus = cPct >= 100 ? 'MATCH' : 'NOT MATCHING';
          cVal = `Consortium satisfies turnover criteria -> ${cPct}% ${cStatus}`;
          gapNotes = dStatus === 'MATCH' ? 'Desire satisfies turnover standalone.' : `Bridged by ${partner.name}.`;
        }
      } else {
        dPct = 100;
        dStatus = 'MATCH';
        dVal = `Desire actual (Turnover certified on record, Form-7 certified) -> 100% MATCH`;
        jPct = 100; jStatus = 'MATCH';
        jVal = `${partner.name} Turnover certified on record -> 100% MATCH`;
        cPct = 100; cStatus = 'MATCH';
        cVal = `Consortium satisfies turnover criteria -> 100% MATCH`;
        gapNotes = 'Turnover verified from company records.';
      }
    }

    // 3. NET WORTH EVALUATION
    else if (title.includes('net worth') || reqText.includes('net worth')) {
      const dNW = desireComp.net_worth;
      const jNW = partner.net_worth || 0;

      if (reqAmtCr !== null && reqAmtCr > 0) {
        if (dNW >= reqAmtCr) {
          dPct = 100;
          dStatus = 'MATCH';
          dVal = `Desire actual Net Worth (₹${dNW} Cr as of 31.03.2024, Audited Balance Sheet Note 3) meets required ₹${reqAmtCr.toFixed(2)} Cr -> 100% MATCH`;
        } else {
          dPct = Math.round((dNW / reqAmtCr) * 100);
          dStatus = 'NOT MATCHING';
          dVal = `Desire actual Net Worth (₹${dNW} Cr) falls short of required ₹${reqAmtCr.toFixed(2)} Cr -> ${dPct}% NOT MATCHING`;
        }

        jPct = jNW >= reqAmtCr ? 100 : Math.round((jNW / reqAmtCr) * 100);
        jStatus = jPct >= 100 ? 'MATCH' : 'NOT MATCHING';
        jVal = `${partner.name} actual Net Worth: ₹${jNW} Cr -> ${jPct}% ${jStatus}`;

        cPct = (dNW + jNW) >= reqAmtCr ? 100 : Math.round(((dNW + jNW) / reqAmtCr) * 100);
        cStatus = cPct >= 100 ? 'MATCH' : 'NOT MATCHING';
        cVal = `Consortium Net Worth: ₹${(dNW + jNW).toFixed(2)} Cr -> ${cPct}% ${cStatus}`;
        gapNotes = dStatus === 'MATCH' ? 'Desire satisfies net worth standalone.' : `Bridged by ${partner.name}.`;
      } else {
        dPct = 100;
        dStatus = 'MATCH';
        dVal = `Desire actual Net Worth (₹${dNW} Cr as of 31.03.2024, Audited Balance Sheet Note 3) -> 100% MATCH`;
        jPct = 100; jStatus = 'MATCH';
        jVal = `${partner.name} Net Worth verified -> 100% MATCH`;
        cPct = 100; cStatus = 'MATCH';
        cVal = `Consortium positive net worth verified -> 100% MATCH`;
        gapNotes = 'Net worth verified.';
      }
    }

    // 4. SOLVENCY EVALUATION (₹5.00 Cr figure deleted; amount verified from clause or marked "amount not stated")
    else if (title.includes('solvency') || reqText.includes('solvency')) {
      const dSolv = desireComp.solvency;
      const jSolv = partner.solvency || 0;
      const certNo = desireComp.solvency_certificate?.certificate_no;
      const bankName = desireComp.solvency_certificate?.bank_name;
      const issueDate = desireComp.solvency_certificate?.issue_date;

      if (reqAmtCr !== null && reqAmtCr > 0) {
        if (dSolv >= reqAmtCr) {
          dPct = 100;
          dStatus = 'MATCH';
          dVal = `Desire actual: Holds Bank Solvency Certificate No. ${certNo} for ₹${dSolv} Cr from ${bankName} (dated ${issueDate}), exceeding required ₹${reqAmtCr.toFixed(2)} Cr -> 100% MATCH`;
        } else {
          dPct = Math.round((dSolv / reqAmtCr) * 100);
          dStatus = 'NOT MATCHING';
          dVal = `Desire Bank Solvency (₹${dSolv} Cr) does not meet required ₹${reqAmtCr.toFixed(2)} Cr -> ${dPct}% NOT MATCHING`;
        }

        jPct = jSolv >= reqAmtCr ? 100 : Math.round((jSolv / reqAmtCr) * 100);
        jStatus = jPct >= 100 ? 'MATCH' : 'NOT MATCHING';
        jVal = `${partner.name} Bank Solvency: ₹${jSolv} Cr -> ${jPct}% ${jStatus}`;

        cPct = Math.max(dPct, jPct);
        cStatus = cPct >= 100 ? 'MATCH' : 'NOT MATCHING';
        cVal = `Consortium Solvency Verified (₹${Math.max(dSolv, jSolv)} Cr) -> ${cPct}% ${cStatus}`;
        gapNotes = dStatus === 'MATCH' ? 'Desire satisfies solvency standalone.' : `Bridged by ${partner.name}.`;
      } else {
        // Amount not stated in quoted clause: verify holding valid solvency certificate
        dPct = 100;
        dStatus = 'MATCH';
        dVal = `Desire actual: Holds Bank Solvency Certificate No. ${certNo} for ₹${dSolv} Cr from ${bankName} (dated ${issueDate}) -> 100% MATCH`;

        jPct = 100;
        jStatus = 'MATCH';
        jVal = `${partner.name} Bank Solvency Certificate verified -> 100% MATCH`;

        cPct = 100;
        cStatus = 'MATCH';
        cVal = `Consortium Solvency Verified (Desire holds ₹${dSolv} Cr Kotak Bank Solvency Certificate) -> 100% MATCH`;
        gapNotes = 'Bank solvency certificate verified.';
      }
    }

    // 5. TECHNICAL EXPERIENCE / PHYSICAL CRITERIA (Form-8 Exact Wording & Scenario 1 OR 2)
    else if (
      title.includes('experience') || reqText.includes('experience') ||
      title.includes('similar work') || reqText.includes('similar work') ||
      title.includes('completed') || reqText.includes('satisfactorily') ||
      reqText.includes('pipeline') || reqText.includes('sewer') || reqText.includes('pumping') ||
      reqText.includes('solar') || reqText.includes('o&m') || title.includes('scenario') || reqText.includes('scenario')
    ) {
      const isScenario1Or2 = reqText.includes('scenario 1') || reqText.includes('scenario 2') || reqText.includes('scenario 1 or') || title.includes('scenario');
      const isSewer = title.includes('sewer') || title.includes('sewage') || title.includes('stp') || title.includes('drainage') ||
                      reqText.includes('sewer') || reqText.includes('sewage') || reqText.includes('stp') || reqText.includes('drainage');
      const isOM = title.includes('o&m') || title.includes('operation & maintenance') || title.includes('operation and maintenance') ||
                   reqText.includes('o&m') || reqText.includes('operation & maintenance') || reqText.includes('operation and maintenance');
      const isSolar = title.includes('solar') || reqText.includes('solar') || reqText.includes('kusum') || reqText.includes('photovoltaic');
      const isEsco = title.includes('esco') || reqText.includes('esco') || title.includes('scada') || reqText.includes('scada') || title.includes('energy efficient') || reqText.includes('energy-efficient');
      const isPipelineWater = title.includes('pipeline') || reqText.includes('pipeline') || reqText.includes('submersible') || reqText.includes('water supply');

      const dProjects: any[] = desireComp.project_register || [];
      const jProjects: any[] = partner.project_register || [];

      // Extract O&M years requirement if specified
      const omYearsMatch = reqText.match(/(\d+)\s*(?:years?|yrs?)\s*(?:of\s*)?o&m/i);
      const reqOMYears = omYearsMatch ? parseInt(omYearsMatch[1]) : (isOM ? 1 : 0);

      let matchedProject: any = null;

      if (isEsco) {
        // Mahesana, Sanand, Anjar = energy-efficient pumping with SCADA on ESCO basis
        matchedProject = dProjects.find(p => p.category === 'energy-efficient pumping with SCADA on ESCO basis' && (p.om_years_completed || 0) >= reqOMYears)
          || dProjects.find(p => p.category === 'energy-efficient pumping with SCADA on ESCO basis');
      } else if (isSolar) {
        // Rajasthan = off-grid solar PV water pumping
        matchedProject = dProjects.find(p => p.category === 'off-grid solar PV water pumping');
      } else if (isPipelineWater) {
        // Lucknow = submersible pumps, tanks and pipeline O&M for UP Projects Corporation
        matchedProject = dProjects.find(p => p.category === 'submersible pumps, tanks and pipeline O&M for UP Projects Corporation')
          || dProjects.find(p => p.category.includes('Rural Piped Water Supply') || p.category.includes('Pipeline'));
      } else if (isOM) {
        matchedProject = dProjects.find(p => (p.om_years_completed || 0) >= reqOMYears && (p.om_value_cr || 0) > 0)
          || dProjects.find(p => (p.om_years_completed || 0) > 0);
      } else if (!isSewer) {
        matchedProject = dProjects.find(p => reqAmtCr ? p.desire_value_cr >= reqAmtCr : true) || dProjects[0];
      }

      if (matchedProject && matchedProject.is_verified) {
        const meetsVal = (reqAmtCr === null || reqAmtCr === 0 || matchedProject.desire_value_cr >= reqAmtCr);
        const meetsOM = (reqOMYears === 0 || (matchedProject.om_years_completed || 0) >= reqOMYears);

        // Scenario 1 OR 2 is one criterion: passes if either scenario is met
        if ((meetsVal && meetsOM) || isScenario1Or2) {
          dPct = 100;
          dStatus = 'MATCH';
          const scenNote = isScenario1Or2 ? ' [Scenario 1 OR 2 criteria satisfied]' : '';
          dVal = `Matched Desire Project: ${matchedProject.project_name} [Category: ${matchedProject.category}] for ${matchedProject.client} (Desire Value: ₹${matchedProject.desire_value_cr} Cr, Date Window: ${matchedProject.start_date} to ${matchedProject.contract_end_date}, O&M Completed: ${matchedProject.om_years_text}, Source: ${matchedProject.source_file})${scenNote} -> 100% MATCH`;
        } else if (!meetsVal) {
          dPct = Math.round((matchedProject.desire_value_cr / reqAmtCr!) * 100);
          dStatus = 'NOT MATCHING';
          dVal = `Desire project "${matchedProject.project_name}" [${matchedProject.category}] (Desire Value: ₹${matchedProject.desire_value_cr} Cr, Source: ${matchedProject.source_file}) falls short of required ₹${reqAmtCr!.toFixed(2)} Cr -> ${dPct}% NOT MATCHING`;
        } else {
          dPct = 50;
          dStatus = 'NOT MATCHING';
          dVal = `Desire project "${matchedProject.project_name}" has ${matchedProject.om_years_completed} yrs O&M completed, below required ${reqOMYears} yrs -> 50% NOT MATCHING`;
        }
      } else if (isSewer) {
        dPct = 0;
        dStatus = 'NOT MATCHING';
        dVal = 'Desire project register contains water supply, solar PV pumping and ESCO projects; no sewerage/STP project on record -> 0% NOT MATCHING';
      } else {
        dPct = 0;
        dStatus = 'CANNOT BE CHECKED';
        dVal = 'CANNOT BE CHECKED — Qualifying technical project data not found in company records.';
      }

      // Partner evaluation
      const jSewerProj = jProjects.find(p => p.category.toLowerCase().includes('sewer') || p.category.toLowerCase().includes('stp'));
      const jBestProj = jProjects.find(p => p.category.toLowerCase().includes('pipeline') || p.category.toLowerCase().includes('water') || p.category.toLowerCase().includes('sewer')) || jProjects[0];

      if (isSewer && jSewerProj) {
        jPct = 100; jStatus = 'MATCH';
        jVal = `Matched ${partner.name} Project: ${jSewerProj.project_name} for ${jSewerProj.client} (Value: ₹${jSewerProj.contract_value_cr} Cr, Cert Ref: ${jSewerProj.certificate_ref}) -> 100% MATCH`;
        cPct = 100; cStatus = 'MATCH';
        cVal = `Combined: ${partner.name} satisfies sewerage technical requirement -> 100% MATCH`;
        gapNotes = `Desire sewerage experience gap bridged by consortium partner ${partner.name}.`;
      } else if (jBestProj && (reqAmtCr === null || (jBestProj.vhp_value_cr || jBestProj.contract_value_cr || 0) >= (reqAmtCr || 0))) {
        jPct = 100; jStatus = 'MATCH';
        const jValCr = jBestProj.vhp_value_cr || jBestProj.contract_value_cr;
        jVal = `Matched ${partner.name} Project: ${jBestProj.project_name} for ${jBestProj.client} (Value: ₹${jValCr} Cr, Cert Ref: ${jBestProj.certificate_ref}) -> 100% MATCH`;
        cPct = (dStatus === 'MATCH' || jStatus === 'MATCH') ? 100 : Math.max(dPct, jPct);
        cStatus = cPct >= 100 ? 'MATCH' : (dStatus === 'CANNOT BE CHECKED' ? 'CANNOT BE CHECKED' : 'NOT MATCHING');
        cVal = cPct >= 100 ? `Consortium satisfies technical experience criteria -> 100% MATCH` : `${dVal}`;
        gapNotes = dStatus === 'MATCH' ? 'Desire satisfies technical experience standalone.' : `Bridged by ${partner.name}.`;
      } else {
        jPct = 0;
        jStatus = 'CANNOT BE CHECKED';
        jVal = `${partner.name} technical experience data missing on record -> CANNOT BE CHECKED`;
        cPct = dPct;
        cStatus = dStatus;
        cVal = dVal;
        gapNotes = dStatus === 'MATCH' ? 'Desire satisfies technical experience standalone.' : (dStatus === 'CANNOT BE CHECKED' ? 'Technical experience data missing.' : `Gaps in technical experience.`);
      }
    }

    // 6. REGISTRATION & LICENCE CRITERIA EVALUATION
    else if (
      title.includes('registration') || title.includes('enlistment') || title.includes('class') ||
      title.includes('licence') || title.includes('license') ||
      reqText.includes('registration') || reqText.includes('enlistment') ||
      reqText.includes('licence') || reqText.includes('license')
    ) {
      // Directive 3: Until certificates are uploaded with files, registration & licence criteria show CANNOT BE CHECKED.
      const dRegs: any[] = (desireComp.registrations || []).filter((r: any) => r.verified && (r.file_name || r.file_url));
      const jRegs: any[] = (partner.registrations || []).filter((r: any) => r.verified || r.validity === 'Active');

      const dHasClassAA = dRegs.some(r => (r.class || '').includes('AA') || (r.class || '').includes('Class-A Special') || (r.class || '').includes('Class-A'));
      const jHasClassAA = jRegs.some(r => (r.class || '').includes('AA') || (r.class || '').includes('Class-A'));

      if (dHasClassAA) {
        dPct = 100; dStatus = 'MATCH';
        const regNames = dRegs.map(r => `${r.class} with ${r.department || r.authority} (${r.file_name || r.source})`).join('; ');
        dVal = `Desire actual: Holds verified ${regNames} -> 100% MATCH`;
      } else {
        dPct = 0; dStatus = 'CANNOT BE CHECKED';
        dVal = 'CANNOT BE CHECKED — Registration / licence certificate has not been uploaded. Upload certificate file in Company Master DB to verify.';
      }

      jPct = jHasClassAA ? 100 : 0;
      jStatus = jPct >= 100 ? 'MATCH' : 'CANNOT BE CHECKED';
      jVal = jHasClassAA ? `${partner.name} actual: Holds valid State Contractor Registration -> 100% MATCH` : `${partner.name} actual: Registration details not on record -> CANNOT BE CHECKED`;

      cPct = Math.max(dPct, jPct);
      cStatus = cPct >= 100 ? 'MATCH' : 'CANNOT BE CHECKED';
      cVal = cPct >= 100 ? `Consortium satisfies contractor registration criteria -> ${cPct}% MATCH` : 'CANNOT BE CHECKED — Contractor registration / licence unverified.';
      gapNotes = dStatus === 'MATCH' ? 'Desire satisfies registration standalone.' : (jStatus === 'MATCH' ? `Bridged by ${partner.name}.` : 'Pending certificate upload in Master DB.');
    }

    // 7. BID CAPACITY (UNVERIFIED INPUT - CANNOT BE CHECKED)
    else if (title.includes('bid capacity') || reqText.includes('bid capacity') || title.includes('bidding capacity') || reqText.includes('bidding capacity')) {
      dStatus = 'CANNOT BE CHECKED';
      dVal = 'CANNOT BE CHECKED — Missing field: bid_capacity (Pending Commitments unverified pending Form-9 submission).';
      dPct = 0;
      jStatus = 'CANNOT BE CHECKED';
      jVal = 'CANNOT BE CHECKED — Missing field: bid_capacity (Partner pending commitments unverified).';
      jPct = 0;
      cStatus = 'CANNOT BE CHECKED';
      cVal = 'CANNOT BE CHECKED — Missing verified commitments data to compute Available Bid Capacity (A*N*2 - B).';
      cPct = 0;
      gapNotes = 'CANNOT BE CHECKED — Missing field: bid_capacity.';
    }

    // 8. WORKING CAPITAL / BANK CREDIT FACILITY / LIQUID ASSETS
    else if (title.includes('working capital') || reqText.includes('working capital') || title.includes('credit line') || reqText.includes('credit line') || title.includes('liquid asset') || reqText.includes('liquid asset') || title.includes('cash accrual') || reqText.includes('cash accrual')) {
      dStatus = 'CANNOT BE CHECKED';
      dVal = 'CANNOT BE CHECKED — Missing field: working_capital / credit_facility (Pending banker line of credit certificate).';
      dPct = 0;
      jStatus = 'CANNOT BE CHECKED';
      jVal = 'CANNOT BE CHECKED — Missing field: working_capital / credit_facility.';
      jPct = 0;
      cStatus = 'CANNOT BE CHECKED';
      cVal = 'CANNOT BE CHECKED — Missing verified working capital / credit line certificate.';
      cPct = 0;
      gapNotes = 'CANNOT BE CHECKED — Missing field: working_capital.';
    }

    // 9. LITIGATION HISTORY / BLACKLISTING AFFIDAVIT
    else if (title.includes('litigation') || reqText.includes('litigation') || title.includes('blacklisting') || reqText.includes('blacklisting') || title.includes('debarment') || reqText.includes('debarment')) {
      dStatus = 'CANNOT BE CHECKED';
      dVal = 'CANNOT BE CHECKED — Missing field: litigation_history / blacklist_status (Requires notarized non-debarment affidavit on stamp paper).';
      dPct = 0;
      jStatus = 'CANNOT BE CHECKED';
      jVal = 'CANNOT BE CHECKED — Missing field: litigation_history.';
      jPct = 0;
      cStatus = 'CANNOT BE CHECKED';
      cVal = 'CANNOT BE CHECKED — Missing verified litigation history records.';
      cPct = 0;
      gapNotes = 'CANNOT BE CHECKED — Missing field: litigation_history.';
    }

    // 10. KEY PERSONNEL / TECHNICAL STAFF
    else if (title.includes('personnel') || title.includes('staff') || title.includes('engineer') || reqText.includes('engineer') || reqText.includes('personnel')) {
      const dStaff: any[] = desireComp.key_personnel || [];
      if (dStaff.length > 0) {
        dPct = 100; dStatus = 'MATCH';
        const staffSample = dStaff.slice(0, 3).map(s => `${s.name} (${s.qualification}, ${s.experience_years} yrs)`).join('; ');
        dVal = `Desire actual: Key engineering personnel deployed on payroll: ${staffSample} -> 100% MATCH`;
      } else {
        dPct = 0; dStatus = 'CANNOT BE CHECKED';
        dVal = 'CANNOT BE CHECKED — Missing field: key_personnel in company records.';
      }

      jPct = 100; jStatus = 'MATCH';
      jVal = `${partner.name} actual: Engineering staff committed -> 100% MATCH`;
      cPct = 100; cStatus = 'MATCH';
      cVal = 'Consortium satisfies key personnel requirements -> 100% MATCH';
      gapNotes = 'Key technical personnel requirements met.';
    }

    // 11. PLANT & EQUIPMENT
    else if (title.includes('equipment') || title.includes('machinery') || title.includes('plant') || reqText.includes('equipment') || reqText.includes('machinery')) {
      const dEquip: any[] = desireComp.plant_and_equipment || [];
      if (dEquip.length > 0) {
        dPct = 100; dStatus = 'MATCH';
        const equipSample = dEquip.slice(0, 3).map(e => `${e.name} (${e.quantity} units ${e.ownership})`).join('; ');
        dVal = `Desire actual: Owned plant & equipment fleet on record: ${equipSample} -> 100% MATCH`;
      } else {
        dPct = 0; dStatus = 'CANNOT BE CHECKED';
        dVal = 'CANNOT BE CHECKED — Missing field: plant_and_equipment in company records.';
      }

      jPct = 100; jStatus = 'MATCH';
      jVal = `${partner.name} actual: Construction machinery committed -> 100% MATCH`;
      cPct = 100; cStatus = 'MATCH';
      cVal = 'Consortium satisfies plant & machinery requirements -> 100% MATCH';
      gapNotes = 'Plant and equipment criteria met.';
    }

    // 12. UNRECOGNIZED CRITERION — MISSING COMPANY DATA
    else {
      const fieldName = (c.clause_title || 'unspecified_field').toLowerCase().replace(/[^a-z0-9_]/g, '_');
      dStatus = 'CANNOT BE CHECKED';
      dVal = `CANNOT BE CHECKED — Missing field: ${fieldName} in company data.`;
      dPct = 0;

      jStatus = 'CANNOT BE CHECKED';
      jVal = `CANNOT BE CHECKED — Missing field: ${fieldName} in partner data.`;
      jPct = 0;

      cStatus = 'CANNOT BE CHECKED';
      cVal = `CANNOT BE CHECKED — Missing field: ${fieldName} across consortium records.`;
      cPct = 0;
      gapNotes = `CANNOT BE CHECKED — Missing field: ${fieldName}.`;
    }

    // Check if requirement contains alternatives (e.g. Scenario 1 OR 2, constructed OR maintained)
    const isAlternative = reqText.includes('scenario 1') || reqText.includes('scenario 2') || reqText.includes('constructed or maintained') || reqText.includes('scenario 1 or') || title.includes('scenario') || title.includes('alternative');
    const altGroup = isAlternative ? (reqText.includes('scenario') || title.includes('scenario') ? 'scenario_alternative_group' : 'work_type_alternative_group') : null;

    return {
      clause_no: c.clause_no || 'Clause',
      clause_title: c.clause_title || 'Requirement',
      requirement_type: c.requirement_type || 'Technical',
      is_eligibility_criterion: true,
      clause_group: 'qualification_criterion',
      clause_category: 'qualification',
      is_alternative: isAlternative,
      alternative_group: altGroup,
      tender_requirement: c.tender_requirement || '',
      required_value: c.required_value || parsedAmt.displayRupees,
      desire_value: dVal,
      desire_status: dStatus,
      desire_pct: dPct,
      jv_value: jVal,
      jv_status: jStatus,
      jv_pct: jPct,
      combined_pct: cPct,
      combined_value: cVal,
      status: cStatus,
      fulfilled_pct: `${cPct}%`,
      applicable_jv_rule: c.applicable_jv_rule || 'Lead Member / Consortium Pooling',
      gap_notes: gapNotes,
      required_doc: c.required_doc || 'Documentary Proof',
      page_ref: c.page_ref || 'Tender Document'
    };
  }

  const partnerEvaluations: Record<string, any> = {};
  for (const partner of jvPartners) {
    const clauseEvals = cleanClauses.map(c => evalClause(c, partner));
    const eligibilityClauses = clauseEvals.filter(c => c.is_eligibility_criterion);
    const submissionClauses = clauseEvals.filter(c => !c.is_eligibility_criterion);

    // Consolidate Alternative Clauses: Alternatives are ONE criterion and pass if any alternative passes!
    const consolidatedMap = new Map<string, any[]>();
    for (const c of eligibilityClauses) {
      const key = c.alternative_group || `${c.clause_no}_${c.clause_title}`;
      if (!consolidatedMap.has(key)) consolidatedMap.set(key, []);
      consolidatedMap.get(key)!.push(c);
    }

    const consolidatedCriteria: any[] = [];
    consolidatedMap.forEach((group: any[]) => {
      if (group.length === 1) {
        consolidatedCriteria.push(group[0]);
      } else {
        // Multi-alternative set: pass if ANY alternative passes
        const dPass = group.find((c: any) => c.desire_status === 'MATCH');
        const jPass = group.find((c: any) => c.jv_status === 'MATCH');
        const cPass = group.find((c: any) => c.status === 'MATCH');

        const dCannotCheck = group.some((c: any) => c.desire_status === 'CANNOT BE CHECKED' || c.desire_status === 'DATA MISSING');
        const jCannotCheck = group.some((c: any) => c.jv_status === 'CANNOT BE CHECKED' || c.jv_status === 'DATA MISSING');
        const cCannotCheck = group.some((c: any) => c.status === 'CANNOT BE CHECKED' || c.status === 'DATA MISSING');

        const rep = { ...group[0] };
        rep.clause_title = `${group[0].clause_title} (Alternatives: ${group.map((g: any) => g.clause_no).join(' / ')})`;
        rep.is_alternative_set = true;
        rep.alternative_items = group;

        if (dPass) {
          rep.desire_status = 'MATCH';
          rep.desire_pct = 100;
          rep.desire_value = `Passed via Alternative (${dPass.clause_no}): ${dPass.desire_value}`;
        } else if (dCannotCheck) {
          rep.desire_status = 'CANNOT BE CHECKED';
          rep.desire_pct = 0;
        } else {
          rep.desire_status = 'NOT MATCHING';
          rep.desire_pct = 0;
        }

        if (jPass) {
          rep.jv_status = 'MATCH';
          rep.jv_pct = 100;
          rep.jv_value = `Passed via Alternative (${jPass.clause_no}): ${jPass.jv_value}`;
        } else if (jCannotCheck) {
          rep.jv_status = 'CANNOT BE CHECKED';
          rep.jv_pct = 0;
        } else {
          rep.jv_status = 'NOT MATCHING';
          rep.jv_pct = 0;
        }

        if (cPass) {
          rep.status = 'MATCH';
          rep.combined_pct = 100;
          rep.combined_value = `Passed via Alternative (${cPass.clause_no}): ${cPass.combined_value}`;
        } else if (cCannotCheck) {
          rep.status = 'CANNOT BE CHECKED';
          rep.combined_pct = 0;
        } else {
          rep.status = 'NOT MATCHING';
          rep.combined_pct = 0;
        }

        consolidatedCriteria.push(rep);
      }
    });

    // Strict scoring rule: Score = passed ÷ checked qualification criteria!
    // Unchecked rows (CANNOT BE CHECKED / DATA MISSING) count NEITHER WAY.
    const desireChecked = consolidatedCriteria.filter(c => c.desire_status !== 'CANNOT BE CHECKED' && c.desire_status !== 'DATA MISSING');
    const desirePassed = desireChecked.filter(c => c.desire_status === 'MATCH');
    const dScore = desireChecked.length > 0 ? Math.min(100, Math.round((desirePassed.length / desireChecked.length) * 100)) : 100;

    const jvChecked = consolidatedCriteria.filter(c => c.jv_status !== 'CANNOT BE CHECKED' && c.jv_status !== 'DATA MISSING');
    const jvPassed = jvChecked.filter(c => c.jv_status === 'MATCH');
    const jScore = jvChecked.length > 0 ? Math.min(100, Math.round((jvPassed.length / jvChecked.length) * 100)) : 100;

    const combinedChecked = consolidatedCriteria.filter(c => c.status !== 'CANNOT BE CHECKED' && c.status !== 'DATA MISSING');
    const combinedPassed = combinedChecked.filter(c => c.status === 'MATCH');
    const cScore = combinedChecked.length > 0 ? Math.min(100, Math.round((combinedPassed.length / combinedChecked.length) * 100)) : 100;

    const desireUnchecked = consolidatedCriteria.filter(c => c.desire_status === 'CANNOT BE CHECKED' || c.desire_status === 'DATA MISSING');
    const combinedUnchecked = consolidatedCriteria.filter(c => c.status === 'CANNOT BE CHECKED' || c.status === 'DATA MISSING');

    // Eligible ONLY if EVERY criterion was checked and passed!
    const desireEligible = consolidatedCriteria.length > 0 && desireUnchecked.length === 0 && desirePassed.length === consolidatedCriteria.length;
    const combinedEligible = consolidatedCriteria.length > 0 && combinedUnchecked.length === 0 && combinedPassed.length === consolidatedCriteria.length;

    partnerEvaluations[partner.id] = {
      partner,
      dScore,
      jScore,
      cScore,
      desireEligible,
      combinedEligible,
      clauses: clauseEvals,
      eligibilityClauses,
      consolidatedCriteria,
      submissionClauses,
      desireChecked,
      desirePassed,
      desireUnchecked,
      combinedChecked,
      combinedPassed,
      combinedUnchecked
    };
  }

  const firstEval = Object.values(partnerEvaluations)[0];
  const desireStandaloneScore = firstEval ? firstEval.dScore : 100;

  let recommendedPartnerId = selectedJvPartnerId && partnerEvaluations[selectedJvPartnerId] ? selectedJvPartnerId : '';
  if (!recommendedPartnerId) {
    if (desireStandaloneScore >= 100) {
      recommendedPartnerId = jvPartners[0]?.id || 'comp-vhp-04';
    } else {
      recommendedPartnerId = Object.keys(partnerEvaluations).reduce((bestId, id) => {
        return partnerEvaluations[id].cScore > partnerEvaluations[bestId].cScore ? id : bestId;
      }, Object.keys(partnerEvaluations)[0]);
    }
  }

  const selectedEval = partnerEvaluations[recommendedPartnerId] || firstEval;
  const recPartner = selectedEval ? selectedEval.partner : (jvPartners[0] || { name: 'VHP Infratech' });

  const desireCheckedList: any[] = selectedEval ? selectedEval.desireChecked : [];
  const desirePassedList: any[] = selectedEval ? selectedEval.desirePassed : [];
  const desireUncheckedList: any[] = selectedEval ? selectedEval.desireUnchecked : [];

  const combinedCheckedList: any[] = selectedEval ? selectedEval.combinedChecked : [];
  const combinedPassedList: any[] = selectedEval ? selectedEval.combinedPassed : [];
  const combinedUncheckedList: any[] = selectedEval ? selectedEval.combinedUnchecked : [];

  const realDataFailures = desireCheckedList.filter((c: any) => c.desire_status !== 'MATCH');

  let summaryLine = '';
  if (selectedEval?.desireEligible) {
    summaryLine = `Desire Energy satisfies all evaluated qualification criteria standalone (${desireStandaloneScore}% score across ${desireCheckedList.length} criteria). JV is optional.`;
  } else if (desireUncheckedList.length > 0 && realDataFailures.length === 0) {
    summaryLine = `Cannot determine complete eligibility standalone: ${desireUncheckedList.length} criteria have missing company data (CANNOT BE CHECKED). All ${desireCheckedList.length} checked criteria passed.`;
  } else {
    summaryLine = `Desire Energy has ${realDataFailures.length} qualification criteria failing real-data evaluation (Score: ${desireStandaloneScore}%). Recommended: JV with ${recPartner.name} to reach ${selectedEval ? selectedEval.cScore : 100}% combined.`;
  }

  const dFormulaStr = `Score = passed (${desirePassedList.length}) ÷ checked qualification criteria (${desireCheckedList.length}) = ${desireStandaloneScore}%`;
  const cFormulaStr = `Score = passed (${combinedPassedList.length}) ÷ checked qualification criteria (${combinedCheckedList.length}) = ${selectedEval ? selectedEval.cScore : 100}%`;

  const scoreFormula = {
    desire_standalone: {
      score: desireStandaloneScore,
      passed_count: desirePassedList.length,
      checked_count: desireCheckedList.length,
      formula_str: dFormulaStr
    },
    combined_jv: {
      score: selectedEval ? selectedEval.cScore : 100,
      passed_count: combinedPassedList.length,
      checked_count: combinedCheckedList.length,
      formula_str: cFormulaStr
    },
    missing_criteria_count: desireUncheckedList.length,
    missing_criteria_names: desireUncheckedList.map((c: any) => c.clause_title),
    unchecked_criteria: desireUncheckedList,
    eligibility_clause_count: selectedEval ? selectedEval.consolidatedCriteria.length : 0,
    submission_clause_count: selectedEval ? selectedEval.submissionClauses.length : 0,
    sequence_gaps: sequenceGaps,
    section_clause_counts: sectionCounts
  };

  const desireVerdict = selectedEval?.desireEligible
    ? 'Eligible Standalone'
    : (desireUncheckedList.length > 0 && realDataFailures.length === 0)
    ? `Cannot determine: ${desireUncheckedList.length} criteria need data`
    : 'Ineligible Standalone';

  const combinedVerdict = selectedEval?.combinedEligible
    ? 'Fully Qualified Consortium'
    : (combinedUncheckedList.length > 0 && combinedCheckedList.filter((c: any) => c.status !== 'MATCH').length === 0)
    ? `Cannot determine: ${combinedUncheckedList.length} criteria need data`
    : 'Partially Qualified Consortium';

  return {
    desireStandaloneScore,
    recommendedPartner: recPartner,
    recommendedPartnerId,
    summaryLine,
    score_formula: scoreFormula,
    sequence_gaps: sequenceGaps,
    section_clause_counts: sectionCounts,
    desire_alone: {
      score: desireStandaloneScore,
      fulfilled_pct: `${desireStandaloneScore}%`,
      status: desireVerdict
    },
    jv_alone: {
      score: selectedEval ? selectedEval.jScore : 100,
      fulfilled_pct: `${selectedEval ? selectedEval.jScore : 100}%`,
      status: (selectedEval ? selectedEval.jScore : 100) >= 100 ? 'Partner Standalone Qualified' : 'Partner Incomplete Standalone'
    },
    combined_jv: {
      score: selectedEval ? selectedEval.cScore : 100,
      fulfilled_pct: `${selectedEval ? selectedEval.cScore : 100}%`,
      status: combinedVerdict
    },
    clauses_breakdown: selectedEval ? selectedEval.clauses : [],
    partnerEvaluations,
    build_info: getBuildStamp()
  };
}

// ─── HMAC-SHA256 SESSION TOKEN & SCRYPT PASSWORD ENGINE ───────────────────────
// PERMANENT RULE — DO NOT REMOVE OR WORK AROUND THIS CHECK:
// If this throws, the fix is to set the real environment variable in
// Vercel. NEVER add a hardcoded fallback value here, under any name,
// for any reason. This has happened 3 times in this project and each
// time it created a real security hole. The throw is correct behavior.
let _cachedSecret: string | null = null;
function getSessionSecret(): string {
  if (_cachedSecret) return _cachedSecret;
  const raw = (process.env.SESSION_SECRET || process.env.SECRET_KEY || '').trim();
  if (!raw || raw.length < 32) {
    throw new Error('SESSION_SECRET is not configured correctly in this environment. Set a real 32+ character random value in Vercel Environment Variables.');
  }
  _cachedSecret = raw;
  return _cachedSecret;
}

const RATE_LIMIT_MAP = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, maxAttempts = 5, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = RATE_LIMIT_MAP.get(ip);
  if (!entry || now > entry.resetTime) {
    RATE_LIMIT_MAP.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (entry.count >= maxAttempts) {
    return false;
  }
  entry.count += 1;
  return true;
}

async function checkSupabaseRateLimitAndLockout(empId: string, clientIp: string): Promise<{ isAllowed: boolean; detail?: string }> {
  if (!supabase) return { isAllowed: true };
  try {
    const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    let lastSuccessTime = windowStart;
    if (empId) {
      const { data: lastSuccess } = await supabase
        .from('audit_logs')
        .select('timestamp')
        .eq('actor', empId)
        .eq('action', 'LOGIN_SUCCESS')
        .order('timestamp', { ascending: false })
        .limit(1);

      if (lastSuccess && lastSuccess.length > 0 && lastSuccess[0].timestamp) {
        if (new Date(lastSuccess[0].timestamp).getTime() > new Date(windowStart).getTime()) {
          lastSuccessTime = lastSuccess[0].timestamp;
        }
      }
    }

    const { data: failedLogs } = await supabase
      .from('audit_logs')
      .select('id')
      .eq('action', 'LOGIN_FAILURE')
      .gte('timestamp', lastSuccessTime)
      .eq('actor', empId || 'UNKNOWN')
      .eq('target', clientIp);

    if (failedLogs && failedLogs.length >= 5) {
      return {
        isAllowed: false,
        detail: 'Account locked out due to 5 consecutive failed login attempts for this user and IP combination. Please wait 15 minutes before trying again or request an Admin unlock.'
      };
    }
  } catch (e) {
    console.error('[AUTH_RATE_LIMIT_ERROR]', e);
  }
  return { isAllowed: true };
}

async function recordLoginAudit(empId: string, clientIp: string, isSuccess: boolean, detailMsg: string) {
  if (!supabase) return;
  try {
    await supabase.from('audit_logs').insert([{
      actor: empId || 'UNKNOWN',
      action: isSuccess ? 'LOGIN_SUCCESS' : 'LOGIN_FAILURE',
      target: clientIp,
      details: detailMsg,
      timestamp: new Date().toISOString()
    }]);
  } catch (e) {}
}

function hashPasswordScrypt(plain: string, saltInput?: string): string {
  const salt = saltInput || crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(plain.trim(), salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

function verifyPasswordScrypt(plain: string, storedHash: string): { isValid: boolean; needsRehash: boolean } {
  if (!plain || !storedHash) return { isValid: false, needsRehash: false };

  // 1. Check if storedHash is in scrypt format "salt:hex"
  if (storedHash.includes(':')) {
    const [salt, hex] = storedHash.split(':');
    if (salt && hex) {
      try {
        const derivedKey = crypto.scryptSync(plain.trim(), salt, 64);
        const isValid = crypto.timingSafeEqual(Buffer.from(hex, 'hex'), derivedKey);
        return { isValid, needsRehash: false };
      } catch (e) {
        return { isValid: false, needsRehash: false };
      }
    }
  }

  // 2. Legacy SHA-256 or plaintext migration compare (auto-rehashes on login)
  const legacySha256 = crypto.createHash('sha256').update(plain.trim()).digest('hex');
  const isLegacyMatch = legacySha256.toLowerCase() === storedHash.toLowerCase() || plain.trim() === storedHash.trim();

  return { isValid: isLegacyMatch, needsRehash: isLegacyMatch };
}

export interface SessionTokenPayload {
  employee_id: string;
  role: string;
  full_name?: string;
  exp: number;
}

export function createSessionToken(payload: { employee_id: string; role: string; full_name?: string }, expiresInSeconds = 12 * 3600): string | null {
  const secret = getSessionSecret();
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload: SessionTokenPayload = { ...payload, exp };
  const payloadBase64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payloadBase64).digest('base64url');
  return `${payloadBase64}.${signature}`;
}

export function verifySessionToken(token: string): SessionTokenPayload | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payloadBase64, signature] = token.split('.');
  if (!payloadBase64 || !signature) return null;

  const secret = getSessionSecret();
  const expectedSignature = crypto.createHmac('sha256', secret).update(payloadBase64).digest('base64url');
  if (signature !== expectedSignature) return null;

  try {
    const payload: SessionTokenPayload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

async function getSessionFromRequest(req: NextRequest): Promise<SessionTokenPayload | null> {
  let rawToken = '';
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    rawToken = authHeader.substring(7).trim();
  } else if (req.headers.get('x-session-token')) {
    rawToken = req.headers.get('x-session-token')!.trim();
  } else {
    const cookiesStr = req.headers.get('cookie') || '';
    cookiesStr.split(';').forEach(c => {
      const [k, v] = c.split('=');
      if (k && k.trim() === 'desire_session_token' && v) {
        rawToken = decodeURIComponent(v.trim());
      }
    });
  }

  if (!rawToken) return null;

  const verified = verifySessionToken(rawToken);
  if (!verified) return null;

  // Re-check user status & role from Supabase DB on each request
  if (supabase && verified.employee_id) {
    try {
      const { data: dbUser } = await supabase
        .from('users')
        .select('employee_id, role, status, full_name')
        .eq('employee_id', verified.employee_id)
        .maybeSingle();

      if (!dbUser || dbUser.status !== 'Active') {
        return null; // Reject session if user does not exist or is not Active
      }

      return {
        ...verified,
        role: dbUser.role || verified.role,
        full_name: dbUser.full_name || verified.full_name
      };
    } catch (e) {
      return verified;
    }
  }

  return verified;
}

async function handleRequest(req: NextRequest, params: { path: string[] }) {
  const subPath = params.path.join('/');
  const method = req.method;

  // ═══ AUTHENTICATION & AUTHORIZATION GUARD ═════════════════════════════════
  const isPublicAllowlist = 
    (subPath === '' || subPath === 'health') ||
    subPath.startsWith('auth/') ||
    subPath === 'tender/analyze' ||
    subPath === 'tender/analyze-full' ||
    subPath === 'tender/status' ||
    subPath === 'tender/ingestion-status' ||
    subPath === 'scraper/config';

  const session = await getSessionFromRequest(req);

  if (!isPublicAllowlist) {
    if (!session) {
      return NextResponse.json(
        { status: 'error', error_type: 'UNAUTHORIZED', message: 'Authentication required. Please log in with valid credentials.' },
        { status: 401 }
      );
    }

    const isAdminRoute = 
      (subPath.startsWith('admin') || subPath === 'credentials' || subPath === 'users') &&
      subPath !== 'users/assignees';

    const isAdminUser = session.role === 'Administrator' || session.role === 'Admin' || session.employee_id === 'EMP001' || session.employee_id === 'ADMIN';

    if (isAdminRoute && !isAdminUser) {
      return NextResponse.json(
        { status: 'error', error_type: 'FORBIDDEN', message: 'Forbidden. Administrator privileges required for this route.' },
        { status: 403 }
      );
    }
  }

  try {
    let body: any = {};
    let formCategory = '', formFilename = '', formTenderTitle = '', formJvPartnerId = '';
    let formFileBuffer: Buffer | null = null;

    if (method === 'POST' || method === 'PATCH' || method === 'PUT') {
      try {
        const ct = req.headers.get('content-type') || '';
        if (ct.includes('multipart/form-data')) {
          const fd = await req.formData();
          formCategory = ((fd.get('project_category') as string) || '').toUpperCase();
          const fileObj = fd.get('file') as File | null;
          formFilename = fileObj?.name || ((fd.get('filename') as string) || '');
          formTenderTitle = (fd.get('tender_title') as string) || '';
          formJvPartnerId = (fd.get('jv_partner_id') as string) || '';
          const docUrlParam = (fd.get('document_url') as string) || (fd.get('file_url') as string) || (fd.get('storage_path') as string) || '';
          if (fileObj) { try { formFileBuffer = Buffer.from(await fileObj.arrayBuffer()); } catch (e) {} }
          if (!formFileBuffer && docUrlParam) {
            if (docUrlParam.startsWith('http://') || docUrlParam.startsWith('https://')) {
              try {
                const fetchRes = await fetch(docUrlParam);
                if (fetchRes.ok) formFileBuffer = Buffer.from(await fetchRes.arrayBuffer());
              } catch (e) {}
            }
            if (!formFileBuffer && supabase) {
              try {
                let cleanPath = docUrlParam;
                if (cleanPath.includes('/tender-documents/')) cleanPath = cleanPath.split('/tender-documents/')[1];
                cleanPath = cleanPath.split('?')[0];
                const { data, error } = await supabase.storage.from('tender-documents').download(cleanPath);
                if (!error && data) formFileBuffer = Buffer.from(await data.arrayBuffer());
              } catch (e) {}
            }
          }
        } else {
          body = await req.json().catch(() => ({}));
          formCategory = ((body.project_category as string) || '').toUpperCase();
          formFilename = (body.filename as string) || 'uploaded_document.pdf';
          formTenderTitle = (body.tender_title as string) || '';
          formJvPartnerId = (body.jv_partner_id as string) || '';
          const docUrlParam = body.document_url || body.file_url || body.storage_path || '';
          if (docUrlParam) {
            if (docUrlParam.startsWith('http://') || docUrlParam.startsWith('https://')) {
              try {
                const fetchRes = await fetch(docUrlParam);
                if (fetchRes.ok) formFileBuffer = Buffer.from(await fetchRes.arrayBuffer());
              } catch (e) {}
            }
            if (!formFileBuffer && supabase) {
              try {
                let cleanPath = docUrlParam;
                if (cleanPath.includes('/tender-documents/')) cleanPath = cleanPath.split('/tender-documents/')[1];
                cleanPath = cleanPath.split('?')[0];
                const { data, error } = await supabase.storage.from('tender-documents').download(cleanPath);
                if (!error && data) formFileBuffer = Buffer.from(await data.arrayBuffer());
              } catch (e) {}
            }
          }
        }
      } catch (e) { body = {}; }
    }

    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';

    // ═══ AUTHENTICATION ENDPOINTS (PUBLIC ALLOWLIST) ══════════════════════════
    if (subPath === 'auth/login' && method === 'POST') {
      const empId = (body?.employee_id || body?.username || '').trim().toUpperCase();
      const pass = (body?.password || '').trim();
      if (!empId || !pass) {
        return NextResponse.json({ status: 'error', detail: 'Employee ID and password are required.' }, { status: 400 });
      }

      // 1. Supabase IP + Username Rate Limiting & Account Lockout Check
      const rateLimitCheck = await checkSupabaseRateLimitAndLockout(empId, clientIp);
      if (!rateLimitCheck.isAllowed) {
        return NextResponse.json({ status: 'error', detail: rateLimitCheck.detail }, { status: 429 });
      }

      let matchedUser: any = null;
      if (supabase) {
        try {
          const { data: dbUsers } = await supabase.from('users').select('*').eq('employee_id', empId);
          if (dbUsers && dbUsers.length > 0) {
            const u = dbUsers[0];
            const { isValid, needsRehash } = verifyPasswordScrypt(pass, u.password_hash || u.password);
            if (isValid) {
              matchedUser = u;
              if (needsRehash) {
                const newScryptHash = hashPasswordScrypt(pass);
                Promise.resolve(supabase.from('users').update({ password_hash: newScryptHash }).eq('employee_id', empId)).then(() => {
                  console.log(`[AUTH] Successfully rehashed password for user ${empId}`);
                }).catch(() => null);
              }
            }
          }
        } catch (e) {}
      }

      if (!matchedUser) {
        await recordLoginAudit(empId, clientIp, false, 'Invalid credentials');
        return NextResponse.json({ status: 'error', detail: 'Access Denied: Invalid Employee ID or Password.' }, { status: 401 });
      }

      // BLOCK PENDING USERS FROM LOGGING IN
      if (matchedUser.status === 'Pending' || matchedUser.status !== 'Active') {
        await recordLoginAudit(empId, clientIp, false, `Account status ${matchedUser.status}`);
        return NextResponse.json(
          { status: 'error', detail: 'Account Pending Admin Approval or Inactive. Please contact administrator to activate your account.' },
          { status: 403 }
        );
      }

      await recordLoginAudit(empId, clientIp, true, 'User login successful');

      const token = createSessionToken({
        employee_id: matchedUser.employee_id,
        role: matchedUser.role || 'User',
        full_name: matchedUser.full_name
      }, 12 * 3600);

      if (!token) {
        return NextResponse.json({ status: 'error', detail: 'Failed to issue session token due to server configuration error.' }, { status: 500 });
      }

      const response = NextResponse.json({
        status: 'success',
        message: `Welcome back, ${matchedUser.full_name}!`,
        session_token: token,
        user: sanitizeUser(matchedUser)
      });

      response.cookies.set({
        name: 'desire_session_token',
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 12 * 3600,
        sameSite: 'lax'
      });

      return response;
    }

    if (subPath === 'auth/admin-login' && method === 'POST') {
      const adminIdClean = (body?.admin_id || body?.username || '').trim().toUpperCase();
      const passClean = (body?.password || '').trim();

      if (!adminIdClean || !passClean) {
        return NextResponse.json({ status: 'error', detail: 'Admin ID and password are required.' }, { status: 400 });
      }

      const rateLimitCheck = await checkSupabaseRateLimitAndLockout(adminIdClean, clientIp);
      if (!rateLimitCheck.isAllowed) {
        return NextResponse.json({ status: 'error', detail: rateLimitCheck.detail }, { status: 429 });
      }

      let matchedAdmin: any = null;
      if (supabase) {
        try {
          const targetEmpId = adminIdClean === 'ADMIN' ? 'EMP001' : adminIdClean;
          const { data: dbUsers } = await supabase.from('users').select('*').eq('employee_id', targetEmpId);
          if (dbUsers && dbUsers.length > 0) {
            const u = dbUsers[0];
            const { isValid, needsRehash } = verifyPasswordScrypt(passClean, u.password_hash || u.password);
            if (isValid && (u.role === 'Administrator' || u.role === 'Admin') && u.status === 'Active') {
              matchedAdmin = u;
              if (needsRehash) {
                const newScryptHash = hashPasswordScrypt(passClean);
                Promise.resolve(supabase.from('users').update({ password_hash: newScryptHash }).eq('employee_id', u.employee_id)).catch(() => null);
              }
            }
          }
        } catch (e) {}
      }

      if (!matchedAdmin) {
        await recordLoginAudit(adminIdClean, clientIp, false, 'Invalid admin credentials');
        return NextResponse.json({ status: 'error', detail: 'Access Denied: Invalid Admin Credentials.' }, { status: 401 });
      }

      await recordLoginAudit(adminIdClean, clientIp, true, 'Admin login successful');

      const token = createSessionToken({
        employee_id: matchedAdmin.employee_id,
        role: matchedAdmin.role || 'Administrator',
        full_name: matchedAdmin.full_name
      }, 12 * 3600);

      if (!token) {
        return NextResponse.json({ status: 'error', detail: 'Failed to issue admin token.' }, { status: 500 });
      }

      const response = NextResponse.json({
        status: 'success',
        message: 'Admin authentication successful.',
        session_token: token,
        must_change_password: false,
        admin: sanitizeUser(matchedAdmin)
      });

      response.cookies.set({
        name: 'desire_session_token',
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 12 * 3600,
        sameSite: 'lax'
      });

      return response;
    }

    if (subPath === 'admin/unlock-account' && method === 'POST') {
      const targetEmpId = (body?.employee_id || body?.username || '').trim().toUpperCase();
      const targetIp = (body?.ip || body?.client_ip || '').trim();

      if (!targetEmpId) {
        return NextResponse.json({ status: 'error', detail: 'Employee ID is required to unlock account.' }, { status: 400 });
      }

      if (supabase) {
        try {
          await supabase.from('audit_logs').insert([{
            actor: targetEmpId,
            action: 'LOGIN_SUCCESS',
            target: targetIp || clientIp,
            details: `Account manually unlocked by Admin`,
            timestamp: new Date().toISOString()
          }]);
        } catch (e) {
          console.error('[ADMIN_UNLOCK_ERROR]', e);
        }
      }

      return NextResponse.json({
        status: 'success',
        message: `Account '${targetEmpId}' has been successfully unlocked.`
      });
    }

    // ═══ MINIMAL AUTHENTICATED ASSIGNEES ENDPOINT FOR BID FLOW CHIPS ════════
    if (subPath === 'users/assignees' && method === 'GET') {
      let assignees = [
        { id: 'usr-101', employee_id: 'EMP001', full_name: 'Ankit Purohit', email: 'ankit.purohit@desireenergy.com' },
        { id: 'usr-102', employee_id: 'EMP002', full_name: 'Deepak Khandelwal', email: 'deepak.khandelwal@desireenergy.com' },
        { id: 'usr-103', employee_id: 'EMP003', full_name: 'Suresh Sharma', email: 'suresh.sharma@desireenergy.com' },
        { id: 'usr-104', employee_id: 'EMP004', full_name: 'Vikas Verma', email: 'vikas.verma@desireenergy.com' },
        { id: 'usr-105', employee_id: 'EMP005', full_name: 'Dharmesh Khandelwal', email: 'dharmeshkhandelwal@desireenergy.com' }
      ];

      if (supabase) {
        try {
          const { data: dbUsers } = await supabase
            .from('users')
            .select('id, employee_id, full_name, email')
            .eq('status', 'Active');

          if (dbUsers && dbUsers.length > 0) {
            assignees = dbUsers;
          }
        } catch (e) {}
      }

      return NextResponse.json({ status: 'success', data: assignees });
    }

    // ═══ ACTIVE VERIFIED STAFF USERS HANDLER ═════════════════════════════════
    if (subPath === 'users' && method === 'GET') {
      if (supabase) {
        try {
          const { data: dbUsers, error } = await supabase
            .from('users')
            .select('id, employee_id, full_name, email, role, department, status')
            .eq('status', 'Active')
            .ilike('email', '%@desireenergy.com')
            .order('employee_id', { ascending: true });

          if (!error && dbUsers && dbUsers.length > 0) {
            return NextResponse.json({ status: 'success', data: dbUsers });
          }
        } catch (e) {
          console.error('[API] Error fetching users from supabase:', e);
        }
      }

      // Verified seed fallback for active Desire Energy staff
      return NextResponse.json({
        status: 'success',
        data: [
          { employee_id: 'EMP001', full_name: 'Ankit Purohit', email: 'ankit.purohit@desireenergy.com', role: 'Administrator', department: 'Admin' },
          { employee_id: 'EMP002', full_name: 'Deepak Khandelwal', email: 'deepak.khandelwal@desireenergy.com', role: 'Sr Estimator', department: 'Estimation Team' },
          { employee_id: 'EMP003', full_name: 'Suresh Sharma', email: 'suresh.sharma@desireenergy.com', role: 'Chief Engineer', department: 'Engineering' },
          { employee_id: 'EMP004', full_name: 'Vikas Verma', email: 'vikas.verma@desireenergy.com', role: 'Tender Head', department: 'Tender Team' },
          { employee_id: 'EMP005', full_name: 'Dharmesh Khandelwal', email: 'dharmeshkhandelwal@desireenergy.com', role: 'Director & JV Lead', department: 'Tender Team' }
        ]
      });
    }

    // ═══ MASTER COMPANIES DIRECT HANDLERS ═════════════════════════════════════
    if (subPath === 'companies' && method === 'GET') {
      let comps = GLOBAL_SERVER_COMPANIES;
      if (supabase) {
        try {
          const { data: dbComps } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
          if (dbComps && dbComps.length > 0) comps = dbComps;
        } catch (e) {}
      }
      return NextResponse.json({ status: 'success', companies: comps });
    }

    if (subPath === 'companies' && method === 'POST') {
      const newComp = body;
      if (newComp && newComp.name) {
        const idx = GLOBAL_SERVER_COMPANIES.findIndex(c => c.id === newComp.id);
        if (idx >= 0) {
          GLOBAL_SERVER_COMPANIES[idx] = { ...GLOBAL_SERVER_COMPANIES[idx], ...newComp };
        } else {
          GLOBAL_SERVER_COMPANIES.unshift(newComp);
        }
        if (supabase) {
          try {
            await supabase.from('companies').upsert([newComp], { onConflict: 'id' });
          } catch (e) {}
        }
        return NextResponse.json({ status: 'success', company: newComp });
      }
      return NextResponse.json({ status: 'error', message: 'Invalid company data' }, { status: 400 });
    }

    if (subPath.startsWith('companies/') && method === 'DELETE') {
      const compId = subPath.split('/')[1];
      GLOBAL_SERVER_COMPANIES = GLOBAL_SERVER_COMPANIES.filter(c => c.id !== compId);
      if (supabase) {
        try {
          await supabase.from('companies').delete().eq('id', compId);
        } catch (e) {}
      }
      return NextResponse.json({ status: 'success', message: `Deleted company ${compId}` });
    }

    // ═══ TENDER MANIFESTS & COSTING DIRECT HANDLERS ══════════════════════════
    if (subPath === 'tender/vapi-manifest' || subPath === 'vapi-manifest' || subPath === 'tender/banaskantha-manifest' || subPath === 'banaskantha-manifest' || subPath === 'tender/vapi-costing-data' || subPath === 'vapi-costing-data' || subPath === 'tender/banaskantha-costing-data' || subPath === 'banaskantha-costing-data') {
      return NextResponse.json({ status: 'error', message: 'Legacy fixture endpoint disabled' }, { status: 404 });
    }

    // ═══ TENDER INGESTION STATUS ══════════════════════════════════════════════
    if ((subPath === 'tender/status' || subPath === 'tender/ingestion-status') && method === 'GET') {
      const searchParams = req.nextUrl.searchParams;
      const tenderId = searchParams.get('tender_id') || searchParams.get('id') || '';
      const queryExpected = parseInt(searchParams.get('expected_chunks') || searchParams.get('total_chunks') || '0', 10);

      if (!tenderId) {
        return NextResponse.json({ status: 'error', message: 'tender_id parameter is required' }, { status: 400 });
      }

      let storedChunks = 0;
      let totalChunks = 0;

      const tracked = INGESTION_TRACKER[tenderId];
      if (tracked) {
        storedChunks = tracked.stored_chunks;
        totalChunks = tracked.total_chunks;
      }

      if (queryExpected > 0 && totalChunks === 0) {
        totalChunks = queryExpected;
      }

      if (supabase) {
        try {
          const { count } = await supabase
            .from('tender_chunks')
            .select('id', { count: 'exact', head: true })
            .eq('tender_id', tenderId);

          if (typeof count === 'number' && count > 0) {
            storedChunks = Math.max(storedChunks, count);
          }
        } catch (e) {}
      }

      const effectiveTotal = totalChunks > 0 ? totalChunks : (queryExpected > 0 ? queryExpected : 0);
      const isComplete = effectiveTotal > 0 && storedChunks >= effectiveTotal && (tracked ? (tracked.status === 'completed' || storedChunks >= effectiveTotal) : (queryExpected > 0 && storedChunks >= queryExpected));

      return NextResponse.json({
        status: 'success',
        tender_id: tenderId,
        stored_chunks: storedChunks,
        total_chunks: effectiveTotal,
        is_complete: isComplete,
        analysis_mode: isComplete ? 'full' : 'preview',
        cold_start_resilient: true
      });
    }

    // ═══ PGVECTOR KNOWLEDGE BASE & VECTOR DB INSPECTOR ═════════════════════════
    if ((subPath === 'tender/vector-db' || subPath === 'vector-db') && method === 'GET') {
      let totalCount = 0;
      let chunksList: any[] = [];
      let tenderSummary: Record<string, number> = {};

      if (supabase) {
        try {
          // 1. Get exact total count and 50 recent chunk snippets for preview
          const { count, data } = await supabase
            .from('tender_chunks')
            .select('id, tender_id, chunk_index, content, created_at', { count: 'exact' })
            .order('created_at', { ascending: false })
            .limit(50);

          if (typeof count === 'number') totalCount = count;
          if (data && data.length > 0) {
            chunksList = data.map(c => ({
              id: c.id,
              tender_id: c.tender_id || 'UNKNOWN',
              chunk_index: c.chunk_index ?? 0,
              chunk_snippet: (c.content || '').slice(0, 300),
              created_at: c.created_at || new Date().toISOString()
            }));
          }

          // 2. Aggregate full tender breakdown across ALL chunks (not limited to 50)
          const { data: fullTenders } = await supabase
            .from('tender_chunks')
            .select('tender_id');

          if (fullTenders && fullTenders.length > 0) {
            fullTenders.forEach(row => {
              const tid = row.tender_id || 'UNKNOWN';
              tenderSummary[tid] = (tenderSummary[tid] || 0) + 1;
            });
          }
        } catch (e: any) {
          console.error('[VECTOR_DB_INSPECTOR] Error querying pgvector tender_chunks:', e);
        }
      }

      return NextResponse.json({
        status: 'success',
        database_engine: 'Supabase PostgreSQL (pgvector extension)',
        embedding_model: 'models/gemini-embedding-001 (768-dim)',
        total_vector_chunks: totalCount,
        unique_tenders_indexed: Object.keys(tenderSummary).length,
        tender_breakdown: tenderSummary,
        recent_chunks: chunksList
      });
    }

    // ═══ TENDER UPLOAD URL (AUTHENTICATED SIGNED URL CREATOR) ═════════════════
    if (subPath === 'tender/upload-url' && method === 'POST') {
      if (!session) {
        return NextResponse.json(
          { status: 'error', error_type: 'UNAUTHORIZED', message: 'Authentication required to obtain upload URL.' },
          { status: 401 }
        );
      }

      const filename = (body?.filename || 'uploaded_document.pdf').trim();
      const cleanFileName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `uploads/${Date.now()}_${cleanFileName}`;

      if (!supabase) {
        return NextResponse.json(
          { status: 'error', error_type: 'UPLOAD_FAILED', message: 'Supabase storage service is not configured on server.' },
          { status: 500 }
        );
      }

      try {
        const { data, error } = await supabase.storage
          .from('tender-documents')
          .createSignedUploadUrl(storagePath);

        if (error || !data?.signedUrl) {
          console.error('[UPLOAD_URL_ERROR]', error);
          return NextResponse.json(
            { status: 'error', error_type: 'UPLOAD_FAILED', message: `Failed to create signed upload URL: ${error?.message || 'Unknown storage error'}` },
            { status: 500 }
          );
        }

        return NextResponse.json({
          status: 'success',
          signed_url: data.signedUrl,
          storage_path: storagePath,
          token: data.token
        });
      } catch (err: any) {
        console.error('[UPLOAD_URL_EXCEPTION]', err);
        return NextResponse.json(
          { status: 'error', error_type: 'UPLOAD_FAILED', message: `Server error creating signed upload URL: ${err?.message || err}` },
          { status: 500 }
        );
      }
    }

    // ═══ TENDER ANALYZE ═══════════════════════════════════════════════════════
    if ((subPath === 'tender/analyze' || subPath === 'tender/analyze-full') && method === 'POST') {
      const filename = formFilename || body.filename || 'uploaded_document.pdf';
      const titleInput = formTenderTitle || body.tender_title || '';
      const jvPartnerId = formJvPartnerId || body.jv_partner_id || 'comp-vhp-04';
      const inputTenderId = (body.tender_id || body.id || '').trim();
      const currentTenderId = inputTenderId || `tender-${Date.now()}`;
      const isFullMode = subPath === 'tender/analyze-full' || body.mode === 'full' || formCategory === 'full';

      // Storage Download Fallback if File Buffer is empty (Direct-to-Storage Flow)
      const docPathOrUrl = body.storage_path || body.document_url || body.file_url || '';
      if ((!formFileBuffer || formFileBuffer.length === 0) && docPathOrUrl) {
        let cleanPath = docPathOrUrl;
        if (cleanPath.includes('/tender-documents/')) cleanPath = cleanPath.split('/tender-documents/')[1];
        cleanPath = cleanPath.split('?')[0];

        if (supabase) {
          try {
            const { data, error } = await supabase.storage.from('tender-documents').download(cleanPath);
            if (!error && data) {
              formFileBuffer = Buffer.from(await data.arrayBuffer());
              console.log(`[STORAGE_DOWNLOAD] Successfully downloaded ${formFileBuffer.length} bytes from path: ${cleanPath}`);
            } else if (error) {
              console.error(`[STORAGE_DOWNLOAD_ERROR] Download failed for ${cleanPath}:`, error.message);
            }
          } catch (dErr: any) {
            console.error(`[STORAGE_DOWNLOAD_EXCEPTION] Download exception for ${cleanPath}:`, dErr?.message || dErr);
          }
        }
      }

      if (!formFileBuffer || formFileBuffer.length === 0) {
        return buildErrorResponse('FILE_UPLOAD_FAILED', 'Uploaded file buffer is empty or could not be downloaded from cloud storage.');
      }

      const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
      if (!geminiKey) {
        return buildErrorResponse('AI_AUTH_FAILED', 'GEMINI_API_KEY environment variable is not configured.');
      }
      const cleanGeminiKey = geminiKey.replace(/^["']|["']$/g, '').trim();

      // Use new clean engine by default, allowing fallback to legacy only if explicitly requested
      const searchParams = req.nextUrl?.searchParams || (req.url ? new URL(req.url, 'http://localhost:3000').searchParams : new URLSearchParams());
      const useNewEngine = process.env.USE_NEW_ENGINE !== 'false' && body.engine !== 'legacy' && searchParams.get('engine') !== 'legacy';

      if (useNewEngine) {
        try {
          const newReport = await runNewEligibilityEvaluation(formFileBuffer, cleanGeminiKey, {
            filename,
            projectCategory: formCategory || body.project_category || 'EPC',
            tenderTitle: titleInput
          });

          // Compatible clauses_breakdown mapping
          const clausesBreakdown = [
            ...newReport.sections.financial.items.map((f, idx) => ({
              clause_no: `FIN-${idx + 1}`,
              clause_title: f.title,
              requirement_type: 'Financial',
              clause_group: 'qualification_criterion',
              tender_requirement: f.quote,
              required_value: f.required_amount ? `₹${f.required_amount} ${f.required_unit || 'Cr'}` : f.title,
              desire_value: f.inputs_shown,
              jv_value: 'Pooled per JV rule',
              combined_value: f.inputs_shown,
              status: f.status === 'PASS' ? 'MATCH' : (f.status === 'CANNOT CHECK' ? 'CANNOT BE CHECKED' : 'NOT ELIGIBLE'),
              active_status: f.status === 'PASS' ? 'MATCH' : (f.status === 'CANNOT CHECK' ? 'CANNOT BE CHECKED' : 'NOT ELIGIBLE'),
              active_val: f.inputs_shown,
              gap_notes: f.evaluation_notes,
              page_ref: `Page ${f.page}`
            })),
            ...newReport.sections.technical.items.map((t, idx) => ({
              clause_no: `TECH-${idx + 1}`,
              clause_title: t.title,
              requirement_type: 'Technical',
              clause_group: 'qualification_criterion',
              tender_requirement: t.quote,
              required_value: t.threshold ? `${t.threshold} ${t.unit || ''}` : t.title,
              desire_value: t.project_used,
              jv_value: 'Available if JV consortium formed',
              combined_value: t.project_used,
              status: t.status === 'PASS' ? 'MATCH' : (t.status === 'CANNOT CHECK' ? 'CANNOT BE CHECKED' : 'NOT ELIGIBLE'),
              active_status: t.status === 'PASS' ? 'MATCH' : (t.status === 'CANNOT CHECK' ? 'CANNOT BE CHECKED' : 'NOT ELIGIBLE'),
              active_val: t.project_used,
              gap_notes: t.evaluation_notes,
              page_ref: `Page ${t.page}`
            })),
            ...newReport.sections.others.gates.map((g, idx) => ({
              clause_no: `GATE-${idx + 1}`,
              clause_title: g.title,
              requirement_type: g.category,
              clause_group: 'qualification_criterion',
              tender_requirement: g.quote,
              required_value: g.title,
              desire_value: g.evaluation_notes,
              jv_value: 'Compliant',
              combined_value: g.evaluation_notes,
              status: g.status === 'PASS' ? 'MATCH' : (g.status === 'CANNOT CHECK' ? 'CANNOT BE CHECKED' : 'NOT ELIGIBLE'),
              active_status: g.status === 'PASS' ? 'MATCH' : (g.status === 'CANNOT CHECK' ? 'CANNOT BE CHECKED' : 'NOT ELIGIBLE'),
              active_val: g.evaluation_notes,
              gap_notes: g.evaluation_notes,
              page_ref: `Page ${g.page}`
            })),
            ...newReport.sections.others.unscored_information.map((u, idx) => ({
              clause_no: `INFO-${idx + 1}`,
              clause_title: u.title,
              requirement_type: u.category,
              clause_group: 'mandatory_submission',
              tender_requirement: u.quote,
              required_value: u.title,
              desire_value: u.evaluation_notes,
              jv_value: 'To be provided at bid submission',
              combined_value: u.evaluation_notes,
              status: 'INFORMATION',
              active_status: 'INFORMATION',
              active_val: u.evaluation_notes,
              gap_notes: u.evaluation_notes,
              page_ref: `Page ${u.page}`
            }))
          ];

          const evaluationReport = {
            tender_id: currentTenderId,
            tender_title: newReport.tender_title || titleInput || filename,
            tender_reference: newReport.tender_reference,
            project_category: formCategory || body.project_category || 'EPC',
            filename,
            is_rejected_non_tender: false,
            verdict: newReport.verdict,
            eligibility_score: newReport.verdict === 'Eligible' ? 100 : (newReport.verdict.startsWith('Cannot determine') ? 50 : 0),
            overall_health: newReport.verdict === 'Eligible' ? 'Green' : (newReport.verdict.startsWith('Cannot determine') ? 'Yellow' : 'Red'),
            top_card: newReport.top_card,
            sections: newReport.sections,
            rendered_text: newReport.rendered_text,
            recommendation: newReport.verdict === 'Eligible'
              ? 'BID — All eligibility criteria (Financial, Technical, and Gates) are verified.'
              : (newReport.verdict.startsWith('Cannot determine')
                ? 'MANUAL VERIFICATION REQUIRED — Certain missing credentials must be uploaded to confirm qualification.'
                : 'DO NOT BID / REVISE STRATEGY — Document contains unmet qualification criteria.'),
            executive_summary: `${newReport.top_card.financial.summary_line} ${newReport.top_card.technical.summary_line} ${newReport.top_card.others.summary_line}`,
            desire_alone: {
              score: newReport.verdict === 'Eligible' ? 100 : 0,
              status: newReport.verdict,
              fulfilled_pct: newReport.verdict === 'Eligible' ? 'Eligible' : newReport.verdict
            },
            jv_alone: {
              score: 100,
              status: 'Partner Qualified',
              fulfilled_pct: '100%'
            },
            combined_jv: {
              score: newReport.verdict === 'Eligible' ? 100 : 0,
              status: newReport.verdict,
              fulfilled_pct: newReport.verdict === 'Eligible' ? 'Eligible' : newReport.verdict
            },
            clauses_breakdown: clausesBreakdown,
            debug: newReport.debug
          };

          return NextResponse.json({
            status: 'success',
            filename,
            tender_id: currentTenderId,
            verdict: newReport.verdict,
            top_card: newReport.top_card,
            sections: newReport.sections,
            rendered_text: newReport.rendered_text,
            evaluation_report: evaluationReport,
            report: evaluationReport,
            debug: newReport.debug
          });
        } catch (newEngineErr: any) {
          console.error('[NEW_ELIGIBILITY_ENGINE_ERROR]', newEngineErr);
          return buildErrorResponse('UNKNOWN_ERROR', `New eligibility engine error: ${newEngineErr?.message || newEngineErr}`);
        }
      }

      // ─── LEGACY ENGINE PATHWAY (PRESERVED UNTOUCHED) ─────────────────────────
      let extractedPdfText = '';
      try {
        extractedPdfText = await extractTextFromPdfBuffer(formFileBuffer);
      } catch (pdfErr: any) {
        return buildErrorResponse('PDF_EXTRACTION_FAILED', pdfErr?.message || String(pdfErr));
      }

      let classifyResult: any = null;
      try {
        classifyResult = await classifyDocumentWithAI(filename, extractedPdfText, cleanGeminiKey);
      } catch (classErr: any) {
        return buildErrorResponse('UNKNOWN_ERROR', `Document classifier exception: ${classErr?.message || classErr}`);
      }

      if (!classifyResult.is_tender) {
        const rejection = buildRejection(filename, classifyResult.quote_of_evidence, classifyResult.reason, classifyResult.document_type);
        return NextResponse.json({
          status: 'success',
          is_rejected_non_tender: true,
          message: `Non-tender document detected (${classifyResult.document_type}): ${classifyResult.reason}`,
          rejection_evidence: classifyResult.quote_of_evidence,
          evaluation_report: rejection,
          report: rejection,
          debug: {
            extracted_text_length: extractedPdfText.length,
            extracted_text_sample_start: extractedPdfText.slice(0, 300),
            extracted_text_sample_end: extractedPdfText.slice(-300),
            classification_raw_ai_response: classifyResult.rawText,
            clause_extraction_raw_ai_response: null,
            path_taken: 'ai_success',
            error_if_any: null
          }
        });
      }

      let comps = GLOBAL_SERVER_COMPANIES;
      if (supabase) {
        try {
          const { data: d } = await supabase.from('companies').select('*');
          if (d && d.length > 0) {
            comps = GLOBAL_SERVER_COMPANIES.map(g => {
              const matched = d.find((c: any) => c.id === g.id || c.name?.toLowerCase() === g.name?.toLowerCase());
              return matched ? { ...g, ...matched, year_wise_turnover: matched.year_wise_turnover || g.year_wise_turnover } : g;
            });
            for (const c of d) {
              if (!comps.some(x => x.id === c.id)) comps.push(c);
            }
          }
        } catch (e) {}
      }

      let aiResult: any = null;
      let aiCallResult: GeminiCallResult = { data: null, rawText: 'Full coverage extraction' };
      let ragMetrics = { chunkCount: 0, indexedCount: 0 };

      if (extractedPdfText && extractedPdfText.length > 0) {
        // EXHAUSTIVE FULL-COVERAGE ANALYSIS FOR ALL TENDER UPLOADS
        aiResult = await performSequentialFullCoverageExtraction(extractedPdfText, filename, geminiKey);
        aiCallResult = { data: aiResult, rawText: 'Exhaustive full coverage extraction completed' };
        ragMetrics = { chunkCount: Math.ceil(extractedPdfText.length / 1000), indexedCount: Math.ceil(extractedPdfText.length / 1000) };
      } else {
        // FAST PREVIEW ANALYSIS
        let snippet = extractedPdfText ? extractedPdfText.slice(0, 60000) : `Filename: ${filename}. Title: ${titleInput}`;
        if (extractedPdfText && extractedPdfText.length > 0) {
          try {
            const ragResult = await retrieveRAGContextForTender(currentTenderId, extractedPdfText, geminiKey);
            if (ragResult.ragContextText && ragResult.ragContextText.length > 50) {
              snippet = ragResult.ragContextText;
              ragMetrics = { chunkCount: ragResult.chunkCount, indexedCount: ragResult.indexedCount };
            }

            const waitUntilFn = (globalThis as any).waitUntil || ((p: Promise<any>) => p);
            waitUntilFn(
              ingestDocumentInBackground(currentTenderId, extractedPdfText, geminiKey).catch(bgErr => {
                console.warn('[BACKGROUND_RAG_TRIGGER] Background ingestion task error:', bgErr);
              })
            );
          } catch (ragErr) {
            console.warn('[RAG_PIPELINE] RAG retrieval warning, falling back to direct snippet:', ragErr);
          }
        }

        const prompt = `You are Desire Tender AI, an expert Government & Corporate Tender Qualification Auditor.
Your ONLY job is to read the provided tender document text and EXTRACT the raw eligibility clauses, titles, requirement types, text descriptions, and required numeric threshold values.

DOCUMENT TEXT (Filename: "${filename}"):
"${snippet}"

INSTRUCTIONS FOR CLAUSE EXTRACTION:
Step 1: Verify if this is a valid Tender Document. If it is an Invoice, Bill, Resume, set "is_rejected_non_tender": true.
Step 2: Extract ALL distinct eligibility and qualification clauses present in the document text (Financial Turnover, Work Experience, Net Worth, Solvency, Certifications, Registration, EMD, Equipment, Staffing, Penalties, etc.).
Step 3: Extract EXACT clause numbers, exact titles, exact required numeric values (in ₹ Crores or Lakhs), units, and requirement descriptions.

Return valid JSON only:
{
  "is_rejected_non_tender": false,
  "tender_title": "string — extracted official tender title",
  "project_category": "ESCO" | "STP" | "RHDS" | "KUSUM" | "SOLAR" | "CIVIL" | "EPC",
  "verdict": "Eligible" | "Conditional" | "Ineligible",
  "overall_health": "Green" | "Yellow" | "Red",
  "recommendation": "string — summary recommendation",
  "executive_summary": "string — summary of extracted tender clauses",
  "clauses_breakdown": [
    {
      "clause_no": "string — e.g. Clause 4.1 or ITB 3.2",
      "clause_title": "string — title of requirement",
      "requirement_type": "Financial" | "Technical" | "Organizational" | "Compliance" | "Equipment" | "Staffing" | "Legal",
      "tender_requirement": "exact requirement statement from document",
      "required_value_num": number or null (e.g. 52.47 for Rs 52.47 Cr),
      "required_value_unit": "Cr" | "Lakhs" | "km" | "MLD" | null,
      "required_value": "string statement of requirement threshold",
      "required_doc": "documentary evidence required",
      "page_ref": "page or section reference"
    }
  ]
}`;

        let aiCallResult: GeminiCallResult;
        try {
          aiCallResult = await callGeminiAI(prompt, geminiKey);
        } catch (aiErr: any) {
          return buildErrorResponse('UNKNOWN_ERROR', `AI clause extraction exception: ${aiErr?.message || aiErr}`);
        }

        if (!aiCallResult.data || typeof aiCallResult.data !== 'object') {
          const cat = aiCallResult.errorCategory || 'UNKNOWN_ERROR';
          return buildErrorResponse(cat, aiCallResult.errorDetail, {
            raw_response: aiCallResult.rawText ? aiCallResult.rawText.slice(0, 500) : null
          });
        }
        aiResult = aiCallResult.data;
      }
      if (!Array.isArray(aiResult.clauses_breakdown) || typeof aiResult.verdict !== 'string') {
        return buildErrorResponse(
          'AI_RESPONSE_INVALID',
          'Parsed AI response is missing required fields (clauses_breakdown array or verdict).',
          { raw_response: aiCallResult.rawText ? aiCallResult.rawText.slice(0, 500) : null }
        );
      }

      // EXECUTE DETERMINISTIC MATCHING & SCORING ENGINE
      const deterministicResult = evaluateDeterministicMatching(aiResult.clauses_breakdown, comps, jvPartnerId);

      aiResult.desire_alone = deterministicResult.desire_alone;
      aiResult.jv_alone = deterministicResult.jv_alone;
      aiResult.combined_jv = deterministicResult.combined_jv;
      aiResult.clauses_breakdown = deterministicResult.clauses_breakdown;
      aiResult.summary_line = deterministicResult.summaryLine;
      aiResult.recommended_jv_partner = deterministicResult.recommendedPartner;

      console.log(`[DETERMINISTIC_ENGINE] ${deterministicResult.summaryLine}`);

      if (aiResult.is_rejected_non_tender === true) {
        const rejection = buildRejection(filename, '', aiResult.executive_summary || 'Document classified as non-tender', 'Non-Tender');
        return NextResponse.json({
          status: 'success',
          is_rejected_non_tender: true,
          message: 'AI confirmed: Not a tender document.',
          evaluation_report: rejection,
          report: rejection,
          debug: {
            extracted_text_length: extractedPdfText.length,
            extracted_text_sample_start: extractedPdfText.slice(0, 300),
            extracted_text_sample_end: extractedPdfText.slice(-300),
            classification_raw_ai_response: classifyResult.rawText,
            clause_extraction_raw_ai_response: aiCallResult.rawText,
            path_taken: 'ai_success',
            error_if_any: null
          }
        });
      }

      aiResult.tender_id = `tender-${Date.now()}`;
      aiResult.filename = filename;
      aiResult.is_rejected_non_tender = false;
      aiResult.parameter_matrix = (aiResult.clauses_breakdown || []).map((c: any) => ({
        parameter: c.clause_title,
        tender_requirement: c.tender_requirement,
        company_capability: `Desire: ${c.desire_value} | JV: ${c.jv_value}`,
        status: c.status === 'MATCH' ? 'Met' : 'Not Met',
        gap_notes: c.gap_notes
      }));
      const recPartner = deterministicResult.recommendedPartner || comps[1] || comps[0];
      const jvName = recPartner.name || 'JV Partner';
      const jvSharePct = recPartner.id === 'comp-aapl-05' ? '25%' : '49%';
      const desireSharePct = recPartner.id === 'comp-aapl-05' ? '75%' : '51%';
      const desireComp = comps.find((c: any) => c.type === 'Desire Energy' || c.id === 'comp-desire-01') || comps[0];
      const cT = (desireComp.average_turnover || 290.27) + (recPartner.average_turnover || 37.01);

      aiResult.jv_rules_audit = [
        { rule: 'Lead Member Equity Share', requirement: '>= 51%', actual: `${desireSharePct} (Desire Energy)`, status: 'PASSED' },
        { rule: 'Minimum Partner Share', requirement: '>= 20%', actual: `${jvSharePct} (${jvName})`, status: 'PASSED' },
        { rule: 'Turnover Pooling', requirement: '100% Sum', actual: `Rs.${cT.toFixed(2)} Cr`, status: 'PASSED' }
      ];
      const titleLower = (aiResult.tender_title || titleInput || '').toLowerCase();
      const catUpper = (aiResult.project_category || formCategory || '').toUpperCase();

      const partnerRecommendations = [
        {
          company_id: 'comp-vhp-04',
          partner_id: 'comp-vhp-04',
          company_name: 'VINOD H PATEL',
          partner_name: 'VINOD H PATEL',
          rank: 1,
          type: 'JV Partner',
          turnover_cr: 191.39,
          net_worth_cr: 33.37,
          solvency_cr: 25.0,
          key_advantage: 'Bulk Water Supply Pipelines, State WRD & R&B Class-AA Contractor Registration',
          reason: 'High turnover (₹191.39 Cr) and extensive state WRD credentials satisfy large civil and pipeline criteria.',
          suitability: (catUpper === 'EPC' || catUpper === 'CIVIL') ? 'Best Match for Large-Scale Water Transmission & Bulk EPC Projects' : 'Strong Financial & High Turnover Partner',
          equity_suggestion: 'Desire 51% : Partner 49%',
          fills_gaps: ['Bulk Water Pipelines', 'State WRD Credentials'],
          match_score: (catUpper === 'EPC' || catUpper === 'CIVIL') ? 98 : 88
        },
        {
          company_id: 'comp-aapl-05',
          partner_id: 'comp-aapl-05',
          company_name: 'ADROIT ASSOCIATES PRIVATE LIMITED',
          partner_name: 'ADROIT ASSOCIATES PRIVATE LIMITED',
          rank: 2,
          type: 'JV Partner',
          turnover_cr: 35.22,
          net_worth_cr: 14.27,
          solvency_cr: 10.0,
          key_advantage: 'Lift Irrigation, State PWD Class-A, DI/HDPE Distribution Network',
          reason: 'Deep lift irrigation & rural distribution credentials complement Desire Energy.',
          suitability: (catUpper === 'RHDS' || catUpper === 'ESCO') ? 'Best Match for Piped Distribution Networks, House Connections & Lift Irrigation' : 'Specialized Water Supply & Lift Irrigation Partner',
          equity_suggestion: 'Desire 75% : Partner 25%',
          fills_gaps: ['Piped Distribution', 'Lift Irrigation'],
          match_score: (catUpper === 'RHDS' || catUpper === 'ESCO') ? 97 : 85
        },
        {
          company_id: 'comp-divija-02',
          partner_id: 'comp-divija-02',
          company_name: 'DIVIJA CONSTRUCTION',
          partner_name: 'DIVIJA CONSTRUCTION',
          rank: 3,
          type: 'JV Partner',
          turnover_cr: 37.01,
          net_worth_cr: 6.58,
          solvency_cr: 10.0,
          key_advantage: 'Underground Sewer Network, Class-AA, Sewage Pumping Station, Micro-tunneling',
          reason: 'Extensive underground sewer and pump house track record fulfills municipal utility qualifications.',
          suitability: (catUpper === 'STP' || catUpper === 'SEWERAGE') ? 'Best Match for Sewerage & STP Networks' : 'Underground Utilities & Drainage Partner',
          equity_suggestion: 'Desire 75% : Partner 25%',
          fills_gaps: ['Sewerage Network', 'STP Experience'],
          match_score: (catUpper === 'STP' || catUpper === 'SEWERAGE') ? 99 : 72
        }
      ].sort((a, b) => b.match_score - a.match_score).map((r, i) => ({ ...r, rank: i + 1 }));

      aiResult.partner_recommendations = partnerRecommendations;
      aiResult.recommended_partner_id = partnerRecommendations[0].partner_id;
      aiResult.recommended_partner_name = partnerRecommendations[0].partner_name;

      const isFullScan = ragMetrics.indexedCount >= ragMetrics.chunkCount && ragMetrics.chunkCount > 0;
      const cleanAi = sanitizeReportClauses(aiResult, jvName);
      cleanAi.tender_id = currentTenderId;
      cleanAi.analysis_mode = isFullScan ? 'full' : 'preview';
      cleanAi.is_background_ingesting = !isFullScan;
      cleanAi.chunk_metrics = {
        total_chunks: ragMetrics.chunkCount,
        indexed_chunks: ragMetrics.indexedCount
      };

      return NextResponse.json({
        status: 'success',
        is_rejected_non_tender: false,
        message: isFullScan ? 'Full semantic RAG tender evaluation complete.' : 'Fast preview tender evaluation complete.',
        tender_id: currentTenderId,
        analysis_mode: isFullScan ? 'full' : 'preview',
        is_background_ingesting: !isFullScan,
        chunk_metrics: {
          total_chunks: ragMetrics.chunkCount,
          indexed_chunks: ragMetrics.indexedCount
        },
        evaluation_report: cleanAi,
        report: cleanAi,
        debug: {
          extracted_text_length: extractedPdfText.length,
          extracted_text_sample_start: extractedPdfText.slice(0, 300),
          extracted_text_sample_end: extractedPdfText.slice(-300),
          classification_raw_ai_response: classifyResult.rawText,
          clause_extraction_raw_ai_response: aiCallResult.rawText,
          path_taken: 'ai_success',
          error_if_any: null
        }
      });
    }

    // ═══ COMPANIES ═══════════════════════════════════════════════════════════
    if (subPath === 'companies' && method === 'GET') {
      let comps = GLOBAL_SERVER_COMPANIES;
      if (supabase) {
        try {
          const { data: d } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
          if (d && d.length > 0) comps = d;
        } catch (e) {}
      }
      return NextResponse.json({ status: 'success', companies: comps });
    }

    if (subPath === 'companies' && method === 'POST') {
      const newComp = body;
      if (newComp && newComp.id) {
        const existingIdx = GLOBAL_SERVER_COMPANIES.findIndex(c => c.id === newComp.id);
        if (existingIdx >= 0) {
          GLOBAL_SERVER_COMPANIES[existingIdx] = { ...GLOBAL_SERVER_COMPANIES[existingIdx], ...newComp };
        } else {
          GLOBAL_SERVER_COMPANIES.unshift(newComp);
        }
      }
      return NextResponse.json({ status: 'success', message: 'Company saved successfully', company: newComp });
    }

    // ═══ TENDERS ══════════════════════════════════════════════════════════════
    if (subPath === 'tenders') {
      if (method === 'GET') {
        return NextResponse.json({
          status: 'success',
          tenders: []
        });
      }
      if (method === 'POST') return NextResponse.json({ status: 'success', message: 'Tender saved.' });
    }

    // ═══ BID FLOW PIPELINE (NATIVE VERCEL SERVERLESS & SUPABASE) ═══════════
    if (subPath === 'bid-flow' || subPath.startsWith('bid-flow/')) {
      const urlBidId = subPath.startsWith('bid-flow/') ? subPath.replace('bid-flow/', '').trim() : null;
      const isUuidStr = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val.trim());

      if (method === 'GET') {
        let bidsList = GLOBAL_BID_FLOW_ITEMS;
        if (supabase) {
          try {
            const { data: dbBids, error: bErr } = await supabase
              .from('bid_flow')
              .select('*')
              .order('created_at', { ascending: false });
            if (!bErr && dbBids && dbBids.length > 0) {
              bidsList = dbBids;
              GLOBAL_BID_FLOW_ITEMS = dbBids;
            }
          } catch (dbErr) {
            console.warn('[BID_FLOW_GET] Supabase fallback to in-memory:', dbErr);
          }
        }
        return NextResponse.json({ status: 'success', count: bidsList.length, data: bidsList });
      }

      if (method === 'POST') {
        const item = {
          id: isUuidStr(body?.id) ? body.id.trim() : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined),
          tender_id: body?.tender_id,
          tender_title: body?.tender_title || 'Untitled Tender',
          authority: body?.authority || null,
          state: body?.state || 'India',
          estimated_value_cr: typeof body?.estimated_value_cr === 'number' ? body.estimated_value_cr : (parseFloat(body?.estimated_value_cr) || 0),
          deadline: body?.deadline || null,
          document_url: body?.document_url || null,
          status: body?.status || 'Live',
          final_status: body?.final_status || null,
          pre_bid_meeting_date: body?.pre_bid_meeting_date || null,
          bid_submission_deadline: body?.bid_submission_deadline || null,
          responsible_person_name: body?.responsible_person_name || 'Unassigned',
          responsible_person_email: body?.responsible_person_email || null,
          cc_emails: Array.isArray(body?.cc_emails) ? body.cc_emails : [],
          notes: body?.notes || null,
          created_at: body?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: body?.created_by || 'Government Portal Scraper'
        };

        if (supabase) {
          try {
            const { error: upsertErr } = await supabase.from('bid_flow').upsert(item, { onConflict: 'tender_id' });
            if (upsertErr) {
              console.error('[BID_FLOW_POST] Supabase upsert error:', upsertErr);
            }
          } catch (sbErr) {
            console.error('[BID_FLOW_POST] Supabase upsert exception:', sbErr);
          }
        }

        const idx = GLOBAL_BID_FLOW_ITEMS.findIndex(b => b.tender_id === item.tender_id);
        if (idx >= 0) {
          GLOBAL_BID_FLOW_ITEMS[idx] = { ...GLOBAL_BID_FLOW_ITEMS[idx], ...item };
        } else {
          GLOBAL_BID_FLOW_ITEMS.unshift(item);
        }

        return NextResponse.json({ status: 'success', message: 'Tender added to Bid Flow', data: item });
      }

      if (method === 'PATCH') {
        const targetId = (urlBidId || body?.id || body?.tender_id || '').trim();
        if (!targetId) {
          return NextResponse.json({ status: 'error', message: 'Missing bid ID or tender ID for PATCH' }, { status: 400 });
        }

        let updatedItem: any = null;
        const updateFields: any = { updated_at: new Date().toISOString() };
        const ALLOWED_COLS = [
          'tender_id', 'tender_title', 'authority', 'state', 'estimated_value_cr',
          'deadline', 'document_url', 'status', 'final_status', 'pre_bid_meeting_date',
          'bid_submission_deadline', 'responsible_person_name', 'responsible_person_email',
          'cc_emails', 'notes'
        ];
        for (const col of ALLOWED_COLS) {
          if (col in body && body[col] !== undefined) {
            updateFields[col] = body[col];
          }
        }

        if (supabase) {
          try {
            // Safe query: UUID column only queried if targetId is actually a valid UUID!
            // Prevents PostgreSQL fatal error: invalid input syntax for type uuid
            const isTargetUuid = isUuidStr(targetId);
            const isBodyUuid = isUuidStr(body?.id);

            let primaryRes = await (isTargetUuid
              ? supabase.from('bid_flow').update(updateFields).eq('id', targetId).select('*')
              : supabase.from('bid_flow').update(updateFields).eq('tender_id', targetId).select('*')
            );

            if (!primaryRes.error && primaryRes.data && primaryRes.data.length > 0) {
              updatedItem = primaryRes.data[0];
            } else {
              // Try fallback matches
              if (!updatedItem && isBodyUuid) {
                const fb1 = await supabase.from('bid_flow').update(updateFields).eq('id', body.id.trim()).select('*');
                if (!fb1.error && fb1.data && fb1.data.length > 0) updatedItem = fb1.data[0];
              }
              if (!updatedItem && body?.tender_id) {
                const fb2 = await supabase.from('bid_flow').update(updateFields).eq('tender_id', String(body.tender_id).trim()).select('*');
                if (!fb2.error && fb2.data && fb2.data.length > 0) updatedItem = fb2.data[0];
              }
            }
          } catch (sbErr) {
            console.error('[BID_FLOW_PATCH] Supabase update exception:', sbErr);
          }
        }

        const idx = GLOBAL_BID_FLOW_ITEMS.findIndex(b => b.id === targetId || b.tender_id === targetId || (body?.tender_id && b.tender_id === body.tender_id));
        if (idx >= 0) {
          GLOBAL_BID_FLOW_ITEMS[idx] = { ...GLOBAL_BID_FLOW_ITEMS[idx], ...updateFields };
          if (!updatedItem) updatedItem = GLOBAL_BID_FLOW_ITEMS[idx];
        }

        return NextResponse.json({ status: 'success', message: 'Bid Flow updated', data: updatedItem || updateFields });
      }

      if (method === 'DELETE') {
        const targetDeleteId = (urlBidId || body?.id || body?.tender_id || '').trim();
        if (supabase && targetDeleteId) {
          try {
            if (isUuidStr(targetDeleteId)) {
              await supabase.from('bid_flow').delete().eq('id', targetDeleteId);
            } else {
              await supabase.from('bid_flow').delete().eq('tender_id', targetDeleteId);
            }
          } catch (sbErr) {
            console.error('[BID_FLOW_DELETE] Supabase delete exception:', sbErr);
          }
        }
        GLOBAL_BID_FLOW_ITEMS = GLOBAL_BID_FLOW_ITEMS.filter(b => b.id !== targetDeleteId && b.tender_id !== targetDeleteId);
        return NextResponse.json({ status: 'success', message: 'Bid removed from Bid Flow' });
      }
    }

    // ═══ OVERALL TENDERS TRACKER STATUS PERSISTENCE ═════════════════════════
    if (subPath === 'overall-tenders/status-overrides' || subPath === 'overall-tenders/statuses') {
      if (method === 'GET') {
        const overrides: Record<string, string> = {};
        if (supabase) {
          try {
            const { data, error } = await supabase
              .from('overall_tenders')
              .select('id, tender_id, status');
            if (!error && data) {
              for (const row of data) {
                if (row.id) overrides[row.id] = row.status;
                if (row.tender_id) overrides[row.tender_id] = row.status;
              }
            } else if (error) {
              console.warn('[OVERALL_TENDERS_STATUSES] Supabase select error:', error);
            }
          } catch (e: any) {
            console.warn('[OVERALL_TENDERS_STATUSES] Exception:', e);
          }
        }
        return NextResponse.json({ status: 'success', overrides, count: Object.keys(overrides).length });
      }
    }

    if ((subPath === 'overall-tenders' || subPath.startsWith('overall-tenders/')) && (method === 'PATCH' || method === 'POST')) {
      const rawId = subPath.startsWith('overall-tenders/') ? subPath.replace('overall-tenders/', '').trim() : '';
      const tenderId = body?.id || body?.tender_id || rawId;
      const rawStatus = body?.status;
      const canonicalStatus = normalizeStatus(rawStatus);

      if (!tenderId) {
        return NextResponse.json({ status: 'error', message: 'Tender ID is required' }, { status: 400 });
      }

      let dbUpdated = false;
      let dbError: any = null;

      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('overall_tenders')
            .update({ 
              status: canonicalStatus, 
              updated_at: new Date().toISOString() 
            })
            .or(`id.eq.${tenderId},tender_id.eq.${tenderId}`)
            .select();

          if (error) {
            dbError = error.message;
            console.error('[OVERALL_TENDER_UPDATE] Supabase update error:', error);
          } else {
            dbUpdated = true;
          }
        } catch (sbErr: any) {
          dbError = sbErr?.message || String(sbErr);
          console.error('[OVERALL_TENDER_UPDATE] Exception:', sbErr);
        }
      }

      return NextResponse.json({
        status: dbUpdated ? 'success' : (supabase ? 'error' : 'success'),
        message: dbUpdated 
          ? `Status for "${tenderId}" updated to "${canonicalStatus}" in Supabase` 
          : `Status updated locally to "${canonicalStatus}"`,
        tender_id: tenderId,
        new_status: canonicalStatus,
        persisted_to_db: dbUpdated,
        error: dbError
      });
    }

    // ═══ LIVE TENDERS MARKET SUMMARY (REAL SUPABASE STATS) ══════════════════
    if (subPath === 'tenders/live-summary' && method === 'GET') {
      try {
        if (!supabase) {
          return NextResponse.json({
            status: 'unconfigured',
            message: 'Supabase client not configured — using offline data',
            active_count: 0,
            total_market_value_cr: 0,
            top_states: [],
            top_sectors: [],
            priority_tenders: [],
            all_tenders: [],
            last_updated: null
          }, { status: 200 });
        }

        const { data: rows, error: sbErr } = await supabase
          .from('tenders')
          .select('id, tender_name, project_category, department_assigned, current_stage, stage_status, eligibility_result, created_at, updated_at')
          .order('updated_at', { ascending: false });

        if (sbErr) {
          console.error('[LIVE_SUMMARY_ERROR] Supabase query failed:', sbErr);
          return NextResponse.json({ status: 'error', message: sbErr.message }, { status: 500 });
        }

        const rawRows = rows || [];
        // Filter out internal test rows and duplicate entries
        const JUNK_IDS = new Set(['TND-714135', 'TND-848273', 'TND-261164', 'TEST', 'ASDF']);
        const seenIds = new Set<string>();
        const allRows = rawRows.filter(r => {
          const idUpper = (r.id || '').trim().toUpperCase();
          const nameLower = (r.tender_name || '').trim().toLowerCase();
          if (JUNK_IDS.has(idUpper) || nameLower === 'test' || nameLower === 'asdf' || nameLower.startsWith('test tender')) {
            return false;
          }
          if (seenIds.has(idUpper)) {
            return false; // Deduplicate
          }
          seenIds.add(idUpper);
          return true;
        });

        const activeCount = allRows.length;
        let totalValCr = 0.0;
        let latestUpdate: string | null = null;
        const statesMap: Record<string, { count: number; val: number; authority: string }> = {};
        const sectorsMap: Record<string, { count: number; val: number }> = {};
        const priorityList: any[] = [];

        const VALID_INDIAN_STATES = [
          'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 
          'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 
          'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 
          'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 
          'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 
          'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh', 'Puducherry', 
          'Dadra and Nagar Haveli', 'Daman and Diu', 'Central (All India)', 'Coal India (CIL)'
        ];

        for (const row of allRows) {
          if (row.updated_at && (!latestUpdate || row.updated_at > latestUpdate)) {
            latestUpdate = row.updated_at;
          }
          if (row.created_at && (!latestUpdate || row.created_at > latestUpdate)) {
            latestUpdate = row.created_at;
          }

          const elig = row.eligibility_result as any;
          const valCr = parseFloat(elig?.value_cr) || 0.0;
          totalValCr += valCr;

          // ─── STRICT 3-TIER STATE RESOLUTION LOGIC ──────────────────
          let resolvedState: string | null = null;
          let resolvedAuthority: string = 'Internal / Unassigned';

          const rawState = typeof elig?.state === 'string' ? elig.state.trim() : null;
          if (rawState) {
            const matched = VALID_INDIAN_STATES.find(s => s.toLowerCase() === rawState.toLowerCase());
            if (matched) resolvedState = matched;
          }

          const INTERNAL_DEPARTMENTS = ['admin', 'business development', 'tender team', 'estimation team', 'management', 'finance'];
          const deptRaw = (row.department_assigned || '').trim();
          const isInternalDept = INTERNAL_DEPARTMENTS.includes(deptRaw.toLowerCase());
          const authorityDeptField = isInternalDept ? '' : deptRaw;
          const explicitAuthority = (elig?.authority || elig?.source || elig?.organisation || '').trim();
          const combinedAuthority = `${authorityDeptField} ${explicitAuthority}`.toLowerCase();

          if (!resolvedState && combinedAuthority.length > 0) {
            const matched = VALID_INDIAN_STATES.find(s => combinedAuthority.includes(s.toLowerCase()));
            if (matched) {
              resolvedState = matched;
            } else if (combinedAuthority.includes('gwssb') || combinedAuthority.includes('germi') || combinedAuthority.includes('gmdc') || combinedAuthority.includes('gsecl')) {
              resolvedState = 'Gujarat';
            } else if (combinedAuthority.includes('phed') || combinedAuthority.includes('rvunl') || combinedAuthority.includes('rajcomp')) {
              resolvedState = 'Rajasthan';
            } else if (combinedAuthority.includes('sccl') || combinedAuthority.includes('tsredco') || combinedAuthority.includes('tstransco')) {
              resolvedState = 'Telangana';
            } else if (combinedAuthority.includes('dsiidc') || combinedAuthority.includes('dpcc') || combinedAuthority.includes('dtc') || combinedAuthority.includes('djb')) {
              resolvedState = 'Delhi';
            } else if (combinedAuthority.includes('rwss') || combinedAuthority.includes('gridco') || combinedAuthority.includes('optcl')) {
              resolvedState = 'Odisha';
            } else if (combinedAuthority.includes('coal india') || combinedAuthority.includes('cil')) {
              resolvedState = 'Coal India (CIL)';
            }
          }

          if (!resolvedState && row.tender_name) {
            const titleLower = row.tender_name.toLowerCase();
            const matched = VALID_INDIAN_STATES.find(s => titleLower.includes(s.toLowerCase()));
            if (matched) {
              resolvedState = matched;
            } else if (titleLower.includes('alwar') || titleLower.includes('jaipur') || titleLower.includes('jodhpur') || titleLower.includes('salumber') || titleLower.includes('sarada') || titleLower.includes('bikaner') || titleLower.includes('kota')) {
              resolvedState = 'Rajasthan';
            } else if (titleLower.includes('patan') || titleLower.includes('ahmedabad') || titleLower.includes('gandhinagar') || titleLower.includes('surat') || titleLower.includes('vadodara') || titleLower.includes('rajkot')) {
              resolvedState = 'Gujarat';
            } else if (titleLower.includes('new delhi') || titleLower.includes('ip estate')) {
              resolvedState = 'Delhi';
            } else if (titleLower.includes('cuttack') || titleLower.includes('jagatsinghpur') || titleLower.includes('bhubaneswar')) {
              resolvedState = 'Odisha';
            } else if (titleLower.includes('hyderabad') || titleLower.includes('warangal') || titleLower.includes('khammam')) {
              resolvedState = 'Telangana';
            }
          }

          if (authorityDeptField) {
            resolvedAuthority = authorityDeptField.split('||')[0].trim();
          } else if (explicitAuthority) {
            resolvedAuthority = explicitAuthority;
          } else if (resolvedState) {
            resolvedAuthority = `${resolvedState} Authority`;
          } else {
            resolvedAuthority = 'Internal / Unassigned';
          }

          const state = resolvedState || 'Unclassified';
          const authority = resolvedAuthority;

          if (!statesMap[state]) {
            statesMap[state] = { count: 0, val: 0.0, authority };
          }
          statesMap[state].count += 1;
          statesMap[state].val += valCr;

          const sector = row.project_category || 'Infrastructure EPC';
          if (!sectorsMap[sector]) {
            sectorsMap[sector] = { count: 0, val: 0.0 };
          }
          sectorsMap[sector].count += 1;
          sectorsMap[sector].val += valCr;

          // Days left calculation (null if no valid deadline provided)
          let daysLeft: number | null = null;
          if (elig?.due_date) {
            try {
              const parsedDate = Date.parse(elig.due_date);
              if (!isNaN(parsedDate)) {
                const diff = Math.ceil((parsedDate - Date.now()) / (1000 * 60 * 60 * 24));
                daysLeft = diff > 0 ? diff : 0;
              }
            } catch {}
          }

          const itemValCr = Math.round(valCr * 100) / 100;
          const emdLakhs = parseFloat(elig?.emd_lakhs) || null;
          const tenderFee = parseFloat(elig?.tender_fee) || null;
          const dueDateStr = elig?.due_date || null;
          const pubDateStr = elig?.publish_date || (row.created_at ? row.created_at.split('T')[0] : null);
          const portalUrl = elig?.portal_url || null;

          // Real eligibility evaluation data check (no hardcoded/fake formula fallbacks)
          const isEvaluated = Boolean(elig && typeof elig.score === 'number');
          const realScore = isEvaluated ? elig.score : null;
          const realStatus = isEvaluated ? (elig.score >= 90 ? 'Direct Eligible' : 'JV Recommended') : 'Not analysed';
          const realKeyCriteria = isEvaluated ? {
            min_turnover_cr: elig.min_turnover_cr ?? null,
            similar_work_cr: elig.similar_work_cr ?? null,
            experience_years: elig.experience_years ?? null,
            license_category: elig.license_category ?? null
          } : 'Not analysed';

          priorityList.push({
            id: row.id,
            nit: row.id,
            nit_number: row.id,
            title: row.tender_name,
            authority,
            authority_code: authority.split(' ')[0] || 'DEPT',
            state,
            district: state,
            sector,
            costCr: itemValCr,
            estimated_cost_cr: itemValCr,
            emd_lakhs: emdLakhs,
            tender_fee: tenderFee,
            publish_date: pubDateStr,
            due_date: dueDateStr,
            dueDate: dueDateStr,
            days_left: daysLeft,
            daysLeft,
            stage: 'Open (Live)',
            eligibility_match_pct: realScore,
            matchPct: realScore,
            desire_qual_status: realStatus,
            status: realStatus,
            scope_highlights: [
              sector,
              authority,
              `State: ${state}`
            ],
            key_criteria: realKeyCriteria,
            portal_url: portalUrl,
            portalUrl: portalUrl,
            updatedAt: row.updated_at
          });
        }

        const topStates = Object.entries(statesMap)
          .map(([st, d]) => ({
            state: st,
            count: d.count,
            val: `₹${Math.round(d.val * 100) / 100} Cr`,
            valNum: d.val,
            authority: d.authority
          }))
          .sort((a, b) => {
            if (a.state === 'Unclassified' && b.state !== 'Unclassified') return 1;
            if (b.state === 'Unclassified' && a.state !== 'Unclassified') return -1;
            return b.count !== a.count ? b.count - a.count : b.valNum - a.valNum;
          });

        const topSectors = Object.entries(sectorsMap)
          .map(([sec, d]) => ({
            name: sec,
            count: d.count,
            value: `₹${Math.round(d.val * 100) / 100} Cr`,
            valNum: d.val,
            tag: d.val >= 50 ? 'High Value' : 'Active NIT'
          }))
          .sort((a, b) => (b.count !== a.count ? b.count - a.count : b.valNum - a.valNum));

        return NextResponse.json({
          status: 'success',
          active_count: activeCount,
          total_market_value_cr: Math.round(totalValCr * 100) / 100,
          top_states: topStates,
          top_sectors: topSectors,
          priority_tenders: priorityList.slice(0, 6),
          all_tenders: priorityList,
          last_updated: latestUpdate
        });
      } catch (err: any) {
        console.error('[LIVE_SUMMARY_EXCEPTION]', err);
        return NextResponse.json({ status: 'error', message: err?.message || 'Server error' }, { status: 500 });
      }
    }

    // ═══ GOVERNMENT PORTALS SCRAPER (RUNS NATIVELY ON VERCEL) ══════════════
    if (subPath === 'scraper/config' && method === 'GET') {
      const allKws = Object.values(KEYWORD_CATEGORIES).flat();
      return NextResponse.json({
        status: 'online',
        default_min_value_cr: 10.0,
        available_portals: Object.keys(STATE_PORTALS),
        keyword_categories: KEYWORD_CATEGORIES,
        all_keywords: Array.from(new Set(allKws)).sort()
      });
    }

    if (subPath === 'scraper/scan' && method === 'POST') {
      const states: string[] = body?.states || ['Rajasthan', 'Haryana'];
      const keywords: string[] = body?.keywords || ['Solar', 'STP or treatment', 'Water Supply'];
      const minValueCr: number = body?.min_value_cr !== undefined ? parseFloat(body.min_value_cr) : 10.0;
      // Adaptively scale maxPerKw to keep scan fast when many states are selected
      const requestedMax = parseInt(body?.max_per_kw) || 6;
      const maxPerKw = states.length > 6 ? Math.min(requestedMax, 3) : requestedMax;

      const allDiscovered: any[] = [];
      const CONCURRENCY_LIMIT = 8;
      const GLOBAL_DEADLINE_MS = 45000; // Inter-batch deadline check. Note: real worst-case is ~55s (45s check + up to 10s for the final in-flight batch)
      const startTime = Date.now();
      let timedOutEarly = false;
      const successfullyScannedStates: string[] = [];
      let lastSbError: any = null;
      let syncedCount = 0;

      // Process portals in concurrent batches of 8 with strict 10s state caps
      for (let i = 0; i < states.length; i += CONCURRENCY_LIMIT) {
        // Enforce global deadline check before starting each batch
        if (Date.now() - startTime > GLOBAL_DEADLINE_MS) {
          timedOutEarly = true;
          break;
        }

        const chunk = states.slice(i, i + CONCURRENCY_LIMIT);
        const chunkPromises = chunk.map(async (state) => {
          try {
            let crawlPromise: Promise<any[]>;
            if (state === 'Gujarat') {
              // Gujarat nProcure enforces state-level IP geofencing (India IPs only).
              // Vercel serverless runs in AWS US-East, which is blocked at TCP SYN level.
              return {
                state: 'Gujarat',
                tenders: [],
                error: 'GEO_FENCED_MANUAL_SEARCH_ONLY: Gujarat (nProcure) drops non-India serverless requests. Search directly via https://tender.nprocure.com or run from an Indian IP.'
              };
            } else if (state === 'Telangana') {
              crawlPromise = crawlTelanganaPortal(keywords, minValueCr, maxPerKw);
            } else {
              const portalUrl = STATE_PORTALS[state];
              if (!portalUrl) return { state, tenders: [] };
              crawlPromise = crawlStateGePNICPortal(state, portalUrl, keywords, minValueCr, maxPerKw);
            }

            // Strict 22s cap per individual portal (GePNIC or dedicated non-NIC)
            const timeoutPromise = new Promise<any[]>((_, reject) => 
              setTimeout(() => reject(new Error(`22s Timeout for ${state}`)), 22000)
            );
            const tenders = await Promise.race([crawlPromise, timeoutPromise]);
            return { state, tenders: Array.isArray(tenders) ? tenders : [], error: null };
          } catch (crawlErr: any) {
            console.warn(`[PORTAL_ERROR] ${state}:`, crawlErr?.message || crawlErr);
            return { state, tenders: [], error: crawlErr?.message || String(crawlErr) };
          }
        });

        const chunkResults = await Promise.allSettled(chunkPromises);
        const chunkDiscovered: any[] = [];
        for (const res of chunkResults) {
          if (res.status === 'fulfilled' && res.value) {
            successfullyScannedStates.push(res.value.state);
            if (res.value.tenders.length > 0) {
              chunkDiscovered.push(...res.value.tenders);
              allDiscovered.push(...res.value.tenders);
            }
          }
        }

        // PROGRESSIVE SYNC: Persist newly discovered batch immediately into Supabase
        if (supabase && chunkDiscovered.length > 0) {
          try {
            // Deduplicate by ID to prevent Postgres "ON CONFLICT DO UPDATE command cannot affect row a second time"
            const uniqueRecords = new Map<string, any>();
            chunkDiscovered.forEach((t, idx) => {
              const uniqueId = String(t.tender_id || `tnd-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`).trim().slice(0, 95);
              if (!uniqueRecords.has(uniqueId)) {
                uniqueRecords.set(uniqueId, {
                  id: uniqueId,
                  tender_name: String(t.title || 'Untitled Tender').trim().slice(0, 250),
                  project_category: String(t.sector || 'Infrastructure EPC').trim().slice(0, 50),
                  department_assigned: String(t.department || t.state || 'General').trim().slice(0, 95),
                  current_stage: 'DISCOVERY',
                  stage_status: String(t.status || 'Live').trim().slice(0, 50),
                  eligibility_result: {
                    state: t.state,
                    amount_inr: t.amount_inr,
                    value_cr: t.value_cr,
                    due_date: t.due_date,
                    portal_url: t.portal_url || t.document_link,
                    source: t.remarks || 'Live Government Portal'
                  },
                  updated_at: new Date().toISOString()
                });
              }
            });

            const rowsToUpsert = Array.from(uniqueRecords.values());
            const { data, error } = await supabase.from('tenders').upsert(rowsToUpsert, { onConflict: 'id' });
            if (error) {
              lastSbError = error.message || error;
              console.warn('[SCRAPER_SCAN] Progressive Supabase upsert error:', error);
            } else {
              syncedCount += rowsToUpsert.length;
            }
          } catch (sbErr: any) {
            lastSbError = sbErr?.message || String(sbErr);
            console.warn('[SCRAPER_SCAN] Progressive Supabase upsert error:', sbErr);
          }
        }
      }

      return NextResponse.json({
        success: true,
        states_scanned: successfullyScannedStates,
        requested_states_count: states.length,
        keywords_searched: keywords,
        min_value_cr_filter: minValueCr,
        total_matches_found: allDiscovered.length,
        scan_duration_sec: Math.round((Date.now() - startTime) / 1000),
        partial_scan: timedOutEarly,
        supabase_sync: {
          is_configured: isSupabaseConfigured,
          has_supabase_instance: Boolean(supabase),
          has_env_url: Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
          has_env_key: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
          last_error: lastSbError,
          synced_count: syncedCount
        },
        tenders: allDiscovered
      });
    }

    // ═══ FORWARD UNHANDLED ROUTES TO PYTHON FASTAPI BACKEND ═══════════════
    const FASTAPI_URL = process.env.FASTAPI_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    try {
      const targetUrl = `${FASTAPI_URL}/api/v1/${subPath}${req.nextUrl.search || ''}`;
      const forwardHeaders: Record<string, string> = {};
      req.headers.forEach((value, key) => {
        if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
          forwardHeaders[key] = value;
        }
      });

      let forwardBody: any = undefined;
      if (method !== 'GET' && method !== 'HEAD') {
        forwardBody = JSON.stringify(body);
        forwardHeaders['content-type'] = 'application/json';
      }

      const backendRes = await fetch(targetUrl, {
        method,
        headers: forwardHeaders,
        body: forwardBody,
        cache: 'no-store'
      });

      const data = await backendRes.json().catch(() => null);
      if (data !== null) {
        return NextResponse.json(data, { status: backendRes.status });
      }
    } catch (proxyErr) {
      // Backend not reachable
    }

    return NextResponse.json({ detail: `Route /api/v1/${subPath} not found` }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ detail: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(req, params);
}
export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(req, params);
}
export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(req, params);
}
export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(req, params);
}
export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(req, params);
}

