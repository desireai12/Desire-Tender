// Types for BOQ SOR Comparison module.

export interface AuthorityMapping {
  authority_code: string;
  authority_name: string;
  state_name: string;
  department_type?: 'Water & Sanitation' | 'Roads & Buildings' | 'Urban Development' | 'Irrigation' | 'Power' | 'General';
  keywords: string[];
  supported_sor_years?: string[];
  is_central_agency?: boolean;
  is_custom?: boolean;
}

export type GstBasis = 'ex_gst' | 'incl_gst' | 'unknown';
export type FileStatus = 'uploaded' | 'pending_confirmation' | 'extracted' | 'error';
export type DocumentDiscipline = 'Civil' | 'Electrical' | 'Mechanical' | 'Plumbing' | 'General' | 'Other';

export interface SorFileRecord {
  id: string;
  filename: string;
  content_fingerprint?: string;
  document_key?: string | null;
  version_number?: number;
  parent_file_id?: string | null;
  is_active?: boolean;
  is_test?: boolean;
  discipline?: DocumentDiscipline;
  document_title?: string | null;
  tender_reference?: string | null;
  detected_sor_year_raw?: string | null;
  is_revision?: boolean;
  revision_confirmed?: boolean;
  upload_session_id?: string;
  file_size?: number;
  storage_path?: string;
  detected_state?: string;
  detection_confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  state_confirmed: boolean;
  state_name?: string | null;
  authority_code?: string | null;
  sor_year?: string | null;
  gst_basis: GstBasis;
  selected_sheet?: string | null;
  header_row?: number | null;
  total_rows?: number;
  extracted_items_count: number;
  skipped_rows_count: number;
  status: FileStatus;
  created_at: string;
}

export interface SorItemRecord {
  id?: string;
  file_id: string;
  state_name: string;
  item_no: string | null;
  raw_description: string;
  parent_description: string | null;
  section_heading: string | null;
  full_description: string;
  unit: string | null;
  unit_norm: string | null;
  quantity: number | null;
  rate_as_stated: number | null;
  rate_ex_gst: number | null;
  rate_incl_gst: number | null;
  gst_basis: GstBasis;
  amount: number | null;
  category: string | null;
  is_addon: boolean;
  is_percentage_based: boolean;
  is_lump_sum: boolean;
  rate_derived: boolean;
  flag_notes?: string | null;
  sheet_name: string;
  source_row: number;
}

export interface SkippedRowRecord {
  id?: string;
  file_id: string;
  sheet_name: string;
  source_row: number;
  raw_data: Record<string, unknown>;
  skip_reason: string;
}

export interface SheetScoreResult {
  sheetName: string;
  rowCount: number;
  score: number;
  isRecommended: boolean;
  reason: string;
  hasPricedItems: boolean;
  detectedHeaderRow?: number;
}

export type MatchClass = 'Strong' | 'Conditional' | 'Not comparable';
export type UnitDimension = 'volume' | 'length' | 'area' | 'mass' | 'count' | 'time' | 'unsupported';

export interface ParsedItemAttributes {
  category: string; // 'Excavation', 'Pipe Laying', 'Manhole', 'Concrete', 'Carriage', 'Dismantling', 'Other'
  materialType?: string | null;
  pipeMaterial?: 'DI' | 'HDPE' | 'RCC' | 'DWC' | 'PVC-U' | 'MS' | 'CI' | 'GI' | 'AC' | null;
  pipeDiameter?: number | null; // e.g. 200, 350, 600
  pipeOuterDiameter?: number | null; // e.g. 238 in "200/238 mm"
  pipeClass?: string | null; // e.g. 'NP4', 'Class 1', 'SN8', '6 kg/cm2'
  pipeStandard?: string | null;
  pipeSupplyIncluded?: boolean | null; // true if supply + lay, false if laying only
  jointingMethod?: string | null; // e.g. 'rubber gasket', 'push fit', 'butt fusion'
  concreteGrade?: string | null; // e.g. 'M10', 'M15', 'M20', 'M25', 'M30', 'M40'
  mixRatio?: string | null; // e.g. '1:2:4', '1:3:6', '1:1.5:3', '1:4', '1:3'
  manholeDia?: number | null; // e.g. 900, 1200, 1500
  manholeConstruction?: 'Precast RCC' | 'Brick Masonry' | null;
  manholeDepth?: number | null;
  isRing?: boolean | null;
  depthMin?: number | null; // e.g. 0.0, 1.5, 3.0
  depthMax?: number | null; // e.g. 1.5, 3.0, 4.5
  soilType?: string | null; // 'all_soil', 'saturated_soil', 'ordinary_rock', 'hard_rock'
  leadDistanceKm?: number | null;
  liftMeters?: number | null;
  isIncrementalLift?: boolean | null;
  disposalIncluded?: boolean | null;
  dewateringIncluded?: boolean | null;
  timberingIncluded?: boolean | null;
  toolingOrMethod?: string | null;
  stagingOrFormworkDetails?: string | null;
  roadWorkType?: string | null;
  [key: string]: unknown;
}

