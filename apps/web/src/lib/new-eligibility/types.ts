// ─── STRICT EXTRACTION SCHEMAS ──────────────────────────────────────────────

export type FinancialClauseType = 'turnover' | 'net_worth' | 'solvency' | 'bid_capacity' | 'other';
export type FinancialYearRule = 'average' | 'any one year' | 'any N of the last M' | 'latest year' | 'other';

export interface ExtractedFinancialItem {
  title: string;
  type: FinancialClauseType;
  amount: number | null; // e.g. 69.78 (in Cr) or null
  amount_unit?: string | null; // e.g. 'Cr', 'Lakhs', null
  amount_raw?: string | null; // exact string stated in clause
  year_rule: FinancialYearRule | string;
  year_range: string; // e.g. "last 3 financial years", "last 5 years"
  alternative_group_id: string | null;
  quote: string; // Verbatim quote from page
  page: number | string; // Page number
}

export interface ExtractedTechnicalItem {
  title: string;
  type: string; // e.g. "similar_work", "pipeline_execution", "solar_pumping"
  unit: string | null; // e.g. "Cr", "km", "MLD", "HP", "Nos"
  threshold: number | string | null; // e.g. 27.91
  alternatives: string[] | null; // e.g. ["1 work of 80%", "2 works of 50%"]
  date_window: string; // e.g. "last 7 years"
  quote: string;
  page: number | string;
}

export type OtherClauseCategory =
  | 'registration'
  | 'licence'
  | 'JV rule'
  | 'blacklisting'
  | 'submission'
  | 'contract term';

export interface ExtractedOtherItem {
  title: string;
  category: OtherClauseCategory;
  details?: string;
  quote: string;
  page: number | string;
}

export interface StrictExtractionResult {
  tender_title: string;
  tender_reference?: string;
  estimated_value_cr?: number | null;
  financial: ExtractedFinancialItem[];
  technical: ExtractedTechnicalItem[];
  others: ExtractedOtherItem[];
}

// ─── EVALUATION RESULTS ─────────────────────────────────────────────────────

export type EvaluationStatus = 'PASS' | 'FAIL' | 'CANNOT CHECK';

export interface FinancialEvaluationItem {
  title: string;
  type: FinancialClauseType;
  required_amount: number | null;
  required_unit?: string | null;
  year_rule: string;
  year_range: string;
  alternative_group_id: string | null;
  quote: string;
  page: number | string;
  status: EvaluationStatus;
  inputs_shown: string; // Explicit arithmetic inputs and formula
  evaluation_notes: string;
  missing_field?: string;
}

export interface TechnicalEvaluationItem {
  title: string;
  type: string;
  unit: string | null;
  threshold: number | string | null;
  alternatives: string[] | null;
  date_window: string;
  quote: string;
  page: number | string;
  status: EvaluationStatus;
  project_used: string; // Full details of project matched from register
  evaluation_notes: string;
  missing_field?: string;
}

export interface OtherEvaluationItem {
  title: string;
  category: OtherClauseCategory;
  is_gate: boolean; // true for registration, licence, JV rule, blacklisting
  quote: string;
  page: number | string;
  status: EvaluationStatus | 'INFORMATION';
  evaluation_notes: string;
  missing_field?: string;
}

export interface TopCardSummary {
  financial: {
    status: EvaluationStatus;
    summary_line: string;
  };
  technical: {
    status: EvaluationStatus;
    summary_line: string;
  };
  others: {
    status: EvaluationStatus;
    summary_line: string;
  };
}

export type OverallVerdict =
  | 'Eligible'
  | `Not eligible (${string})`
  | `Cannot determine (${string})`;

export interface NewEligibilityReport {
  tender_title: string;
  tender_reference: string;
  filename: string;
  verdict: OverallVerdict;
  top_card: TopCardSummary;
  sections: {
    financial: {
      status: EvaluationStatus;
      items: FinancialEvaluationItem[];
    };
    technical: {
      status: EvaluationStatus;
      items: TechnicalEvaluationItem[];
    };
    others: {
      status: EvaluationStatus;
      gates: OtherEvaluationItem[];
      unscored_information: OtherEvaluationItem[];
    };
  };
  rendered_text: string;
  debug?: {
    pages_read: number[];
    total_pages: number;
    dropped_quotes_count: number;
    dropped_items?: any[];
  };
}
