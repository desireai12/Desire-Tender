// Authority and State Detection Registry.
// Dynamic, extensible registry of Indian state departments and central agencies.
import type { AuthorityMapping } from './types';

export const ALL_INDIAN_STATES_AND_UTS = [
  // 28 States
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  // 8 Union Territories
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
  // Central / National Scope
  'Central Agencies',
] as const;

export type IndianStateOrUT = (typeof ALL_INDIAN_STATES_AND_UTS)[number];

export const DEFAULT_AUTHORITY_MAPPINGS: AuthorityMapping[] = [
  // ─── RAJASTHAN ─────────────────────────────────────────────────────────────
  {
    authority_code: 'RUIDP',
    authority_name: 'Rajasthan Urban Infrastructure Development Project',
    state_name: 'Rajasthan',
    department_type: 'Urban Development',
    keywords: ['ruidp', 'ruidp sor', 'bhinmal', 'jaipur', 'rajasthan urban'],
    supported_sor_years: ['2021', '2022', '2023', '2024'],
  },
  {
    authority_code: 'DLB_RAJ',
    authority_name: 'Department of Local Bodies, Rajasthan',
    state_name: 'Rajasthan',
    department_type: 'Urban Development',
    keywords: ['dlb', 'dlb raj', 'local bodies rajasthan', 'dlb jodhpur', 'dlb jaipur'],
    supported_sor_years: ['2022', '2023', '2024'],
  },
  {
    authority_code: 'PHED_RAJ',
    authority_name: 'Public Health Engineering Department, Rajasthan',
    state_name: 'Rajasthan',
    department_type: 'Water & Sanitation',
    keywords: ['phed raj', 'phed rajasthan', 'phed water supply'],
    supported_sor_years: ['2021', '2022', '2023', '2024'],
  },
  {
    authority_code: 'RAJ_PWD',
    authority_name: 'Public Works Department, Rajasthan',
    state_name: 'Rajasthan',
    department_type: 'Roads & Buildings',
    keywords: ['pwd rajasthan', 'raj pwd', 'pwd raj bsr', 'rajasthan bsr'],
    supported_sor_years: ['2021', '2022', '2023', '2024'],
  },
  {
    authority_code: 'WRD_RAJ',
    authority_name: 'Water Resources Department, Rajasthan',
    state_name: 'Rajasthan',
    department_type: 'Irrigation',
    keywords: ['wrd rajasthan', 'wrd raj', 'irrigation rajasthan'],
    supported_sor_years: ['2022', '2023', '2024'],
  },

  // ─── MADHYA PRADESH ────────────────────────────────────────────────────────
  {
    authority_code: 'MP_UADD',
    authority_name: 'Urban Administration & Development Dept, MP',
    state_name: 'Madhya Pradesh',
    department_type: 'Urban Development',
    keywords: ['uadd', 'mp uadd', 'mp ucf', 'ucf jabalpur', 'uadd bhopal', 'uadd indore'],
    supported_sor_years: ['2021', '2022', '2023', '2024'],
  },
  {
    authority_code: 'MPUDC',
    authority_name: 'Madhya Pradesh Urban Development Company',
    state_name: 'Madhya Pradesh',
    department_type: 'Urban Development',
    keywords: ['mpudc', 'madhya pradesh urban development', 'mpudc water'],
    supported_sor_years: ['2022', '2023', '2024'],
  },
  {
    authority_code: 'MP_PWD',
    authority_name: 'Public Works Department, Madhya Pradesh',
    state_name: 'Madhya Pradesh',
    department_type: 'Roads & Buildings',
    keywords: ['mp pwd', 'mppwd', 'pwd mp', 'mp bsr'],
    supported_sor_years: ['2021', '2022', '2023', '2024'],
  },
  {
    authority_code: 'MP_WRD',
    authority_name: 'Water Resources Department, Madhya Pradesh',
    state_name: 'Madhya Pradesh',
    department_type: 'Irrigation',
    keywords: ['mp wrd', 'mpwrd', 'wrd mp', 'water resources mp'],
    supported_sor_years: ['2022', '2023', '2024'],
  },
  {
    authority_code: 'MP_JJM',
    authority_name: 'Jal Jeevan Mission, Madhya Pradesh',
    state_name: 'Madhya Pradesh',
    department_type: 'Water & Sanitation',
    keywords: ['mp jjm', 'jal jeevan mission mp', 'mp rural water'],
    supported_sor_years: ['2022', '2023', '2024'],
  },

  // ─── UTTAR PRADESH ─────────────────────────────────────────────────────────
  {
    authority_code: 'UPJN',
    authority_name: 'Uttar Pradesh Jal Nigam',
    state_name: 'Uttar Pradesh',
    department_type: 'Water & Sanitation',
    keywords: ['upjn', 'up jal nigam', 'jal nigam up', 'uttar pradesh jal nigam'],
    supported_sor_years: ['2021', '2022', '2023', '2024'],
  },
  {
    authority_code: 'UP_PWD',
    authority_name: 'Uttar Pradesh Public Works Department',
    state_name: 'Uttar Pradesh',
    department_type: 'Roads & Buildings',
    keywords: ['up pwd', 'uppwd', 'pwd up', 'uttar pradesh pwd', 'up bsr'],
    supported_sor_years: ['2021', '2022', '2023', '2024'],
  },
  {
    authority_code: 'UP_JJM',
    authority_name: 'State Water and Sanitation Mission (JJM), Uttar Pradesh',
    state_name: 'Uttar Pradesh',
    department_type: 'Water & Sanitation',
    keywords: ['swsm up', 'swsm uttar pradesh', 'up jjm', 'jal jeevan mission up'],
    supported_sor_years: ['2022', '2023', '2024'],
  },

  // ─── MAHARASHTRA ───────────────────────────────────────────────────────────
  {
    authority_code: 'MJP',
    authority_name: 'Maharashtra Jeevan Pradhikaran',
    state_name: 'Maharashtra',
    department_type: 'Water & Sanitation',
    keywords: ['mjp', 'maharashtra jeevan pradhikaran', 'mjp sor', 'mjp water'],
    supported_sor_years: ['2021', '2022', '2023', '2024', '2025'],
  },
  {
    authority_code: 'CIDCO',
    authority_name: 'City and Industrial Development Corporation of Maharashtra',
    state_name: 'Maharashtra',
    department_type: 'Urban Development',
    keywords: ['cidco', 'navi mumbai cidco', 'cidco sor', 'cidco tender'],
    supported_sor_years: ['2022', '2023', '2024'],
  },
  {
    authority_code: 'BMC',
    authority_name: 'Brihanmumbai Municipal Corporation',
    state_name: 'Maharashtra',
    department_type: 'Urban Development',
    keywords: ['bmc', 'mcgm', 'brihanmumbai', 'mumbai municipal', 'bmc sor'],
    supported_sor_years: ['2021', '2023', '2024'],
  },
  {
    authority_code: 'MAHA_PWD',
    authority_name: 'Public Works Department, Maharashtra',
    state_name: 'Maharashtra',
    department_type: 'Roads & Buildings',
    keywords: ['maha pwd', 'mahapwd', 'pwd maharashtra', 'maharashtra pwd bsr'],
    supported_sor_years: ['2022', '2023', '2024'],
  },

  // ─── GUJARAT ───────────────────────────────────────────────────────────────
  {
    authority_code: 'GWSSB',
    authority_name: 'Gujarat Water Supply and Sewerage Board',
    state_name: 'Gujarat',
    department_type: 'Water & Sanitation',
    keywords: ['gwssb', 'gujarat water supply', 'gwssb gandhinagar', 'gwssb sor'],
    supported_sor_years: ['2021', '2022', '2023', '2024'],
  },
  {
    authority_code: 'GUJ_RNDB',
    authority_name: 'Roads & Buildings Department, Gujarat',
    state_name: 'Gujarat',
    department_type: 'Roads & Buildings',
    keywords: ['gujarat r&b', 'r&bd gujarat', 'gujarat roads buildings', 'gujarat rnb'],
    supported_sor_years: ['2021', '2022', '2023', '2024'],
  },
  {
    authority_code: 'AMC',
    authority_name: 'Ahmedabad Municipal Corporation',
    state_name: 'Gujarat',
    department_type: 'Urban Development',
    keywords: ['amc ahmedabad', 'ahmedabad municipal corporation', 'amc sor'],
    supported_sor_years: ['2022', '2023', '2024'],
  },

  // ─── BIHAR ─────────────────────────────────────────────────────────────────
  {
    authority_code: 'BIHAR_PHED',
    authority_name: 'Public Health Engineering Department, Bihar',
    state_name: 'Bihar',
    department_type: 'Water & Sanitation',
    keywords: ['bihar phed', 'phed bihar', 'bihar water supply'],
    supported_sor_years: ['2021', '2022', '2023', '2024'],
  },
  {
    authority_code: 'BIHAR_PWD',
    authority_name: 'Road Construction Department / PWD, Bihar',
    state_name: 'Bihar',
    department_type: 'Roads & Buildings',
    keywords: ['bihar rcd', 'rcd bihar', 'bihar pwd', 'brpnnl'],
    supported_sor_years: ['2022', '2023', '2024'],
  },

  // ─── KARNATAKA ─────────────────────────────────────────────────────────────
  {
    authority_code: 'KRWSSA',
    authority_name: 'Karnataka Rural Water Supply and Sanitation Agency',
    state_name: 'Karnataka',
    department_type: 'Water & Sanitation',
    keywords: ['krwssa', 'karnataka rural water', 'krwssd', 'jal nirmal'],
    supported_sor_years: ['2021', '2022', '2023', '2024'],
  },
  {
    authority_code: 'KUWSDB',
    authority_name: 'Karnataka Urban Water Supply and Drainage Board',
    state_name: 'Karnataka',
    department_type: 'Water & Sanitation',
    keywords: ['kuwsdb', 'karnataka urban water', 'kuwsdb bangalore'],
    supported_sor_years: ['2022', '2023', '2024'],
  },
  {
    authority_code: 'KAPWD',
    authority_name: 'Public Works Department, Karnataka',
    state_name: 'Karnataka',
    department_type: 'Roads & Buildings',
    keywords: ['kapwd', 'karnataka pwd', 'pwd karnataka', 'karnataka bsr'],
    supported_sor_years: ['2021', '2022', '2023', '2024'],
  },
  {
    authority_code: 'BWSSB',
    authority_name: 'Bangalore Water Supply and Sewerage Board',
    state_name: 'Karnataka',
    department_type: 'Water & Sanitation',
    keywords: ['bwssb', 'bangalore water supply', 'bwssb bengaluru'],
    supported_sor_years: ['2022', '2023', '2024'],
  },

  // ─── TAMIL NADU ────────────────────────────────────────────────────────────
  {
    authority_code: 'TWAD',
    authority_name: 'Tamil Nadu Water Supply and Drainage Board',
    state_name: 'Tamil Nadu',
    department_type: 'Water & Sanitation',
    keywords: ['twad', 'twad board', 'tamil nadu water supply', 'twad sor'],
    supported_sor_years: ['2021', '2022', '2023', '2024'],
  },
  {
    authority_code: 'TN_PWD',
    authority_name: 'Public Works Department, Tamil Nadu',
    state_name: 'Tamil Nadu',
    department_type: 'Roads & Buildings',
    keywords: ['tn pwd', 'tamil nadu pwd', 'pwd chennai', 'tn wrd'],
    supported_sor_years: ['2021', '2022', '2023', '2024'],
  },
  {
    authority_code: 'CMWSSB',
    authority_name: 'Chennai Metropolitan Water Supply and Sewerage Board',
    state_name: 'Tamil Nadu',
    department_type: 'Water & Sanitation',
    keywords: ['cmwssb', 'chennai metro water', 'metro water chennai'],
    supported_sor_years: ['2022', '2023', '2024'],
  },

  // ─── CENTRAL AGENCIES ──────────────────────────────────────────────────────
  {
    authority_code: 'CPWD',
    authority_name: 'Central Public Works Department',
    state_name: 'Central Agencies',
    department_type: 'Roads & Buildings',
    is_central_agency: true,
    keywords: ['cpwd', 'dsr', 'delhi schedule of rates', 'cpwd dsr', 'cpwd sor'],
    supported_sor_years: ['2019', '2021', '2023', '2024'],
  },
  {
    authority_code: 'MES',
    authority_name: 'Military Engineer Services',
    state_name: 'Central Agencies',
    department_type: 'General',
    is_central_agency: true,
    keywords: ['mes', 'military engineer services', 'mes ssr', 'defence works'],
    supported_sor_years: ['2020', '2021', '2023', '2024'],
  },
  {
    authority_code: 'NHAI',
    authority_name: 'National Highways Authority of India',
    state_name: 'Central Agencies',
    department_type: 'Roads & Buildings',
    is_central_agency: true,
    keywords: ['nhai', 'morth', 'national highways', 'nhai sor', 'morth sor'],
    supported_sor_years: ['2020', '2022', '2023', '2024'],
  },
  {
    authority_code: 'BRO',
    authority_name: 'Border Roads Organisation',
    state_name: 'Central Agencies',
    department_type: 'Roads & Buildings',
    is_central_agency: true,
    keywords: ['bro', 'border roads organisation', 'bro ssr', 'gref'],
    supported_sor_years: ['2021', '2023', '2024'],
  },
];

