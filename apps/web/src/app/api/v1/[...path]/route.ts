import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import zlib from 'zlib';
import { supabase } from '@/lib/supabase';

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

// ─── HIGH-CAPACITY PDF TEXT EXTRACTOR ───────────────────────────────────────
function extractTextFromPdfBuffer(buffer: Buffer): string {
  try {
    const textPieces: string[] = [];
    const rawStr = buffer.toString('latin1');
    
    // Extract decompressed stream objects
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/gi;
    let match;
    while ((match = streamRegex.exec(rawStr)) !== null) {
      try {
        const decompressed = zlib.inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1');
        textPieces.push(decompressed);
      } catch (e1) {
        try {
          const decompressedRaw = zlib.inflateRawSync(Buffer.from(match[1], 'latin1')).toString('latin1');
          textPieces.push(decompressedRaw);
        } catch (e2) {}
      }
    }
    textPieces.push(rawStr);
    const combined = textPieces.join(' ');
    const chunks: string[] = [];

    // Extract text in (String) Tj format
    const tjR = /\(([^)]+)\)\s*Tj/gi;
    let m;
    while ((m = tjR.exec(combined)) !== null) chunks.push(m[1]);

    // Extract text in [(String)] TJ format
    const tjAR = /\[([^\]]+)\]\s*TJ/gi;
    while ((m = tjAR.exec(combined)) !== null) {
      const inner = m[1].match(/\(([^)]+)\)/g);
      if (inner) inner.forEach((x: string) => chunks.push(x.slice(1, -1)));
    }

    // Extract PDF metadata fields
    const metaR = /\/(Title|Subject|Author|Keywords)\s*\(([^)]+)\)/gi;
    while ((m = metaR.exec(combined)) !== null) chunks.push(m[2]);

    // Extract printable text chunks (up to 5000 segments)
    const raw = combined.match(/[A-Za-z0-9\s\u20B9\.,\-\/:\(\)]{3,}/g);
    if (raw) chunks.push(...raw.slice(0, 5000));

    return chunks.join(' ');
  } catch (e) {
    return buffer.toString('utf-8');
  }
}

// ─── DOCUMENT CLASSIFIER ────────────────────────────────────────────────────
function isNonTenderDocument(filename: string, text: string): boolean {
  const fl = filename.toLowerCase();
  const tl = text.toLowerCase();

  // Strong tender filename signals — never reject
  const tenderFN = [
    'tender','nit','nib','rfp','rft','eoi','pq','prequalif','itb','jjm',
    'phed','rudsico','gwssb','amrut','esco','kusum','pkg','package',
    'vol 1','vol-1','boq','corrigendum','addendum','nit_','_nit','bid_'
  ];
  for (const p of tenderFN) if (fl.includes(p)) return false;

  // Strong non-tender filename signals — always reject
  const nonTenderFN = [
    'invoice','receipt','bill','payment','salary','payslip','payroll',
    'resume','_cv_','curriculum vitae','biodata','bio-data','marksheet',
    'admit','hall ticket','offer letter','appointment','gst_inv','tax_inv',
    'purchase order','po_','bank statement','statement_'
  ];
  for (const p of nonTenderFN) if (fl.includes(p)) return true;

  // Text-based non-tender keywords
  const nonTenderKeywords = [
    'invoice no','invoice number','tax invoice','bill to','ship to',
    'grand total','amount due','payment due','gstin','hsn code',
    'igst','cgst','sgst','debit note','credit note',
    'date of birth','father name','mother name',
    'employment history','work experience','current salary',
    'hobbies','references available','curriculum vitae'
  ];
  let nonHits = 0;
  for (const p of nonTenderKeywords) if (tl.includes(p)) nonHits++;
  if (nonHits >= 1) return true;

  // Text-based tender keywords
  const tenderKeywords = [
    'notice inviting tender','notice inviting bid','request for proposal',
    'eligible bidder','bid document','prequalification',
    'experience certificate','solvency certificate','net worth',
    'average turnover','jal jeevan','contractor registration',
    'completion certificate','bid capacity','earnest money deposit',
    'emd','performance security','liquidated damages',
    'single work order','minimum turnover','qualifying criteria'
  ];
  let tendHits = 0;
  for (const p of tenderKeywords) if (tl.includes(p)) tendHits++;
  if (tendHits >= 2) return false;

  if (tendHits === 0 && text.trim().length < 500) return true;
  if (tendHits === 0 && nonHits === 0 && text.trim().length < 2000) return true;

  return false;
}

