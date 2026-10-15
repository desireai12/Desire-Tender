// ─── MASTER COMPANY RECORDS FOR DETERMINISTIC ELIGIBILITY EVALUATION ─────────

export interface YearWiseFinancialRecord {
  year: string;
  value_cr: number | null;
  source: string;
  verified: boolean;
}

export interface ProjectRegisterEntry {
  project_id: string;
  project_name: string;
  client: string;
  category: string;
  scope_tags: string[];
  contract_value_cr: number;
  desire_share_pct: number;
  desire_value_cr: number;
  execution_value_cr: number;
  om_value_cr?: number;
  start_date: string;
  actual_completion_date: string;
  completion_year: number;
  quantities?: Record<string, any>;
  certificate_ref: string;
  is_verified: boolean;
  source_file?: string;
  jv_partner?: string;
  scope_summary: string;
}

export interface ContractorRegistration {
  authority: string;
  class: string;
  category: string;
  validity: string;
  status: 'Active' | 'Expired';
}

export interface ContractorLicence {
  title: string;
  issuing_body: string;
  class: string;
  validity: string;
  status: 'Active' | 'Valid';
}

export interface CompanyMasterProfile {
  id: string;
  name: string;
  type: string;
  cin: string;
  pan: string;
  gst: string;
  year_wise_turnover: Record<string, number>;
  three_year_average_turnover: number;
  peak_turnover_cr: number;
  peak_turnover_year: string;
  year_wise_net_worth: Record<string, number | null>;
  latest_net_worth_cr: number;
  latest_net_worth_year: string;
  solvency_amount_cr: number;
  solvency_certificate: {
    bank_name: string;
    certificate_no: string;
    issue_date: string;
    amount_cr: number;
    validity: string;
    verified: boolean;
  };
  project_register: ProjectRegisterEntry[];
  registrations: ContractorRegistration[];
  licences: ContractorLicence[];
  blacklisting: {
    is_blacklisted: boolean;
    has_affidavit: boolean;
    details: string;
  };
  jv_permitted: boolean;
}

