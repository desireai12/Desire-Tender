export type DepartmentRole = 
  | 'Business Development'
  | 'Engineering'
  | 'Estimation Team'
  | 'Management'
  | 'Tender Team'
  | 'Procurement'
  | 'Finance'
  | 'Admin';

export type ProjectCategory = 'EPC' | 'ESCO' | 'SOLAR' | 'STP' | 'KUSUM' | 'RHDS';

export type TenderStage = 
  | '1_ELIGIBILITY' 
  | '2_AI_ANALYSIS' 
  | '3_COST_ESTIMATION' 
  | '4_DECISION' 
  | '5_BID_DETAILS' 
  | '6_TENDER_RESULT';

export interface AuditLog {
  id: string;
  user: string;
  department: DepartmentRole;
  timestamp: string;
  action: string;
  status: string;
  next_pending_action: string;
}

export interface ClauseAnalysisItem {
  clause_no: string;
  title: string;
  status: 'Matched' | 'Not Matched' | 'Partially Matched';
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  explanation: string;
  action_required: string;
}

export interface EligibilityRequirementItem {
  requirement: string;
  status: 'Green' | 'Yellow' | 'Red';
  notes: string;
}

export interface MissingDocumentItem {
  name: string;
  type: 'Missing' | 'Expired' | 'Required';
  notes: string;
}

export interface AITenderReport {
  overall_health: 'Green' | 'Yellow' | 'Red';
  tender_score: number;
  recommendation: 'BID' | 'DO NOT BID' | 'REVIEW REQUIRED';
  executive_summary: string;
  clauses: ClauseAnalysisItem[];
  eligibility_matrix: EligibilityRequirementItem[];
  missing_documents: MissingDocumentItem[];
  risks: {
    technical: string[];
    commercial: string[];
    legal: string[];
    execution: string[];
    financial: string[];
  };
  ai_recommendations: string[];
  client_clarifications: string[];
}

export interface BOQLineItem {
  id: string;
  category: 'Labour' | 'Raw Materials' | 'Equipment' | 'Logistics' | 'Overhead' | 'Subcontractor';
  item_name: string;
  unit_of_measure: string;
  quantity: number;
  unit_cost: number;
  markup_percentage: number;
  tax_percentage: number;
}

export interface TenderProcess {
  id: string;
  tender_name: string;
  project_category: ProjectCategory;
  project_locked: boolean;
  department_assigned: DepartmentRole;
  current_stage: TenderStage;
  stage_status: 'Pending' | 'In Progress' | 'Under Review' | 'Approved' | 'Completed' | 'Rejected';
  created_at: string;
  updated_at: string;

  // Step 1 & Stage 1: Eligibility
  eligibility_result?: {
    is_eligible: boolean;
    reasoning: string;
    score: number;
    status_verdict?: 'Eligible' | 'Partially Eligible' | 'Not Eligible';
  };

  // Step 2 & Stage 2: AI Report
  uploaded_files?: {
    tender_pdf?: string;
    boq_file?: string;
    drawings?: string;
    supporting_docs?: string;
  };
  ai_report?: AITenderReport;

  // Stage 3: Cost Estimation
  boq_items?: BOQLineItem[];

  // Stage 4: Decision
  did_apply?: boolean;
  apply_decision_reason?: string;

  // Stage 5: Bid Details
  bid_details?: {
    bid_amount: number;
    bid_date: string;
    emd_amount: number;
    emd_reference?: string;
    tender_id_code: string;
    supporting_docs_attached: string[];
    submitted_by?: string;
    remarks?: string;
  };

  // Stage 6: Result & Knowledge Capture
  result_status?: 'Won' | 'Lost' | 'Cancelled' | 'Under Evaluation';
  lost_reason_details?: {
    winner_company: string;
    winning_price: number;
    l2_company?: string;
    l2_price?: number;
    l3_company?: string;
    l3_price?: number;
    our_rank?: string;
    price_difference_amount: number;
    price_difference_pct: number;
    reasons: string;
    lessons_learned: string;
  };

  audit_trail: AuditLog[];
}

export type KnowledgeModuleType = 
  | 'company'
  | 'certificates'
  | 'competitor'
  | 'historical_boq'
  | 'versioning';

export interface KnowledgeDocument {
  id: string;
  module: KnowledgeModuleType;
  title: string;
  filename: string;
  version: string;
  uploaded_by: string;
  uploaded_at: string;
  approval_status: 'Approved' | 'Pending Review' | 'Archived';
  expiry_date?: string;
  chunk_count: number;
  tags: string[];
  summary: string;
}

export type PermissionType = 
  | 'eligibility' 
  | 'ai_analysis' 
  | 'cost_estimation' 
  | 'bid_decision' 
  | 'bid_details' 
  | 'tender_result' 
  | 'admin';

export type UserStatus = 'Pending' | 'Active' | 'Rejected' | 'Deactivated';

export interface UserProfile {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone: string;
  password?: string;
  role: string;
  department: DepartmentRole;
  status: UserStatus;
  permissions: PermissionType[];
  assigned_projects: ProjectCategory[];
  registered_at: string;
  last_login: string;
}

export interface Project {
  id: string;
  name: string;
  type: ProjectCategory;
  client: string;
  description: string;
  ai_instructions?: string;
  knowledge_sources: string[];
  status: 'Active' | 'Archived';
  created_at: string;
}