export interface StateDetectionResult {
  detected_state: string | null;
  authority_code: string | null;
  authority_name?: string | null;
  department_type?: string | null;
  detected_sor_year?: string | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  matched_keyword: string | null;
  reason?: string;
}

let customAuthorityMappings: AuthorityMapping[] = [...DEFAULT_AUTHORITY_MAPPINGS];

export function getAuthorityMappings(): AuthorityMapping[] {
  return customAuthorityMappings;
}

export function resetAuthorityMappings(): void {
  customAuthorityMappings = [...DEFAULT_AUTHORITY_MAPPINGS];
}

export function addAuthorityMapping(mapping: AuthorityMapping): { success: boolean; error?: string } {
  const normCode = mapping.authority_code.trim().toUpperCase();
  const existing = customAuthorityMappings.find(
    (m) => m.authority_code.toUpperCase() === normCode
  );

  // Validate duplicate authority codes and prevent silent destructive overwrite of standard mappings
  if (existing && !existing.is_custom) {
    return {
      success: false,
      error: `Authority code "${normCode}" is a built-in standard authority (${existing.authority_name}) and cannot be overwritten.`,
    };
  }

  customAuthorityMappings = customAuthorityMappings.filter(
    (m) => m.authority_code.toUpperCase() !== normCode
  );
  customAuthorityMappings.push({
    ...mapping,
    authority_code: normCode,
    is_custom: true,
  });
  return { success: true };
}