export const DESIRE_ENERGY_MASTER: CompanyMasterProfile = {
  id: 'comp-desire-01',
  name: 'DESIRE ENERGY SOLUTIONS PRIVATE LIMITED',
  type: 'Desire Energy',
  cin: 'U40106RJ2011PTC034878',
  pan: 'AAECD3266E',
  gst: '24AAECD3266E1ZZ',

  // Year-wise Turnover Table (Form-7 Audited, CA Certified)
  year_wise_turnover: {
    'FY 2021-22': 100.83,
    'FY 2022-23': 201.53,
    'FY 2023-24': 350.66,
    'FY 2024-25': 263.63,
    'FY 2025-26': 256.52,
  },
  // Audited 3-year average: (FY 22-23 to FY 24-25): (201.53 + 350.66 + 263.63) / 3 = 271.94 Cr
  three_year_average_turnover: 271.94,
  peak_turnover_cr: 350.66,
  peak_turnover_year: 'FY 2023-24',

  // Year-wise Net Worth Table (Audited Balance Sheet Notes)
  year_wise_net_worth: {
    'FY 2020-21': 7.05,
    'FY 2021-22': 13.95,
    'FY 2022-23': 27.25,
    'FY 2023-24': 52.62,
    'FY 2024-25': null, // UNVERIFIED — Pending upload of signed audited balance sheet
  },
  latest_net_worth_cr: 52.62,
  latest_net_worth_year: 'FY 2023-24',

  // Solvency Certificate (Kotak Mahindra Bank)
  solvency_amount_cr: 72.18,
  solvency_certificate: {
    bank_name: 'Kotak Mahindra Bank',
    certificate_no: 'RBGIFD/2025-26/000876/SC 1',
    issue_date: '18/02/2026',
    amount_cr: 72.18,
    validity: 'Valid for FY 2025-26 / 12 Months',
    verified: true,
  },

  // Authoritative Project Register with full provenance
  project_register: [
    {
      project_id: 'DES-PRJ-01',
      project_name: 'SITC and O&M of off grid solar photovoltaic water pumping system in Rajasthan (PM-KUSUM Component-B)',
      client: 'Rajasthan Horticulture Development Society (RHDS) / RRECL',
      category: 'Solar Water Pumping / PM-KUSUM Component-B',
      scope_tags: ['solar', 'pumping', 'water', 'kusum', 'epc', 'pipe', 'pipeline'],
      contract_value_cr: 93.36,
      desire_share_pct: 49,
      desire_value_cr: 45.75,
      execution_value_cr: 41.17,
      om_value_cr: 4.57,
      start_date: '14/03/2022',
      actual_completion_date: '14/03/2023',
      completion_year: 2023,
      quantities: { pumps: 1500, capacity_kw: 7500 },
      certificate_ref: 'RHDS Work Agreement F-9(40) CH/Solar/PM KUSUM/2020-21/6315-6402 dt 14.03.2022',
      source_file: 'PQ_Upload_Junagadh (2).pdf, Page 24 (Form-8, Item 5)',
      is_verified: true,
      jv_partner: 'Duke Plasto (51%)',
      scope_summary: 'Off-grid solar PV water pumping (PM-KUSUM Component-B with 5 years O&M)'
    },
    {
      project_id: 'DES-PRJ-02',
      project_name: 'SITC and O&M of submersible pumps along with tanks and pipeline for drinking water supply (Lucknow)',
      client: 'UP Projects Corporation Ltd (Zone-7)',
      category: 'Water Supply Pipeline, Submersible Pumps & O&M',
      scope_tags: ['pipeline', 'water supply', 'pumps', 'hdpe', 'di', 'civil', 'epc'],
      contract_value_cr: 37.54,
      desire_share_pct: 49,
      desire_value_cr: 18.40,
      execution_value_cr: 14.72,
      om_value_cr: 3.68,
      start_date: '24/02/2021',
      actual_completion_date: '10/06/2022',
      completion_year: 2022,
      quantities: { pipeline_km: 42.5, pipe_type: 'HDPE / DI', pumps: 120, tanks: 45 },
      certificate_ref: 'Agreement No. 09/GM-7/UPPCL/2020-21 dt 24/02/2021 & Handpump Order 531/PCL dt 24/03/2021',
      source_file: 'PQ_Upload_Junagadh (2).pdf, Page 19 (Form-8, Item 1)',
      is_verified: true,
      jv_partner: 'Duke Plasto (51%)',
      scope_summary: 'Submersible pumps, tanks, and 42.5 km pipeline installation and O&M'
    },
    {
      project_id: 'DES-PRJ-03',
      project_name: 'Energy Efficient Pumping System with SCADA on ESCO Basis (10 years O&M)',
      client: 'Mahesana Municipality, Gujarat',
      category: 'Energy Efficient Pumping with SCADA / ESCO',
      scope_tags: ['esco', 'pumping', 'scada', 'automation', 'water', 'energy'],
      contract_value_cr: 23.09,
      desire_share_pct: 50,
      desire_value_cr: 11.55,
      execution_value_cr: 6.93,
      om_value_cr: 4.62,
      start_date: '25/10/2018',
      actual_completion_date: '2019',
      completion_year: 2019,
      quantities: { pumping_stations: 18, tubewells: 45, scada_points: 65 },
      certificate_ref: 'Mahesana Municipality Work Order 1314/2018-19 & Extended Order 3499/2018-19 dt 24/02/2021',
      source_file: 'PQ_Upload_Junagadh (2).pdf, Page 19 (Form-8, Item 2)',
      is_verified: true,
      jv_partner: 'Toran Trade Link (50%)',
      scope_summary: 'Energy-efficient pumping with SCADA on ESCO basis with 10 years O&M'
    },
    {
      project_id: 'DES-PRJ-04',
      project_name: 'Energy Efficient Pumping System with SCADA on ESCO Basis (10 years O&M)',
      client: 'Anjar Nagarpalika, Gujarat',
      category: 'Energy Efficient Pumping with SCADA / ESCO',
      scope_tags: ['esco', 'pumping', 'scada', 'automation', 'water'],
      contract_value_cr: 15.33,
      desire_share_pct: 50,
      desire_value_cr: 7.66,
      execution_value_cr: 5.36,
      om_value_cr: 2.30,
      start_date: '01/12/2019',
      actual_completion_date: '2020',
      completion_year: 2020,
      quantities: { pumping_stations: 12, tubewells: 30, scada_points: 40 },
      certificate_ref: 'Anjar Nagarpalika Work Order No. 2839 dt 01/12/2019 & Experience Cert dt 10/01/2024',
      source_file: 'PQ_Upload_Junagadh (2).pdf, Page 19 (Form-8, Item 4)',
      is_verified: true,
      jv_partner: 'Toran Trade Link (50%)',
      scope_summary: 'Energy-efficient pumping system with SCADA on ESCO basis'
    },
    {
      project_id: 'DES-PRJ-06',
      project_name: 'In-Village Water Supply Infrastructure under JJM (Naswadi Taluka, 25 Mini Schemes)',
      client: 'Executive Engineer, P.H. Mech Division, GWSSB Chhotaudepur',
      category: 'Rural Piped Water Supply (JJM)',
      scope_tags: ['water supply', 'pipeline', 'jjm', 'solar', 'pumping', 'storage'],
      contract_value_cr: 2.0545,
      desire_share_pct: 100,
      desire_value_cr: 2.0545,
      execution_value_cr: 1.8491,
      om_value_cr: 0.2054,
      start_date: '30/09/2021',
      actual_completion_date: '01/03/2022',
      completion_year: 2022,
      quantities: { mini_schemes: 25, solar_pumps: 25, storage_tanks: 25 },
      certificate_ref: 'GWSSB Chhotaudepur Outward No. 181/2022 dt 06/05/2022 (Agreement B.1/15/of 2021-22)',
      source_file: 'PQ_Upload_Junagadh (2).pdf, Page 77',
      is_verified: true,
      scope_summary: 'Solar pump-motor-panel with module, MS structure, 5000L tank, pipelines & 5 years M&R'
    },
    {
      project_id: 'DES-PRJ-07',
      project_name: 'JJM In-Village Water Supply Infrastructure (Jetpurpavi Taluka, 78 mini schemes)',
      client: 'Executive Engineer, P.H. Mech Division, GWSSB Chhotaudepur',
      category: 'Rural Piped Water Supply (JJM)',
      scope_tags: ['water supply', 'pipeline', 'jjm', 'solar', 'pumping'],
      contract_value_cr: 6.4102,
      desire_share_pct: 100,
      desire_value_cr: 6.4102,
      execution_value_cr: 6.4102,
      om_value_cr: 0.64,
      start_date: '16/10/2021',
      actual_completion_date: '15/03/2022',
      completion_year: 2022,
      quantities: { mini_schemes: 78, solar_pumps: 78, storage_tanks: 78 },
      certificate_ref: 'GWSSB Chhotaudepur Outward No. 667/2025 dt 18-08-2025 (Agreement B.1/16/of 2021-22)',
      source_file: 'PQ_Upload_Junagadh (2).pdf, Page 65',
      is_verified: true,
      scope_summary: 'Design, supply, erection, testing and commissioning of 78 solar mini piped water schemes'
    },
    {
      project_id: 'DES-PRJ-08',
      project_name: 'JJM In-Village Water Supply Infrastructure (Chhotaudepur and Kawant Taluka, 69 mini schemes)',
      client: 'Executive Engineer, P.H. Mech Division, GWSSB Chhotaudepur',
      category: 'Rural Piped Water Supply (JJM)',
      scope_tags: ['water supply', 'pipeline', 'jjm', 'solar', 'pumping'],
      contract_value_cr: 5.6614,
      desire_share_pct: 100,
      desire_value_cr: 5.6614,
      execution_value_cr: 5.6614,
      om_value_cr: 0.56,
      start_date: '16/10/2021',
      actual_completion_date: '11/03/2022',
      completion_year: 2022,
      quantities: { mini_schemes: 69, solar_pumps: 69, storage_tanks: 69 },
      certificate_ref: 'GWSSB Chhotaudepur Outward No. 668/2025 dt 18-08-2025 (Agreement B.1/17/of 2021-22)',
      source_file: 'PQ_Upload_Junagadh (2).pdf, Page 68',
      is_verified: true,
      scope_summary: 'Solar pumping, tanks, distribution pipelines, and community stand posts'
    },
    {
      project_id: 'DES-PRJ-10',
      project_name: 'PHED Alwar Bulk Water Pipeline Transmission (DI/HDPE)',
      client: 'Executive Engineer, PHED Alwar',
      category: 'Bulk Water Supply Pipeline EPC',
      scope_tags: ['pipeline', 'water supply', 'transmission', 'di', 'hdpe', 'bulk'],
      contract_value_cr: 28.45,
      desire_share_pct: 100,
      desire_value_cr: 28.45,
      execution_value_cr: 27.12,
      om_value_cr: 1.33,
      start_date: '15/06/2021',
      actual_completion_date: '28/06/2023',
      completion_year: 2023,
      quantities: { pipeline_km: 85.0, pipe_type: 'DI / HDPE' },
      certificate_ref: 'Scanned certificate image (no selectable text layer)',
      source_file: 'PQ_Upload_Alwar (2).pdf, Page 88',
      is_verified: false, // Needs manual certificate verification
      scope_summary: 'Bulk water pipeline transmission execution (85 km DI/HDPE)'
    }
  ],

  // Verified Contractor Registrations
  registrations: [
    {
      authority: 'Gujarat WRD (Water Resources Department)',
      class: 'Class-AA',
      category: 'Civil & Pipelines',
      validity: 'Active (Valid up to 31/12/2028)',
      status: 'Active'
    },
    {
      authority: 'Gujarat R&B (Roads & Buildings)',
      class: 'Class-AA',
      category: 'Civil',
      validity: 'Active',
      status: 'Active'
    },
    {
      authority: 'PHED Rajasthan',
      class: 'Class-A Special',
      category: 'Water Infrastructure & Pumping',
      validity: 'Active',
      status: 'Active'
    }
  ],

  // Verified Licenses & Certifications
  licences: [
    {
      title: 'Class-A Electrical Contractor License',
      issuing_body: 'Electrical Licensing Board of Gujarat',
      class: 'Class-A',
      validity: 'Valid (Regularly Renewed)',
      status: 'Valid'
    },
    {
      title: 'BEE Grade-1 ESCO Accreditation',
      issuing_body: 'Bureau of Energy Efficiency (Govt of India)',
      class: 'Grade-1',
      validity: 'Active',
      status: 'Valid'
    },
    {
      title: 'ISO 9001:2015 & ISO 14001:2015',
      issuing_body: 'Quality & Environmental Management Systems',
      class: 'ISO Standards',
      validity: 'Active',
      status: 'Valid'
    }
  ],

  // Blacklisting / Debarment Status
  blacklisting: {
    is_blacklisted: false,
    has_affidavit: true,
    details: 'Verified Non-Debarment Affidavit on ₹500 Non-Judicial Stamp Paper. Not blacklisted or barred by any Central/State Govt department or PSU.'
  },

  jv_permitted: true
};

