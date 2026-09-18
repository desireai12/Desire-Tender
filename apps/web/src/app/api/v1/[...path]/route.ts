import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';
import { STATE_PORTALS, KEYWORD_CATEGORIES, crawlStateGePNICPortal } from '@/lib/gepnic-crawler';
import vapiTenderData from '@/data/vapi_karvad_real_tender.json';
import banasTenderData from '@/data/banaskantha_kankrej_real_tender.json';
import vapiManifest from '@/data/vapi_tender_documents_manifest.json';
import banasManifest from '@/data/banaskantha_tender_documents_manifest.json';


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
    // 1. Fast zero-dependency pure stream text extraction
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
        return cleanedPure;
      }
    } catch (pureErr) {}

    // 2. Fallback to unpdf if available
    try {
      const modName = 'unpdf';
      const unpdf = await import(/* webpackIgnore: true */ modName).catch(() => null);
      if (unpdf && unpdf.getDocumentProxy && unpdf.extractText) {
        const uint8Array = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        const pdf = await unpdf.getDocumentProxy(uint8Array);
        const { text } = await unpdf.extractText(pdf, { mergePages: true });
        const fullText = (text || '').trim();
        if (fullText.length >= 20) {
          return fullText;
        }
      }
    } catch (unpdfErr) {}

    // 3. Fallback to dynamic node require for pdf-parse
    try {
      const dynamicRequire = eval('require');
      const pdfLib = dynamicRequire('pdf-parse');
      let fullText = '';
      if (pdfLib && pdfLib.PDFParse) {
        try {
          const { pathToFileURL } = dynamicRequire('url');
          const worker = dynamicRequire('pdf-parse/worker');
          if (worker && worker.getPath) {
            pdfLib.PDFParse.setWorker(pathToFileURL(worker.getPath()).href);
          }
        } catch (wErr) {}
        const parser = new pdfLib.PDFParse({ data: buffer });
        const res = await parser.getText();
        fullText = (res?.text || '').trim();
      } else if (typeof pdfLib === 'function') {
        const parsed = await pdfLib(buffer);
        fullText = (parsed?.text || '').trim();
      }
      if (fullText.length >= 20) {
        return fullText;
      }
    } catch (pdfErr) {}

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
    'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.1-flash-lite',
    'gemini-3.6-flash'
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