export function loadPersistedAuthorityMappings(dbMappings: AuthorityMapping[]): void {
  if (!Array.isArray(dbMappings)) return;
  for (const m of dbMappings) {
    if (m && m.authority_code && m.authority_name && m.state_name) {
      addAuthorityMapping(m);
    }
  }
}

export function getAuthoritiesByState(stateName: string): AuthorityMapping[] {
  const normState = stateName.trim().toLowerCase();
  return customAuthorityMappings.filter(
    (m) => m.state_name.toLowerCase() === normState || (normState === 'central' && m.is_central_agency)
  );
}

/**
 * Result of rigorous SOR year detection distinguishing SOR years from tender/deadline dates.
 */
export interface SorYearDetectionResult {
  detected_sor_year: string | null;
  raw_year_text: string | null;
  year_type: 'SOR_YEAR' | 'FINANCIAL_YEAR' | 'PUBLICATION_YEAR' | 'TENDER_YEAR' | 'UNKNOWN';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  requires_user_confirmation: boolean;
  reason?: string;
}

/**
 * Extracts SOR year or financial year from filename and sample text with strict context validation.
 * Distinguishes explicit SOR/BSR years from tender execution, NIT, submission, and bid deadline dates.
 * Does NOT silently substitute current calendar year when year is absent.
 */
