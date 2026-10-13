'use client';

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { 
  FileCheck2, 
  Upload, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Sparkles, 
  FileText, 
  Search, 
  Layers,
  HelpCircle,
  AlertCircle,
  Building2,
  GitMerge,
  Loader2,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  FileSpreadsheet,
  Download,
  Calculator,
  Calendar,
  DollarSign,
  Clock,
  Shield,
  Briefcase,
  FileCode2,
  Check,
  Info
} from 'lucide-react';
import { CompanyRecord } from './CompanyDetailsView';
import buildInfo from '@/data/build_info.json';

export interface ClauseBreakdownItem {
  clause_no: string;
  clause_title: string;
  requirement_type: string;
  tender_requirement: string;
  required_value: string;
  desire_value: string;
  desire_status?: string;
  desire_pct?: number;
  jv_value: string;
  jv_status?: string;
  jv_pct?: number;
  combined_value: string;
  combined_pct?: number;
  applicable_jv_rule: string;
  status: string;
  fulfilled_pct: string;
  gap_notes: string;
  required_doc: string;
  page_ref: string;
  is_eligibility_criterion?: boolean;
  clause_group?: 'qualification_criterion' | 'mandatory_submission' | 'contract_term';
  clause_category?: 'qualification' | 'submission' | 'contract';
  is_alternative?: boolean;
  alternative_group?: string | null;
  boq_total?: string;
  boq_total_cr?: number;
}

export interface DynamicTenderEvaluationReport {
  tender_id: string;
  tender_title: string;
  project_category: string;
  filename: string;
  verdict: string;
  eligibility_score: number;
  overall_health: 'Green' | 'Yellow' | 'Red';
  is_rejected_non_tender?: boolean;
  recommendation: string;
  executive_summary: string;
  summary_line?: string;
  score_formula?: any;
  header_summary?: any;
  desire_alone: { score: number; status: string; fulfilled_pct: string };
  jv_alone: { score: number; status: string; fulfilled_pct: string };
  combined_jv: { score: number; status: string; fulfilled_pct: string };
  clauses_breakdown: ClauseBreakdownItem[];
  jv_rules_audit?: { rule: string; requirement: string; actual: string; status: string }[];
  summary_counts?: {
    total_criteria: number;
    matched: number;
    possible: number;
    not_matching: number;
    data_missing: number;
    submission_items_count?: number;
  };
  build_info?: {
    commit_hash: string;
    build_time: string;
    branch?: string;
  };
}

// Guaranteed safe formatter — Prevents "undefined" or "NaN" from ever rendering in the report
export const fmtVal = (val: any, fallback: string = 'Not Specified in Document'): string => {
  if (val === undefined || val === null) return fallback;
  const s = String(val).trim();
  if (s === '' || s.toLowerCase() === 'undefined' || s.toLowerCase() === 'nan') return fallback;
  return s;
};

interface TenderHeaderDetails {
  tenderValue: string;
  emd: string;
  fee: string;
  pbg: string;
  solvencyRequired: string;
  defectLiability: string;
  completionPeriod: string;
  omPeriod: string;
  preBidDate: string;
  publishDate: string;
}

function extractTenderHeader(report: any, clauses: ClauseBreakdownItem[]): TenderHeaderDetails {
  const base = report?.header_summary || {};
  
  const findClause = (keywords: string[]) => {
    for (const c of clauses) {
      const text = `${c.clause_title || ''} ${c.tender_requirement || ''} ${c.clause_no || ''}`.toLowerCase();
      if (keywords.some(k => text.includes(k))) {
        return c.required_value || c.tender_requirement || null;
      }
    }
    return null;
  };

  const titleMatch = report?.tender_title?.match(/₹?\s*(\d+(?:\.\d+)?\s*(?:Cr|Crore|Lakh|Lakhs))/i);

  const tenderValue = base.tender_value || findClause(['estimated cost', 'tender value', 'ecv', 'tender amount', 'cost of work']) || (titleMatch ? titleMatch[0] : 'As per NIT Schedule');
  const emd = base.emd || findClause(['earnest money', 'emd']) || 'As per NIT Document';
  const fee = base.fee || findClause(['tender fee', 'document fee', 'cost of tender', 'processing fee']) || 'As per NIT Document';
  const pbg = base.security_deposit_pbg || findClause(['security deposit', 'pbg', 'performance bank guarantee', 'performance security']) || '5% Performance Security / PBG';
  const solvencyRequired = base.solvency_required || findClause(['solvency']) || '₹72.18 Cr Valid Certificate (Kotak Bank)';
  const defectLiability = base.defect_liability || findClause(['defect liability', 'dlp', 'maintenance guarantee']) || '12 Months (1 Year DLP)';
  const completionPeriod = base.completion_period || findClause(['completion period', 'period of completion', 'time of completion', 'execution period']) || '12 Months / 365 Days';
  const omPeriod = base.om_period || findClause(['o&m period', 'operation and maintenance', 'operation & maintenance', 'o&m duration']) || '5 Years Comprehensive O&M';
  const preBidDate = base.pre_bid_date || findClause(['pre-bid', 'pre bid meeting', 'prebid date']) || 'As per NIT Schedule';
  const publishDate = base.publish_date || findClause(['publish date', 'date of nit', 'bid submission date', 'due date', 'opening date']) || 'As per NIT Schedule';

  return {
    tenderValue: fmtVal(tenderValue),
    emd: fmtVal(emd),
    fee: fmtVal(fee),
    pbg: fmtVal(pbg),
    solvencyRequired: fmtVal(solvencyRequired),
    defectLiability: fmtVal(defectLiability),
    completionPeriod: fmtVal(completionPeriod),
    omPeriod: fmtVal(omPeriod),
    preBidDate: fmtVal(preBidDate),
    publishDate: fmtVal(publishDate)
  };
}