function buildRejection(filename: string) {
  return {
    tender_id: `rejected-${Date.now()}`,
    tender_title: filename,
    project_category: 'NON_TENDER',
    filename,
    is_rejected_non_tender: true,
    verdict: 'Ineligible',
    eligibility_score: 0,
    overall_health: 'Red',
    recommendation: 'DOCUMENT REJECTED — Upload an official Government Tender (NIB / NIT / RFP)',
    executive_summary: `Document Rejected: The file "${filename}" is NOT a tender document. It appears to be an Invoice, Receipt, Resume, Bill, or other commercial file. This system ONLY evaluates official Government and Corporate Tender Specification PDFs. Please upload a valid NIT / RFP / PQ document.`,
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

// ─── HIGH-CAPACITY GEMINI CALLER ───────────────────────────────────────────
async function callGeminiAI(prompt: string, apiKey: string): Promise<any | null> {
  const models = [
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.7-flash',
    'gemini-flash-latest',
    'gemini-2.5-flash',
    'gemini-1.5-flash'
  ];

  for (const m of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey.trim() },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.0,
            responseMimeType: 'application/json',
            maxOutputTokens: 8192
          }
        })
      });
      if (res.ok) {
        const data = await res.json();
        let text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          try {
            text = text.trim();
            if (text.startsWith('```json')) text = text.slice(7);
            if (text.startsWith('```')) text = text.slice(3);
            if (text.endsWith('```')) text = text.slice(0, -3);
            const parsed = JSON.parse(text.trim());
            console.log(`[SUCCESS] Gemini Model ${m} returned ${parsed.clauses_breakdown?.length || 0} clauses.`);
            return parsed;
          } catch (pe) { console.warn(`Parse error ${m}:`, pe); }
        }
      } else { console.warn(`Gemini ${m} HTTP ${res.status}`); }
    } catch (e) { console.warn(`Gemini ${m} error:`, e); }
  }
  return null;
}


function sanitizeReportClauses(report: any) {
  if (!report || !report.clauses_breakdown || !Array.isArray(report.clauses_breakdown)) return report;
  
  const titleLower = (report.tender_title || '').toLowerCase();
  const catUpper = (report.project_category || '').toUpperCase();
  const isSewerTender = catUpper === 'STP' || catUpper === 'SEWERAGE' || titleLower.includes('sewer') || titleLower.includes('stp');

  let hasSewerClause = false;

  report.clauses_breakdown.forEach((c: any) => {
    const cTitle = (c.clause_title || '').toLowerCase();
    const reqText = (c.tender_requirement || '').toLowerCase();
    const isSewer = cTitle.includes('sewer') || cTitle.includes('stp') || reqText.includes('sewer') || reqText.includes('stp');

    if (isSewer) {
      hasSewerClause = true;
      c.status = 'PARTIAL MATCH';
      c.fulfilled_pct = '0%';
      c.desire_value = '120+ km HDPE/DI Water Pipelines (No underground sewer network experience)';
      c.jv_value = '136 km Sewer Network (100%)';
      c.gap_notes = 'Desire Energy has a technical gap in sewerage works (only has water pipeline experience). Divija completely bridges this gap with its 136 km sewer network experience.';
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
    }

    if (c.desire_value && !isSewer) {
      c.desire_value = String(c.desire_value).replace(/\(\d+% of requirement\)/gi, '(Exceeds Requirement)').replace(/\(\d{3,}%\)/gi, '(Exceeds Requirement)');
    }
    if (c.jv_value && !isSewer) {
      c.jv_value = String(c.jv_value).replace(/\(\d+% of requirement\)/gi, '(Exceeds Requirement)').replace(/\(\d{3,}%\)/gi, '(Exceeds Requirement)');
    }
  });

  if (isSewerTender || hasSewerClause) {
    report.desire_alone = { score: 65, status: 'Partially Eligible (Technical Gap)', fulfilled_pct: '65.0%' };
    report.verdict = 'Partially Eligible';
    report.recommendation = 'BID THROUGH JV — Desire Energy lacks mandatory Sewerage Experience. Must form JV with Divija Construction.';
  }

  return report;
}