export function detectSorYearDetailed(filename: string, sampleText: string = ''): SorYearDetectionResult {
  const combined = `${filename} ${sampleText}`;

  // 1. Guard against tender/bid/NIT deadline dates first
  // If adjacent to "NIT", "Bid", "Submission", "Opening", "Deadline", classify as TENDER_YEAR with LOW confidence
  const tenderDateRegex = /\b(?:nit|bid|tender|submission|opening|deadline|due|dated?)\b[\s\S]{0,35}\b(20[12]\d)\b/i;
  const tenderDateMatch = combined.match(tenderDateRegex);
  if (tenderDateMatch && !/\b(?:sor|bsr|schedule\s+of\s+rates?)\b/i.test(combined)) {
    return {
      detected_sor_year: tenderDateMatch[1],
      raw_year_text: tenderDateMatch[0],
      year_type: 'TENDER_YEAR',
      confidence: 'LOW',
      requires_user_confirmation: true,
      reason: `Year found adjacent to tender/bid deadline marker: "${tenderDateMatch[0]}". User confirmation required.`,
    };
  }

  // 2. Check for explicit SOR / BSR / Schedule of Rates context
  // e.g. "SOR 2023", "BSR 2024", "Schedule of Rates 2022-23", "SOR 2023-2024", "Schedule of Rates for 2023"
  const sorContextRegex = /\b(?:sor|bsr|schedule\s+of\s+rates?|rates?|csr|dsr)\b[\s\S]{0,30}\b(20[12]\d)(?:[-_/](20)?([23]\d))?/i;
  const sorContextMatch = combined.match(sorContextRegex);
  if (sorContextMatch) {
    const startYear = sorContextMatch[1];
    const endYear = sorContextMatch[3];
    const raw = sorContextMatch[0];
    if (endYear) {
      return {
        detected_sor_year: `${startYear}-${endYear.length === 2 ? endYear : endYear.slice(-2)}`,
        raw_year_text: raw.trim(),
        year_type: 'FINANCIAL_YEAR',
        confidence: 'HIGH',
        requires_user_confirmation: false,
        reason: `Explicit schedule of rates identifier: "${raw.trim()}"`,
      };
    }
    return {
      detected_sor_year: startYear,
      raw_year_text: raw.trim(),
      year_type: 'SOR_YEAR',
      confidence: 'HIGH',
      requires_user_confirmation: false,
      reason: `Explicit schedule of rates identifier: "${raw.trim()}"`,
    };
  }

  // Also check if filename has pattern like "RUIDP_SOR_2023" or "SOR_2023"
  const sorFilenameMatch = filename.match(/\b(?:sor|bsr)[-_ ]?(20[12]\d)\b/i);
  if (sorFilenameMatch) {
    return {
      detected_sor_year: sorFilenameMatch[1],
      raw_year_text: sorFilenameMatch[0],
      year_type: 'SOR_YEAR',
      confidence: 'HIGH',
      requires_user_confirmation: false,
      reason: `Filename contains explicit SOR year: "${sorFilenameMatch[0]}"`,
    };
  }

  // 3. Check for Financial Year: e.g., 2023-24, 2024-25, 2022-2023
  const fyRegex = /\b(20[12]\d)[-_/](20)?([23]\d)\b/;
  const fyMatch = combined.match(fyRegex);
  if (fyMatch) {
    const start = fyMatch[1];
    const end = fyMatch[3];
    const formatted = `${start}-${end.length === 2 ? end : end.slice(-2)}`;
    return {
      detected_sor_year: formatted,
      raw_year_text: fyMatch[0],
      year_type: 'FINANCIAL_YEAR',
      confidence: 'MEDIUM',
      requires_user_confirmation: false,
      reason: `Detected financial year format: "${fyMatch[0]}"`,
    };
  }

  // 4. Standalone 4-digit calendar year (2018-2029)
  const calRegex = /\b(201[89]|202[0-9])\b/;
  const calMatch = combined.match(calRegex);
  if (calMatch) {
    return {
      detected_sor_year: calMatch[1],
      raw_year_text: calMatch[1],
      year_type: 'PUBLICATION_YEAR',
      confidence: 'MEDIUM',
      requires_user_confirmation: false,
      reason: `Found 4-digit publication year: "${calMatch[1]}"`,
    };
  }

  // 5. Year missing entirely: Do NOT default to new Date().getFullYear()!
  return {
    detected_sor_year: null,
    raw_year_text: null,
    year_type: 'UNKNOWN',
    confidence: 'LOW',
    requires_user_confirmation: true,
    reason: 'No reliable SOR or calendar year detected. User confirmation required.',
  };
}

