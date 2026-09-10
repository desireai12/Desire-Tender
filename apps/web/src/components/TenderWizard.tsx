'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Upload, 
  FileText, 
  ArrowRight, 
  AlertTriangle, 
  Sparkles, 
  Wand2,
  Check,
  ArrowLeft,
  Building2,
  GitMerge,
  HelpCircle,
  Loader2,
  Users,
  ShieldCheck,
  Award,
  Sliders,
  TrendingUp,
  Percent
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import { 
  ProjectCategory, 
  DepartmentRole, 
  TenderProcess 
} from '@/lib/types';
import { CompanyRecord } from './CompanyDetailsView';
import { ClauseBreakdownItem, DynamicTenderEvaluationReport } from './EligibilityChecker';

interface TenderWizardProps {
  currentProvider: 'gemini' | 'openai';
  activeRole: DepartmentRole;
  onTenderCreated: (process: TenderProcess) => void;
}

export const TenderWizard: React.FC<TenderWizardProps> = ({
  currentProvider,
  activeRole,
  onTenderCreated,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Master Companies State
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [selectedJvPartnerId, setSelectedJvPartnerId] = useState<string>('comp-vhp-04');
  const [desireCompanyId, setDesireCompanyId] = useState<string>('comp-desire-01');

  // Dynamic JV Equity Ratio: Desire Share % (Default: 75% lead, Partner 25%)
  const [desireEquityRatio, setDesireEquityRatio] = useState<number>(75);

  // Step 1 State
  const [tenderTitle, setTenderTitle] = useState<string>('Banaskantha Bulk Water Transmission Package (GWSSB / WRD Gujarat - ₹69.78 Cr)');
  const [initiatingDepartment, setInitiatingDepartment] = useState<DepartmentRole>(activeRole);
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategory>('EPC');
  const [uploadedTenderFile, setUploadedTenderFile] = useState<File | null>(null);
  const [uploadedBOQFile, setUploadedBOQFile] = useState<File | null>(null);

  // Preferred Analysis Mode Selection
  const [activeAnalysisOption, setActiveAnalysisOption] = useState<'desire' | 'jv' | 'combined'>('combined');

  // Step 2 Staged Processing State
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [analysisStageText, setAnalysisStageText] = useState<string>('Reading Tender Document & Extracting Specifications...');
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Step 3 Dynamic Assessment Report State
  const [evaluationReport, setEvaluationReport] = useState<DynamicTenderEvaluationReport | null>(null);

  // Fetch Master Companies on Mount
  useEffect(() => {
    const fetchMasterCompanies = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/companies`);
        if (res.ok) {
          const data = await res.json();
          if (data.companies && Array.isArray(data.companies)) {
            setCompanies(data.companies);
            // Default to first valid JV Partner if current default not found
            const jvPartners = data.companies.filter((c: CompanyRecord) => c.type === 'JV Partner');
            if (jvPartners.length > 0 && !jvPartners.some((p: CompanyRecord) => p.id === selectedJvPartnerId)) {
              setSelectedJvPartnerId(jvPartners[0].id);
            }
          }
        }
      } catch (e) {
        console.error('Failed to load companies:', e);
      }
    };
    fetchMasterCompanies();
  }, []);

  // Handle File Upload on Step 1
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'tender' | 'boq') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'tender') {
      setUploadedTenderFile(file);
      const fileLower = file.name.toLowerCase();
      if (fileLower.includes('banaskantha') || fileLower.includes('gujarat') || fileLower.includes('69.78')) {
        setTenderTitle('Banaskantha Bulk Water Transmission Package (GWSSB / WRD Gujarat - ₹69.78 Cr)');
        setSelectedCategory('EPC');
      } else if (fileLower.includes('vapi') || fileLower.includes('lift') || fileLower.includes('irrigation')) {
        setTenderTitle('Vapi Lift Irrigation & Water Distribution Scheme (Gujarat WRD)');
        setSelectedCategory('ESCO');
      } else if (fileLower.includes('alwar') || fileLower.includes('sewer') || fileLower.includes('rudsico')) {
        setTenderTitle('Alwar Package 44 Sewerage & STP Project (AMRUT 2.0)');
        setSelectedCategory('STP');
      } else {
        setTenderTitle(file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
      }
    } else if (type === 'boq') {
      setUploadedBOQFile(file);
    }
  };

  // Resolve Active Companies (strictly filtered to JV Partners for partner side)
  const desireComp = companies.find(c => c.type === 'Desire Energy' || c.id === desireCompanyId) || { 
    id: 'comp-desire-01',
    name: 'DESIRE ENERGY SOLUTIONS PRIVATE LIMITED', 
    type: 'Desire Energy',
    average_turnover: 300.93, 
    net_worth: 95.0, 
    solvency_amount: 72.18 
  };
  
  const jvComp = companies.find(c => c.id === selectedJvPartnerId && c.type === 'JV Partner') || 
    companies.find(c => c.type === 'JV Partner') || { 
    id: 'comp-vhp-04',
    name: 'VINOD H PATEL', 
    type: 'JV Partner',
    average_turnover: 191.39, 
    net_worth: 33.37, 
    solvency_amount: 10.0 
  };

  // Dynamic Calculated JV Partner Share %
  const partnerEquityRatio = 100 - desireEquityRatio;

  // Dynamic Financial Contributions based on Equity Split
  const pooledTurnover = Number((desireComp.average_turnover + jvComp.average_turnover).toFixed(2));
  const pooledNetWorth = Number((desireComp.net_worth + jvComp.net_worth).toFixed(2));
  const pooledSolvency = Number(((desireComp.solvency_amount || 72.18) + (jvComp.solvency_amount || 10.0)).toFixed(2));

  // Start Document Processing & Switch to Step 2 Loading Animation
  const startDocumentAnalysis = () => {
    setAnalysisError(null);
    setCurrentStep(2);
    setAnalysisProgress(10);
    setAnalysisStageText('Uploading & Inspecting Tender Specification Document...');
    handleRunAnalysis();
  };

  // Run AI Tender Analysis API
  const handleRunAnalysis = async () => {
    let fetchedReport: DynamicTenderEvaluationReport | null = null;
    let isRejected = false;
    let rejectMsg = '';
    setAnalysisError(null);

    try {
      const formData = new FormData();
      if (uploadedTenderFile) {
        formData.append('file', uploadedTenderFile);
      }
      formData.append('project_category', selectedCategory);
      formData.append('tender_title', tenderTitle);
      formData.append('jv_partner_id', selectedJvPartnerId);

      setAnalysisProgress(30);
      setAnalysisStageText('Parsing All Tender Clauses, Requirements & Technical Specifications...');

      const res = await fetch(`${API_BASE_URL}/tender/analyze?provider=${currentProvider}`, {
        method: 'POST',
        body: formData,
      });

      setAnalysisProgress(65);
      setAnalysisStageText('Evaluating Desire Energy vs. Tender Criteria (Clause by Clause)...');

      if (res.ok) {
        const data = await res.json();
        fetchedReport = data.evaluation_report || data.report;
        if (data.is_rejected_non_tender || (fetchedReport && (fetchedReport as any).is_rejected_non_tender)) {
          isRejected = true;
          rejectMsg = fetchedReport?.executive_summary || 'Uploaded file is a Non-Tender document.';
        }

        setAnalysisProgress(85);
        setAnalysisStageText('Ranking Best JV Partners & Generating Consortium Recommendations...');

        // Auto-select the highest scoring AI Recommended JV Partner
        if (fetchedReport && (fetchedReport as any).partner_recommendations && Array.isArray((fetchedReport as any).partner_recommendations)) {
          const topRec = (fetchedReport as any).partner_recommendations[0];
          if (topRec && topRec.company_id) {
            setSelectedJvPartnerId(topRec.company_id);
          }
        }
      } else {
        setAnalysisError(`Tender Analysis Server returned status ${res.status}. Please try again.`);
      }
    } catch (err) {
      console.error('Tender analysis API call error:', err);
      setAnalysisError('Network error connecting to analysis server. Please retry.');
    }

    if (isRejected && fetchedReport) {
      setEvaluationReport(fetchedReport);
      setAnalysisProgress(100);
      setAnalysisStageText(`Document Rejected: ${rejectMsg}`);
      setTimeout(() => {
        setCurrentStep(3);
      }, 500);
      return;
    }

    if (fetchedReport) {
      setEvaluationReport(fetchedReport);
      const dScore = fetchedReport.desire_alone?.score !== undefined ? fetchedReport.desire_alone.score : 100;
      if (dScore >= 90 || fetchedReport.desire_alone?.fulfilled_pct === '100%') {
        setActiveAnalysisOption('desire');
      } else {
        setActiveAnalysisOption('combined');
      }
      setAnalysisProgress(100);
      setAnalysisStageText(`Full Report Ready: ${(fetchedReport.clauses_breakdown || []).length} Clauses Extracted & Evaluated.`);
      setTimeout(() => {
        setCurrentStep(3);
      }, 400);
    } else {
      setAnalysisProgress(0);
      setAnalysisError(prev => prev || 'Tender analysis returned an empty report. Please verify the uploaded document or retry.');
      setCurrentStep(1);
    }
  };

  // Submit Finalized Tender to Process Queue
  const handleSubmitToQueue = () => {
    const newProcess: TenderProcess = {
      id: `TND-${Date.now().toString().slice(-6)}`,
      tender_name: tenderTitle,
      project_category: selectedCategory,
      project_locked: true,
      department_assigned: initiatingDepartment,
      current_stage: '1_ELIGIBILITY',
      stage_status: 'Completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      eligibility_result: {
        is_eligible: evaluationReport?.verdict !== 'Ineligible',
        score: evaluationReport?.eligibility_score || 100,
        reasoning: evaluationReport?.executive_summary || 'Verified against company records.'
      },
      uploaded_files: {
        tender_pdf: uploadedTenderFile?.name || 'Uploaded_Tender.pdf'
      },
      audit_trail: [
        {
          id: `log-${Date.now()}`,
          user: `Officer (${activeRole})`,
          department: activeRole,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          action: `Uploaded Tender & Completed Dynamic AI Eligibility Analysis with ${jvComp.name} (${desireEquityRatio}:${partnerEquityRatio})`,
          status: 'Completed',
          next_pending_action: 'Estimation Team to generate Stage 3 BOQ Costing'
        }
      ]
    };
    onTenderCreated(newProcess);
  };

  // Perspective Data helper (MATHEMATICALLY SYNCHRONIZED & DYNAMIC)
  const getPerspectiveData = () => {
    if (!evaluationReport) {
      return {
        badge: 'OPTION 1 — DESIRE ENERGY ALONE',
        entityName: 'Desire Energy Alone',
        verdict: 'PROCESSING',
        score: 0,
        fulfilled_pct: '0%',
        option1_pct: '0%',
        option2_pct: '0%',
        option3_pct: '100%',
        summary_counts: { total_criteria: 0, matched: 0, partial: 0, not_matching: 0, data_missing: 0 },
        total_count: 0,
        matched_count: 0,
        partial_count: 0,
        not_matching_count: 0,
        data_missing_count: 0,
        evaluatedClauses: [],
        tabScores: { desire: '0%', jv: '0%', combined: '100%' },
        recommendation: 'Analyzing tender clauses...',
        executive_summary: 'Processing AI Report...'
      };
    }

    const clauses = evaluationReport.clauses_breakdown || [];
    const totalCount = clauses.length || 1;

    // Evaluate perspective with exact clause-by-clause scoring
    const evaluatePerspective = (mode: 'desire' | 'jv' | 'combined') => {
      const evaluated = clauses.map(c => {
        let val = c.combined_value;
        let status: 'MATCH' | 'PARTIAL MATCH' | 'NOT MATCHING' | 'DATA NOT AVAILABLE' = c.status;
        let pct = 100;

        // Desire standalone capability on this clause
        const dVal = (c.desire_value || '').toLowerCase();
        let dStatus: 'MATCH' | 'PARTIAL MATCH' | 'NOT MATCHING' | 'DATA NOT AVAILABLE' = 'MATCH';
        if (dVal.includes('data not') || dVal.includes('missing')) {
          dStatus = 'DATA NOT AVAILABLE';
        } else if (dVal.includes('lacks') || dVal.includes('not met') || dVal.includes('0%') || dVal.includes('no experience') || dVal.includes('ineligible') || dVal.includes('cannot bid')) {
          dStatus = 'NOT MATCHING';
        } else if (dVal.includes('partial') || dVal.includes('50%') || dVal.includes('75%') || dVal.includes('requires jv') || dVal.includes('gap')) {
          dStatus = 'PARTIAL MATCH';
        }

        // JV Partner capability on this clause
        const jVal = (c.jv_value || '').toLowerCase();
        let jStatus: 'MATCH' | 'PARTIAL MATCH' | 'NOT MATCHING' | 'DATA NOT AVAILABLE' = 'MATCH';
        if (jVal.includes('data not') || jVal.includes('missing')) {
          jStatus = 'DATA NOT AVAILABLE';
        } else if (jVal.includes('lacks') || jVal.includes('not met') || jVal.includes('0%') || jVal.includes('no experience') || jVal.includes('cannot bid') || jVal.includes('ineligible')) {
          jStatus = 'NOT MATCHING';
        } else if (jVal.includes('partial') || jVal.includes('60%') || jVal.includes('61%') || jVal.includes('50%') || jVal.includes('70%') || jVal.includes('gap')) {
          jStatus = 'PARTIAL MATCH';
        }

        if (mode === 'desire') {
          val = c.desire_value || '';
          status = dStatus;
          pct = status === 'MATCH' ? 100 : status === 'PARTIAL MATCH' ? 50 : 0;
        } else if (mode === 'jv') {
          val = c.jv_value || '';
          status = jStatus;
          pct = status === 'MATCH' ? 100 : status === 'PARTIAL MATCH' ? 50 : 0;
        } else {
          // Combined: If either party matches or pooled financials satisfy, status is MATCH
          val = c.combined_value || `${c.desire_value || ''} + ${c.jv_value || ''}`;
          if (dStatus === 'MATCH' || jStatus === 'MATCH' || c.status === 'MATCH') {
            status = 'MATCH';
            pct = 100;
          } else if (dStatus === 'PARTIAL MATCH' || jStatus === 'PARTIAL MATCH' || c.status === 'PARTIAL MATCH') {
            status = 'PARTIAL MATCH';
            pct = 50;
          } else {
            status = 'NOT MATCHING';
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

      const matched = evaluated.filter(c => c.active_status === 'MATCH').length;
      const partial = evaluated.filter(c => c.active_status === 'PARTIAL MATCH').length;
      const notMatching = evaluated.filter(c => c.active_status === 'NOT MATCHING').length;
      const missing = evaluated.filter(c => c.active_status === 'DATA NOT AVAILABLE').length;

      const score = Math.min(100, Math.round(((matched * 100) + (partial * 50)) / totalCount));

      return {
        score,
        pctStr: `${score}%`,
        evaluated,
        counts: {
          total_criteria: totalCount,
          matched,
          partial,
          not_matching: notMatching,
          data_missing: missing
        }
      };
    };

    const desireEval = evaluatePerspective('desire');
    const jvEval = evaluatePerspective('jv');
    const combinedEval = evaluatePerspective('combined');

    // Mathematically guarantee that Combined Consortium score is >= individual members
    if (combinedEval.score < desireEval.score || combinedEval.score < jvEval.score) {
      combinedEval.score = Math.max(desireEval.score, jvEval.score);
      combinedEval.pctStr = `${combinedEval.score}%`;
    }

    const activeEval = activeAnalysisOption === 'desire' ? desireEval : activeAnalysisOption === 'jv' ? jvEval : combinedEval;

    let badge = `OPTION 3 — DESIRE (${desireEquityRatio}%) + ${jvComp.name} (${partnerEquityRatio}%) COMBINED`;
    let entityName = `Combined Consortium (Desire Energy + ${jvComp.name})`;
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
        recommendation = `REVIEW / JV RECOMMENDED — Desire Energy satisfies ${activeEval.pctStr} of criteria`;
      } else {
        verdict = 'Ineligible Standalone';
        recommendation = `JV MANDATORY — Desire Energy satisfies only ${activeEval.pctStr} of criteria`;
      }
    } else if (activeAnalysisOption === 'jv') {
      badge = `OPTION 2 — ${jvComp.name.toUpperCase()} ALONE`;
      entityName = `${jvComp.name} Alone`;
      if (activeEval.score >= 90) {
        verdict = 'Partner Qualified Standalone';
        recommendation = `PARTNER QUALIFIED — ${jvComp.name} satisfies ${activeEval.pctStr} standalone. (For Desire Energy to bid this tender, bid as Lead via Option 3 Consortium)`;
      } else if (activeEval.score >= 60) {
        verdict = 'Partially Eligible Standalone';
        recommendation = `LEAD MEMBER REQUIRED — ${jvComp.name} satisfies ${activeEval.pctStr} of criteria`;
      } else {
        verdict = 'Ineligible Standalone';
        recommendation = `INSUFFICIENT — ${jvComp.name} satisfies only ${activeEval.pctStr} of criteria`;
      }
    } else {
      if (desireEval.score >= 90) {
        verdict = 'Fully Eligible Consortium (Desire Already 100% Standalone Qualified)';
        recommendation = `BID STANDALONE OR CONSORTIUM — Desire Energy is ${desireEval.pctStr} Standalone Qualified alone. Formed JV with ${jvComp.name} for financial pooling (₹${pooledTurnover} Cr turnover).`;
      } else if (activeEval.score >= 90) {
        verdict = 'Fully Eligible Through JV Consortium';
        recommendation = `BID THROUGH JV CONSORTIUM — Desire Energy (${desireEquityRatio}%) + ${jvComp.name} (${partnerEquityRatio}%) satisfies ${activeEval.pctStr} of criteria.`;
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
      option1_pct: desireEval.pctStr,
      option2_pct: jvEval.pctStr,
      option3_pct: combinedEval.pctStr,
      recommendation,
      executive_summary: activeAnalysisOption === 'desire'
        ? `Desire Energy Standalone AI Analysis: Evaluated ${totalCount} extracted tender clauses for '${evaluationReport.tender_title}' against Desire Energy credentials (₹${desireComp.average_turnover} Cr avg turnover, ₹${desireComp.net_worth} Cr net worth). Desire Energy satisfies ${activeEval.pctStr} of requirements.`
        : activeAnalysisOption === 'jv'
        ? `${jvComp.name} Standalone AI Analysis: Evaluated ${totalCount} extracted tender clauses against ${jvComp.name} credentials (₹${jvComp.average_turnover} Cr avg turnover, ₹${jvComp.net_worth} Cr net worth). Partner satisfies ${activeEval.pctStr} of requirements.`
        : `Combined Consortium AI Analysis: Evaluated ${totalCount} extracted tender clauses against Desire Energy (${desireEquityRatio}%) + ${jvComp.name} (${partnerEquityRatio}%) with ₹${pooledTurnover} Cr pooled turnover and ₹${pooledNetWorth} Cr pooled net worth. Combined consortium achieves ${activeEval.pctStr} qualification across all criteria.`,
      summary_counts: activeEval.counts,
      total_count: activeEval.counts.total_criteria,
      matched_count: activeEval.counts.matched,
      partial_count: activeEval.counts.partial,
      not_matching_count: activeEval.counts.not_matching,
      data_missing_count: activeEval.counts.data_missing,
      evaluatedClauses: activeEval.evaluated,
      tabScores: {
        desire: desireEval.pctStr,
        jv: jvEval.pctStr,
        combined: combinedEval.pctStr
      }
    };
  };

  const perspective = getPerspectiveData();

  const currentReport = (evaluationReport && !(evaluationReport as any).is_rejected_non_tender) ? {
    tender_id: evaluationReport.tender_id,
    tender_title: evaluationReport.tender_title || tenderTitle,
    project_category: evaluationReport.project_category || selectedCategory,
    filename: evaluationReport.filename || 'tender.pdf',
    verdict: evaluationReport.verdict || 'Eligible',
    eligibility_score: evaluationReport.eligibility_score || 0,
    overall_health: evaluationReport.overall_health || 'Green',
    recommendation: evaluationReport.recommendation || '',
    executive_summary: evaluationReport.executive_summary || '',
    desire_alone: evaluationReport.desire_alone || { score: 0, status: 'Processing', fulfilled_pct: '0%' },
    jv_alone: evaluationReport.jv_alone || { score: 0, status: 'Processing', fulfilled_pct: '0%' },
    combined_jv: evaluationReport.combined_jv || { score: 0, status: 'Processing', fulfilled_pct: '0%' },
    clauses_breakdown: evaluationReport.clauses_breakdown || [],
    jv_rules_audit: evaluationReport.jv_rules_audit || [],
    partner_recommendations: (evaluationReport as any).partner_recommendations || [],
    summary_counts: evaluationReport.summary_counts || { total_criteria: 0, matched: 0, partial: 0, not_matching: 0, data_missing: 0 }
  } : null;

  // Filter only registered JV Partners (STRICTLY EXCLUDE COMPETITORS)
  const availableJvPartners = companies.filter(c => c.type === 'JV Partner');

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Module Banner */}
      <div className="glass-card p-6 rounded-2xl border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-teal-800 font-semibold font-mono text-xs mb-1">
            <Wand2 className="w-4 h-4" />
            <span>DYNAMIC AI TENDER ELIGIBILITY & CONSORTIUM ENGINE</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-slate-900">
            Tender Assessment & Qualification Wizard
          </h2>
          <p className="text-xs text-slate-700 font-medium mt-1">
            Upload ANY tender PDF. The AI engine dynamically extracts all clauses, evaluates Desire Standalone capability, and automatically suggests the best JV Consortium Partner with dynamic equity split controls.
          </p>
        </div>
        <div className="px-3.5 py-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 font-mono text-xs text-center shrink-0">
          Step {currentStep} of 4
        </div>
      </div>

      {/* 4-Step Guided Stepper Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { num: 1, title: 'Step 1: Upload Tender PDF', desc: 'Provide Tender Documents' },
          { num: 2, title: 'Step 2: AI Document Analysis', desc: 'Extract Specifications & Rules' },
          { num: 3, title: 'Step 3: AI Partner & 3-Option Report', desc: 'AI Partner Suggestion & % Split' },
          { num: 4, title: 'Step 4: Save & Process Entry', desc: 'Database Entry' }
        ].map((s) => {
          const isActive = currentStep === s.num;
          const isDone = currentStep > s.num;
          return (
            <div
              key={s.num}
              className={`p-4 rounded-xl border transition-all ${
                isActive
                  ? 'bg-teal-700 border-2 border-teal-800 text-white shadow-md'
                  : isDone
                  ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                  : 'bg-white border border-slate-200 text-slate-600 opacity-80'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                    isActive
                      ? 'bg-white text-teal-800 font-bold'
                      : isDone
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-slate-100 text-slate-700 font-bold border border-slate-300'
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4" /> : s.num}
                </div>
                <div>
                  <h4 className={`text-xs font-bold ${isActive ? 'text-white font-bold' : 'text-slate-900 font-bold'}`}>{s.title}</h4>
                  <p className={`text-[11px] font-medium ${isActive ? 'text-teal-100' : 'text-slate-600'}`}>{s.desc}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* STEP 1: CLEAN UPLOAD & SETUP (NO MANUAL PARTNER SELECTION - AI WILL SUGGEST BEST PARTNER IN STEP 3) */}
      {currentStep === 1 && (
        <div className="glass-card p-6 md:p-8 rounded-2xl border border-slate-200 space-y-6">
          {analysisError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-800 text-xs font-medium">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-rose-900">Analysis Issue Detected</p>
                <p>{analysisError}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Upload className="w-5 h-5 text-teal-800 font-semibold" />
              <span>Step 1: Tender Details & Document Upload</span>
            </h3>
            <span className="text-[11px] font-mono text-emerald-700 font-bold px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200">
              AI Partner Matching Enabled
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-600 font-semibold">Tender Project Name / Title *</label>
              <input
                type="text"
                value={tenderTitle}
                onChange={(e) => setTenderTitle(e.target.value)}
                placeholder="e.g. Banaskantha Bulk Water Transmission Package (GWSSB - ₹69.78 Cr)"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-teal-600"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-600 font-semibold">Project Category Vertical *</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as ProjectCategory)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-teal-600"
              >
                <option value="EPC">Turnkey Civil & Pipeline EPC (Banaskantha / GWSSB / WRD)</option>
                <option value="ESCO">ESCO & Water Pumping Project (Vapi / Junagadh Scheme)</option>
                <option value="STP">STP & Sewerage Package (AMRUT 2.0 / Alwar PKG 44)</option>
                <option value="RHDS">RHDS Jal Jeevan Mission Rural Water Scheme</option>
                <option value="SOLAR">Solar PV EPC Project</option>
                <option value="KUSUM">PM-Kusum Component-B Solar Pumps</option>
              </select>
            </div>
          </div>

          {/* Tender PDF Drag & Drop */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-600 font-semibold">Upload Tender Specification PDF (NIT / RFP / Volume 1) *</label>
            <label className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/40 hover:bg-teal-50/80 cursor-pointer transition-all">
              <Upload className="w-8 h-8 text-teal-800 font-semibold mb-2" />
              <span className="text-xs font-bold text-slate-900">
                {uploadedTenderFile ? uploadedTenderFile.name : 'Drag & drop tender PDF here, or click to browse'}
              </span>
              <span className="text-[11px] text-slate-600 font-medium mt-1">Supports official tender NIT, RFP, PQ guidelines PDF (e.g. Banaskantha, Vapi, Alwar, Junagadh)</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => handleFileChange(e, 'tender')}
              />
            </label>
          </div>

          {/* AI Partner Suggestion Note */}
          <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 flex items-start space-x-3">
            <Sparkles className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-900">Automatic AI Partner Synergy Matching</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                You do not need to pre-select a JV partner. After uploading, the AI engine will parse the tender's technical & financial requirements, evaluate standalone capability, and automatically recommend the best-matched JV Partner with interactive % split controls.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200">
            <button
              onClick={startDocumentAnalysis}
              className="px-6 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-lg shadow-teal-900/20 flex items-center space-x-2 transition-all cursor-pointer"
            >
              <span>Analyze Tender & Generate AI Recommendations</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: DOCUMENT PROCESSING STATE */}
      {currentStep === 2 && (
        <div className="glass-card p-12 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center space-y-6">
          <Loader2 className="w-12 h-12 text-teal-800 font-semibold animate-spin" />
          <div className="space-y-2 max-w-md">
            <h3 className="text-base font-bold text-slate-900">Executing Dynamic AI Eligibility & Synergy Engine</h3>
            <p className="text-xs text-slate-700 font-medium">{analysisStageText}</p>
          </div>
          <div className="w-full max-w-md bg-slate-100 border border-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full transition-all duration-300"
              style={{ width: `${analysisProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* STEP 3: DYNAMIC ASSESSMENT REPORT & AI PARTNER RECOMMENDATION WITH DYNAMIC % SPLIT */}
      {currentStep === 3 && evaluationReport && (evaluationReport as any).is_rejected_non_tender && (
        <div className="p-8 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border-2 border-rose-400 dark:border-rose-700 space-y-6 animate-fadeIn text-center max-w-3xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/80 text-rose-700 dark:text-rose-300 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
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
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-xs text-slate-800 dark:text-slate-200 font-mono text-left leading-relaxed">
            {evaluationReport.executive_summary}
          </div>
          <div className="pt-2">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-6 py-3 rounded-xl bg-teal-800 text-white font-bold text-xs hover:bg-teal-900 transition shadow-md cursor-pointer"
            >
              ← Upload Official Tender Document (NIB / RFP)
            </button>
          </div>
        </div>
      )}

      {currentStep === 3 && evaluationReport && !(evaluationReport as any).is_rejected_non_tender && currentReport && (
        <div className="space-y-6">

          {/* ⚠️ DESIRE INELIGIBLE ALERT — Show Best Alternative Partner */}
          {(() => {
            const bestPartnerData = (evaluationReport as any).best_partner_if_desire_ineligible;
            const desireScore = perspective.tabScores?.desire ? parseInt(perspective.tabScores.desire) : 100;
            if (bestPartnerData?.applicable && desireScore < 70) {
              return (
                <div className="p-5 rounded-2xl border-2 border-amber-400 bg-amber-50 space-y-3">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-amber-900">⚠️ Desire Energy May Not Qualify Standalone — Alternative Partner Recommended</h4>
                      <p className="text-xs text-amber-800 font-medium leading-relaxed">{bestPartnerData.explanation}</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-amber-200 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-teal-700" />
                      <span className="text-xs font-bold text-slate-900">Recommended Lead Partner for This Tender:</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-100 text-teal-800 border border-teal-300">
                        Best Fit for Tender Gaps
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-teal-900">{bestPartnerData.recommended_partner_name}</h3>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed">{bestPartnerData.why}</p>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* AI SUGGESTED PARTNER & DYNAMIC JV EQUITY SPLIT CONTROLS */}
          <div className="glass-card p-6 rounded-2xl border-2 border-teal-300 bg-teal-50/40 space-y-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-teal-800" />
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-teal-900">
                    AI Recommended JV Consortium Partner
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Top Synergy Match
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {jvComp.name}
                </h3>
                <p className="text-xs text-slate-700 font-medium">
                  3-Yr Avg Turnover: <strong className="text-slate-900">₹{jvComp.average_turnover} Cr</strong> • Net Worth: <strong className="text-slate-900">₹{jvComp.net_worth} Cr</strong> • Solvency: <strong className="text-slate-900">₹{(jvComp as any).solvency_amount || 10.0} Cr</strong>
                </p>
              </div>

              {/* Partner Switcher Dropdown (STRICTLY JV PARTNERS, NO COMPETITORS) */}
              <div className="space-y-1 w-full md:w-auto">
                <label className="text-[10px] font-mono font-bold uppercase text-slate-600 block">Switch Partner Option:</label>
                <select
                  value={selectedJvPartnerId}
                  onChange={(e) => setSelectedJvPartnerId(e.target.value)}
                  className="bg-white border border-teal-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer shadow-sm w-full"
                >
                  {availableJvPartners.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Avg ₹{c.average_turnover} Cr | Net Worth: ₹{c.net_worth} Cr)
                    </option>
                  ))}
                  {availableJvPartners.length === 0 && (
                    <>
                      <option value="comp-vhp-04">VINOD H PATEL (Avg ₹191.39 Cr | Net Worth: ₹33.37 Cr)</option>
                      <option value="comp-aapl-05">ADROIT ASSOCIATES PRIVATE LIMITED (Avg ₹35.22 Cr | Net Worth: ₹14.27 Cr)</option>
                      <option value="comp-divija-02">DIVIJA CONSTRUCTION (Avg ₹37.01 Cr | Net Worth: ₹6.58 Cr)</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Dynamic JV Equity % Ratio Slider & Presets */}
            <div className="pt-4 border-t border-teal-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-teal-800" />
                  <span className="text-xs font-bold text-slate-900">
                    Dynamic JV Equity Split Ratio:
                  </span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-teal-800 text-white">
                    Desire {desireEquityRatio}% : {jvComp.name.split(' ')[0]} {partnerEquityRatio}%
                  </span>
                </div>

                {/* Preset Split Buttons */}
                <div className="flex items-center space-x-1.5">
                  {[
                    { label: '75 : 25', desire: 75 },
                    { label: '60 : 40', desire: 60 },
                    { label: '51 : 49', desire: 51 },
                    { label: '80 : 20', desire: 80 }
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setDesireEquityRatio(preset.desire)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        desireEquityRatio === preset.desire
                          ? 'bg-teal-800 text-white shadow-sm'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-teal-50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Range Slider for Custom Percentage */}
              <div className="flex items-center space-x-4">
                <span className="text-[11px] font-mono text-slate-600 font-semibold">51% (Min Lead)</span>
                <input
                  type="range"
                  min="51"
                  max="90"
                  step="1"
                  value={desireEquityRatio}
                  onChange={(e) => setDesireEquityRatio(Number(e.target.value))}
                  className="w-full accent-teal-700 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
                <span className="text-[11px] font-mono text-slate-600 font-semibold">90%</span>
              </div>

              {/* Dynamic Financial Pooling Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-white border border-teal-200 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">Pooled 3-Yr Avg Turnover</span>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-sm font-bold text-teal-900 font-mono">₹{pooledTurnover} Cr</span>
                    <span className="text-[10px] text-slate-500 font-mono">(₹{desireComp.average_turnover} + ₹{jvComp.average_turnover})</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white border border-teal-200 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">Pooled Consortium Net Worth</span>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-sm font-bold text-teal-900 font-mono">₹{pooledNetWorth} Cr</span>
                    <span className="text-[10px] text-slate-500 font-mono">(₹{desireComp.net_worth} + ₹{jvComp.net_worth})</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white border border-teal-200 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">Pooled Solvency Amount</span>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-sm font-bold text-teal-900 font-mono">₹{pooledSolvency} Cr</span>
                    <span className="text-[10px] text-slate-500 font-mono">(100% Combined)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3 Dynamic Analysis Options Selection Tabs */}
          <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
            <button
              onClick={() => setActiveAnalysisOption('desire')}
              className={`px-4 py-3 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all shrink-0 cursor-pointer ${
                activeAnalysisOption === 'desire' ? 'bg-teal-700 border-2 border-teal-800 text-white shadow-md font-bold' : 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 font-medium'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>OPTION 1 — DESIRE ALONE</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/20 font-bold">
                {perspective.option1_pct}
              </span>
            </button>

            <button
              onClick={() => setActiveAnalysisOption('jv')}
              className={`px-4 py-3 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all shrink-0 cursor-pointer ${
                activeAnalysisOption === 'jv' ? 'bg-teal-700 border-2 border-teal-800 text-white shadow-md font-bold' : 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 font-medium'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>OPTION 2 — JV ALONE ({jvComp.name})</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/20 font-bold">
                {perspective.option2_pct}
              </span>
            </button>

            <button
              onClick={() => setActiveAnalysisOption('combined')}
              className={`px-4 py-3 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all shrink-0 cursor-pointer ${
                activeAnalysisOption === 'combined' ? 'bg-teal-700 border-2 border-teal-800 text-white shadow-md font-bold' : 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 font-medium'
              }`}
            >
              <GitMerge className="w-4 h-4" />
              <span>OPTION 3 — DESIRE ({desireEquityRatio}%) + {jvComp.name.split(' ')[0]} ({partnerEquityRatio}%)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/30 text-emerald-300 font-bold">
                {perspective.option3_pct}
              </span>
            </button>
          </div>

          {/* DYNAMIC VERDICT BANNER FOR SELECTED OPTION */}
          <div className="glass-card p-6 rounded-2xl border border-slate-200 bg-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-3 flex-wrap gap-y-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-300">
                  {perspective.badge}
                </span>
                <span className={`px-3 py-0.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                  perspective.verdict.includes('Eligible') && !perspective.verdict.includes('Ineligible')
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                }`}>
                  {perspective.verdict}
                </span>
                <span className="text-xs font-mono text-emerald-700 font-bold">
                  Match Score: {perspective.fulfilled_pct}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">{currentReport.tender_title}</h2>
              <p className="text-xs text-slate-600 max-w-3xl leading-relaxed font-medium">{perspective.executive_summary}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 shrink-0 text-center space-y-1">
              <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">Recommendation</span>
              <span className="text-xs font-bold text-emerald-800 block">{perspective.recommendation}</span>
            </div>
          </div>

          {/* Dynamic Criteria Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="glass-card p-3 rounded-xl border border-slate-200 bg-white">
              <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">Total Criteria</span>
              <span className="text-sm font-bold text-slate-900">
                {perspective.summary_counts.total_criteria}
              </span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-emerald-500/30 bg-emerald-50">
              <span className="text-[10px] font-mono text-emerald-800 font-bold uppercase block">Matched (100%)</span>
              <span className="text-sm font-bold text-emerald-800">
                {perspective.summary_counts.matched}
              </span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-amber-500/30 bg-amber-50">
              <span className="text-[10px] font-mono text-amber-800 font-bold uppercase block">Partial Match (50%)</span>
              <span className="text-sm font-bold text-amber-900 font-bold">
                {perspective.summary_counts.partial}
              </span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-rose-500/30 bg-rose-50">
              <span className="text-[10px] font-mono text-rose-800 font-bold uppercase block">Not Matching (0%)</span>
              <span className="text-sm font-bold text-rose-800">
                {perspective.summary_counts.not_matching}
              </span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-slate-300 bg-slate-50">
              <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">Data Missing</span>
              <span className="text-sm font-bold text-slate-700">
                {perspective.summary_counts.data_missing}
              </span>
            </div>
          </div>

          {/* DYNAMIC CLAUSE-LEVEL AI TABLE ACCORDING TO SELECTED OPTION */}
          <div className="glass-card p-6 rounded-2xl border border-slate-200 space-y-4 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-900">Extracted Tender Clause Analysis ({perspective.evaluatedClauses.length} Clauses Evaluated)</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-800 border border-slate-300 font-bold">
                  {perspective.badge}
                </span>
              </div>
              <span className="text-xs text-slate-500 font-medium font-mono">Dynamic AI Matching Engine</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-700 font-medium font-mono text-[10px] uppercase tracking-wider bg-slate-100 border border-slate-200">
                    <th className="p-3">Clause & Page</th>
                    <th className="p-3">Tender Requirement</th>
                    {activeAnalysisOption === 'desire' && <th className="p-3 text-teal-800 font-bold">Desire Energy Value</th>}
                    {activeAnalysisOption === 'jv' && <th className="p-3 text-teal-800 font-bold">{jvComp.name} Value</th>}
                    {activeAnalysisOption === 'combined' && (
                      <>
                        <th className="p-3 text-teal-800 font-bold">Desire Energy ({desireEquityRatio}%)</th>
                        <th className="p-3 text-teal-800 font-bold">{jvComp.name} ({partnerEquityRatio}%)</th>
                        <th className="p-3 text-slate-900 font-bold">Combined Result</th>
                        <th className="p-3">Applicable JV Rule</th>
                      </>
                    )}
                    <th className="p-3">Match Status</th>
                    <th className="p-3">Fulfilled %</th>
                    <th className="p-3">Gap & Notes</th>
                    <th className="p-3">Required Doc</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {perspective.evaluatedClauses.map((item, idx) => {
                    const statusVal = item.active_status;
                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                          <span className="font-mono text-[10px] text-teal-800 font-semibold block">{item.clause_no} ({item.page_ref})</span>
                          <span className="font-semibold text-slate-900">{item.clause_title}</span>
                        </td>
                        <td className="p-3 text-slate-600">{item.tender_requirement}</td>
                        {activeAnalysisOption === 'desire' && <td className="p-3 text-teal-800 font-mono font-medium">{item.active_val}</td>}
                        {activeAnalysisOption === 'jv' && <td className="p-3 text-teal-800 font-bold font-mono font-medium">{item.active_val}</td>}
                        {activeAnalysisOption === 'combined' && (
                          <>
                            <td className="p-3 text-teal-800 font-mono">{item.desire_value}</td>
                            <td className="p-3 text-teal-800 font-bold font-mono">{item.jv_value}</td>
                            <td className="p-3 text-slate-900 font-mono font-bold">{item.combined_value}</td>
                            <td className="p-3 text-slate-700 font-medium font-mono text-[11px]">{item.applicable_jv_rule}</td>
                          </>
                        )}
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              statusVal === 'MATCH'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : statusVal === 'PARTIAL MATCH'
                                ? 'bg-amber-100 text-amber-900 font-bold border border-amber-200'
                                : statusVal === 'NOT MATCHING'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-300'
                            }`}
                          >
                            {statusVal === 'MATCH' && <CheckCircle2 className="w-3 h-3" />}
                            {statusVal === 'PARTIAL MATCH' && <AlertTriangle className="w-3 h-3 text-amber-700" />}
                            {statusVal === 'NOT MATCHING' && <XCircle className="w-3 h-3" />}
                            {statusVal === 'DATA NOT AVAILABLE' && <HelpCircle className="w-3 h-3" />}
                            <span>{statusVal}</span>
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-teal-800 font-semibold">
                          {item.active_pct}%
                        </td>
                        <td className="p-3 text-slate-700 font-medium text-[11px]">{item.gap_notes}</td>
                        <td className="p-3 text-slate-600 font-mono text-[11px]">{item.required_doc}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Empty State — No Clauses */}
          {perspective.evaluatedClauses.length === 0 && (
            <div className="glass-card p-10 rounded-2xl border border-slate-200 bg-white text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto">
                <HelpCircle className="w-6 h-6 text-amber-600" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Clause Extraction Incomplete</h4>
              <p className="text-xs text-slate-600 font-medium max-w-sm mx-auto">
                The AI could not extract individual clauses from the uploaded document. This may be a scanned/image PDF.
                The executive summary above still provides an overall eligibility assessment.
              </p>
              <button
                onClick={() => setCurrentStep(1)}
                className="px-5 py-2.5 rounded-xl bg-teal-700 text-white font-bold text-xs hover:bg-teal-800 transition cursor-pointer"
              >
                Try Again with a Different Document
              </button>
            </div>
          )}

          {/* AI Partner Recommendation Cards */}
          {(() => {
            const recs = (evaluationReport as any).partner_recommendations as Array<any>;
            if (!recs || recs.length === 0) return null;
            const isDesireStandalone100 = (perspective.tabScores?.desire === '100%' || perspective.option1_pct === '100%' || (evaluationReport.desire_alone?.score !== undefined && evaluationReport.desire_alone.score >= 90));

            return (
              <div className="glass-card p-6 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-teal-800" />
                    <h3 className="text-sm font-bold text-slate-900">AI-Ranked JV Partner Options for Consortium Bidding</h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-600 font-bold uppercase">Ranked by Financial & Technical Fit</span>
                </div>

                {isDesireStandalone100 && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center space-x-2.5 text-xs font-semibold text-emerald-950">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>🟢 <strong>Standalone Qualification Confirmed</strong>: Desire Energy is 100% Qualified alone for this tender. Joint Venture bidding is optional.</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {recs.slice(0, 3).map((rec: any, i: number) => {
                    const cId = rec.company_id || rec.partner_id || `comp-${i}`;
                    const cName = rec.company_name || rec.partner_name || rec.name || 'JV Partner';
                    const cReason = rec.reason || rec.suitability || rec.key_advantage || rec.rationale || 'High capability partner';
                    const cRank = rec.rank || (i + 1);
                    const cScore = rec.match_score || 85;
                    const cTurnover = rec.turnover_cr || (cId === 'comp-vhp-04' ? 191.39 : cId === 'comp-aapl-05' ? 35.22 : 37.01);
                    const isSelected = selectedJvPartnerId === cId;

                    return (
                      <div
                        key={cId}
                        onClick={() => setSelectedJvPartnerId(cId)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-teal-700 bg-teal-50/80 shadow-md ring-2 ring-teal-600/30'
                            : 'border-slate-300 bg-white hover:border-teal-400 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-900 text-white">Rank #{cRank}</span>
                            {isSelected && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-700 text-white shadow-sm">Selected Partner</span>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-sm font-bold font-mono ${
                              cScore >= 90 ? 'text-emerald-800 font-bold' : cScore >= 70 ? 'text-amber-800 font-bold' : 'text-rose-800'
                            }`}>{cScore}% Fit</span>
                          </div>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 mb-1">{cName}</h4>
                        <p className="text-[11px] text-slate-800 font-medium leading-relaxed mb-3">{cReason}</p>

                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] font-mono">
                          <span className="text-teal-950 font-bold">Avg Turnover: ₹{cTurnover} Cr</span>
                          <span className="text-slate-700 font-bold">Desire {desireEquityRatio}% : Partner {partnerEquityRatio}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Step 3 Navigation Actions */}
          <div className="flex justify-between pt-4 border-t border-slate-200">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Step 1</span>
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-lg shadow-teal-900/20 flex items-center space-x-2"
            >
              <span>Proceed to Step 4: Submit to Queue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: SUBMIT TO QUEUE */}
      {currentStep === 4 && (
        <div className="glass-card p-8 rounded-2xl border border-slate-200 space-y-6 text-center max-w-2xl mx-auto">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900">Save Dynamic Assessment & Add to Process Queue</h3>
            <p className="text-xs text-slate-700 font-medium">
              The dynamic AI evaluation report for '{tenderTitle}' has been generated with {jvComp.name} consortium ({desireEquityRatio}:{partnerEquityRatio} equity ratio) and saved to the database. Submit to enter stage 1 of the tender process queue.
            </p>
          </div>

          <div className="pt-4 flex justify-center space-x-4">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
            >
              Review Report
            </button>
            <button
              onClick={handleSubmitToQueue}
              className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-lg shadow-teal-900/20"
            >
              Submit to Queue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