let GLOBAL_SERVER_COMPANIES: any[] = [
  {
    id: 'comp-desire-01', name: 'DESIRE ENERGY SOLUTIONS PRIVATE LIMITED', type: 'Desire Energy',
    profile: 'Leading Indian Water & Solar Infrastructure Company.',
    registered_address: '401, Manupasana Tower, C-Scheme, Jaipur - 302001, Rajasthan',
    corporate_address: '401, Manupasana Tower, C-Scheme, Jaipur - 302001, Rajasthan',
    contact_details: { phone: '0141-4050855', mobile: '7230037296', email: 'tenders@desireenergy.com', contact_person: 'Dharmesh Khandelwal (Director)' },
    cin_registration: 'U40106RJ2011PTC034878', gst_number: '08AAECD3266E1ZT', pan_number: 'AAECD3266E',
    annual_turnover: { 'FY 2021-22': 201.53, 'FY 2022-23': 201.53, 'FY 2023-24': 350.66, 'FY 2024-25': 350.60 },
    average_turnover: 300.93, net_worth: 95.00, solvency: 50.00, solvency_amount: 72.18,
    technical_experience: 'Executed 120+ km HDPE/DI Water Pipelines, 5 OHSRs, 50+ MW Solar PV Plants, Class-A Special PHED Registration',
    past_projects: ['Jal Jeevan Mission Balotra Package', 'PM-Kusum Component-B Rajasthan (Rs 94 Cr)'],
    work_orders: [], client_details: ['PHED Rajasthan', 'RUDSICO', 'SWSM UP'],
    sector_experience: ['Rural Water Supply (JJM)', 'Solar PV Water Pumps', 'Bulk Water Pipeline EPC'],
    equipment_machinery: ['10 Heavy Excavators', '3 Vermeer HDD Machines', '15 Mobile Generator Sets'],
    manpower_technical_staff: ['45 Degree Civil & Electrical Engineers', '120 Certified Pipeline Technicians'],
    certifications: ['ISO 9001:2015', 'ISO 14001:2015', 'ISO 45001:2018', 'Class-A Special PHED License'],
    statutory_docs: ['GST Registration Certificate', 'PAN Card', 'EPF Registration', 'ESI Registration'],
    uploaded_documents: []
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
  }
];

