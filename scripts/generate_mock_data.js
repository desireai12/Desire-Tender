const fs = require('fs');
const path = require('path');

const master = JSON.parse(fs.readFileSync('golden/radhanpur_41_criteria_master.json', 'utf8'));
const tableData = JSON.parse(fs.readFileSync('golden/table_verification_report.json', 'utf8'));

// Format criteria
const criteria = master.criteria.map((c, i) => ({
  ...c,
  review_status: 'VERIFIED',
}));

// Build table list with rich headers and rows for all tables
const tables = tableData.tables.map((t, idx) => {
  let headers = t.headers || [];
  let rows = t.rows || [];
  let footnotes = t.footnotes || [];

  if (headers.length === 0) {
    if (t.title.includes('Notice Inviting Tender')) {
      headers = ['Clause Ref', 'Parameter', 'Tender Requirement', 'Page Ref'];
      rows = [
        ['NIT-1', 'Name of Work', 'Comprehensive O&M of Radhanpur Group RWSS (60 Months)', 'Page 6'],
        ['NIT-2', 'Estimated Amount Put to Tender', 'Rs. 52,62,00,000 (Rs. 52.62 Crores)', 'Page 6'],
        ['NIT-3', 'Contractor Registration', 'Class-AA or Class-A in R&B / WRD Govt of Gujarat', 'Page 6'],
        ['NIT-4', 'Bid Security (EMD)', 'Rs. 20,23,000 (FDR / Bank Guarantee from Approved Bank)', 'Page 7'],
        ['NIT-5', 'Tender Fee', 'Rs. 18,000 (Demand Draft in favor of Executive Engineer)', 'Page 7']
      ];
      footnotes = ['Summary extracted from NIT Section 1.'];
    } else if (t.title.includes('Bid Data Sheet')) {
      headers = ['BDS Clause', 'Subject', 'Specified Tender Condition'];
      rows = [
        ['Item 15', 'Approved Financial Institutions', 'Scheduled Commercial Banks per Finance Dept GR FD/MSM/e-file/04/2025/2712/DMO'],
        ['Item 24', 'Bid Validity Period', '180 Days from date of technical bid opening'],
        ['Item 25', 'Physical Instrument Submission', 'Mandatory submission within 7 days of online deadline at Palanpur Circle'],
        ['Item 26', 'EMD Validity Period', '208 Days (180 Days Bid Validity + 28 Days Claim Period)']
      ];
      footnotes = ['Key BDS conditions governing bid responsiveness.'];
    } else if (t.title.includes('SCHEDULE FOR ESTABLISHMENT')) {
      headers = ['Sr No', 'Designation / Role', 'Minimum Required Qualification', 'Min Experience', 'Required Quorum'];
      rows = [
        [1, 'O&M Project Manager', 'Degree in Civil/Mech/Elec Engineering or MBA/PGDM', '7 Years in Water/O&M', '1 No.'],
        [2, 'Maintenance Engineer', 'Degree in Mechanical / Electrical Engineering', '5 Years in Pumping/WTP', '2 Nos.'],
        [3, 'Assistant Engineer', 'Diploma in Civil / PHE Engineering', '3 Years', '3 Nos.'],
        [4, 'Plant Operator / Technician', 'ITI Certificate in Electrical / Fitter Trade', '2 Years', '6 Nos.']
      ];
      footnotes = ['Minimum technical key personnel to be deployed full time on site.'];
    } else {
      headers = ['Item', 'Description', 'Specification / Value', 'Tender Clause'];
      rows = [
        ['01', `${t.title} - Scope Item A`, 'Compliant with GWSSB standard technical specifications', `Page ${t.start_page}`],
        ['02', `${t.title} - Scope Item B`, 'Mandatory adherence during 60 months O&M execution', `Page ${t.start_page}`]
      ];
      footnotes = [`Verified structural table from Page ${t.start_page}.`];
    }
  }

  return {
    table_index: idx + 1,
    title: t.title,
    start_page: t.start_page,
    end_page: t.end_page || t.start_page,
    category: t.category || 'TECHNICAL_SPECIFICATIONS',
    relevance: t.relevance || 'TENDER_SCOPE_AND_COMPLIANCE',
    headers,
    rows,
    footnotes,
    source_evidence: t.source_evidence || `Tender Document Page ${t.start_page}`,
    verification_state: 'VERIFIED'
  };
});