export interface SorMatchRecord {
  id?: string;
  pair_hash: string;
  source_item: SorItemRecord;
  target_item: SorItemRecord;
  source_state: string;
  target_state: string;
  match_class: MatchClass;
  confidence: number; // 0-100
  reasoning: string;
  scope_differences: string[];
  rate_structure_warning?: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'promoted_strong';
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'promoted_strong';

export interface SorItemGroupRecord {
  id: string;
  canonical_name: string;
  category: string;
  canonical_unit: string;
  attributes: ParsedItemAttributes;
  status: 'active' | 'archived' | 'merged';
  group_key?: string;
  created_at?: string;
  members?: SorItemGroupMemberRecord[];
  is_test?: boolean;
}

export interface SorItemGroupMemberRecord {
  id?: string;
  group_id: string;
  item_id: string;
  file_id: string;
  state_name: string;
  match_class: MatchClass;
  confidence: number;
  reasoning: string;
  warnings: string[];
  review_status: ReviewStatus;
  reviewer_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  item?: SorItemRecord;
  // Computed consolidation fields for UI
  state_rate_status?: 'consolidated' | 'state_rate_conflict';
  distinct_state_rates?: number[];
  selected_rate_ex_gst?: number | null;
  source_rows?: number[];
  source_files?: string[];
  description_variants?: string[];
}

export interface SorMatchAuditRecord {
  id?: string;
  match_id?: string | null;
  group_id?: string | null;
  member_id?: string | null;
  action: string;
  actor: string;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  notes?: string | null;
  created_at?: string;
}

export interface ComparisonSummary {
  totalExcluded: {
    is_addon: number;
    is_percentage_based: number;
    is_lump_sum: number;
    unit_missing: number;
    zero_rate: number;
    null_rate: number;
  };
  totalEligibleSource: number;
  totalEligibleTarget: number;
  matchesCount: {
    strong: number;
    conditional: number;
    not_comparable: number;
  };
}

export interface ConsolidatedStateItem {
  state_name: string | null;
  full_description: string;
  unit_norm: string;
  category: string | null;
  is_addon: boolean;
  is_percentage_based: boolean;
  is_lump_sum: boolean;
  rate_ex_gst: number | null;
  rate_as_stated: number | null;
  rates_differ: boolean;
  distinct_rates: number[];
  state_rate_conflict?: boolean;
  sources: {
    file_id: string;
    filename: string;
    sheet_name: string;
    source_row: number;
    rate_ex_gst: number | null;
    rate_as_stated: number | null;
  }[];
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  stateFilter?: string;
  categoryFilter?: string;
  classFilter?: string;
  conflictsOnly?: boolean;
  statusFilter?: string;
  search?: string;
}

export interface DashboardMetricSummary {
  totalItems: number;
  totalGroups: number;
  totalStates: number;
  statesList: string[];
  totalFiles: number;
  tier1Count: number;
  tier2Count: number;
  conflictCount: number;
  pendingReviewCount: number;
  stateCounts: Record<string, number>;
  categoryDistribution: { category: string; count: number; percentage: number }[];
}