// JV PARTNER PROFILE: VINOD H PATEL (Available for joint bidding when tender permits)
export const VINOD_H_PATEL_MASTER = {
  id: 'comp-vhp-04',
  name: 'VINOD H PATEL',
  type: 'JV Partner',
  registrations: [
    { authority: 'Gujarat WRD (Water Resources Department)', class: 'Class-AA', category: 'Civil & Pipelines', validity: 'Active' },
    { authority: 'Gujarat R&B', class: 'Class-AA', category: 'Civil', validity: 'Active' },
    { authority: 'Gujarat Energy Dept', class: 'Class-A', category: 'Electrical Contractor License', validity: 'Active' }
  ],
  year_wise_turnover: {
    'FY 2021-22': 131.77,
    'FY 2022-23': 249.61,
    'FY 2023-24': 280.15,
    'FY 2024-25': 134.55
  },
  three_year_average_turnover: 191.39,
  net_worth: 33.37,
  solvency_amount_cr: 25.00,
  project_register: [
    {
      project_id: 'VHP-PRJ-01',
      project_name: 'Palanpur Group Water Supply Package 2 (Rising/Gravity DI/PVC Pipeline & Pumping Station)',
      client: 'Executive Engineer, WRD Palanpur / GWSSB',
      contract_value_cr: 99.41,
      vhp_share_pct: 85,
      vhp_value_cr: 84.49,
      escalated_value_cr: 112.37,
      completion_date: '14/08/2023',
      completion_year: 2023,
      category: 'Bulk Water Supply Pipeline EPC',
      quantities: { pipeline_km: 110.0, pipe_type: 'DI / PVC', pipe_dia_mm: '300-700', pumping_stations: 3 },
      certificate_ref: 'Executive Engineer, WRD Palanpur Completion Certificate dt 14/08/2023',
      is_verified: true,
      scope_summary: 'EPC execution of 110+ km DI/PVC bulk transmission water pipeline and pumping stations'
    }
  ]
};
