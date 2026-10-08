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
  ShieldCheck,
  FileSpreadsheet,
  Download,
  Calculator
} from 'lucide-react';
import { CompanyRecord } from './CompanyDetailsView';

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
  clause_category?: 'eligibility' | 'submission';
}

export interface DynamicTenderEvaluationReport {
  tender_id: string;
  tender_title: string;
  project_category: string;
  filename: string;
  verdict: 'Eligible' | 'Conditional' | 'Ineligible';
  eligibility_score: number;
  overall_health: 'Green' | 'Yellow' | 'Red';
  is_rejected_non_tender?: boolean;
  recommendation: string;
  executive_summary: string;
  summary_line?: string;
  score_formula?: any;
  desire_alone: { score: number; status: string; fulfilled_pct: string };
  jv_alone: { score: number; status: string; fulfilled_pct: string };
  combined_jv: { score: number; status: string; fulfilled_pct: string };
  clauses_breakdown: ClauseBreakdownItem[];
  jv_rules_audit: { rule: string; requirement: string; actual: string; status: string }[];
  summary_counts: {
    total_criteria: number;
    matched: number;
    partial: number;
    not_matching: number;
    data_missing: number;
    submission_items_count?: number;
  };
}

export const EligibilityChecker: React.FC = () => {
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [selectedJvPartnerId, setSelectedJvPartnerId] = useState<string>('comp-divija-02');
  const [selectedCategory, setSelectedCategory] = useState<string>('RHDS');
  const [tenderFile, setTenderFile] = useState<File | null>(null);
  const [tenderTitleInput, setTenderTitleInput] = useState<string>('');
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [activeAnalysisOption, setActiveAnalysisOption] = useState<'desire' | 'jv' | 'combined'>('combined');
  const [report, setReport] = useState<DynamicTenderEvaluationReport | null>({
    tender_id: 'BANAS-2026-NIT-004',
    tender_title: 'EPC Contract for Tapping Branch Pipeline from Changa MPS to fill 27 Ponds in Kankrej Taluka',
    project_category: 'RHDS',
    filename: 'Banaskantha_Kankrej_Water_Supply_Scheme.pdf',
    verdict: 'Eligible',
    eligibility_score: 100,
    overall_health: 'Green',
    recommendation: 'Desire Energy qualifies standalone (100%). A JV is optional.',
    executive_summary: 'Desire Energy satisfies 100% of financial, technical, and regulatory requirements for standalone bidding.',
    desire_alone: { score: 100, status: 'Eligible Standalone', fulfilled_pct: '100%' },
    jv_alone: { score: 100, status: 'Partner Standalone Qualified', fulfilled_pct: '100%' },
    combined_jv: { score: 100, status: 'Fully Qualified Consortium', fulfilled_pct: '100%' },
    summary_counts: { total_criteria: 5, matched: 5, partial: 0, not_matching: 0, data_missing: 0 },
    jv_rules_audit: [],
    clauses_breakdown: [
      {
        clause_no: 'Clause 1.1',
        clause_title: 'Average Annual Financial Turnover',
        requirement_type: 'Financial',
        tender_requirement: 'Minimum Average Annual Financial Turnover of Rs 87.45 Cr in last 3 financial years.',
        required_value: 'Rs 87.45 Cr',
        desire_value: 'Required: Rs 87.45 Cr | Desire actual: Rs 290.27 Cr -> 331.9% raw (100% capped)',
        desire_status: 'MATCH',
        desire_pct: 100,
        jv_value: 'Required: Rs 87.45 Cr | VINOD H PATEL actual: Rs 191.39 Cr -> 218.9% raw (100% capped)',
        jv_status: 'MATCH',
        jv_pct: 100,
        combined_value: 'Pooled: Rs 481.66 Cr -> 550.8% raw (100% capped)',
        combined_pct: 100,
        applicable_jv_rule: 'Lead Member / JV Pooling',
        status: 'MATCH',
        fulfilled_pct: '100%',
        gap_notes: 'Desire satisfies standalone',
        required_doc: 'Audited Financial Statements / CA Certificate',
        page_ref: 'Section III - Qualification Criteria, Page 14'
      },
      {
        clause_no: 'Clause 1.2',
        clause_title: 'Net Worth Requirement',
        requirement_type: 'Financial',
        tender_requirement: 'Minimum Net Worth of Rs 15.00 Cr as on last financial year.',
        required_value: 'Rs 15.00 Cr',
        desire_value: 'Required: Rs 15 Cr | Desire actual: Rs 52.62 Cr -> 350.8% raw (100% capped)',
        desire_status: 'MATCH',
        desire_pct: 100,
        jv_value: 'Required: Rs 15 Cr | VINOD H PATEL actual: Rs 33.37 Cr -> 222.5% raw (100% capped)',
        jv_status: 'MATCH',
        jv_pct: 100,
        combined_value: 'Pooled: Rs 128.37 Cr -> 855.8% raw (100% capped)',
        combined_pct: 100,
        applicable_jv_rule: 'Lead Member / JV Pooling',
        status: 'MATCH',
        fulfilled_pct: '100%',
        gap_notes: 'Desire satisfies standalone',
        required_doc: 'CA Net Worth Certificate',
        page_ref: 'Section III, Page 15'
      },
      {
        clause_no: 'Clause 1.3',
        clause_title: 'Bank Solvency Certificate',
        requirement_type: 'Financial',
        tender_requirement: 'Solvency Certificate of minimum Rs 20.00 Cr from any Scheduled Bank.',
        required_value: 'Rs 20.00 Cr',
        desire_value: 'Required: Rs 20 Cr | Desire actual: Rs 72.18 Cr -> 360.9% raw (100% capped)',
        desire_status: 'MATCH',
        desire_pct: 100,
        jv_value: 'Required: Rs 20 Cr | VINOD H PATEL actual: Rs 25 Cr -> 125% raw (100% capped)',
        jv_status: 'MATCH',
        jv_pct: 100,
        combined_value: 'Pooled: Rs 97.18 Cr -> 485.9% raw (100% capped)',
        combined_pct: 100,
        applicable_jv_rule: 'Lead Member / JV Pooling',
        status: 'MATCH',
        fulfilled_pct: '100%',
        gap_notes: 'Desire satisfies standalone',
        required_doc: 'Bank Solvency Certificate',
        page_ref: 'Section III, Page 16'
      },
      {
        clause_no: 'Clause 2.1',
        clause_title: 'Technical Execution Experience',
        requirement_type: 'Technical',
        tender_requirement: 'Execution of bulk water pipeline schemes including DI/HDPE pipes and pumping machineries.',
        required_value: 'Similar Water Pipeline Works',
        desire_value: 'Desire actual: Executed 120+ km HDPE/DI Water Pipelines -> 100% MATCH',
        desire_status: 'MATCH',
        desire_pct: 100,
        jv_value: 'VINOD H PATEL actual: Executed Palanpur Group Water Supply Package 2 -> 100% MATCH',
        jv_status: 'MATCH',
        jv_pct: 100,
        combined_value: 'Combined: Meets technical experience criteria -> 100% MATCH',
        combined_pct: 100,
        applicable_jv_rule: 'Lead Member Experience',
        status: 'MATCH',
        fulfilled_pct: '100%',
        gap_notes: 'Desire satisfies standalone',
        required_doc: 'Work Completion Certificates',
        page_ref: 'Section IV - Technical Specs, Page 22'
      },
      {
        clause_no: 'Clause 3.1',
        clause_title: 'General Business Registration',
        requirement_type: 'Compliance',
        tender_requirement: 'Class-A Civil/PHED Contractor License / Registration with Government authority.',
        required_value: 'Class-A License',
        desire_value: 'Desire actual: Holds Class-A PHED & AA Class Gujarat License -> 100% MATCH',
        desire_status: 'MATCH',
        desire_pct: 100,
        jv_value: 'VINOD H PATEL actual: Holds AA Class Civil Contractor Registration -> 100% MATCH',
        jv_status: 'MATCH',
        jv_pct: 100,
        combined_value: 'Combined: Meets registration criteria -> 100% MATCH',
        combined_pct: 100,
        applicable_jv_rule: 'Lead Member Registration',
        status: 'MATCH',
        fulfilled_pct: '100%',
        gap_notes: 'Desire satisfies standalone',
        required_doc: 'Valid Registration Certificate',
        page_ref: 'Section II - ITB, Page 8'
      }
    ]
  });
  const [analysisError, setAnalysisError] = useState<string | null>(null);

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

  // Only run analysis when triggered by user
  // (removed auto-triggering on mount with dummy data)

  const desireComp = companies.find(c => c.type === 'Desire Energy' || c.id === 'comp-desire-01') || companies[0] || {
    id: 'comp-desire-01',
    name: 'Desire Energy Solutions Pvt Ltd',
    type: 'Desire Energy',
    average_turnover: 50,
    net_worth: 20
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
    const clauses = report.clauses_breakdown || [];

    // B1: Split into (a) bidder eligibility criteria and (b) submission/payment items
    const eligibilityClauses = clauses.filter((c: any) => c.is_eligibility_criterion !== false);
    const submissionClauses = clauses.filter((c: any) => c.is_eligibility_criterion === false);

    // B2: Exclude DATA MISSING from score calculation
    const desireEvaluable = eligibilityClauses.filter((c: any) => c.desire_status !== 'DATA MISSING');
    const jvEvaluable = eligibilityClauses.filter((c: any) => c.jv_status !== 'DATA MISSING');
    const combinedEvaluable = eligibilityClauses.filter((c: any) => c.status !== 'DATA MISSING');

    const missingCount = eligibilityClauses.length - desireEvaluable.length;

    const calcDesireScore = desireEvaluable.length > 0
      ? Math.min(100, Math.round(desireEvaluable.reduce((acc: number, c: any) => acc + (typeof c.desire_pct === 'number' ? c.desire_pct : (c.desire_status === 'MATCH' ? 100 : c.desire_status === 'POSSIBLE MATCH' ? 85 : c.desire_status === 'PARTIAL MATCH' ? 50 : 0)), 0) / desireEvaluable.length))
      : 100;

    const calcJvScore = jvEvaluable.length > 0
      ? Math.min(100, Math.round(jvEvaluable.reduce((acc: number, c: any) => acc + (typeof c.jv_pct === 'number' ? c.jv_pct : (c.jv_status === 'MATCH' ? 100 : c.jv_status === 'POSSIBLE MATCH' ? 85 : c.jv_status === 'PARTIAL MATCH' ? 50 : 0)), 0) / jvEvaluable.length))
      : 100;

    const calcCombinedScore = combinedEvaluable.length > 0
      ? Math.min(100, Math.round(combinedEvaluable.reduce((acc: number, c: any) => acc + (typeof c.combined_pct === 'number' ? c.combined_pct : (c.status === 'MATCH' ? 100 : c.status === 'POSSIBLE MATCH' ? 85 : c.status === 'PARTIAL MATCH' ? 50 : 0)), 0) / combinedEvaluable.length))
      : 100;

    const desireTargetScore = report.desire_alone?.score ?? calcDesireScore;
    const jvTargetScore = report.jv_alone?.score ?? calcJvScore;
    const combinedTargetScore = report.combined_jv?.score ?? calcCombinedScore;

    const evaluatePerspective = (mode: 'desire' | 'jv' | 'combined') => {
      const activeClauses = clauses.map((c: any) => {
        let val = c.combined_value;
        let status: string = (c.status as any) || 'MATCH';
        let pct = 100;

        let dStatus: string = (c.desire_status as any) || 'MATCH';
        const dVal = (c.desire_value || '').toLowerCase();
        if (c.desire_status === 'POSSIBLE MATCH' || dVal.includes('possible match') || dVal.includes('manual verification')) {
          dStatus = 'POSSIBLE MATCH';
        } else if (c.desire_status === 'DATA MISSING' || c.desire_status === 'DATA NOT AVAILABLE' || dVal.includes('data not available')) {
          dStatus = 'DATA MISSING';
        } else if (c.desire_status === 'NOT ELIGIBLE' || c.desire_status === 'NOT MATCHING' || dVal.includes('lacks') || dVal.includes('0%')) {
          dStatus = 'NOT ELIGIBLE';
        }

        let jStatus: string = (c.jv_status as any) || 'MATCH';
        const jVal = (c.jv_value || '').toLowerCase();
        if (c.jv_status === 'POSSIBLE MATCH' || jVal.includes('possible match') || jVal.includes('manual verification')) {
          jStatus = 'POSSIBLE MATCH';
        } else if (c.jv_status === 'DATA MISSING' || c.jv_status === 'DATA NOT AVAILABLE' || jVal.includes('data not available')) {
          jStatus = 'DATA MISSING';
        } else if (c.jv_status === 'NOT ELIGIBLE' || c.jv_status === 'NOT MATCHING' || jVal.includes('lacks') || jVal.includes('0%')) {
          jStatus = 'NOT ELIGIBLE';
        }

        if (mode === 'desire') {
          val = c.desire_value || '';
          status = dStatus;
          pct = status === 'MATCH' ? 100 : status === 'POSSIBLE MATCH' ? 85 : status === 'PARTIAL MATCH' ? 50 : 0;
        } else if (mode === 'jv') {
          val = c.jv_value || '';
          status = jStatus;
          pct = status === 'MATCH' ? 100 : status === 'POSSIBLE MATCH' ? 85 : status === 'PARTIAL MATCH' ? 50 : 0;
        } else {
          val = c.combined_value || `${c.desire_value || ''} + ${c.jv_value || ''}`;
          if (dStatus === 'MATCH' || jStatus === 'MATCH' || c.status === 'MATCH') {
            status = 'MATCH';
            pct = 100;
          } else if (dStatus === 'POSSIBLE MATCH' || jStatus === 'POSSIBLE MATCH' || c.status === 'POSSIBLE MATCH') {
            status = 'POSSIBLE MATCH';
            pct = 85;
          } else if (dStatus === 'DATA MISSING' && jStatus === 'DATA MISSING') {
            status = 'DATA MISSING';
            pct = 0;
          } else {
            status = 'NOT ELIGIBLE';
            pct = 0;
          }
        }

        return {
          ...c,
          active_val: val,
          active_status: status,
          active_pct: pct
        };
      });

      const evalElig = activeClauses.filter((c: any) => c.is_eligibility_criterion !== false);
      const evalSub = activeClauses.filter((c: any) => c.is_eligibility_criterion === false);

      const matched = evalElig.filter((c: any) => c.active_status === 'MATCH').length;
      const possible = evalElig.filter((c: any) => c.active_status === 'POSSIBLE MATCH' || c.active_status === 'PARTIAL MATCH').length;
      const notEligible = evalElig.filter((c: any) => c.active_status === 'NOT ELIGIBLE' || c.active_status === 'NOT MATCHING').length;
      const dataMissing = evalElig.filter((c: any) => c.active_status === 'DATA MISSING' || c.active_status === 'DATA NOT AVAILABLE').length;

      const targetScore = mode === 'desire' ? desireTargetScore : mode === 'jv' ? jvTargetScore : combinedTargetScore;

      return {
        score: targetScore,
        pctStr: `${targetScore}%`,
        evaluated: activeClauses,
        eligibilityClauses: evalElig,
        submissionClauses: evalSub,
        counts: {
          total_criteria: evalElig.length,
          matched,
          possible,
          not_eligible: notEligible,
          data_missing: dataMissing,
          submission_items: evalSub.length
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
      if (activeEval.score >= 90) {
        verdict = 'Eligible Standalone';
        recommendation = `BID STANDALONE — Desire Energy satisfies ${activeEval.pctStr} of criteria (No JV Consortium Required)`;
      } else if (activeEval.score >= 60) {
        verdict = 'Partially Eligible Standalone';
        recommendation = `REVIEW / JV RECOMMENDED — Desire Energy satisfies ${activeEval.pctStr} of criteria (Partner fills remaining gaps)`;
      } else {
        verdict = 'Ineligible Standalone';
        recommendation = `JV MANDATORY — Desire Energy satisfies only ${activeEval.pctStr} of criteria`;
      }
    } else if (activeAnalysisOption === 'jv') {
      badge = `OPTION 2 — ${jvComp.name.toUpperCase()} ALONE`;
      entityName = `${jvComp.name} Alone`;
      if (activeEval.score >= 90) {
        verdict = 'Partner Fully Qualified Standalone';
        recommendation = `PARTNER QUALIFIED STANDALONE — ${jvComp.name} satisfies ${activeEval.pctStr} standalone.`;
      } else if (activeEval.score >= 60) {
        verdict = 'Partner Partially Eligible Standalone';
        recommendation = `PARTNER INCOMPLETE STANDALONE — ${jvComp.name} satisfies ${activeEval.pctStr} standalone. Must join Desire Energy via Option 3 Consortium.`;
      } else {
        verdict = 'Partner Ineligible Standalone';
        recommendation = `INSUFFICIENT STANDALONE — ${jvComp.name} satisfies only ${activeEval.pctStr} standalone. Must join Desire Energy via Option 3 Consortium.`;
      }
    } else {
      if (desireEval.score >= 90) {
        verdict = 'Fully Eligible Consortium (Desire Already 100% Standalone Qualified)';
        recommendation = `BID STANDALONE OR CONSORTIUM — Desire Energy is ${desireEval.pctStr} Standalone Qualified. Formed JV with ${jvComp.name} for financial pooling.`;
      } else if (activeEval.score >= 90) {
        verdict = 'Fully Eligible Through JV Consortium';
        recommendation = `BID THROUGH JV CONSORTIUM — Desire Energy + ${jvComp.name} satisfies ${activeEval.pctStr} of criteria.`;
      } else {
        verdict = 'Partially Eligible Through JV';
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
      missingCount,
      executive_summary: report.executive_summary || report.summary_line || 'Tender evaluation report ready.',
      summary_counts: activeEval.counts,
      evaluatedClauses: activeEval.evaluated,
      eligibilityClauses: activeEval.eligibilityClauses,
      submissionClauses: activeEval.submissionClauses,
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
          <title>Tender Eligibility Report - ${report.tender_id || 'Evaluation'}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            body { font-family: 'Segoe UI', Roboto, sans-serif; color: #0f172a; background: #fff; margin: 0; padding: 0; font-size: 10pt; line-height: 1.4; }
            .header { border-bottom: 3px solid #059669; padding-bottom: 10px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
            .logo { font-size: 16pt; font-weight: 800; color: #065f46; letter-spacing: 0.5px; }
            .sub-logo { font-size: 8pt; color: #475569; font-weight: 600; font-family: monospace; }
            .report-meta { text-align: right; font-size: 8.5pt; color: #475569; }
            .title-box { background: #f0fdf4; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; }
            .tender-title { font-size: 12pt; font-weight: bold; color: #064e3b; margin-bottom: 6px; }
            .verdict-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-weight: bold; font-size: 9pt; text-transform: uppercase; background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
            .summary-tiles { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 16px; text-align: center; }
            .tile { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; background: #f8fafc; }
            .tile-label { font-size: 7.5pt; font-family: monospace; text-transform: uppercase; color: #64748b; font-weight: bold; display: block; margin-bottom: 2px; }
            .tile-value { font-size: 13pt; font-weight: bold; }
            .tile-matched { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }
            .tile-possible { background: #fffbebf; border-color: #fde68a; color: #92400e; }
            .tile-not-eligible { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
            .tile-missing { background: #f1f5f9; border-color: #cbd5e1; color: #475569; }
            .executive-summary { background: #f8fafc; border-left: 4px solid #059669; padding: 10px 14px; margin-bottom: 16px; font-size: 9pt; color: #334155; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 8.5pt; }
            th { background: #0f172a; color: #f8fafc; font-family: monospace; font-size: 7.5pt; text-transform: uppercase; text-align: left; padding: 7px 8px; }
            td { border-bottom: 1px solid #e2e8f0; padding: 7px 8px; vertical-align: top; }
            tr:nth-child(even) { background: #f8fafc; }
            .status-badge { display: inline-block; padding: 2px 7px; border-radius: 10px; font-size: 7.5pt; font-weight: bold; font-family: monospace; }
            .badge-matched { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
            .badge-possible { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
            .badge-not-eligible { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
            .badge-missing { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
            .footer { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 7.5pt; color: #94a3b8; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">DESIRE ENERGY SOLUTIONS</div>
              <div class="sub-logo">AI TENDER ELIGIBILITY EVALUATION REPORT</div>
            </div>
            <div class="report-meta">
              <div><strong>Date:</strong> ${dateStr}</div>
              <div><strong>Option:</strong> ${perspective.badge}</div>
              <div><strong>Document:</strong> ${report.filename || 'Tender PDF'}</div>
            </div>
          </div>

          <div class="title-box">
            <div class="tender-title">${report.tender_title}</div>
            <div>
              <span class="verdict-badge">${perspective.verdict} (${perspective.fulfilled_pct})</span>
            </div>
          </div>

          <div class="summary-tiles">
            <div class="tile">
              <span class="tile-label">Total Criteria</span>
              <span class="tile-value">${perspective.summary_counts.total_criteria}</span>
            </div>
            <div class="tile tile-matched">
              <span class="tile-label">Matched (100%)</span>
              <span class="tile-value">${perspective.summary_counts.matched}</span>
            </div>
            <div class="tile tile-possible">
              <span class="tile-label">Possible Match</span>
              <span class="tile-value">${perspective.summary_counts.possible}</span>
            </div>
            <div class="tile tile-not-eligible">
              <span class="tile-label">Not Eligible</span>
              <span class="tile-value">${perspective.summary_counts.not_eligible}</span>
            </div>
            <div class="tile tile-missing">
              <span class="tile-label">Data Missing</span>
              <span class="tile-value">${perspective.summary_counts.data_missing}</span>
            </div>
          </div>

          <div class="executive-summary">
            <strong>Executive Summary & Recommendation:</strong><br/>
            ${perspective.executive_summary}<br/><br/>
            <strong>Recommendation:</strong> ${perspective.recommendation}
          </div>

          <h4 style="margin: 12px 0 4px 0; color: #0f172a; font-size: 10pt;">Detailed Clause Evaluation</h4>
          <table>
            <thead>
              <tr>
                <th style="width: 15%;">Clause & Ref</th>
                <th style="width: 30%;">Tender Requirement</th>
                <th style="width: 25%;">Desire / Consortium Actual</th>
                <th style="width: 15%;">Status</th>
                <th style="width: 15%;">Gap & Notes</th>
              </tr>
            </thead>
            <tbody>
              ${perspective.evaluatedClauses.map(item => {
                const st = item.active_status;
                let badgeCls = 'badge-missing';
                let badgeText = 'Unknown — No Record on File';
                if (st === 'MATCH') {
                  badgeCls = 'badge-matched';
                  badgeText = 'MATCH (100%)';
                } else if (st === 'POSSIBLE MATCH' || st.includes('POSSIBLE')) {
                  badgeCls = 'badge-possible';
                  badgeText = 'Possible Match';
                } else if (st === 'NOT ELIGIBLE' || st === 'NOT MATCHING') {
                  badgeCls = 'badge-not-eligible';
                  badgeText = 'Not Eligible (0%)';
                }

                return `
                  <tr>
                    <td><strong>${item.clause_no}</strong><br/><span style="font-size: 7.5pt; color: #64748b;">${item.page_ref}</span></td>
                    <td>${item.tender_requirement}</td>
                    <td style="font-family: monospace; font-size: 8pt;">${item.active_val || item.desire_value || ''}</td>
                    <td><span class="status-badge ${badgeCls}">${badgeText}</span></td>
                    <td style="font-size: 8pt; color: #475569;">${item.gap_notes || ''}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="footer">
            Confidential — Generated by Desire Energy AI Engine. Verified against Supabase Public Master Data.
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          </script>
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
                  perspective.verdict.includes('Eligible') && !perspective.verdict.includes('Ineligible')
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-800'
                }`}>
                  {perspective.verdict}
                </span>
                <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                  Match Score: {perspective.fulfilled_pct}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{report.tender_title}</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed font-medium">{perspective.executive_summary}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#15233c] border border-slate-200 dark:border-[#263752] shrink-0 text-center space-y-1">
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase block">Recommendation</span>
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">{perspective.recommendation}</span>
            </div>
          </div>

          {/* Four Distinct Summary Category Tiles (Matched / Possible Match / Not Eligible / Data Missing) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="glass-card p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1426]">
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase block">Eligibility Criteria</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">{perspective.summary_counts.total_criteria}</span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40">
              <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-300 font-bold uppercase block">Matched (100%)</span>
              <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">{perspective.summary_counts.matched}</span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/40">
              <span className="text-[10px] font-mono text-amber-800 dark:text-amber-300 font-bold uppercase block">Possible Match</span>
              <span className="text-sm font-bold text-amber-900 dark:text-amber-200 font-bold">{perspective.summary_counts.possible}</span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-rose-500/30 bg-rose-50 dark:bg-rose-950/40">
              <span className="text-[10px] font-mono text-rose-800 dark:text-rose-300 font-bold uppercase block">Not Eligible</span>
              <span className="text-sm font-bold text-rose-800 dark:text-rose-300">{perspective.summary_counts.not_eligible}</span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80">
              <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 font-bold uppercase block">Data Missing</span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{perspective.summary_counts.data_missing}</span>
            </div>
          </div>

          {/* SCORE FORMULA BREAKDOWN BOX & EXCLUDED DATA MISSING BADGE (B2 & B4) */}
          {report.score_formula && (
            <div className="p-4 rounded-2xl bg-slate-900 dark:bg-[#111c33] border border-cyan-500/30 text-slate-200 text-xs space-y-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="font-mono font-bold text-cyan-400 flex items-center space-x-1">
                  <Calculator className="w-4 h-4 mr-1 inline text-cyan-400" />
                  <span>SCORING FORMULA BREAKDOWN</span>
                </span>
                {perspective.missingCount > 0 && (
                  <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-700 shadow-sm">
                    {perspective.missingCount} criteria could not be checked (DATA MISSING — excluded from score)
                  </span>
                )}
              </div>
              <div className="font-mono text-[11px] text-emerald-300 bg-slate-950/80 p-3 rounded-xl border border-slate-800 leading-relaxed">
                {activeAnalysisOption === 'desire'
                  ? (report.score_formula.desire_standalone?.formula_str || `Score ${perspective.score}% = [${report.score_formula.desire_standalone?.numerator_criteria?.join(' + ')}] / ${report.score_formula.desire_standalone?.evaluated_count} evaluated criteria`)
                  : (report.score_formula.combined_jv?.formula_str || `Score ${perspective.score}% = [${report.score_formula.combined_jv?.numerator_criteria?.join(' + ')}] / ${report.score_formula.combined_jv?.evaluated_count} evaluated criteria`)}
              </div>
              {report.score_formula.missing_criteria_names && report.score_formula.missing_criteria_names.length > 0 && (
                <div className="text-[10px] text-amber-400 font-mono">
                  Excluded Missing Criteria: {report.score_formula.missing_criteria_names.join(', ')}
                </div>
              )}
            </div>
          )}

          {/* SECTION 1: BIDDER ELIGIBILITY CRITERIA (SCORED) */}
          <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 bg-white dark:bg-[#0b1426]">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  (a) Bidder Eligibility Criteria ({perspective.eligibilityClauses.length} Scored Criteria)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold">
                  SCORED ({perspective.fulfilled_pct})
                </span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono">Evaluated against company metrics</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#263752] text-slate-700 dark:text-teal-300 font-medium font-mono text-[10px] uppercase tracking-wider bg-slate-100 dark:bg-[#111c33]">
                    <th className="p-3">Clause & Page</th>
                    <th className="p-3">Requirement</th>
                    {activeAnalysisOption === 'desire' && <th className="p-3 text-emerald-800 dark:text-emerald-400 font-bold">Desire Energy Capability</th>}
                    {activeAnalysisOption === 'jv' && <th className="p-3 text-purple-800 dark:text-purple-400 font-bold">{jvComp.name} Capability</th>}
                    {activeAnalysisOption === 'combined' && (
                      <>
                        <th className="p-3 text-emerald-800 dark:text-emerald-400 font-bold">Desire Energy</th>
                        <th className="p-3 text-purple-800 dark:text-purple-400 font-bold">JV Partner</th>
                        <th className="p-3 text-slate-900 dark:text-white font-bold">Combined Result</th>
                      </>
                    )}
                    <th className="p-3">Status</th>
                    <th className="p-3">Score %</th>
                    <th className="p-3">Gap & Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {perspective.eligibilityClauses.map((item: any, idx: number) => {
                    const statusVal = item.active_status;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition-colors">
                        <td className="p-3">
                          <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold block">{item.clause_no} ({item.page_ref})</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{item.clause_title}</span>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{item.tender_requirement}</td>
                        {activeAnalysisOption === 'desire' && <td className="p-3 text-emerald-800 dark:text-emerald-300 font-mono font-medium">{item.active_val}</td>}
                        {activeAnalysisOption === 'jv' && <td className="p-3 text-purple-800 dark:text-purple-300 font-mono font-medium">{item.active_val}</td>}
                        {activeAnalysisOption === 'combined' && (
                          <>
                            <td className="p-3 text-emerald-800 dark:text-emerald-300 font-mono">{item.desire_value}</td>
                            <td className="p-3 text-purple-800 dark:text-purple-300 font-mono">{item.jv_value}</td>
                            <td className="p-3 text-slate-900 dark:text-white font-mono font-bold">{item.combined_value}</td>
                          </>
                        )}
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              statusVal === 'MATCH'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : (statusVal === 'POSSIBLE MATCH' || statusVal.includes('POSSIBLE'))
                                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800 shadow-sm'
                                : (statusVal === 'NOT ELIGIBLE' || statusVal === 'NOT MATCHING')
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {statusVal === 'MATCH' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                            {(statusVal === 'POSSIBLE MATCH' || statusVal.includes('POSSIBLE')) && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                            {(statusVal === 'NOT ELIGIBLE' || statusVal === 'NOT MATCHING') && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                            {(statusVal === 'DATA MISSING' || statusVal === 'DATA NOT AVAILABLE') && <HelpCircle className="w-3.5 h-3.5 text-slate-500" />}
                            <span>
                              {statusVal === 'MATCH'
                                ? 'MATCH'
                                : (statusVal === 'POSSIBLE MATCH' || statusVal.includes('POSSIBLE'))
                                ? 'Possible Match'
                                : (statusVal === 'NOT ELIGIBLE' || statusVal === 'NOT MATCHING')
                                ? 'Not Eligible'
                                : 'DATA MISSING'}
                            </span>
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {statusVal === 'DATA MISSING' ? 'EXCLUDED' : `${item.active_pct}%`}
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300 font-medium text-[11px]">{item.gap_notes}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 2: SUBMISSION & PAYMENT CHECKLIST (UNSCORED) */}
          <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 bg-white dark:bg-[#0b1426]">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileCheck2 className="w-5 h-5 text-cyan-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  (b) Submission & Payment Checklist ({perspective.submissionClauses.length} Mandatory Items)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-bold">
                  UNSCORED CHECKLIST
                </span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono">Mandatory bid submission items</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#263752] text-slate-700 dark:text-cyan-300 font-medium font-mono text-[10px] uppercase tracking-wider bg-slate-100 dark:bg-[#111c33]">
                    <th className="p-3">Checklist Item</th>
                    <th className="p-3">Tender Specification Statement</th>
                    <th className="p-3">Submission Status</th>
                    <th className="p-3">Required Proof / Attachment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {perspective.submissionClauses.length > 0 ? (
                    perspective.submissionClauses.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition-colors">
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">
                          <span className="font-mono text-[10px] text-cyan-600 block">{item.clause_no} ({item.page_ref})</span>
                          <span>{item.clause_title}</span>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{item.tender_requirement}</td>
                        <td className="p-3">
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" />
                            <span>CHECKLIST ITEM</span>
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">{item.required_doc || 'Mandatory Submission Proof'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-500 font-mono text-xs">
                        No separate submission/payment items tagged in this tender.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