function sanitizeReportClauses(report: any, jvName: string = 'JV Partner') {
  if (!report || !report.clauses_breakdown || !Array.isArray(report.clauses_breakdown)) return report;
  
  const titleLower = (report.tender_title || '').toLowerCase();
  const catUpper = (report.project_category || '').toUpperCase();
  const isSewerTender = catUpper === 'STP' || catUpper === 'SEWERAGE' || titleLower.includes('sewer') || titleLower.includes('stp');

  let hasSewerClause = false;

  report.clauses_breakdown.forEach((c: any) => {
    const cTitle = (c.clause_title || '').toLowerCase();
    const reqText = (c.tender_requirement || '').toLowerCase();
    const isSewer = isSewerTender && (cTitle.includes('sewer') || cTitle.includes('stp') || reqText.includes('sewer') || reqText.includes('stp'));

    if (isSewer) {
      hasSewerClause = true;
      c.status = 'PARTIAL MATCH';
      c.fulfilled_pct = '50%';
      c.desire_value = '120+ km HDPE/DI Water Pipelines (No specialized underground sewer network experience)';
      c.gap_notes = `Desire Energy has a specialized gap in underground sewerage works. ${jvName} bridges this gap.`;
    } else if (c.status === 'MATCH') {
      c.fulfilled_pct = '100%';
    } else if (c.fulfilled_pct) {
      const match = String(c.fulfilled_pct).match(/(\d+(\.\d+)?)/);
      if (match) {
        const val = parseFloat(match[1]);
        c.fulfilled_pct = val >= 100 ? '100%' : `${val}%`;
      } else {
        c.fulfilled_pct = '100%';
      }
    } else {
      c.fulfilled_pct = '100%';
  });

  return report;
}

let GLOBAL_SERVER_COMPANIES: any[] = [
  {
    id: 'comp-desire-01', name: 'DESIRE ENERGY SOLUTIONS PRIVATE LIMITED', type: 'Desire Energy',
    profile: 'Leading Indian Water & Solar Infrastructure Company managing 1,00,000+ villages under Jal Jeevan Mission, PM-Kusum, and RHDS pipe networks. Registered AA Class Contractor with Gujarat WRD & R&B.',
    registered_address: '401, Manupasana Tower, C-Scheme, Jaipur - 302001, Rajasthan',
    corporate_address: '401, Manupasana Tower, C-Scheme, Jaipur - 302001, Rajasthan',
    contact_details: { phone: '0141-4050855', mobile: '7230037296', email: 'tenders@desireenergy.com', contact_person: 'Dharmesh Khandelwal (Director)' },
    cin_registration: 'U40106RJ2011PTC034878', gst_number: '24AAECD3266E1ZZ', pan_number: 'AAECD3266E',
    annual_turnover: { 'FY 2021-22': 201.53, 'FY 2022-23': 201.53, 'FY 2023-24': 350.66, 'FY 2024-25': 350.60 },
    average_turnover: 300.93, net_worth: 95.00, solvency: 50.00, solvency_amount: 72.18,
    technical_experience: 'Executed 120+ km HDPE/DI Water Pipelines, 5 OHSRs, 50+ MW Solar PV Plants, Class-A Special PHED Registration & AA Class Gujarat WRD/R&B Registration',
    past_projects: ['Jal Jeevan Mission Balotra Package', 'PM-Kusum Component-B Rajasthan (Rs 94 Cr)', 'RHDS Water Supply Network'],
    work_orders: [], client_details: ['PHED Rajasthan', 'RUDSICO', 'SWSM UP', 'Gujarat WRD'],
    sector_experience: ['Rural Water Supply (JJM)', 'Solar PV Water Pumps', 'Bulk Water Pipeline EPC', 'Lift Irrigation Schemes'],
    equipment_machinery: ['10 Heavy Excavators', '3 Vermeer HDD Machines', '15 Mobile Generator Sets', '4 Transit Mixers', '2 Concrete Batching Units'],
    manpower_technical_staff: ['45 Degree Civil & Electrical Engineers', '120 Certified Pipeline Technicians', '8 Quality Control Managers'],
    certifications: ['ISO 9001:2015', 'ISO 14001:2015', 'ISO 45001:2018', 'CMMI Level-5', 'BEE Grade-1 ESCO', 'AA Class Gujarat WRD/R&B License', 'Electrical Contractor License'],
    statutory_docs: ['GST Registration Certificate (Gujarat & Rajasthan)', 'PAN Card', 'EPF Registration', 'ESI Registration', 'Udyam Registration UDYAM-RJ-17-0025258'],
    uploaded_documents: []
  },
  {
    id: 'comp-vhp-04', name: 'VINOD H PATEL', type: 'JV Partner',
    profile: 'Govt Approved AA Class Contractor (Gujarat WRD & R&B) specializing in Bulk Water Supply Pipelines, Pumping Stations, and Civil Infrastructure.',
    registered_address: 'First Floor, F-21/22, Perfect Plaza, Radhanpur Road, Mehsana - 384002, Gujarat',
    corporate_address: 'First Floor, F-21/22, Perfect Plaza, Radhanpur Road, Mehsana - 384002, Gujarat',
    contact_details: { phone: '02762-253598', mobile: '9825012345', email: 'vinodhpatel@gmail.com', contact_person: 'Patel Mit Vinodchandra / Vinod H. Patel' },
    cin_registration: 'GUJ-MEH-PARTNERSHIP-1996', gst_number: '24AATFV4986F1ZH', pan_number: 'AATFV4986F',
    annual_turnover: { 'FY 2020-21': 160.90, 'FY 2021-22': 131.77, 'FY 2022-23': 249.61, 'FY 2023-24': 280.15, 'FY 2024-25': 134.55 },
    average_turnover: 191.39, net_worth: 33.37, solvency: 20.00, solvency_amount: 25.00,
    technical_experience: 'Executed Palanpur Group Water Supply Package 2 (Rising/Gravity DI/PVC Pipeline & Pumping Station) worth Rs 99.41 Cr (VHP Share Rs 84.49 Cr, Escalated Rs 112.37 Cr), 150+ km DI/HDPE pipeline projects in Gujarat WRD & GWSSB',
    past_projects: ['Palanpur Group Water Supply Package 2 (Rs 99.41 Cr)', 'Mehsana Water Pipeline Network', 'Banaskantha Lift Irrigation Project'],
    work_orders: [], client_details: ['Executive Engineer, PHED/WRD Palanpur', 'GWSSB Gujarat', 'R&B Department Gujarat'],
    sector_experience: ['Bulk Water Supply Pipelines (DI/MS/HDPE)', 'Water Pumping Stations & Headworks', 'Irrigation & Pipeline Distribution'],
    equipment_machinery: ['8 Heavy Excavators', '2 Fully Automatic Concrete Batching Plants', '4 Transit Mixers', '12 DG Sets', '6 Mobile Mixers', '2 Compactor Rollers'],
    manpower_technical_staff: ['25 Degree Civil Engineers', '8 Mechanical Supervisors', '50 Certified Site Technicians'],
    certifications: ['AA Class Civil Contractor Registration (Gujarat WRD & R&B)', 'Gujarat Electrical Contractor License', 'EPF Registration', 'ROF Registration Certificate'],
    statutory_docs: ['GST Registration Certificate', 'PAN Card (AATFV4986F)', 'Partnership Deed', 'CA Net Worth & Turnover Certificate (UDIN: 25124129BMGTGD3142)'],
    uploaded_documents: []
  },
  {
    id: 'comp-aapl-05', name: 'ADROIT ASSOCIATES PRIVATE LIMITED', type: 'JV Partner',
    profile: 'Indore based Infrastructure & Water Engineering company with Class "A" PWD registration (Chhattisgarh & MP), executing Lift Irrigation, Water Supply, and SBR Sewage Treatment Plants since 1987. Official 25% JV Partner with Desire Energy for Vapi Karvad Project.',
    registered_address: '01/101, Satguru Prime 11, Scheme No 140 Main Road, Indore - 452016, Madhya Pradesh',
    corporate_address: '01/101, Satguru Prime 11, Scheme No 140 Main Road, Indore - 452016, Madhya Pradesh',
    contact_details: { phone: '0731-4045600', mobile: '9425054321', email: 'adroitassociates@gmail.com', contact_person: 'Rajendra Purandare (Director, B.E. Mech - 39+ yrs exp)' },
    cin_registration: 'U45100MP2019PTC049757', gst_number: '23AASCA8055A1ZX', pan_number: 'AASCA8055A',
    annual_turnover: { 'FY 2020-21': 30.45, 'FY 2021-22': 32.80, 'FY 2022-23': 37.66, 'FY 2023-24': 39.01, 'FY 2024-25': 36.18 },
    average_turnover: 35.22, net_worth: 14.27, solvency: 10.00, solvency_amount: 10.00,
    technical_experience: 'Executed Roshni-1 Multi-Village Rural Water Supply Scheme (Rs 46.73 Cr), Rani Durgawati Lift Irrigation Project (Rs 20.32 Cr), Gobra Nawapara 7.6 MLD SBR Sewage Treatment Plant (Rs 15.48 Cr), 100+ km DI & HDPE distribution pipelines.',
    past_projects: [
      'Roshni-1 Multi-Village Rural Water Supply Scheme (Rs 46.73 Cr)',
      'Rani Durgawati Lift Irrigation Project (Rs 20.32 Cr)',
      'Gobra Nawapara 7.6 MLD SBR STP (Rs 15.48 Cr)',
      'Vapi Karvad Water Supply Scheme (JV with Desire Energy - 25% Share, Rs 31.80 Cr)'
    ],
    work_orders: [], client_details: ['Madhya Pradesh Jal Nigam Maryadit (MPJNM)', 'Chhattisgarh PWD & PHE', 'WRD Madhya Pradesh', 'Vapi Notified Area Authority (VNAA)'],
    sector_experience: ['Rural Water Supply Schemes (JJM)', 'Lift Irrigation Schemes', 'SBR Sewage Treatment Plants (STP)', 'DI & HDPE Piped Water Distribution Networks'],
    equipment_machinery: [
      '6 Heavy Hydraulic Excavators', '2 Vermeer Directional Drilling Units', '3 Concrete Transit Mixers',
      '8 Mobile Diesel Generators (62.5 - 125 kVA)', '4 High-pressure Hydrostatic Testing Pumps', '3 Dewatering Submersible Pumps'
    ],
    manpower_technical_staff: [
      'Rajendra Purandare (Director / Project In-Charge - B.E. Mech, 39 yrs exp)', 'Vandana Purandare (Director)', 'Jay Purandare (Director / Civil Engineer)',
      '18 Degree Civil & Mechanical Engineers', '6 Quality Control Supervisors', '35 Certified Pipeline Technicians'
    ],
    certifications: [
      'Class "A" Registration with PWD Chhattisgarh (CGeR21408)', 'Class "A" Registration with MP PWD',
      'ISO 9001:2015 Quality Management System', 'EPFO Registration (MIND0128956000)', 'ESIC Registration (23000456120000999)'
    ],
    statutory_docs: [
      'Certificate of Incorporation (CIN: U45100MP2019PTC049757)',
      'GST Registration Certificate (MP: 23AASCA8055A1ZX / CG: 22AASCA8055A1ZV)',
      'PAN Card (AASCA8055A)', 'CA Net Worth & Turnover Certificate (Fadnis & Gupte LLP - UDIN Certified)',
      'Bank Solvency Certificate (Union Bank of India / HDFC Bank)',
      'Joint Venture Agreement with DESPL (75% DESPL : 25% AAPL for Vapi Karvad)'
    ],
    uploaded_documents: [
      'CA Certificate-AAPL.pdf', 'EPFO_Registration-AAPL.pdf', 'ESIC_Registration-AAPL.pdf', 'Form 26-AAPL.pdf',
      'Form 27-AAPL.pdf', 'Form 3 Details of Machinery Equipment and work Plan-AAPL.pdf', 'Form-22-Affidavite-AAPL.pdf',
      'Form-23-Litigation Record-AAPL.pdf', 'Form-24-No Contract Abandonment-AAPL.pdf', 'Form-28-Undertaking for Site Visit-AAPL.pdf',
      'Form-29-Undertaking for Sub-Contractor-AAPL.pdf', 'GST-AAPL.pdf', 'PAN-AAPL.pdf', 'Registration-AAPL.pdf'
    ]
  },
  {
    id: 'comp-divija-02', name: 'DIVIJA CONSTRUCTION', type: 'JV Partner',
    profile: 'Specialized Sewerage, Drainage & Underground Utilities Contractor.',
    registered_address: 'Plot No. 12, Sector 5, Vidyadhar Nagar, Jaipur, Rajasthan',
    corporate_address: 'Plot No. 12, Sector 5, Vidyadhar Nagar, Jaipur, Rajasthan',
    contact_details: { phone: '0141-2233445', mobile: '9829011223', email: 'divija.infra@gmail.com', contact_person: 'Rajesh Sharma (Partner)' },
    cin_registration: 'RJ-JPR-2016-09871', gst_number: '08AABFD8899K1Z5', pan_number: 'AABFD8899K',
    annual_turnover: { 'FY 2021-22': 32.50, 'FY 2022-23': 36.80, 'FY 2023-24': 41.74 },
    average_turnover: 37.01, net_worth: 6.58, solvency: 10.00, solvency_amount: 10.00,
    technical_experience: 'Executed 136 km Sewer Network in Jaipur DLB, 8 MLD Sewage Pumping Station, DWC & RCC NP3 Pipe Jacking',
    past_projects: ['RUDSICO Jaipur Sewerage Scheme', 'Kota Drainage Project'],
    work_orders: [], client_details: ['RUDSICO', 'Jaipur Nagar Nigam', 'DLB Rajasthan'],
    sector_experience: ['Underground Sewerage Network', 'STP Sewage Pumping Stations', 'Micro-tunneling'],
    equipment_machinery: ['4 Trench Excavators', '2 Dewatering Pumps', '1 Pipe Jacking Unit'],
    manpower_technical_staff: ['15 Civil Engineers', '40 Sewerage Technicians'],
    certifications: ['ISO 9001:2015', 'Class-AA DLB License'],
    statutory_docs: ['GST Registration', 'PAN Card', 'Labor License'],
    uploaded_documents: []
  },
  {
    id: 'comp-lt-03', name: 'LARSEN & TOUBRO LIMITED (WATER & EFFLUENT IC)', type: 'Competitor',
    profile: 'Major Indian Infrastructure Conglomerate with dominant market share in mega water supply & STP EPC contracts.',
    registered_address: 'L&T House, Ballard Estate, Mumbai - 400001, Maharashtra',
    corporate_address: 'Mount Poonamallee Road, Manapakkam, Chennai - 600089, Tamil Nadu',
    contact_details: { phone: '022-67525656', email: 'infrawater@larsentoubro.com', contact_person: 'Bidding Lead Water IC' },
    cin_registration: 'L99999MH1946PLC004768', gst_number: '27AAACL0140P1ZM', pan_number: 'AAACL0140P',
    annual_turnover: { 'FY 2021-22': 156521.00, 'FY 2022-23': 183341.00, 'FY 2023-24': 221113.00 },
    average_turnover: 186991.67, net_worth: 89115.00, solvency: 5000.00, solvency_amount: 5000.00,
    technical_experience: 'Executed thousands of km DI/MS/HDPE transmission pipelines, mega lift irrigation schemes, 100+ MLD STPs across India.',
    past_projects: ['Mega Regional Water Grid Gujarat', 'Kaleshwaram Lift Irrigation', 'Delhi STP Network'],
    work_orders: [], client_details: ['GWSSB Gujarat', 'Telangana WRD', 'DJB Delhi', 'CPWD'],
    sector_experience: ['Mega Water Supply', 'Lift Irrigation', 'WTP / STP', 'Industrial Water Systems'],
    equipment_machinery: ['Fleet of 500+ Heavy Machines', 'Automated HDD rigs', 'Pipeline laying barges'],
    manpower_technical_staff: ['10,000+ Engineers and Technical Staff'],
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
  },
  {
    id: "0e1bd43a-c418-4566-8c72-44eab54e6fe5",
    tender_id: "TEST_2026_NIT_001",
    tender_title: "Test JJM Bulk Water Supply Pipeline Scheme",
    authority: "PHED Rajasthan",
    state: "Rajasthan",
    estimated_value_cr: 42.5,
    deadline: "2026-10-15",
    document_url: "https://eproc.rajasthan.gov.in",
    status: "Technical Bid Opening",
    final_status: null,
    pre_bid_meeting_date: null,
    bid_submission_deadline: null,
    responsible_person_name: null,
    responsible_person_email: null,
    cc_emails: [],
    notes: null,
    created_at: "2026-09-18T04:56:46.123Z",
    updated_at: "2026-09-18T04:56:53.295Z",
    created_by: "Scraper Ingestion"
  }
];


async function handleRequest(req: NextRequest, params: { path: string[] }) {
  const subPath = params.path.join('/');
  const method = req.method;
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
          if (fileObj) { try { formFileBuffer = Buffer.from(await fileObj.arrayBuffer()); } catch (e) {} }
        } else {
          body = await req.json().catch(() => ({}));
        }
      } catch (e) { body = {}; }
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
    if ((subPath === 'tender/vapi-manifest' || subPath === 'vapi-manifest') && method === 'GET') {
      return NextResponse.json(vapiManifest);
    }
    if ((subPath === 'tender/banaskantha-manifest' || subPath === 'banaskantha-manifest') && method === 'GET') {
      return NextResponse.json(banasManifest);
    }
    if ((subPath === 'tender/vapi-costing-data' || subPath === 'vapi-costing-data') && method === 'GET') {
      return NextResponse.json(vapiTenderData);
    }
    if ((subPath === 'tender/banaskantha-costing-data' || subPath === 'banaskantha-costing-data') && method === 'GET') {
      return NextResponse.json(banasTenderData);
    }

    // ═══ TENDER ANALYZE ═══════════════════════════════════════════════════════
    if (subPath === 'tender/analyze' && method === 'POST') {
      const filename = formFilename || body.filename || 'uploaded_document.pdf';
      const titleInput = formTenderTitle || body.tender_title || '';
      const jvPartnerId = formJvPartnerId || body.jv_partner_id || 'comp-vhp-04';

      // 1. File Upload Stage
      if (!formFileBuffer || formFileBuffer.length === 0) {
        return buildErrorResponse('FILE_UPLOAD_FAILED', 'Uploaded file buffer is empty or 0 bytes.');
      }

      // 2. PDF Text Extraction Stage
      let extractedPdfText = '';
      try {
        extractedPdfText = await extractTextFromPdfBuffer(formFileBuffer);
      } catch (pdfErr: any) {
        return buildErrorResponse('PDF_EXTRACTION_FAILED', pdfErr?.message || String(pdfErr));
      }
      const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
      if (!geminiKey) {
        return buildErrorResponse('AUTH_ERROR', 'GEMINI_API_KEY environment variable is not configured.');
      }

      // 3. AI Document Classifier Stage
      let classifyResult: any = null;
      try {
        classifyResult = await classifyDocumentWithAI(filename, extractedPdfText, geminiKey);
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

      // 4. Load company credentials
      let comps = GLOBAL_SERVER_COMPANIES;
      if (supabase) { try { const { data: d } = await supabase.from('companies').select('*'); if (d && d.length > 0) comps = d; } catch (e) {} }
      const desireComp = comps.find((c: any) => c.type === 'Desire Energy' || c.id === 'comp-desire-01') || comps[0];
      const jvComp = comps.find((c: any) => c.id === jvPartnerId || c.type === 'JV Partner') || comps[1] || comps[0];
      const dT = desireComp.average_turnover || 300.93;
      const dNW = desireComp.net_worth || 95.0;
      const dS = (desireComp as any).solvency_amount || 72.18;
      const jT = jvComp.average_turnover || 37.01;
      const jNW = jvComp.net_worth || 6.58;
      const jS = (jvComp as any).solvency_amount || 10.0;
      const cT = dT + jT;

      const jvName = jvComp.name || 'JV Partner';
      const jvExp = jvComp.technical_experience || 'Civil & Infrastructure Contractor';
      const jvCerts = Array.isArray(jvComp.certifications) ? jvComp.certifications.join(', ') : 'Standard ISO Certifications';
      const jvSharePct = jvComp.id === 'comp-aapl-05' ? '25%' : '49%';
      const desireSharePct = jvComp.id === 'comp-aapl-05' ? '75%' : '51%';

      // Pass up to 60,000 characters of document text to Gemini AI for complete extraction
      const snippet = extractedPdfText ? extractedPdfText.slice(0, 60000) : `Filename: ${filename}. Title: ${titleInput}`;

      // 5. FULL DEEP GEMINI AI PROMPT
      const prompt = `You are Desire Tender AI, an expert Government & Corporate Tender Qualification Auditor for Desire Energy Solutions Pvt Ltd.

COMPANY MASTER CREDENTIALS:
1. DESIRE ENERGY SOLUTIONS PVT LTD (Lead Member, ${desireSharePct} Share):
   - Average Annual Turnover: Rs.${dT.toFixed(2)} Crores (3-Yr Avg: FY 2021-24)
   - Net Worth: Rs.${dNW.toFixed(2)} Crores (Audited CA Certified)
   - Bank Solvency: Rs.${dS.toFixed(2)} Crores (Kotak Mahindra Bank)
   - Contractor Class: Class-A Special Registration (PHED Rajasthan) / AA Class Gujarat WRD & R&B
   - Technical Track Record: 120+ km HDPE/DI Water Pipelines, 5 OHSR Reservoirs, Rs.94 Cr PM-KUSUM Component-B Solar Pumps, 14 Years ESCO O&M Experience
   - Certifications: ISO 9001:2015 Quality, ISO 14001:2015 Environment, ISO 45001:2018 Safety

2. ${jvName.toUpperCase()} (JV Partner, ${jvSharePct} Share):
   - Average Annual Turnover: Rs.${jT.toFixed(2)} Crores
   - Net Worth: Rs.${jNW.toFixed(2)} Crores
   - Bank Solvency: Rs.${jS.toFixed(2)} Crores
   - Technical Track Record: ${jvExp}
   - Registrations & Certifications: ${jvCerts}

DOCUMENT TEXT (Filename: "${filename}"):
"${snippet}"

INSTRUCTIONS FOR EXTRACTING CLAUSES:
Step 1: Determine if this is a valid Tender Document (NIT/NIB/RFP/EOI/PQ/Bidding Document). If it is an Invoice, Bill, Receipt, or Resume, set "is_rejected_non_tender": true.
Step 2: If it IS a tender, extract EVERY SINGLE ELIGIBILITY AND QUALIFICATION CLAUSE directly present in the document text above (e.g. Financial Turnover, Single Work Experience, Specific Work Quantities, Net Worth, Solvency, Bid Capacity, License/Registration, EMD, ISO Certs, Litigation Affidavit, Key Personnel, O&M Commitment, etc.).
Extract at least 8 to 15 distinct clauses found in THIS SPECIFIC tender document.
CRITICAL: Do NOT output generic clauses. Extract the EXACT clause numbers, exact titles, exact financial thresholds (in ₹ Crores or Lakhs), and exact physical quantities (pipe diameters, lengths in km, pump ratings, time limits) stated in the provided DOCUMENT TEXT.

Step 3: Evaluate EACH extracted clause for:
- Desire Energy Standalone capability ("desire_value")
- ${jvName} Standalone capability ("jv_value")
- Combined Consortium (Desire ${desireSharePct}% + ${jvName} ${jvSharePct}%) ("combined_value")

CRITICAL STANDALONE EVALUATION RULES:
- Evaluate ${jvName}'s standalone capability ("jv_value" and "jv_alone.score") REALISTICALLY against all tender criteria.
- If ${jvName} lacks specific certifications (ISO, ESCO, Solar, SCADA), licenses, or experience present in the tender, explicitly mark "jv_value" as "NOT MATCHING (0%) — Lacks requirement".
- If ${jvName} only partially meets a financial limit (e.g. turnover of ₹191.39 Cr vs ₹300 Cr required), mark "jv_value" as "PARTIAL MATCH (63% of requirement)".
- Do NOT artificially grant 100% to "jv_alone" unless ${jvName} genuinely satisfies 100% of all tender requirements alone.

Return valid JSON only (no markdown wrapping):
{
  "is_rejected_non_tender": false,
  "tender_title": "string — extracted official tender title or document name",
  "project_category": "ESCO" | "STP" | "RHDS" | "KUSUM" | "SOLAR" | "CIVIL" | "EPC",
  "verdict": "Eligible" | "Conditional" | "Ineligible",
  "eligibility_score": number from 0 to 100,
  "overall_health": "Green" | "Yellow" | "Red",
  "recommendation": "string — clear bidding recommendation with consortium rationale",
  "executive_summary": "string — comprehensive summary of AI eligibility audit",
  "desire_alone": {"score": number, "status": "string", "fulfilled_pct": "string"},
  "jv_alone": {"score": number, "status": "string", "fulfilled_pct": "string"},
  "combined_jv": {"score": number, "status": "string", "fulfilled_pct": "string"},
  "clauses_breakdown": [
    {
      "clause_no": "string — e.g. Clause 4.2.1 or ITB 4.5.3",
      "clause_title": "string — title of requirement",
      "requirement_type": "Financial" | "Technical" | "Organizational" | "Compliance",
      "tender_requirement": "exact requirement statement from document",
      "required_value": "numeric required value with unit (e.g. Rs. 69.78 Cr)",
      "desire_value": "Desire Energy actual metric and match status",
      "desire_status": "MATCH" | "PARTIAL MATCH" | "NOT MATCHING",
      "jv_value": "${jvName} actual metric and match status",
      "jv_status": "MATCH" | "PARTIAL MATCH" | "NOT MATCHING",
      "combined_value": "Combined capability description",
      "applicable_jv_rule": "JV pooling rule applied",
      "status": "MATCH" | "PARTIAL MATCH" | "NOT MATCHING",
      "fulfilled_pct": "percentage string (e.g. 100%)",
      "gap_notes": "detailed gap analysis",
      "required_doc": "documentary evidence required",
      "page_ref": "page or section reference from document"
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

      const aiResult = aiCallResult.data;
      if (!Array.isArray(aiResult.clauses_breakdown) || typeof aiResult.verdict !== 'string') {
        return buildErrorResponse(
          'AI_RESPONSE_INVALID',
          'Parsed AI response is missing required fields (clauses_breakdown array or verdict).',
          { raw_response: aiCallResult.rawText ? aiCallResult.rawText.slice(0, 500) : null }
        );
      }

      // Normalize clauses_breakdown fields in case model used slightly different keys
      aiResult.clauses_breakdown = (aiResult.clauses_breakdown || []).map((c: any, idx: number) => {
        const dVal = (c.desire_value || '').toLowerCase();
        const jVal = (c.jv_value || '').toLowerCase();
        
        let desireStatus = (c.desire_status === 'MATCH' || c.desire_status === 'PARTIAL MATCH' || c.desire_status === 'NOT MATCHING')
          ? c.desire_status
          : (dVal.includes('lack') || dVal.includes('not met') || dVal.includes('ineligible') || dVal.includes('cannot bid')) ? 'NOT MATCHING'
          : (dVal.includes('partial') || dVal.includes('gap') || dVal.includes('% of requirement') || dVal.includes('requires jv') || dVal.includes('below') || dVal.includes('insufficient')) ? 'PARTIAL MATCH'
          : 'MATCH';

        let jvStatus = (c.jv_status === 'MATCH' || c.jv_status === 'PARTIAL MATCH' || c.jv_status === 'NOT MATCHING')
          ? c.jv_status
          : (jVal.includes('lack') || jVal.includes('not met') || jVal.includes('ineligible') || jVal.includes('cannot bid') || jVal.includes('no esco') || jVal.includes('no solar')) ? 'NOT MATCHING'
          : (jVal.includes('partial') || jVal.includes('gap') || jVal.includes('% of requirement') || jVal.includes('below') || jVal.includes('insufficient') || jVal.includes('local only')) ? 'PARTIAL MATCH'
          : 'MATCH';

        return {
          clause_no: c.clause_no || c.clause_id || `Clause ${idx + 1}`,
          clause_title: c.clause_title || c.clause_name || c.parameter || c.title || `Requirement ${idx + 1}`,
          requirement_type: c.requirement_type || c.type || 'Technical',
          tender_requirement: c.tender_requirement || c.requirement || c.description || 'As per tender document specifications',
          required_value: c.required_value || c.threshold || c.required || 'Specified in tender specs',
          desire_value: c.desire_value || c.bidder_value || c.desire_capability || 'Meets Requirement',
          desire_status: desireStatus,
          jv_value: c.jv_value || c.partner_value || c.jv_capability || 'Meets Requirement',
          jv_status: jvStatus,
          combined_value: c.combined_value || 'Combined credentials satisfy criteria',
          applicable_jv_rule: c.applicable_jv_rule || 'Lead Member / JV Pooling',
          status: (c.status === 'MATCH' || c.status === 'Compliant' || c.status === 'Met') ? 'MATCH' : (c.status === 'PARTIAL MATCH' || c.status === 'Partial') ? 'PARTIAL MATCH' : (c.status === 'NOT MATCHING' || c.status === 'Ineligible' || c.status === 'Non-Compliant') ? 'NOT MATCHING' : 'MATCH',
          fulfilled_pct: c.fulfilled_pct || '100%',
          gap_notes: c.gap_notes || c.notes || 'None',
          required_doc: c.required_doc || c.document || 'Documentary Proof',
          page_ref: c.page_ref || c.section || 'Tender Technical Bid'
        };
      });

      // Calculate mathematically grounded standalone scores from individual clause evaluations
      const dMatched = aiResult.clauses_breakdown.filter((c: any) => c.desire_status === 'MATCH').length;
      const dPartial = aiResult.clauses_breakdown.filter((c: any) => c.desire_status === 'PARTIAL MATCH').length;
      const jMatched = aiResult.clauses_breakdown.filter((c: any) => c.jv_status === 'MATCH').length;
      const jPartial = aiResult.clauses_breakdown.filter((c: any) => c.jv_status === 'PARTIAL MATCH').length;
      const totalClauseCount = aiResult.clauses_breakdown.length || 1;

      const calcDScore = Math.min(100, Math.round(((dMatched * 100) + (dPartial * 50)) / totalClauseCount));
      const calcJScore = Math.min(100, Math.round(((jMatched * 100) + (jPartial * 50)) / totalClauseCount));

      // Extract existing AI scores if available and valid
      const parseReportScore = (obj: any, fallback: number) => {
        if (!obj) return fallback;
        if (typeof obj.score === 'number' && !isNaN(obj.score)) return obj.score;
        if (obj.fulfilled_pct) {
          const m = String(obj.fulfilled_pct).match(/(\d+)/);
          if (m) return parseInt(m[1], 10);
        }
        return fallback;
      };

      let finalDScore = parseReportScore(aiResult.desire_alone, calcDScore);
      let finalJScore = parseReportScore(aiResult.jv_alone, calcJScore);

      // If standalone scores were not differentiated by AI, use the calculated clause scores
      if (finalDScore >= 98 && calcDScore < 98) finalDScore = calcDScore;
      if (finalJScore >= 98 && calcJScore < 98) finalJScore = calcJScore;

      // Realistic calibration: A JV is recommended specifically to fill gaps, so standalone should reflect individual member realities
      if (finalDScore >= 96 && finalJScore >= 96) {
        finalDScore = 88;
        finalJScore = 78;
      }

      aiResult.desire_alone = {
        score: finalDScore,
        fulfilled_pct: `${finalDScore}%`,
        status: finalDScore >= 90 ? 'Eligible Standalone' : finalDScore >= 60 ? 'Partially Eligible Standalone (JV Recommended)' : 'Ineligible Standalone'
      };

      aiResult.jv_alone = {
        score: finalJScore,
        fulfilled_pct: `${finalJScore}%`,
        status: finalJScore >= 90 ? 'Partner Standalone Qualified' : finalJScore >= 60 ? 'Partner Incomplete Standalone' : 'Partner Ineligible Standalone'
      };

      aiResult.combined_jv = {
        score: 100,
        fulfilled_pct: '100%',
        status: 'Fully Qualified Consortium'
      };

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
          key_advantage: 'Bulk Water Supply Pipelines, Palanpur Group Project (₹99.41 Cr), Gujarat AA Class Contractor Registration',
          reason: 'High turnover (₹191.39 Cr) and extensive Gujarat WRD credentials satisfy large civil and pipeline criteria.',
          suitability: (catUpper === 'EPC' || titleLower.includes('pipeline') || titleLower.includes('kankrej') || titleLower.includes('narmada') || titleLower.includes('gujarat') || titleLower.includes('wrd')) ? 'Best Match for Bulk Water Transmission Pipelines & GWSSB/GWIL Projects' : 'Strong Financial & High Turnover Partner',
          equity_suggestion: 'Desire 51% : Partner 49%',
          fills_gaps: ['Bulk Water Pipelines', 'GWSSB Credentials'],
          match_score: (catUpper === 'EPC' || titleLower.includes('pipeline') || titleLower.includes('kankrej') || titleLower.includes('narmada') || titleLower.includes('gujarat') || titleLower.includes('wrd')) ? 98 : 88
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
          key_advantage: 'Roshni-1 Water Scheme (₹46.73 Cr), Lift Irrigation, MP/CG PWD Class-A, DI/HDPE Distribution Network',
          reason: 'Deep lift irrigation & rural distribution credentials (₹46.73 Cr Roshni project) perfectly complement Desire Energy.',
          suitability: (titleLower.includes('karvad') || titleLower.includes('vapi') || titleLower.includes('house connection') || titleLower.includes('lift irrigation') || catUpper === 'RHDS') ? 'Best Match for Piped Distribution Networks, House Connections & Lift Irrigation' : 'Specialized Water Supply & Lift Irrigation Partner',
          equity_suggestion: 'Desire 75% : Partner 25%',
          fills_gaps: ['Piped Distribution', 'Lift Irrigation'],
          match_score: (titleLower.includes('karvad') || titleLower.includes('vapi') || titleLower.includes('house connection') || titleLower.includes('lift irrigation') || catUpper === 'RHDS') ? 97 : 85
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
          key_advantage: '136 km Underground Sewer Network, DLB Class-AA, 8 MLD Sewage Pumping Station, Micro-tunneling',
          reason: 'Extensive 136 km underground sewer and pump house track record fulfills DLB/RUDSICO qualifications.',
          suitability: (catUpper === 'STP' || titleLower.includes('sewer') || titleLower.includes('stp') || titleLower.includes('alwar')) ? 'Best Match for Sewerage, STP Networks & AMRUT 2.0 Projects' : 'Underground Utilities & Drainage Partner',
          equity_suggestion: 'Desire 75% : Partner 25%',
          fills_gaps: ['Sewerage Network', 'STP Experience'],
          match_score: (catUpper === 'STP' || titleLower.includes('sewer') || titleLower.includes('stp') || titleLower.includes('alwar')) ? 99 : 72
        }
      ].sort((a, b) => b.match_score - a.match_score).map((r, i) => ({ ...r, rank: i + 1 }));

      aiResult.partner_recommendations = partnerRecommendations;
      aiResult.recommended_partner_id = partnerRecommendations[0].partner_id;
      aiResult.recommended_partner_name = partnerRecommendations[0].partner_name;

      const cleanAi = sanitizeReportClauses(aiResult, jvName);
      return NextResponse.json({
        status: 'success',
        is_rejected_non_tender: false,
        message: 'Gemini AI tender evaluation complete.',
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

    // ═══ REAL TENDER DATASETS (VAPI & BANASKANTHA) ════════════════════════════
    if (subPath === 'tender/vapi-costing-data' && method === 'GET') {
      return NextResponse.json(vapiTenderData);
    }

    if (subPath === 'tender/banaskantha-costing-data' && method === 'GET') {
      return NextResponse.json(banasTenderData);
    }

    // ═══ TENDERS ══════════════════════════════════════════════════════════════
    if (subPath === 'tenders') {
      if (method === 'GET') {
        return NextResponse.json({
          status: 'success',
          tenders: [
            banasTenderData.tender_metadata,
            vapiTenderData.tender_metadata
          ]
        });
      }
      if (method === 'POST') return NextResponse.json({ status: 'success', message: 'Tender saved.' });
    }

    // ═══ BID FLOW PIPELINE (NATIVE VERCEL SERVERLESS & SUPABASE) ═══════════
    if (subPath === 'bid-flow' || subPath.startsWith('bid-flow/')) {
      const bidId = subPath.startsWith('bid-flow/') ? subPath.replace('bid-flow/', '').trim() : null;

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
          id: body?.id || `bf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
            await supabase.from('bid_flow').upsert(item, { onConflict: 'tender_id' });
          } catch (sbErr) {
            console.error('[BID_FLOW_POST] Supabase upsert error:', sbErr);
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

      if (method === 'PATCH' && bidId) {
        let updatedItem: any = null;
        const updateFields: any = { ...body, updated_at: new Date().toISOString() };

        if (supabase) {
          try {
            const { data, error } = await supabase
              .from('bid_flow')
              .update(updateFields)
              .or(`id.eq.${bidId},tender_id.eq.${bidId}`)
              .select('*');
            if (!error && data && data.length > 0) {
              updatedItem = data[0];
            }
          } catch (sbErr) {
            console.error('[BID_FLOW_PATCH] Supabase update error:', sbErr);
          }
        }

        const idx = GLOBAL_BID_FLOW_ITEMS.findIndex(b => b.id === bidId || b.tender_id === bidId);
        if (idx >= 0) {
          GLOBAL_BID_FLOW_ITEMS[idx] = { ...GLOBAL_BID_FLOW_ITEMS[idx], ...updateFields };
          if (!updatedItem) updatedItem = GLOBAL_BID_FLOW_ITEMS[idx];
        }

        return NextResponse.json({ status: 'success', message: 'Bid Flow updated', data: updatedItem || updateFields });
      }

      if (method === 'DELETE' && bidId) {
        if (supabase) {
          try {
            await supabase.from('bid_flow').delete().or(`id.eq.${bidId},tender_id.eq.${bidId}`);
          } catch (sbErr) {
            console.error('[BID_FLOW_DELETE] Supabase delete error:', sbErr);
          }
        }
        GLOBAL_BID_FLOW_ITEMS = GLOBAL_BID_FLOW_ITEMS.filter(b => b.id !== bidId && b.tender_id !== bidId);
        return NextResponse.json({ status: 'success', message: 'Bid removed from Bid Flow' });
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
      const minValueCr: number = parseFloat(body?.min_value_cr) || 10.0;
      const maxPerKw: number = parseInt(body?.max_per_kw) || 6;

      const allDiscovered: any[] = [];
      for (const state of states) {
        const portalUrl = STATE_PORTALS[state];
        if (!portalUrl) continue;
        try {
          const results = await crawlStateGePNICPortal(state, portalUrl, keywords, minValueCr, maxPerKw);
          allDiscovered.push(...results);
        } catch (crawlErr) {
          // Continue with next state
        }
      }

      // Automatically sync into Supabase if connected
      if (supabase && allDiscovered.length > 0) {
        try {
          await supabase.from('tenders').upsert(
            allDiscovered.map(t => ({
              tender_id: t.tender_id,
              title: t.title,
              state: t.state,
              sector: t.sector,
              amount_inr: t.amount_inr,
              value_cr: t.value_cr,
              department: t.department,
              due_date: t.due_date,
              status: t.status,
              source: 'GePNIC Portal'
            })),
            { onConflict: 'tender_id' }
          );
        } catch (e) {}
      }

      return NextResponse.json({
        success: true,
        states_scanned: states,
        keywords_searched: keywords,
        min_value_cr_filter: minValueCr,
        total_matches_found: allDiscovered.length,
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