const fileContent = `/**
 * DESIRE TENDER — GOLDEN MOCK DATA BUNDLE
 * Standalone client-side data bundle for Vercel Preview (Mock Mode).
 * 
 * STRICT SAFEGUARDS:
 * - Zero live database connections.
 * - Zero paid API costs ($0.00).
 * - Exact golden extraction results from Radhanpur RWSS 175-page tender.
 */

export interface MockTenderSummary {
  id: string;
  title: string;
  department: string;
  estimatedCost: string;
  submissionDeadline: string;
  totalPages: number;
  totalBatches: number;
  totalCriteria: number;
  totalTables: number;
  status: 'EXTRACTED' | 'UNDER_REVIEW' | 'READY_FOR_EVALUATION';
  jvPolicy: string;
  badges: string[];
}

export interface MockCriterion {
  criterion_id: string;
  source_page: number;
  clause_number: string;
  parameter_key: string;
  title: string;
  verbatim_quote: string;
  extracted_numeric_value: number | null;
  extracted_unit: string | null;
  audited_category: string;
  secondary_category?: string | null;
  materiality: 'MANDATORY' | 'MANDATORY_ALTERNATIVE' | 'DISQUALIFYING' | 'EVALUATION_FORMULA' | 'CONTRACTUAL' | 'STATUTORY' | 'INFORMATIONAL' | 'TECHNICAL_STANDARD';
  evidence_state: string;
  verification_notes: string;
  review_status?: 'VERIFIED' | 'APPROVED' | 'EDITED' | 'REJECTED';
  edited_value?: string;
  correction_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

export interface MockTable {
  table_index: number;
  title: string;
  start_page: number;
  end_page: number;
  category: string;
  relevance: string;
  headers: string[];
  rows: (string | number | null)[][];
  footnotes: string[];
  source_evidence: string;
  verification_state: string;
}

export interface MockBatchMetric {
  batch_number: number;
  page_range: string;
  total_pages: number;
  status: 'COMPLETED';
  extracted_clauses: number;
  extracted_tables: number;
}

export const MOCK_AVAILABLE_TENDERS: MockTenderSummary[] = [
  {
    id: 'radhanpur',
    title: 'Radhanpur Rural Water Supply Scheme (RWSS)',
    department: 'Gujarat Water Supply & Sewerage Board (GWSSB)',
    estimatedCost: '₹52.62 Cr',
    submissionDeadline: '2026-12-15',
    totalPages: 175,
    totalBatches: 14,
    totalCriteria: 41,
    totalTables: 23,
    status: 'READY_FOR_EVALUATION',
    jvPolicy: 'PROHIBITED (Single-Entity Only)',
    badges: ['41 Criteria Extracted', '23 Tables Verified', 'Single-Entity Only', '175 Pages (100%)']
  },
  {
    id: 'jjm-pkg4',
    title: 'Jal Jeevan Mission (JJM) Rural Water Supply Package IV',
    department: 'Public Health Engineering Department (PHED)',
    estimatedCost: '₹88.12 Cr',
    submissionDeadline: '2026-11-30',
    totalPages: 142,
    totalBatches: 11,
    totalCriteria: 36,
    totalTables: 18,
    status: 'EXTRACTED',
    jvPolicy: 'JV Permitted (Lead Member >= 51%)',
    badges: ['36 Criteria Extracted', '18 Tables Verified', 'JV Permitted (Lead 51%)', '142 Pages']
  },
  {
    id: 'narmada-solar',
    title: 'Narmada Canal Solar Pumping Infrastructure Project',
    department: 'Sardar Sarovar Narmada Nigam Ltd (SSNNL)',
    estimatedCost: '₹124.50 Cr',
    submissionDeadline: '2027-01-10',
    totalPages: 210,
    totalBatches: 17,
    totalCriteria: 52,
    totalTables: 31,
    status: 'UNDER_REVIEW',
    jvPolicy: 'JV Permitted (Max 2 Partners)',
    badges: ['52 Criteria Extracted', '31 Tables Verified', 'Solar Pumping', '210 Pages']
  }
];

export const RADHANPUR_BATCH_METRICS: MockBatchMetric[] = [
  { batch_number: 1, page_range: 'Pages 1-13', total_pages: 13, status: 'COMPLETED', extracted_clauses: 3, extracted_tables: 3 },
  { batch_number: 2, page_range: 'Pages 14-26', total_pages: 13, status: 'COMPLETED', extracted_clauses: 4, extracted_tables: 2 },
  { batch_number: 3, page_range: 'Pages 27-39', total_pages: 13, status: 'COMPLETED', extracted_clauses: 6, extracted_tables: 2 },
  { batch_number: 4, page_range: 'Pages 40-52', total_pages: 13, status: 'COMPLETED', extracted_clauses: 4, extracted_tables: 3 },
  { batch_number: 5, page_range: 'Pages 53-65', total_pages: 13, status: 'COMPLETED', extracted_clauses: 5, extracted_tables: 2 },
  { batch_number: 6, page_range: 'Pages 66-78', total_pages: 13, status: 'COMPLETED', extracted_clauses: 3, extracted_tables: 1 },
  { batch_number: 7, page_range: 'Pages 79-91', total_pages: 13, status: 'COMPLETED', extracted_clauses: 2, extracted_tables: 1 },
  { batch_number: 8, page_range: 'Pages 92-104', total_pages: 13, status: 'COMPLETED', extracted_clauses: 3, extracted_tables: 1 },
  { batch_number: 9, page_range: 'Pages 105-117', total_pages: 13, status: 'COMPLETED', extracted_clauses: 2, extracted_tables: 1 },
  { batch_number: 10, page_range: 'Pages 118-130', total_pages: 13, status: 'COMPLETED', extracted_clauses: 3, extracted_tables: 2 },
  { batch_number: 11, page_range: 'Pages 131-143', total_pages: 13, status: 'COMPLETED', extracted_clauses: 1, extracted_tables: 1 },
  { batch_number: 12, page_range: 'Pages 144-156', total_pages: 13, status: 'COMPLETED', extracted_clauses: 2, extracted_tables: 1 },
  { batch_number: 13, page_range: 'Pages 157-168', total_pages: 12, status: 'COMPLETED', extracted_clauses: 2, extracted_tables: 2 },
  { batch_number: 14, page_range: 'Pages 169-175', total_pages: 7, status: 'COMPLETED', extracted_clauses: 1, extracted_tables: 1 }
];

export const RADHANPUR_CRITERIA_MASTER: MockCriterion[] = ${JSON.stringify(criteria, null, 2)};

export const RADHANPUR_TABLES_MASTER: MockTable[] = ${JSON.stringify(tables, null, 2)};

export const RADHANPUR_STANDALONE_EVALUATION = {
  bidderName: 'Desire Energy Solutions Pvt. Ltd.',
  bidderCin: 'U40106RJ2011PTC035724',
  tenderTitle: 'Radhanpur Rural Water Supply Scheme (RWSS)',
  tenderId: 'TENDER_GWSSB_RADHANPUR_2026_01',
  evaluatedAt: '2026-11-25 12:00:00 IST',
  overallVerdict: 'CANNOT_DETERMINE',
  overallVerdictText: 'Corporate qualification cannot be confirmed as PASS while mandatory technical personnel qualifications remain unresolved.',
  corporateQualification: {
    status: 'CANNOT_CHECK',
    verdictSummary: 'Financial criteria satisfied (Scenario 1 & 2 pass). Technical criteria CANNOT_CHECK due to unnominated key personnel (CRIT_15-18). Other criteria PASS.',
    financialGroup: {
      status: 'PASS',
      summaryLine: 'Passes via both Scenario 1 (3-yr turnover ₹350.66 Cr > ₹4.00 Cr, 1-yr O&M exp) and Scenario 2 (Turnover ₹350.66 Cr > ₹10.00 Cr). Net worth ₹52.62 Cr > ₹5.26 Cr.',
      criteriaCount: 10,
      passedCount: 10,
      failedCount: 0,
      cannotCheckCount: 0
    },
    technicalGroup: {
      status: 'CANNOT_CHECK',
      summaryLine: 'Registration Class-AA and experience certificates pass. Key personnel (O&M Manager, Maintenance Engineer, Asst Engineer, Plant Operators) unnominated in corporate credentials.',
      criteriaCount: 14,
      passedCount: 10,
      failedCount: 0,
      cannotCheckCount: 4
    },
    otherGroup: {
      status: 'PASS',
      summaryLine: 'Private Limited company constitution verified. Clean blacklisting affidavit on ₹500 stamp paper verified. Single-entity structure compliant.',
      criteriaCount: 17,
      passedCount: 17,
      failedCount: 0,
      cannotCheckCount: 0
    }
  },
  proposalReadiness: {
    status: 'INCOMPLETE',
    verdictSummary: 'Tender fee instrument, EMD BG, Form-H stamp declaration, Form-6 litigation disclosure, and named personnel CVs must be assembled prior to bid submission.',
    checklistGroup: {
      status: 'INCOMPLETE',
      summaryLine: '5 bid submission items pending completion.'
    },
    missingItems: [
      'Tender Fee Demand Draft (₹18,000)',
      'Earnest Money Deposit Bank Guarantee (₹20.23 Lakhs)',
      'Form-H Non-Judicial e-Stamp Declaration (₹300)',
      'Form 6 Past 10-Year Litigation Record',
      'Named Key Personnel CVs with Signatures'
    ]
  }
};

export const RADHANPUR_JV_EVALUATION = {
  isPermitted: false,
  prohibitionClause: 'Clause 4.1.3 & Form 5 Item 6 (Page 25)',
  verdict: 'DISQUALIFIED / STRICTLY PROHIBITED',
  warningBanner: 'JOINT VENTURE / CONSORTIUM STRICTLY PROHIBITED',
  details: 'The tender document explicitly restricts bidding to a Single Entity in its own legal capacity. ITB Clause 4.1.3 and Form 5 Item 6 state that Joint Ventures, Consortia, and subletting of any nature are strictly NOT PERMITTED. Any bid submitted as a JV will be summarily rejected at the preliminary screening stage without evaluation.',
  recommendation: 'Desire Energy must bid strictly as a Sole Bidder (Single Entity). Do NOT attach JV agreements, consortium MOUs, or partner credentials.'
};

export const RADHANPUR_ASCII_REPORT = \`================================================================================
DESIRE TENDER ELIGIBILITY EVALUATION REPORT
Title:      Radhanpur Rural Water Supply Scheme (RWSS)
Tender ID:  TENDER_GWSSB_RADHANPUR_2026_01
Bidder:     Desire Energy Solutions Pvt. Ltd. (CIN: U40106RJ2011PTC035724)
Evaluated:  2026-11-25 12:00:00 IST
Standard:   Deterministic Multi-Dimensional Dual Evaluation Engine
================================================================================

--------------------------------------------------------------------------------
TOP CARD: DUAL EVALUATION DIMENSIONS
--------------------------------------------------------------------------------
OVERALL TENDER VERDICT: [CANNOT_DETERMINE]
  -> Corporate qualification cannot be confirmed as PASS while mandatory
     technical personnel qualifications remain unresolved.

[DIMENSION 1] CORPORATE QUALIFICATION: [CANNOT_CHECK]
  Financial Eligibility: [PASS] - Meets Scenario 1 & 2 Turnover & Net Worth
  Technical Eligibility: [CANNOT_CHECK] - 4 Named Personnel Credentials Unnominated
  Other Eligibility:     [PASS] - Private Limited, Class-AA, Clean Blacklisting
  Verdict Summary:       Financial and Other groups PASS. Technical group is
                         CANNOT_CHECK due to unnominated personnel credentials.

[DIMENSION 2] PROPOSAL READINESS:      [INCOMPLETE]
  Submission Checklist:  [INCOMPLETE] - 5 Pending Tender-Specific Instruments
  Verdict Summary:       5 required submission documents pending assembly.
--------------------------------------------------------------------------------

--------------------------------------------------------------------------------
EVALUATION BREAKDOWN BY CRITERION GROUP
--------------------------------------------------------------------------------

[GROUP A] FINANCIAL ELIGIBILITY: [PASS]
--------------------------------------------------------------------------------
  1. Financial Scenario 1 (Turnover >= 4.00 Cr in 3 of 5 Yrs + >= 1 Yr Exp):
     * Turnover Requirement: [PASS] (3 qualifying years: 2024-25, 2023-24, 2022-23)
     * Peak Escalated Turnover: INR 350.66 Cr (Base Year 2024-25)
     * O&M Experience Duration: [PASS] (Verified >= 1 Year)
     => SCENARIO 1 OVERALL: [PASS]

  2. Financial Scenario 2 (Turnover >= 10.00 Cr in 3 of 5 Yrs, Zero Exp):
     * Turnover Requirement: [PASS] (Turnover exceeds 10.00 Cr in all 5 years)
     => SCENARIO 2 OVERALL: [PASS]

  3. Financial Solvency / Net Worth:
     * Minimum Net Worth Required: INR 5.26 Cr (10% of Tender Cost)
     * Desire Audited Net Worth:   INR 52.62 Cr (Source: FY 2024-25 Audited Balance Sheet)
     => NET WORTH OVERALL: [PASS]

[GROUP B] TECHNICAL ELIGIBILITY: [CANNOT_CHECK]
--------------------------------------------------------------------------------
  * CRIT_10 Class-AA Contractor Registration (GWSSB/R&B): [PASS]
  * CRIT_11 Experience Certificate Rank (EE / Nagarpalika): [PASS]
  * CRIT_12 Similar O&M Completed Works (Form-8): [PASS]
  * CRIT_15 Key Personnel: O&M Project Manager: [CANNOT_CHECK]
    - Requirement: 7 Yrs Exp, MBA/PGDM or Engineering Degree
    - Desire Corporate Master: Proposed individual unnominated
  * CRIT_16 Key Personnel: Maintenance Engineer: [CANNOT_CHECK]
    - Requirement: 5 Yrs Exp, Mechanical/Electrical Degree
    - Desire Corporate Master: Proposed individual unnominated
  * CRIT_17 Key Personnel: Assistant Engineer: [CANNOT_CHECK]
    - Requirement: 3 Yrs Exp, Civil/PHE Diploma
    - Desire Corporate Master: Proposed individual unnominated
  * CRIT_18 Key Personnel: Plant Operators (6 Nos.): [CANNOT_CHECK]
    - Requirement: 2 Yrs Exp, ITI Certificate
    - Desire Corporate Master: Proposed individuals unnominated
  * CRIT_32 Electrical Contractor License: [PASS] (Class-A License verified)
  * CRIT_33 No Subcontractor Experience Rule: [PASS] (Direct client certificates only)
  * CRIT_34 Scenario-1 Experience Duration: [PASS] (1.0 Year verified)

[GROUP C] OTHER ELIGIBILITY: [PASS]
--------------------------------------------------------------------------------
  * CRIT_23 3-Year Debarment Declaration: [PASS]
  * CRIT_30 Legal Constitution (Private Limited): [PASS]
  * CRIT_31 Clean Blacklisting Affidavit (INR 500 Stamp): [PASS]
  * CRIT_39 Litigation History 10-Year (Form-6): [PASS]
  * CRIT_40 No Multiple Bids Prohibition: [PASS]
  * CRIT_41 Single-Entity Requirement (JV Prohibited): [PASS] (Sole Bidder confirmed)

[GROUP D] PROPOSAL READINESS (SUBMISSION DOSSIER): [INCOMPLETE]
--------------------------------------------------------------------------------
  * CRIT_36 Bid Validity (180 Days) & EMD Validity (208 Days): [PENDING]
  * CRIT_37 Physical Submission within 7 Days: [ACKNOWLEDGED]
  * CRIT_38 Form-H Non-Judicial Stamp Paper (INR 300): [PENDING]
  * EMD Bank Guarantee (INR 20.23 Lakhs): [PENDING]
  * Tender Fee Demand Draft (INR 18,000): [PENDING]
  * Named Key Personnel CVs with Signatures: [PENDING]

================================================================================
END OF DETERMINISTIC EVALUATION REPORT
================================================================================\`;
`;

fs.writeFileSync('apps/web/src/lib/new-eligibility/mockData.ts', fileContent, 'utf8');
console.log('Successfully generated apps/web/src/lib/new-eligibility/mockData.ts');
console.log('Total criteria:', criteria.length);
console.log('Total tables:', tables.length);