/**
 * Extracts 4-digit SOR year or financial year string, or null if uncertain.
 */
export function detectSorYear(filename: string, sampleText: string = ''): string | null {
  const result = detectSorYearDetailed(filename, sampleText);
  return result.detected_sor_year;
}

/**
 * Detects engineering discipline or document type from filename or sheet texts.
 */
export function detectDiscipline(text: string): 'Civil' | 'Electrical' | 'Mechanical' | 'Plumbing' | 'General' {
  const lower = text.toLowerCase();
  if (/\b(?:electrical|e&m|power|substation|cable|illumination)\b/i.test(lower)) return 'Electrical';
  if (/\b(?:mechanical|machinery|pump|valves?|hvac|plant)\b/i.test(lower)) return 'Mechanical';
  if (/\b(?:plumbing|sanitary|drainage|water\s*supply|sewerage|sewer)\b/i.test(lower)) return 'Plumbing';
  if (/\b(?:civil|road|building|bridge|culvert|earthwork|concrete|structure|masonry)\b/i.test(lower)) return 'Civil';
  return 'General';
}

/**
 * Document identity parameters representing a unique, independent schedule or tender.
 */
export interface DocumentIdentityParams {
  state_name?: string | null;
  authority_code?: string | null;
  sor_year?: string | null;
  discipline?: string | null;
  document_title?: string | null;
  tender_reference?: string | null;
}