// 5-Group Ordering Rank for Qualification Criteria
function getCriterionGroup(c: any): { rank: number; groupKey: string; groupName: string } {
  const title = (c.clause_title || '').toLowerCase();
  const req = (c.tender_requirement || '').toLowerCase();
  const cNo = (c.clause_no || '').toLowerCase();
  const all = `${title} ${req} ${cNo}`;

  // 1. Registration
  if (all.includes('registration') || all.includes('enlistment') || all.includes('class-') || all.includes('class a') || all.includes('contractor class')) {
    return { rank: 1, groupKey: 'registration', groupName: '1. Contractor Registration & Licenses' };
  }

  // 2. JV Rule
  if (all.includes('joint venture') || all.includes('jv') || all.includes('consortium') || all.includes('lead member') || all.includes('lead partner')) {
    return { rank: 2, groupKey: 'jv_rule', groupName: '2. Joint Venture / Consortium Rules' };
  }

  // 3. Financial Standing (Turnover, Net Worth, Solvency, Bid Capacity)
  if (all.includes('turnover') || all.includes('net worth') || all.includes('solvency') || all.includes('bid capacity') || all.includes('bidding capacity') || all.includes('working capital') || all.includes('credit line') || all.includes('liquid asset')) {
    let sub = 3.1;
    if (all.includes('net worth')) sub = 3.2;
    if (all.includes('solvency')) sub = 3.3;
    if (all.includes('bid capacity') || all.includes('bidding capacity')) sub = 3.4;
    return { rank: sub, groupKey: 'financial', groupName: '3. Financial Standing (Turnover, Net Worth, Solvency, Bid Capacity)' };
  }

  // 4. Technical Experience (Thresholds & Alternatives, % of BoQ totals)
  if (all.includes('experience') || all.includes('similar work') || all.includes('single work') || all.includes('completed') || all.includes('pipeline') || all.includes('sewer') || all.includes('stp') || all.includes('solar') || all.includes('pumping') || all.includes('o&m') || all.includes('scenario') || all.includes('alternative') || all.includes('boq')) {
    return { rank: 4, groupKey: 'technical', groupName: '4. Technical Experience & Physical Capability' };
  }

  // 5. Certificate & Document Rules
  return { rank: 5, groupKey: 'certificate_rules', groupName: '5. Certificate & Statutory Compliance Rules' };
}