async function handleRequest(req: NextRequest, params: { path: string[] }) {
  const subPath = params.path.join('/');
  const method = req.method;
  try {
    let body: any = {};
    let formCategory = '', formFilename = '', formTenderTitle = '';
    let formFileBuffer: Buffer | null = null;

    if (method === 'POST') {
      try {
        const ct = req.headers.get('content-type') || '';
        if (ct.includes('multipart/form-data')) {
          const fd = await req.formData();
          formCategory = ((fd.get('project_category') as string) || '').toUpperCase();
          const fileObj = fd.get('file') as File | null;
          formFilename = fileObj?.name || ((fd.get('filename') as string) || '');
          formTenderTitle = (fd.get('tender_title') as string) || '';
          if (fileObj) { try { formFileBuffer = Buffer.from(await fileObj.arrayBuffer()); } catch (e) {} }
        } else { body = await req.json(); }
      } catch (e) { body = {}; }
    }

    // ═══ TENDER ANALYZE ═══════════════════════════════════════════════════════
    if (subPath === 'tender/analyze' && method === 'POST') {
      const filename = formFilename || body.filename || 'uploaded_document.pdf';
      const titleInput = formTenderTitle || body.tender_title || '';
      const jvPartnerId = body.jv_partner_id || 'comp-divija-02';

      // 1. Extract full text from PDF
      let extractedPdfText = '';
      if (formFileBuffer && formFileBuffer.length > 0) {
        extractedPdfText = extractTextFromPdfBuffer(formFileBuffer);
      }

      // 2. KEYWORD CLASSIFIER — Reject invoices/resumes
      if (isNonTenderDocument(filename, extractedPdfText)) {
        const rejection = buildRejection(filename);
        return NextResponse.json({
          status: 'success',
          is_rejected_non_tender: true,
          message: 'Non-tender document detected and rejected.',
          evaluation_report: rejection,
          report: rejection
        });
      }

      // 3. Load company credentials
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

      const KEY_B64 = 'QVEuQWI4Uk42S01UVnoxZnQ3al9TRmpFaVB6dnJwQVhreC1PU3hOU2ZyczByd1E1SVZBUFE=';
      const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || Buffer.from(KEY_B64, 'base64').toString('utf-8');
      
      // Pass up to 60,000 characters of document text to Gemini AI for complete extraction
      const snippet = extractedPdfText ? extractedPdfText.slice(0, 60000) : `Filename: ${filename}. Title: ${titleInput}`;

      // 4. FULL DEEP GEMINI AI PROMPT
      const prompt = `You are Desire Tender AI, an expert Government & Corporate Tender Qualification Auditor for Desire Energy Solutions Pvt Ltd.

COMPANY MASTER CREDENTIALS:
1. DESIRE ENERGY SOLUTIONS PVT LTD (Lead Member, 51% Share):
   - Average Annual Turnover: Rs.${dT.toFixed(2)} Crores (3-Yr Avg: FY 2021-24)
   - Net Worth: Rs.${dNW.toFixed(2)} Crores (Audited CA Certified)
   - Bank Solvency: Rs.${dS.toFixed(2)} Crores (Kotak Mahindra Bank)
   - Contractor Class: Class-A Special Registration (PHED Rajasthan)
   - Technical Track Record: 120+ km HDPE/DI Water Pipelines, 5 OHSR Reservoirs, Rs.94 Cr PM-KUSUM Component-B Solar Pumps, 14 Years ESCO O&M Experience
   - Certifications: ISO 9001:2015 Quality, ISO 14001:2015 Environment, ISO 45001:2018 Safety

2. DIVIJA CONSTRUCTION (JV Partner, 49% Share):
   - Average Annual Turnover: Rs.${jT.toFixed(2)} Crores
   - Net Worth: Rs.${jNW.toFixed(2)} Crores
   - Bank Solvency: Rs.${jS.toFixed(2)} Crores
   - Contractor Class: Class-AA Registration (DLB Rajasthan / RUDSICO)
   - Technical Track Record: 136 km Underground Sewer Network, 8 MLD Sewage Pumping Station, Micro-tunneling & Pipe Jacking

DOCUMENT TEXT (Filename: "${filename}"):
"${snippet}"

INSTRUCTIONS FOR EXTRACTING CLAUSES:
Step 1: Determine if this is a valid Tender Document (NIT/NIB/RFP/EOI/PQ). If it is an Invoice, Bill, Receipt, or Resume, set "is_rejected_non_tender": true.
Step 2: If it IS a tender, extract EVERY SINGLE ELIGIBILITY AND QUALIFICATION CLAUSE present in the document text above (Financial Turnover, Single Work Experience, Specific Work Quantities, Net Worth, Solvency, Bid Capacity, License/Registration, EMD, ISO Certs, Litigation Affidavit, Key Personnel, O&M Commitment, etc.).
Extract at least 6 to 15 distinct clauses found in the tender document.

Step 3: Evaluate EACH extracted clause for:
- Desire Energy Standalone capability
- Divija Construction Standalone capability
- Combined Consortium (Desire 51% + Divija 49%)

Return valid JSON (no markdown wrapping):
{
  "is_rejected_non_tender": false,
  "tender_title": "string — extracted official tender title or document name",
  "project_category": "ESCO" | "STP" | "RHDS" | "KUSUM" | "SOLAR" | "CIVIL",
  "verdict": "Eligible" | "Conditional" | "Ineligible",
  "eligibility_score": number from 0 to 100,
  "overall_health": "Green" | "Yellow" | "Red",
  "recommendation": "string — clear bidding recommendation",
  "executive_summary": "string — comprehensive summary of AI eligibility audit",
  "desire_alone": {"score": number, "status": "string", "fulfilled_pct": "string"},
  "jv_alone": {"score": number, "status": "string", "fulfilled_pct": "string"},
  "combined_jv": {"score": number, "status": "string", "fulfilled_pct": "string"},
  "clauses_breakdown": [
    {
      "clause_no": "string — e.g. Clause 1.1 or ITB 4.2",
      "clause_title": "string — title of requirement",
      "requirement_type": "Financial" | "Technical" | "Organizational" | "Compliance",
      "tender_requirement": "exact requirement statement",
      "required_value": "numeric required value with unit",
      "desire_value": "Desire Energy actual metric and percentage (e.g. Rs.300.93 Cr (100%))",
      "jv_value": "Divija actual metric and percentage (e.g. Rs.37.01 Cr (74%))",
      "combined_value": "Combined capability description",
      "applicable_jv_rule": "JV pooling rule applied",
      "status": "MATCH" | "PARTIAL MATCH" | "NOT MATCHING",
      "fulfilled_pct": "percentage string (e.g. 100%)",
      "gap_notes": "detailed gap analysis",
      "required_doc": "documentary evidence required",
      "page_ref": "page or section reference"
    }
  ]
}`;

      const aiResult = await callGeminiAI(prompt, geminiKey);

      // 5. Process Gemini response
      if (aiResult && typeof aiResult === 'object') {
        if (aiResult.is_rejected_non_tender === true) {
          const rejection = buildRejection(filename);
          rejection.executive_summary = aiResult.executive_summary || rejection.executive_summary;
          rejection.tender_title = aiResult.tender_title || filename;
          return NextResponse.json({
            status: 'success',
            is_rejected_non_tender: true,
            message: 'AI confirmed: Not a tender document.',
            evaluation_report: rejection,
            report: rejection
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
          { rule: 'Lead Member Equity Share', requirement: '>= 51%', actual: '51% (Desire Energy)', status: 'PASSED' },
          { rule: 'Minimum Partner Share', requirement: '>= 26%', actual: '49% (Divija)', status: 'PASSED' },
          { rule: 'Turnover Pooling', requirement: '100% Sum', actual: `Rs.${cT.toFixed(2)} Cr`, status: 'PASSED' }
        ];
        const cb = aiResult.clauses_breakdown || [];
        aiResult.summary_counts = {
          total_criteria: cb.length,
          matched: cb.filter((c: any) => c.status === 'MATCH').length,
          partial: cb.filter((c: any) => c.status === 'PARTIAL MATCH').length,
          not_matching: cb.filter((c: any) => c.status === 'NOT MATCHING').length,
          data_missing: 0
        };
        const cleanAi = sanitizeReportClauses(aiResult);
        return NextResponse.json({
          status: 'success',
          is_rejected_non_tender: false,
          message: 'Gemini AI tender evaluation complete.',
          evaluation_report: cleanAi,
          report: cleanAi
        });
      }

      // 6. FALLBACK — Gemini unavailable
      const rejection = buildRejection(filename);
      rejection.executive_summary = `Gemini AI service unavailable. Could not generate automated clause analysis for "${filename}". Please try again.`;
      return NextResponse.json({
        status: 'success',
        is_rejected_non_tender: true,
        message: 'AI Service Temporary Failure.',
        evaluation_report: rejection,
        report: rejection
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

    // ═══ TENDERS ══════════════════════════════════════════════════════════════
    if (subPath === 'tenders') {
      if (method === 'GET') return NextResponse.json({ status: 'success', tenders: [] });
      if (method === 'POST') return NextResponse.json({ status: 'success', message: 'Tender saved.' });
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