/**
 * Computes logical document identity key from state, authority, discipline, year, and tender reference.
 * Prevents distinct engineering disciplines (Civil, Electrical, Mechanical) or independent tenders
 * from being combined into the same version history.
 */
export function computeDocumentKey(
  paramsOrState?: DocumentIdentityParams | string | null,
  authorityCode?: string | null,
  sorYear?: string | null,
  discipline?: string | null,
  tenderRef?: string | null,
): string {
  let state: string;
  let authority: string;
  let year: string;
  let disc: string;
  let tender: string;

  if (paramsOrState && typeof paramsOrState === 'object') {
    state = paramsOrState.state_name || 'unassigned_state';
    authority = paramsOrState.authority_code || 'unassigned_auth';
    year = paramsOrState.sor_year || 'unspecified_year';
    disc = paramsOrState.discipline || 'civil';
    tender = paramsOrState.tender_reference || '';
  } else {
    state = (paramsOrState as string) || 'unassigned_state';
    authority = authorityCode || 'unassigned_auth';
    year = sorYear || 'unspecified_year';
    disc = discipline || 'civil';
    tender = tenderRef || '';
  }

  const s = state.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  const a = authority.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  const d = disc.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  const y = year.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  const t = tender.trim() ? `::${tender.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}` : '';

  return `${s}::${a}::${d}::${y}${t}`;
}