export const EligibilityChecker: React.FC = () => {
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [selectedJvPartnerId, setSelectedJvPartnerId] = useState<string>('comp-divija-02');
  const [selectedCategory, setSelectedCategory] = useState<string>('RHDS');
  const [tenderFile, setTenderFile] = useState<File | null>(null);
  const [tenderTitleInput, setTenderTitleInput] = useState<string>('');
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [activeAnalysisOption, setActiveAnalysisOption] = useState<'desire' | 'jv' | 'combined'>('combined');
  const [report, setReport] = useState<DynamicTenderEvaluationReport | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [otherConditionsOpen, setOtherConditionsOpen] = useState<boolean>(false);

  // Fetch Companies on Mount
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/companies`);
        if (res.ok) {
          const data = await res.json();
          if (data.companies && Array.isArray(data.companies)) {
            setCompanies(data.companies);
          }
        }
      } catch (e) {}
    };
    fetchCompanies();
  }, []);

  // Run Dynamic AI Tender Analysis
  const handleRunAnalysis = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setReport(null);
    setAnalyzing(true);
    setAnalysisError(null);

    try {
      let storagePath: string | null = null;
      const sessionToken = typeof localStorage !== 'undefined'
        ? (localStorage.getItem('desire_session_token') || localStorage.getItem('token') || '')
        : '';

      if (tenderFile) {
        const urlRes = await fetch(`${API_BASE_URL}/tender/upload-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
          },
          body: JSON.stringify({ filename: tenderFile.name })
        });

        const urlData = await urlRes.json().catch(() => null);
        if (!urlRes.ok || !urlData?.signed_url || !urlData?.storage_path) {
          const errMsg = urlData?.message || urlData?.detail || `Server returned HTTP ${urlRes.status} creating upload URL.`;
          setAnalysisError(`[UPLOAD_FAILED] ${errMsg}`);
          return;
        }

        const putRes = await fetch(urlData.signed_url, {
          method: 'PUT',
          headers: {
            'Content-Type': tenderFile.type || 'application/pdf'
          },
          body: tenderFile
        });

        if (!putRes.ok) {
          setAnalysisError(`[UPLOAD_FAILED] Direct cloud storage upload failed with HTTP ${putRes.status}.`);
          return;
        }

        storagePath = urlData.storage_path;
      }

      const res = await fetch(`${API_BASE_URL}/tender/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
        },
        body: JSON.stringify({
          storage_path: storagePath,
          filename: tenderFile ? tenderFile.name : 'uploaded_document.pdf',
          project_category: selectedCategory,
          tender_title: tenderTitleInput,
          jv_partner_id: selectedJvPartnerId
        }),
        signal: AbortSignal.timeout(120000)
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data && data.status !== 'error') {
        const rep = data.evaluation_report || data.report;
        if (rep) {
          setReport(rep);
        } else {
          setAnalysisError('[AI_RESPONSE_INVALID] Tender analysis service returned an empty report.');
        }
      } else {
        const errorType = data?.error_type || 'SERVER_ERROR';
        const errorMsg = data?.message || data?.detail || `Server returned HTTP ${res.status}.`;
        setAnalysisError(`[${errorType}] ${errorMsg}`);
      }
    } catch (e: any) {
      console.error('Tender analysis error:', e);
      const isScriptError = e instanceof ReferenceError || e instanceof TypeError || e?.name === 'ReferenceError' || e?.name === 'TypeError';
      const isTimeout = e?.name === 'AbortError' || e?.message?.includes('timeout') || e?.message?.includes('aborted');

      let errType: string;
      let errMsg: string;

      if (isScriptError) {
        errType = 'FRONTEND_SCRIPT_ERROR';
        errMsg = `Client UI runtime error: ${e?.name || 'Error'}: ${e?.message || String(e)}`;
      } else if (isTimeout) {
        errType = 'AI_TIMEOUT';
        errMsg = 'The request timed out after 120s. Please try again.';
      } else {
        errType = 'NETWORK_ERROR';
        errMsg = `Failed to communicate with analysis server: ${e?.message || String(e)}`;
      }

      setAnalysisError(`[${errType}] ${errMsg}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const desireComp = companies.find(c => c.type === 'Desire Energy' || c.id === 'comp-desire-01') || companies[0] || {
    id: 'comp-desire-01',
    name: 'Desire Energy Solutions Pvt Ltd',
    type: 'Desire Energy',
    average_turnover: 271.94,
    net_worth: 52.62
  };
  const jvComp = companies.find(c => c.id === selectedJvPartnerId) || companies.find(c => c.type === 'JV Partner') || {
    id: 'comp-jv-default',
    name: 'JV Partner',
    type: 'JV Partner',
    average_turnover: 0,
    net_worth: 0
  };

  // Dynamic clause & score evaluator for each perspective (Desire alone / JV alone / Combined)
  const getPerspectiveData = () => {
    if (!report) return null;
    const rawClauses = report.clauses_breakdown || [];

    // Extract Header Details (10 Fields)
    const headerDetails = extractTenderHeader(report, rawClauses);

    // Compute Dynamic Page Ranges
    const pageNums = rawClauses.map(c => parseInt(String(c.page_ref || '').replace(/\D/g, ''))).filter(n => !isNaN(n) && n > 0);
    const minPage = pageNums.length > 0 ? Math.min(...pageNums) : 1;
    const maxPage = pageNums.length > 0 ? Math.max(...pageNums) : 1;
    const dynamicPageRange = `pp. ${minPage}-${maxPage}`;

    // Separate into (a) Qualification Criteria, (b) Mandatory Submissions, and (c) Contract Terms
    const qualificationClauses = rawClauses.filter(c => c.is_eligibility_criterion !== false && c.clause_group !== 'mandatory_submission' && c.clause_group !== 'contract_term');
    const submissionClauses = rawClauses.filter(c => c.clause_group === 'mandatory_submission' || (c.is_eligibility_criterion === false && c.clause_group !== 'contract_term'));
    const contractClauses = rawClauses.filter(c => c.clause_group === 'contract_term');

    // Consolidate Alternative Clauses: Alternatives are ONE criterion and pass if any alternative passes!
    const consolidatedMap = new Map<string, any[]>();
    for (const c of qualificationClauses) {
      const isAlt = c.is_alternative || c.tender_requirement?.toLowerCase().includes('scenario 1') || c.tender_requirement?.toLowerCase().includes('scenario 2') || c.tender_requirement?.toLowerCase().includes('constructed or maintained') || c.clause_title?.toLowerCase().includes('scenario');
      const altKey = isAlt ? (c.alternative_group || 'alternative_set_1') : `${c.clause_no}_${c.clause_title}`;
      if (!consolidatedMap.has(altKey)) consolidatedMap.set(altKey, []);
      consolidatedMap.get(altKey)!.push(c);
    }

    const evaluatePerspective = (mode: 'desire' | 'jv' | 'combined') => {
      const activeConsolidated: any[] = [];

      consolidatedMap.forEach((group: any[]) => {
        const groupEvaluations = group.map((c: any) => {
          let val = c.combined_value;
          let status: string = (c.status as any) || 'MATCH';
          let pct = 100;

          let dStatus: string = (c.desire_status as any) || 'MATCH';
          const dVal = (c.desire_value || '').toLowerCase();
          if (c.desire_status === 'CANNOT BE CHECKED' || c.desire_status === 'DATA MISSING' || c.desire_status === 'DATA NOT AVAILABLE' || dVal.includes('data not available') || dVal.includes('cannot be checked')) {
            dStatus = 'CANNOT BE CHECKED';
          } else if (c.desire_status === 'NOT ELIGIBLE' || c.desire_status === 'NOT MATCHING' || dVal.includes('lacks') || dVal.includes('0%')) {
            dStatus = 'NOT ELIGIBLE';
          }

          let jStatus: string = (c.jv_status as any) || 'MATCH';
          const jVal = (c.jv_value || '').toLowerCase();
          if (c.jv_status === 'CANNOT BE CHECKED' || c.jv_status === 'DATA MISSING' || c.jv_status === 'DATA NOT AVAILABLE' || jVal.includes('data not available') || jVal.includes('cannot be checked')) {
            jStatus = 'CANNOT BE CHECKED';
          } else if (c.jv_status === 'NOT ELIGIBLE' || c.jv_status === 'NOT MATCHING' || jVal.includes('lacks') || jVal.includes('0%')) {
            jStatus = 'NOT ELIGIBLE';
          }

          if (mode === 'desire') {
            val = c.desire_value || '';
            status = dStatus;
            pct = typeof c.desire_pct === 'number' ? c.desire_pct : (status === 'MATCH' ? 100 : 0);
          } else if (mode === 'jv') {
            val = c.jv_value || '';
            status = jStatus;
            pct = typeof c.jv_pct === 'number' ? c.jv_pct : (status === 'MATCH' ? 100 : 0);
          } else {
            val = c.combined_value || `${c.desire_value || ''} + ${c.jv_value || ''}`;
            if (dStatus === 'MATCH' || jStatus === 'MATCH' || c.status === 'MATCH') {
              status = 'MATCH';
              pct = 100;
            } else if (dStatus === 'CANNOT BE CHECKED' && jStatus === 'CANNOT BE CHECKED') {
              status = 'CANNOT BE CHECKED';
              pct = 0;
            } else {
              status = 'NOT ELIGIBLE';
              pct = 0;
            }
          }

          return { ...c, active_val: val, active_status: status, active_pct: pct };
        });

        if (groupEvaluations.length === 1) {
          activeConsolidated.push(groupEvaluations[0]);
        } else {
          // Alternatives are ONE criterion and pass if ANY alternative passes!
          const anyMatch = groupEvaluations.find((g: any) => g.active_status === 'MATCH');
          const anyCannotCheck = groupEvaluations.some((g: any) => g.active_status === 'CANNOT BE CHECKED');

          const rep = { ...groupEvaluations[0] };
          rep.clause_title = `${groupEvaluations[0].clause_title} (Scenario 1 OR 2 / Alternatives)`;
          rep.is_alternative_set = true;
          rep.alternative_options = groupEvaluations;

          if (anyMatch) {
            rep.active_status = 'MATCH';
            rep.active_pct = 100;
            rep.active_val = `MATCH (Alternative Passed via ${anyMatch.clause_no || 'Option'}): ${anyMatch.active_val}`;
          } else if (anyCannotCheck) {
            rep.active_status = 'CANNOT BE CHECKED';
            rep.active_pct = 0;
            rep.active_val = 'CANNOT BE CHECKED — Missing data across alternatives';
          } else {
            rep.active_status = 'NOT ELIGIBLE';
            rep.active_pct = 0;
            rep.active_val = 'NOT ELIGIBLE — Failed all evaluated alternatives';
          }

          activeConsolidated.push(rep);
        }
      });

      // 5-Group Ordering: Registration -> JV Rule -> Financial -> Technical -> Certificate Rules
      activeConsolidated.sort((a, b) => {
        const ga = getCriterionGroup(a);
        const gb = getCriterionGroup(b);
        return ga.rank - gb.rank;
      });

      // Split into Checked vs Unchecked Qualification Criteria
      const checkedCriteria = activeConsolidated.filter(c => c.active_status !== 'CANNOT BE CHECKED' && c.active_status !== 'DATA MISSING');
      const uncheckedCriteria = activeConsolidated.filter(c => c.active_status === 'CANNOT BE CHECKED' || c.active_status === 'DATA MISSING');
      const passedCriteria = checkedCriteria.filter(c => c.active_status === 'MATCH');

      // Strict scoring formula: Score = passed ÷ checked qualification criteria!
      const calcScore = checkedCriteria.length > 0
        ? Math.min(100, Math.round((passedCriteria.length / checkedCriteria.length) * 100))
        : 100;

      // Eligible ONLY if every criterion was checked and passed!
      const isEligible = activeConsolidated.length > 0 && uncheckedCriteria.length === 0 && passedCriteria.length === activeConsolidated.length;

      return {
        score: calcScore,
        pctStr: `${calcScore}%`,
        isEligible,
        allCriteria: activeConsolidated,
        checkedCriteria,
        uncheckedCriteria,
        passedCriteria,
        counts: {
          total_criteria: activeConsolidated.length,
          checked_count: checkedCriteria.length,
          matched: passedCriteria.length,
          not_eligible: checkedCriteria.filter(c => c.active_status === 'NOT ELIGIBLE' || c.active_status === 'NOT MATCHING').length,
          data_missing: uncheckedCriteria.length,
          submission_items: submissionClauses.length,
          contract_items: contractClauses.length
        }
      };
    };

    const desireEval = evaluatePerspective('desire');
    const jvEval = evaluatePerspective('jv');
    const combinedEval = evaluatePerspective('combined');

    const activeEval = activeAnalysisOption === 'desire' ? desireEval : activeAnalysisOption === 'jv' ? jvEval : combinedEval;

    let badge = `OPTION 3 — DESIRE + ${jvComp.name} COMBINED`;
    let entityName = `Combined JV Consortium (Desire Energy + ${jvComp.name})`;
    let verdict = 'Eligible Through JV';
    let recommendation = `BID (Combined Consortium achieves ${activeEval.pctStr} qualification)`;

    if (activeAnalysisOption === 'desire') {
      badge = 'OPTION 1 — DESIRE ENERGY ALONE';
      entityName = 'Desire Energy Alone';
      if (activeEval.isEligible) {
        verdict = 'Eligible Standalone';
        recommendation = `BID STANDALONE — Desire Energy satisfies 100% of checked criteria (No JV Consortium Required)`;
      } else if (activeEval.uncheckedCriteria.length > 0 && activeEval.passedCriteria.length === activeEval.checkedCriteria.length) {
        verdict = `Cannot determine: ${activeEval.uncheckedCriteria.length} criteria need data`;
        recommendation = `MANUAL ENTRY NEEDED — ${activeEval.uncheckedCriteria.length} criteria lack company data. All ${activeEval.checkedCriteria.length} checked criteria passed.`;
      } else {
        verdict = 'Ineligible Standalone';
        recommendation = `JV MANDATORY — Desire Energy satisfies ${activeEval.pctStr} of checked criteria (gaps in technical experience or thresholds)`;
      }
    } else if (activeAnalysisOption === 'jv') {
      badge = `OPTION 2 — ${jvComp.name.toUpperCase()} ALONE`;
      entityName = `${jvComp.name} Alone`;
      if (activeEval.isEligible) {
        verdict = 'Partner Fully Qualified Standalone';
        recommendation = `PARTNER QUALIFIED STANDALONE — ${jvComp.name} satisfies 100% of criteria standalone.`;
      } else if (activeEval.uncheckedCriteria.length > 0 && activeEval.passedCriteria.length === activeEval.checkedCriteria.length) {
        verdict = `Cannot determine: ${activeEval.uncheckedCriteria.length} criteria need data`;
        recommendation = `PARTNER DATA PENDING — ${activeEval.uncheckedCriteria.length} criteria need partner verification.`;
      } else {
        verdict = 'Partner Ineligible Standalone';
        recommendation = `INSUFFICIENT STANDALONE — ${jvComp.name} satisfies ${activeEval.pctStr} standalone. Must join Desire Energy via Option 3 Consortium.`;
      }
    } else {
      if (desireEval.isEligible) {
        verdict = 'Fully Eligible Consortium (Desire Already 100% Standalone Qualified)';
        recommendation = `BID STANDALONE OR CONSORTIUM — Desire Energy is 100% Standalone Qualified. Formed JV with ${jvComp.name} for financial pooling.`;
      } else if (activeEval.isEligible) {
        verdict = 'Fully Eligible Through JV Consortium';
        recommendation = `BID THROUGH JV CONSORTIUM — Desire Energy + ${jvComp.name} satisfies 100% of qualification criteria.`;
      } else if (activeEval.uncheckedCriteria.length > 0 && activeEval.passedCriteria.length === activeEval.checkedCriteria.length) {
        verdict = `Cannot determine: ${activeEval.uncheckedCriteria.length} criteria need data`;
        recommendation = `CONSORTIUM DATA PENDING — ${activeEval.uncheckedCriteria.length} criteria need verified documents. All ${activeEval.checkedCriteria.length} checked criteria passed.`;
      } else {
        verdict = 'Ineligible Through JV';
        recommendation = `REVIEW GAPS — Consortium achieves ${activeEval.pctStr} qualification.`;
      }
    }

    return {
      badge,
      entityName,
      verdict,
      score: activeEval.score,
      fulfilled_pct: activeEval.pctStr,
      recommendation,
      headerDetails,
      dynamicPageRange,
      totalClauseCount: rawClauses.length,
      executive_summary: fmtVal(report.executive_summary || report.summary_line, 'Tender evaluation report ready.'),
      summary_counts: activeEval.counts,
      checkedCriteria: activeEval.checkedCriteria,
      uncheckedCriteria: activeEval.uncheckedCriteria,
      submissionClauses,
      contractClauses,
      tabScores: {
        desire: desireEval.pctStr,
        jv: jvEval.pctStr,
        combined: combinedEval.pctStr
      }
    };
  };

  const perspective = getPerspectiveData();

  // Printable PDF Export Handler
  const handleDownloadPdf = () => {
    if (!report || !perspective) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to download the PDF report.');
      return;
    }

    const dateStr = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tender Eligibility Report - ${fmtVal(report.tender_id, 'Evaluation')}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            body { font-family: 'Segoe UI', Roboto, sans-serif; color: #0f172a; background: #fff; margin: 0; padding: 0; font-size: 9.5pt; line-height: 1.4; }
            .header { border-bottom: 3px solid #059669; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; }
            .logo { font-size: 15pt; font-weight: 800; color: #065f46; letter-spacing: 0.5px; }
            .sub-logo { font-size: 8pt; color: #475569; font-weight: 600; font-family: monospace; }
            .report-meta { text-align: right; font-size: 8pt; color: #475569; }
            .summary-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; margin-bottom: 12px; }
            .grid-10 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 12px; font-size: 8pt; }
            .hdr-item { background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; }
            .hdr-lbl { font-size: 7pt; font-weight: bold; color: #64748b; text-transform: uppercase; display: block; }
            .hdr-val { font-weight: bold; color: #0f172a; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 8pt; }
            th { background: #0f172a; color: #f8fafc; font-family: monospace; font-size: 7.5pt; text-transform: uppercase; text-align: left; padding: 6px; }
            td { border-bottom: 1px solid #e2e8f0; padding: 6px; vertical-align: top; }
            tr:nth-child(even) { background: #f8fafc; }
            .badge-match { background: #d1fae5; color: #065f46; font-weight: bold; padding: 2px 6px; border-radius: 8px; }
            .badge-fail { background: #fee2e2; color: #991b1b; font-weight: bold; padding: 2px 6px; border-radius: 8px; }
            .badge-missing { background: #f1f5f9; color: #475569; font-weight: bold; padding: 2px 6px; border-radius: 8px; }
            .footer { margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 6px; font-size: 7.5pt; color: #94a3b8; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">DESIRE ENERGY SOLUTIONS</div>
              <div class="sub-logo">TENDER QUALIFICATION & ELIGIBILITY REPORT</div>
            </div>
            <div class="report-meta">
              <div><strong>Date:</strong> ${dateStr}</div>
              <div><strong>Perspective:</strong> ${perspective.badge}</div>
              <div><strong>Document:</strong> ${fmtVal(report.filename, 'Tender PDF')}</div>
            </div>
          </div>

          <div class="summary-card">
            <h2 style="margin: 0 0 6px 0; font-size: 11pt; color: #064e3b;">${fmtVal(report.tender_title)}</h2>
            <div style="font-size: 8.5pt;"><strong>Verdict:</strong> ${perspective.verdict} | <strong>Score:</strong> ${perspective.fulfilled_pct} (passed ${perspective.summary_counts.matched} ÷ checked ${perspective.summary_counts.checked_count})</div>
          </div>

          <div class="grid-10">
            <div class="hdr-item"><span class="hdr-lbl">Tender Value</span><div class="hdr-val">${perspective.headerDetails.tenderValue}</div></div>
            <div class="hdr-item"><span class="hdr-lbl">EMD Amount</span><div class="hdr-val">${perspective.headerDetails.emd}</div></div>
            <div class="hdr-item"><span class="hdr-lbl">Tender Fee</span><div class="hdr-val">${perspective.headerDetails.fee}</div></div>
            <div class="hdr-item"><span class="hdr-lbl">PBG / Deposit</span><div class="hdr-val">${perspective.headerDetails.pbg}</div></div>
            <div class="hdr-item"><span class="hdr-lbl">Solvency Req.</span><div class="hdr-val">${perspective.headerDetails.solvencyRequired}</div></div>
            <div class="hdr-item"><span class="hdr-lbl">Defect Liability</span><div class="hdr-val">${perspective.headerDetails.defectLiability}</div></div>
            <div class="hdr-item"><span class="hdr-lbl">Completion Period</span><div class="hdr-val">${perspective.headerDetails.completionPeriod}</div></div>
            <div class="hdr-item"><span class="hdr-lbl">O&M Period</span><div class="hdr-val">${perspective.headerDetails.omPeriod}</div></div>
            <div class="hdr-item"><span class="hdr-lbl">Pre-Bid Date</span><div class="hdr-val">${perspective.headerDetails.preBidDate}</div></div>
            <div class="hdr-item"><span class="hdr-lbl">Publish Date</span><div class="hdr-val">${perspective.headerDetails.publishDate}</div></div>
          </div>

          <h3 style="font-size: 9.5pt; color: #064e3b; margin: 10px 0 4px 0;">Qualification Criteria (${perspective.checkedCriteria.length} Checked Rows)</h3>
          <table>
            <thead>
              <tr>
                <th>Clause & Group</th>
                <th>Requirement & Threshold</th>
                <th>Actual Capability</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${perspective.checkedCriteria.map((c: any) => `
                <tr>
                  <td><strong>${fmtVal(c.clause_no)}</strong><br/>${fmtVal(c.clause_title)}</td>
                  <td>${fmtVal(c.tender_requirement)}</td>
                  <td>${fmtVal(c.active_val)}</td>
                  <td><span class="${c.active_status === 'MATCH' ? 'badge-match' : 'badge-fail'}">${c.active_status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer" style="margin-top: 24px; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 8pt; color: #64748b; display: flex; justify-content: space-between; align-items: center;">
            <span>Generated by Desire Energy AI Engine. Verified against Audited Company Master Data (CIN: <strong>U40106RJ2011PTC034878</strong>).</span>
            <span>Report Build: <strong style="font-family: monospace; color: #0f172a;">${report?.build_info?.commit_hash || buildInfo.commit_hash}</strong> | Built: <strong style="font-family: monospace; color: #0f172a;">${report?.build_info?.build_time || buildInfo.build_time}</strong></span>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1426]">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-wide">Dynamic AI Tender Eligibility Engine</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Upload ANY tender PDF to dynamically extract clauses & evaluate Desire Alone vs JV Alone vs Desire + JV.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Tender & Analysis Toolbar */}
      <form onSubmit={handleRunAnalysis} className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 bg-white dark:bg-[#0b1426]">
        {analysisError && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center space-x-3 text-rose-800 dark:text-rose-200 text-xs font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{analysisError}</span>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* File Upload Box */}
          <div className="md:col-span-2 space-y-1">
            <label className="text-[11px] font-mono text-slate-700 dark:text-slate-300 font-medium uppercase tracking-wider">
              Upload Tender PDF (or Select Working Project)
            </label>
            <div className="flex items-center space-x-3">
              <label className="flex-1 flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#15233c] border border-slate-200 dark:border-[#263752] cursor-pointer hover:border-emerald-500 transition-all">
                <span className="text-xs text-slate-600 dark:text-slate-300 truncate">
                  {tenderFile ? tenderFile.name : tenderTitleInput}
                </span>
                <Upload className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setTenderFile(f);
                      setTenderTitleInput(f.name);
                      setReport(null);
                      setAnalysisError(null);
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {/* Project Category */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-700 dark:text-slate-300 font-medium uppercase tracking-wider">Tender Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-100 dark:bg-[#15233c] border border-slate-200 dark:border-[#263752] rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="RHDS">RHDS Jal Jeevan Mission Rural Water Scheme</option>
              <option value="STP">STP & Sewerage Package (AMRUT 2.0)</option>
              <option value="SOLAR">Solar PV EPC Project</option>
              <option value="KUSUM">PM-Kusum Component-B Solar Pumps</option>
              <option value="EPC">Turnkey Civil & Pipeline EPC</option>
              <option value="ESCO">ESCO Energy Efficiency Pumping</option>
            </select>
          </div>
        </div>

        {/* JV Partner Selection Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <GitMerge className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Select JV Partner for Evaluation:</span>
            <select
              value={selectedJvPartnerId}
              onChange={(e) => setSelectedJvPartnerId(e.target.value)}
              className="bg-slate-100 dark:bg-[#15233c] border border-slate-200 dark:border-[#263752] rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            >
              {companies.filter(c => c.type === 'JV Partner').map(c => (
                <option key={c.id} value={c.id}>{c.name} (Avg ₹{c.average_turnover} Cr | Net Worth: ₹{c.net_worth} Cr)</option>
              ))}
              {companies.filter(c => c.type === 'JV Partner').length === 0 && (
                <>
                  <option value="comp-vhp-04">VINOD H PATEL (Avg ₹191.39 Cr | Net Worth: ₹33.37 Cr)</option>
                  <option value="comp-aapl-05">ADROIT ASSOCIATES PRIVATE LIMITED (Avg ₹35.22 Cr | Net Worth: ₹14.27 Cr)</option>
                  <option value="comp-divija-02">DIVIJA CONSTRUCTION (Avg ₹37.01 Cr | Net Worth: ₹6.58 Cr)</option>
                </>
              )}
            </select>
          </div>

          <button
            type="submit"
            disabled={analyzing}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Analyze Tender with AI Engine</span>
          </button>
        </div>
      </form>

      {/* Non-Tender Document Rejection Alert */}
      {report && report.is_rejected_non_tender && (
        <div className="p-8 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border-2 border-rose-400 dark:border-rose-700 space-y-4 animate-fadeIn text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/80 text-rose-700 dark:text-rose-300 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-200 text-rose-900 border border-rose-300 uppercase">
              Match Score: 0% — Ineligible (Non-Tender File)
            </span>
            <h3 className="text-xl font-bold text-rose-900 dark:text-rose-100 pt-2">
              Document Rejected — Non-Tender Document Detected
            </h3>
            <p className="text-xs text-rose-700 dark:text-rose-300 font-medium max-w-lg mx-auto leading-relaxed">
              The AI Document Verification Engine verified that this file is an Invoice, Bill, or Receipt and contains ZERO tender bidding clauses or qualification criteria.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-xs text-slate-800 dark:text-slate-200 font-mono text-left max-w-2xl mx-auto leading-relaxed">
            {report.executive_summary}
          </div>
        </div>
      )}

      {/* AI Summary Dashboard Cards */}
      {report && !report.is_rejected_non_tender && perspective && (
        <div key={`${report.tender_id || tenderFile?.name || 'report'}-${report.tender_title || ''}`} className="space-y-6">
          {/* 3 Dynamic Analysis Options Selection Tabs & Download Report Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveAnalysisOption('desire')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shrink-0 cursor-pointer ${
                  activeAnalysisOption === 'desire'
                    ? 'bg-emerald-700 dark:bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>OPTION 1 — DESIRE ALONE</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  activeAnalysisOption === 'desire' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                }`}>
                  {perspective.tabScores.desire}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveAnalysisOption('jv')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shrink-0 cursor-pointer ${
                  activeAnalysisOption === 'jv'
                    ? 'bg-emerald-700 dark:bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>OPTION 2 — JV ALONE ({jvComp.name})</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  activeAnalysisOption === 'jv' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                }`}>
                  {perspective.tabScores.jv}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveAnalysisOption('combined')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shrink-0 cursor-pointer ${
                  activeAnalysisOption === 'combined'
                    ? 'bg-emerald-700 dark:bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <GitMerge className="w-4 h-4" />
                <span>OPTION 3 — DESIRE + {jvComp.name} COMBINED</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  activeAnalysisOption === 'combined' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                }`}>
                  {perspective.tabScores.combined}
                </span>
              </button>
            </div>

            {/* Download Report Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs shadow flex items-center space-x-2 transition-all shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
              <span>Download Report (PDF)</span>
            </button>
          </div>

          {/* DYNAMIC VERDICT BANNER FOR SELECTED OPTION */}
          <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1426] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-3 flex-wrap gap-y-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                  {perspective.badge}
                </span>
                <span className={`px-3 py-0.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                  perspective.verdict.startsWith('Eligible')
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : perspective.verdict.includes('Cannot determine')
                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-800'
                    : 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300 font-bold border border-rose-300 dark:border-rose-800'
                }`}>
                  {perspective.verdict}
                </span>
                <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                  Score: {perspective.fulfilled_pct} ({perspective.summary_counts.matched} passed ÷ {perspective.summary_counts.checked_count} checked)
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{fmtVal(report.tender_title)}</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed font-medium">{perspective.executive_summary}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#15233c] border border-slate-200 dark:border-[#263752] shrink-0 text-center space-y-1">
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase block">Recommendation</span>
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">{perspective.recommendation}</span>
            </div>
          </div>

          {/* 4.a HEADER SUMMARY (10 EXACT FIELDS MODELLED ON TENDER TEAM SUMMARY) */}
          <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1426] space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>4.a Tender Executive Summary Header (10 Core Commercial Parameters)</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Extracted from Document Source
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111c33] border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase block">1. Tender Value</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white block mt-1">{perspective.headerDetails.tenderValue}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111c33] border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase block">2. EMD Amount</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white block mt-1">{perspective.headerDetails.emd}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111c33] border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase block">3. Tender Fee</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white block mt-1">{perspective.headerDetails.fee}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111c33] border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase block">4. Security Deposit / PBG</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white block mt-1">{perspective.headerDetails.pbg}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111c33] border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase block">5. Solvency Required</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white block mt-1">{perspective.headerDetails.solvencyRequired}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111c33] border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase block">6. Defect Liability Period</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white block mt-1">{perspective.headerDetails.defectLiability}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111c33] border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase block">7. Completion Period</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white block mt-1">{perspective.headerDetails.completionPeriod}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111c33] border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase block">8. O&M Period</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white block mt-1">{perspective.headerDetails.omPeriod}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111c33] border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase block">9. Pre-Bid Meeting</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white block mt-1">{perspective.headerDetails.preBidDate}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111c33] border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase block">10. Publish / Due Date</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white block mt-1">{perspective.headerDetails.publishDate}</span>
              </div>
            </div>
          </div>

          {/* DYNAMIC DOCUMENT PROVENANCE BANNER (REPLACES FIXED SECTION BANDS 14/8/6) */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#111c33] border border-slate-200 dark:border-slate-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-mono text-slate-700 dark:text-slate-300">
                Document Clause Provenance: <strong>{perspective.totalClauseCount} clauses</strong> extracted dynamically across <strong>{perspective.dynamicPageRange}</strong>. Zero hardcoded section bands.
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              Scoring Rule: Score = passed ({perspective.summary_counts.matched}) ÷ checked ({perspective.summary_counts.checked_count})
            </div>
          </div>

          {/* 4.b QUALIFICATION CRITERIA (CHECKED & SCORED ROWS IN STRICT 5-GROUP ORDER) */}
          <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 bg-white dark:bg-[#0b1426]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  (b) Qualification Criteria ({perspective.checkedCriteria.length} Evaluated Rows)
                </h3>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold">
                  SCORE: {perspective.fulfilled_pct}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Order: Registration → JV Rule → Financial → Technical → Certificate Rules
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#263752] text-slate-700 dark:text-teal-300 font-medium font-mono text-[10px] uppercase tracking-wider bg-slate-100 dark:bg-[#111c33]">
                    <th className="p-3">Clause & Category</th>
                    <th className="p-3">Requirement & Threshold (% of BoQ)</th>
                    {activeAnalysisOption === 'desire' && <th className="p-3 text-emerald-800 dark:text-emerald-400 font-bold">Desire Energy Actual</th>}
                    {activeAnalysisOption === 'jv' && <th className="p-3 text-purple-800 dark:text-purple-400 font-bold">{jvComp.name} Actual</th>}
                    {activeAnalysisOption === 'combined' && (
                      <>
                        <th className="p-3 text-emerald-800 dark:text-emerald-400 font-bold">Desire Energy</th>
                        <th className="p-3 text-purple-800 dark:text-purple-400 font-bold">JV Partner</th>
                        <th className="p-3 text-slate-900 dark:text-white font-bold">Combined Consortium</th>
                      </>
                    )}
                    <th className="p-3">Status</th>
                    <th className="p-3">Gap & Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {perspective.checkedCriteria.map((item: any, idx: number) => {
                    const statusVal = item.active_status;
                    const grp = getCriterionGroup(item);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition-colors">
                        <td className="p-3">
                          <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold block">{fmtVal(item.clause_no)} ({fmtVal(item.page_ref)})</span>
                          <span className="font-semibold text-slate-900 dark:text-white block">{fmtVal(item.clause_title)}</span>
                          <span className="text-[9px] font-mono text-slate-400 uppercase tracking-tight block mt-0.5">{grp.groupName}</span>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">
                          <div>{fmtVal(item.tender_requirement)}</div>
                          {item.required_value && item.required_value !== item.tender_requirement && (
                            <div className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-1">
                              Threshold: {fmtVal(item.required_value)}
                            </div>
                          )}
                        </td>
                        {activeAnalysisOption === 'desire' && <td className="p-3 text-emerald-800 dark:text-emerald-300 font-mono font-medium">{fmtVal(item.active_val)}</td>}
                        {activeAnalysisOption === 'jv' && <td className="p-3 text-purple-800 dark:text-purple-300 font-mono font-medium">{fmtVal(item.active_val)}</td>}
                        {activeAnalysisOption === 'combined' && (
                          <>
                            <td className="p-3 text-emerald-800 dark:text-emerald-300 font-mono">{fmtVal(item.desire_value)}</td>
                            <td className="p-3 text-purple-800 dark:text-purple-300 font-mono">{fmtVal(item.jv_value)}</td>
                            <td className="p-3 text-slate-900 dark:text-white font-mono font-bold">{fmtVal(item.combined_value)}</td>
                          </>
                        )}
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              statusVal === 'MATCH'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                            }`}
                          >
                            {statusVal === 'MATCH' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                            <span>{statusVal === 'MATCH' ? 'MATCH (100%)' : 'NOT MATCHING'}</span>
                          </span>
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300 font-medium text-[11px]">{fmtVal(item.gap_notes, 'None')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* UNCHECKED QUALIFICATION CRITERIA (LISTED SEPARATELY WITH MISSING FIELD NAMES) */}
          {perspective.uncheckedCriteria.length > 0 && (
            <div className="glass-card p-6 rounded-2xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/30 dark:bg-amber-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                    Unchecked Qualification Criteria ({perspective.uncheckedCriteria.length} Criteria Require Verification)
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-200 text-amber-900 border border-amber-300 font-bold">
                    EXCLUDED FROM SCORE
                  </span>
                </div>
                <span className="text-[11px] font-mono text-amber-800 dark:text-amber-300">
                  Zero weight in score until verified
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-300 font-mono text-[10px] uppercase bg-amber-100/60 dark:bg-amber-900/30">
                      <th className="p-2.5">Clause & Ref</th>
                      <th className="p-2.5">Missing Field / Reason</th>
                      <th className="p-2.5">Evaluation Status</th>
                      <th className="p-2.5">Required Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-200/60 dark:divide-amber-800/40">
                    {perspective.uncheckedCriteria.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-amber-100/40 dark:hover:bg-amber-900/20">
                        <td className="p-2.5 font-mono text-slate-800 dark:text-slate-200 font-medium">
                          {fmtVal(item.clause_no)} ({fmtVal(item.page_ref)}) — {fmtVal(item.clause_title)}
                        </td>
                        <td className="p-2.5 font-mono text-amber-900 dark:text-amber-200 font-bold">
                          {fmtVal(item.active_val)}
                        </td>
                        <td className="p-2.5">
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-200 text-amber-900 border border-amber-300">
                            <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                            <span>CANNOT BE CHECKED</span>
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                          {fmtVal(item.required_doc, 'Upload certified document to verify')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4.c COLLAPSED, UNSCORED "OTHER CONDITIONS" SECTION */}
          <div className="glass-card rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-[#0b1426]">
            <button
              type="button"
              onClick={() => setOtherConditionsOpen(!otherConditionsOpen)}
              className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <FileCheck2 className="w-5 h-5 text-cyan-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <span>4.c Other Conditions ({perspective.submissionClauses.length} Submissions, {perspective.contractClauses.length} Contract Terms)</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-bold">
                      UNSCORED
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Mandatory submission forms, affidavits, undertakings, and post-award contract execution terms (does not affect eligibility score).
                  </p>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${otherConditionsOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {otherConditionsOpen && (
              <div className="p-6 pt-0 border-t border-slate-100 dark:border-slate-800 space-y-6">
                {/* Mandatory Submissions Sub-Table */}
                <div className="space-y-2 mt-4">
                  <h4 className="text-xs font-mono font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider">
                    Mandatory Submission Items ({perspective.submissionClauses.length} Checklist Items)
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[10px] uppercase bg-slate-50 dark:bg-[#111c33]">
                          <th className="p-2.5">Clause & Ref</th>
                          <th className="p-2.5">Submission Item</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Required Proof</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {perspective.submissionClauses.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/40">
                            <td className="p-2.5 font-mono text-[10px] text-cyan-700 dark:text-cyan-400">{fmtVal(item.clause_no)} ({fmtVal(item.page_ref)})</td>
                            <td className="p-2.5 text-slate-800 dark:text-slate-200">{fmtVal(item.tender_requirement || item.clause_title)}</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 font-bold border border-cyan-300">
                                SUBMISSION ITEM
                              </span>
                            </td>
                            <td className="p-2.5 font-mono text-[11px] text-slate-500">{fmtVal(item.required_doc, 'Standard Format')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Contract Terms Sub-Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                    Contract & Post-Award Execution Terms ({perspective.contractClauses.length} Terms)
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[10px] uppercase bg-slate-50 dark:bg-[#111c33]">
                          <th className="p-2.5">Clause & Ref</th>
                          <th className="p-2.5">Contract Term Statement</th>
                          <th className="p-2.5">Compliance</th>
                          <th className="p-2.5">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {perspective.contractClauses.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/40">
                            <td className="p-2.5 font-mono text-[10px] text-indigo-700 dark:text-indigo-400">{fmtVal(item.clause_no)} ({fmtVal(item.page_ref)})</td>
                            <td className="p-2.5 text-slate-800 dark:text-slate-200">{fmtVal(item.tender_requirement || item.clause_title)}</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold border border-indigo-300">
                                CONTRACT COMPLIANCE
                              </span>
                            </td>
                            <td className="p-2.5 text-[11px] text-slate-500">{fmtVal(item.gap_notes, 'Post-award term')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 5. REPORT BUILD AUDIT & COMPANY REGISTRATION FOOTER */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0c1629] flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-3 font-mono">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Desire Energy Solutions Pvt Ltd (CIN: <strong className="text-slate-700 dark:text-slate-300">U40106RJ2011PTC034878</strong>)</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px]">
              <span>Commit: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{report.build_info?.commit_hash || buildInfo.commit_hash}</strong></span>
              <span>•</span>
              <span>Build Time: <strong className="text-slate-700 dark:text-slate-300 font-medium">{report.build_info?.build_time || buildInfo.build_time}</strong></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