/**
 * Detects state, authority, and SOR year using strict multi-tier heuristics.
 * Guards strictly against weak single-word matches.
 */
export function detectStateAndAuthority(
  filename: string,
  sampleText: string = '',
  mappings: AuthorityMapping[] = customAuthorityMappings,
): StateDetectionResult {
  const normFilename = filename.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
  const normText = sampleText.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
  const detectedYear = detectSorYear(filename, sampleText);

  // 1. TIER 1 (HIGH CONFIDENCE): Exact authority code match as whole word in filename
  for (const m of mappings) {
    const codeRegex = new RegExp(`\\b${m.authority_code.toLowerCase().replace('_', '[_ ]?')}\\b`, 'i');
    if (codeRegex.test(normFilename)) {
      return {
        detected_state: m.state_name,
        authority_code: m.authority_code,
        authority_name: m.authority_name,
        department_type: m.department_type,
        detected_sor_year: detectedYear,
        confidence: 'HIGH',
        matched_keyword: m.authority_code,
        reason: `Matched exact official authority code "${m.authority_code}" in filename`,
      };
    }
  }

  // 2. TIER 2 (HIGH CONFIDENCE): Specific official multi-word keyword in filename
  for (const m of mappings) {
    for (const kw of m.keywords) {
      if (kw.length >= 4 && normFilename.includes(kw.toLowerCase())) {
        return {
          detected_state: m.state_name,
          authority_code: m.authority_code,
          authority_name: m.authority_name,
          department_type: m.department_type,
          detected_sor_year: detectedYear,
          confidence: 'HIGH',
          matched_keyword: kw,
          reason: `Matched specific keyword "${kw}" in filename`,
        };
      }
    }
  }

  // 3. TIER 3 (MEDIUM CONFIDENCE): Authority code or multi-word keyword in sheet text/titles
  for (const m of mappings) {
    const codeRegex = new RegExp(`\\b${m.authority_code.toLowerCase().replace('_', '[_ ]?')}\\b`, 'i');
    if (codeRegex.test(normText)) {
      return {
        detected_state: m.state_name,
        authority_code: m.authority_code,
        authority_name: m.authority_name,
        department_type: m.department_type,
        detected_sor_year: detectedYear,
        confidence: 'MEDIUM',
        matched_keyword: m.authority_code,
        reason: `Matched authority code "${m.authority_code}" in workbook content`,
      };
    }
    for (const kw of m.keywords) {
      if (kw.length >= 6 && normText.includes(kw.toLowerCase())) {
        return {
          detected_state: m.state_name,
          authority_code: m.authority_code,
          authority_name: m.authority_name,
          department_type: m.department_type,
          detected_sor_year: detectedYear,
          confidence: 'MEDIUM',
          matched_keyword: kw,
          reason: `Matched keyword "${kw}" in workbook content`,
        };
      }
    }
  }

  // 4. TIER 4: Generic State Name detected without definite authority -> LOW confidence
  for (const state of ALL_INDIAN_STATES_AND_UTS) {
    if (state === 'Central Agencies') continue;
    const stateRegex = new RegExp(`\\b${state.toLowerCase()}\\b`, 'i');
    if (stateRegex.test(normFilename) || stateRegex.test(normText)) {
      return {
        detected_state: state,
        authority_code: null,
        detected_sor_year: detectedYear,
        confidence: 'LOW',
        matched_keyword: state,
        reason: `Detected state name "${state}" but authority could not be unambiguously confirmed. User confirmation required.`,
      };
    }
  }

  // 5. UNCERTAIN / UNKNOWN -> LOW confidence, manual selection required
  return {
    detected_state: null,
    authority_code: null,
    detected_sor_year: detectedYear,
    confidence: 'LOW',
    matched_keyword: null,
    reason: 'No recognized authority or state identified. Please manually select state and authority.',
  };
}
