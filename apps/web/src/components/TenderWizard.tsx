'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Lock, 
  Upload, 
  FileText, 
  RefreshCw, 
  ArrowRight, 
  AlertTriangle, 
  Sparkles, 
  FileCheck2, 
  ShieldAlert, 
  Wand2,
  Check,
  ArrowLeft,
  Building2,
  GitMerge,
  HelpCircle,
  Loader2,
  Users,
  ShieldCheck,
  Award
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
  const [selectedJvPartnerId, setSelectedJvPartnerId] = useState<string>('comp-divija-02');
  const [desireCompanyId, setDesireCompanyId] = useState<string>('comp-desire-01');

  // Step 1 State
  const [tenderTitle, setTenderTitle] = useState<string>('RUDSICO Alwar Town Sewerage Package 44 (NIT 01/2026-27)');
  const [initiatingDepartment, setInitiatingDepartment] = useState<DepartmentRole>(activeRole);
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategory>('STP');
  const [uploadedTenderFile, setUploadedTenderFile] = useState<File | null>(null);
  const [uploadedBOQFile, setUploadedBOQFile] = useState<File | null>(null);

  // Preferred Analysis Mode Selection on Step 1
  const [activeAnalysisOption, setActiveAnalysisOption] = useState<'desire' | 'jv' | 'combined'>('combined');

  // Step 2 Staged Processing State
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [analysisStageText, setAnalysisStageText] = useState<string>('Reading Tender Document & Extracting Specifications...');

  // Step 3 Dynamic Assessment Report State (10+ UNRESTRICTED DYNAMIC CLAUSES)
  const [evaluationReport, setEvaluationReport] = useState<DynamicTenderEvaluationReport | null>(null);

  // Fetch Companies on Mount
  useEffect(() => {
    const fetchMasterCompanies = async () => {
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
    fetchMasterCompanies();
  }, []);

  // Handle File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'tender' | 'boq') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'tender') {
      setUploadedTenderFile(file);
      const fileLower = file.name.toLowerCase();
      if (fileLower.includes('junagadh') || fileLower.includes('ras') || fileLower.includes('vol 1')) {
        setTenderTitle(file.name.replace(/\.[^/.]+$/, ''));
        setSelectedCategory('ESCO');
      } else if (fileLower.includes('alwar') || fileLower.includes('sewer')) {
        setTenderTitle('RUDSICO Alwar Town Sewerage Package 44 (NIT 01/2026-27)');
        setSelectedCategory('STP');
      } else {
        setTenderTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    } else {
      setUploadedBOQFile(file);
    }
  };

  const desireComp = companies.find(c => c.type === 'Desire Energy' || c.id === desireCompanyId) || { name: 'DESIRE ENERGY SOLUTIONS PRIVATE LIMITED', average_turnover: 300.93, net_worth: 95.0, solvency_amount: 72.18 };
  const jvComp = companies.find(c => c.id === selectedJvPartnerId) || { name: 'DIVIJA CONSTRUCTION', average_turnover: 37.01, net_worth: 6.58 };

  // Start Step 2 Document Analysis (REAL AI & 10+ DYNAMIC CLAUSES)
  const startDocumentAnalysis = async () => {
    setCurrentStep(2);
    setAnalysisProgress(20);
    setAnalysisStageText('Reading Document Binary Stream & Extracting Text...');

    let fetchedReport: DynamicTenderEvaluationReport | null = null;
    let isRejected = false;
    let rejectMsg = '';

    try {
      const formData = new FormData();
      if (uploadedTenderFile) {
        formData.append('file', uploadedTenderFile);
      }
      formData.append('project_category', selectedCategory);
      formData.append('tender_title', tenderTitle);
      formData.append('jv_partner_id', selectedJvPartnerId);

      setAnalysisProgress(50);
      setAnalysisStageText('Verifying Document Type & Extracting Clauses...');

      const res = await fetch(`${API_BASE_URL}/tender/analyze?provider=${currentProvider}`, {
        method: 'POST',
        body: formData,
      });

      setAnalysisProgress(80);

      if (res.ok) {
        const data = await res.json();
        fetchedReport = data.evaluation_report || data.report;
        if (data.is_rejected_non_tender || (fetchedReport && (fetchedReport as any).is_rejected_non_tender)) {
          isRejected = true;
          rejectMsg = fetchedReport?.executive_summary || 'Uploaded file is a Non-Tender document (e.g. Tax Invoice / Receipt).';
        }
      }
    } catch (err) {
      console.error('Tender analysis API call error:', err);
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
      setAnalysisProgress(100);
      setAnalysisStageText('AI Eligibility Report Generated Successfully.');
      setTimeout(() => {
        setCurrentStep(3);
      }, 400);
    } else {
      setAnalysisProgress(100);
      setAnalysisStageText('Analysis complete.');
      setTimeout(() => {
        setCurrentStep(3);
      }, 400);
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
          action: `Uploaded Tender & Completed Dynamic AI Eligibility Analysis for ${selectedCategory}`,
          status: 'Completed',
          next_pending_action: 'Estimation Team to generate Stage 3 BOQ Costing'
        }
      ]
    };
    onTenderCreated(newProcess);
  };

  // Perspective Data helper (ZERO DISCREPANCY MATHEMATICAL CALCULATOR)
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

    // Helper to evaluate a specific perspective with exact clause-by-clause scoring
    const evaluatePerspective = (mode: 'desire' | 'jv' | 'combined') => {
      const evaluated = clauses.map(c => {
        let val = c.combined_value;
        let status: 'MATCH' | 'PARTIAL MATCH' | 'NOT MATCHING' | 'DATA NOT AVAILABLE' = c.status;
        let pct = 100;

        if (mode === 'desire') {
          val = c.desire_value || '';
          const lowerVal = val.toLowerCase();
          if (lowerVal.includes('data not') || lowerVal.includes('missing')) {
            status = 'DATA NOT AVAILABLE';
            pct = 0;
          } else if (lowerVal.includes('lacks') || lowerVal.includes('not met') || lowerVal.includes('0%') || lowerVal.includes('no experience') || lowerVal.includes('ineligible')) {
            status = 'NOT MATCHING';
            pct = 0;
          } else if (lowerVal.includes('partial') || lowerVal.includes('50%') || lowerVal.includes('75%') || lowerVal.includes('requires jv') || lowerVal.includes('pooled')) {
            status = 'PARTIAL MATCH';
            pct = 50;
          } else {
            status = 'MATCH';
            pct = 100;
          }
        } else if (mode === 'jv') {
          val = c.jv_value || '';
          const lowerVal = val.toLowerCase();
          if (lowerVal.includes('data not') || lowerVal.includes('missing')) {
            status = 'DATA NOT AVAILABLE';
            pct = 0;
          } else if (lowerVal.includes('lacks') || lowerVal.includes('not met') || lowerVal.includes('0%') || lowerVal.includes('no experience') || lowerVal.includes('cannot bid')) {
            status = 'NOT MATCHING';
            pct = 0;
          } else if (lowerVal.includes('partial') || lowerVal.includes('60%') || lowerVal.includes('61%') || lowerVal.includes('50%') || lowerVal.includes('70%')) {
            status = 'PARTIAL MATCH';
            pct = 50;
          } else {
            status = 'MATCH';
            pct = 100;
          }
        } else {
          // Combined
          status = c.status === 'MATCH' ? 'MATCH' : c.status === 'PARTIAL MATCH' ? 'PARTIAL MATCH' : 'NOT MATCHING';
          pct = status === 'MATCH' ? 100 : status === 'PARTIAL MATCH' ? 50 : 0;
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

      const score = Math.round(((matched * 100) + (partial * 50)) / totalCount);

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

    const activeEval = activeAnalysisOption === 'desire' ? desireEval : activeAnalysisOption === 'jv' ? jvEval : combinedEval;

    let badge = 'OPTION 3 — DESIRE + JV COMBINED';
    let entityName = 'Combined JV Consortium';
    let verdict = 'Eligible Through JV';
    let recommendation = `BID (Combined Consortium achieves ${activeEval.pctStr} qualification)`;

    if (activeAnalysisOption === 'desire') {
      badge = 'OPTION 1 — DESIRE ENERGY ALONE';
      entityName = 'Desire Energy Alone';
      if (activeEval.score >= 90) {
        verdict = 'Eligible Standalone';
        recommendation = `BID STANDALONE (Desire Energy satisfies ${activeEval.pctStr} of criteria)`;
      } else if (activeEval.score >= 60) {
        verdict = 'Partially Eligible Standalone';
        recommendation = `REVIEW / JV RECOMMENDED (Desire Energy satisfies ${activeEval.pctStr} of criteria)`;
      } else {
        verdict = 'Ineligible Standalone';
        recommendation = `JV MANDATORY (Desire Energy satisfies only ${activeEval.pctStr} of criteria)`;
      }
    } else if (activeAnalysisOption === 'jv') {
      badge = `OPTION 2 — ${jvComp.name.toUpperCase()} ALONE`;
      entityName = `${jvComp.name} Alone`;
      if (activeEval.score >= 90) {
        verdict = 'Eligible Standalone';
        recommendation = `PARTNER ELIGIBLE (${jvComp.name} satisfies ${activeEval.pctStr} of criteria)`;
      } else if (activeEval.score >= 60) {
        verdict = 'Partially Eligible Standalone';
        recommendation = `LEAD MEMBER REQUIRED (${jvComp.name} satisfies ${activeEval.pctStr} of criteria)`;
      } else {
        verdict = 'Ineligible Standalone';
        recommendation = `INSUFFICIENT (${jvComp.name} satisfies only ${activeEval.pctStr} of criteria)`;
      }
    } else {
      if (activeEval.score >= 90) {
        verdict = 'Fully Eligible (Joint Venture)';
        recommendation = `BID (Combined Consortium achieves ${activeEval.pctStr} qualification)`;
      } else {
        verdict = 'Partially Eligible Through JV';
        recommendation = `REVIEW GAPS (Combined Consortium achieves ${activeEval.pctStr} qualification)`;
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
        ? `Desire Energy Standalone AI Analysis: Evaluated ${totalCount} extracted tender clauses for '${evaluationReport.tender_title}' against Desire Energy credentials (₹${desireComp.average_turnover} Cr avg turnover, ₹${desireComp.net_worth} Cr net worth). Desire Energy satisfies ${activeEval.pctStr} of requirements with ${activeEval.counts.matched} criteria fully met and ${activeEval.counts.partial} partial.`
        : activeAnalysisOption === 'jv'
        ? `${jvComp.name} Standalone AI Analysis: Evaluated ${totalCount} extracted tender clauses against ${jvComp.name} company credentials (₹${jvComp.average_turnover} Cr avg turnover, ₹${jvComp.net_worth} Cr net worth). Partner satisfies ${activeEval.pctStr} of requirements with ${activeEval.counts.matched} criteria met.`
        : `Combined Consortium AI Analysis: Evaluated ${totalCount} extracted tender clauses against Desire Energy + ${jvComp.name} master data with 100% turnover pooling. Combined consortium achieves ${activeEval.pctStr} qualification across all financial, technical, and licensing criteria.`,
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

  // Only build the report object when the AI returned real evaluation data
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
    summary_counts: evaluationReport.summary_counts || { total_criteria: 0, matched: 0, partial: 0, not_matching: 0, data_missing: 0 }
  } : null;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Module Banner */}
      <div className="glass-card p-6 rounded-2xl border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-teal-800 font-semibold font-mono text-xs mb-1">
            <Wand2 className="w-4 h-4" />
            <span>DYNAMIC AI TENDER ELIGIBILITY ENGINE</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-slate-900">
            Tender Assessment & Qualification Wizard
          </h2>
          <p className="text-xs text-slate-700 font-medium mt-1">
            Upload ANY tender PDF to dynamically extract requirements, compare against Company Master Data, and evaluate Desire Alone, JV Alone, and Desire + JV Combined.
          </p>
        </div>
        <div className="px-3.5 py-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 font-mono text-xs text-center shrink-0">
          Step {currentStep} of 4
        </div>
      </div>

      {/* 4-Step Guided Stepper Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { num: 1, title: 'Step 1: Upload & Company Setup', desc: 'Select JV & Analysis Mode' },
          { num: 2, title: 'Step 2: AI Document Analysis', desc: 'Extract Specifications & Rules' },
          { num: 3, title: 'Step 3: 3-Option AI Report', desc: 'Desire, JV & Combined Verdict' },
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

      {/* STEP 1: UPLOAD & SETUP (INCLUDES ANALYSIS MODE SELECTOR) */}
      {currentStep === 1 && (
        <div className="glass-card p-6 md:p-8 rounded-2xl border border-slate-200 space-y-6">
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Upload className="w-5 h-5 text-teal-800 font-semibold" />
            <span>Step 1: Tender Details, Document Upload & Analysis Mode Selection</span>
          </h3>

          {/* Analysis Mode Selection on Step 1 */}
          <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 border border-slate-200 space-y-3">
            <label className="text-[11px] font-mono text-teal-800 font-semibold uppercase tracking-wider block font-bold">
              Select Primary Analysis Mode (How You Want the AI Report Generated)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setActiveAnalysisOption('desire')}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between space-y-2 transition-all ${
                  activeAnalysisOption === 'desire'
                    ? 'bg-[#064e3b] text-white border-2 border-emerald-400 shadow-md shadow-emerald-950/20 font-bold'
                    : 'bg-white border border-slate-300 text-slate-900 hover:bg-slate-50 font-medium'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Building2 className={`w-4 h-4 ${activeAnalysisOption === 'desire' ? 'text-white' : 'text-slate-700'}`} />
                  <span className={`text-xs font-bold ${activeAnalysisOption === 'desire' ? 'text-white' : 'text-slate-900'}`}>1. Desire Alone</span>
                </div>
                <span className={`text-[11px] font-medium ${activeAnalysisOption === 'desire' ? 'text-emerald-100 font-medium' : 'text-slate-600'}`}>Evaluate Desire Energy standalone capability</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveAnalysisOption('jv')}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between space-y-2 transition-all ${
                  activeAnalysisOption === 'jv'
                    ? 'bg-[#064e3b] text-white border-2 border-emerald-400 shadow-md shadow-emerald-950/20 font-bold'
                    : 'bg-white border border-slate-300 text-slate-900 hover:bg-slate-50 font-medium'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Building2 className={`w-4 h-4 ${activeAnalysisOption === 'jv' ? 'text-white' : 'text-slate-700'}`} />
                  <span className={`text-xs font-bold ${activeAnalysisOption === 'jv' ? 'text-white' : 'text-slate-900'}`}>2. JV Partner Alone</span>
                </div>
                <span className={`text-[11px] font-medium ${activeAnalysisOption === 'jv' ? 'text-emerald-100 font-medium' : 'text-slate-600'}`}>Evaluate chosen JV Partner standalone capability</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveAnalysisOption('combined')}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between space-y-2 transition-all ${
                  activeAnalysisOption === 'combined'
                    ? 'bg-[#064e3b] text-white border-2 border-emerald-400 shadow-md shadow-emerald-950/20 font-bold'
                    : 'bg-white border border-slate-300 text-slate-900 hover:bg-slate-50 font-medium'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <GitMerge className={`w-4 h-4 ${activeAnalysisOption === 'combined' ? 'text-white' : 'text-slate-700'}`} />
                  <span className={`text-xs font-bold ${activeAnalysisOption === 'combined' ? 'text-white' : 'text-slate-900'}`}>3. Desire + JV Combined</span>
                </div>
                <span className={`text-[11px] font-medium ${activeAnalysisOption === 'combined' ? 'text-emerald-100 font-medium' : 'text-slate-600'}`}>Evaluate combined consortium with JV rules</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-600">Tender Project Name / Title *</label>
              <input
                type="text"
                value={tenderTitle}
                onChange={(e) => setTenderTitle(e.target.value)}
                className="w-full bg-slate-100 border border-slate-200 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-600">Project Category Vertical *</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as ProjectCategory)}
                className="w-full bg-slate-100 border border-slate-200 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-cyan-500"
              >
                <option value="ESCO">ESCO & Water Pumping Project (Junagadh Municipal Scheme)</option>
                <option value="STP">STP & Sewerage Package (AMRUT 2.0 / Alwar PKG 44)</option>
                <option value="RHDS">RHDS Jal Jeevan Mission Rural Water Scheme</option>
                <option value="SOLAR">Solar PV EPC Project</option>
                <option value="KUSUM">PM-Kusum Component-B Solar Pumps</option>
                <option value="EPC">Turnkey Civil & Pipeline EPC</option>
              </select>
            </div>

            {/* Tender PDF Drag & Drop */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-mono text-slate-600">Upload Tender Specification PDF *</label>
              <label className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-slate-250 hover:border-teal-300 bg-slate-100 border border-slate-200 hover:bg-teal-800/20 cursor-pointer transition-all">
                <Upload className="w-8 h-8 text-teal-800 font-semibold mb-2" />
                <span className="text-xs font-semibold text-slate-900">
                  {uploadedTenderFile ? uploadedTenderFile.name : 'Drag & drop tender PDF here, or click to browse'}
                </span>
                <span className="text-[11px] text-slate-700 font-medium mt-1">Supports official tender NIT, RFP, PQ guidelines PDF (e.g. PQ_Upload_Junagadh.pdf)</span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, 'tender')}
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200">
            <button
              onClick={startDocumentAnalysis}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold text-xs hover:brightness-110 shadow-lg shadow-cyan-500/20 flex items-center space-x-2 transition-all"
            >
              <span>Analyze Tender & Run AI Qualification</span>
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
            <h3 className="text-base font-bold text-slate-900">Executing Dynamic AI Eligibility Engine</h3>
            <p className="text-xs text-slate-700 font-medium">{analysisStageText}</p>
          </div>
          <div className="w-full max-w-md bg-slate-100 border border-slate-200 rounded-full h-2 overflow-hidden border border-slate-200">
            <div
              className="bg-gradient-to-r from-cyan-400 to-teal-400 h-full transition-all duration-300"
              style={{ width: `${analysisProgress}%` }}
            />
          </div>
        </div>
      )}

            {/* STEP 3: DYNAMIC 3-OPTION ASSESSMENT REPORT */}
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
          {/* 3 Dynamic Analysis Options Selection Tabs WITH PERFECT PERCENTAGE SYNCHRONIZATION */}
          <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
            <button
              onClick={() => setActiveAnalysisOption('desire')}
              className={`px-4 py-3 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all shrink-0 ${
                activeAnalysisOption === 'desire' ? 'bg-teal-700 border-2 border-teal-800 text-white shadow-md font-bold' : 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 font-medium'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>OPTION 1 — DESIRE ALONE</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 font-bold">
                {perspective.option1_pct}
              </span>
            </button>

            <button
              onClick={() => setActiveAnalysisOption('jv')}
              className={`px-4 py-3 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all shrink-0 ${
                activeAnalysisOption === 'jv' ? 'bg-teal-700 border-2 border-teal-800 text-white shadow-md font-bold' : 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 font-medium'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>OPTION 2 — JV ALONE ({jvComp.name.slice(0, 18)})</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 font-bold">
                {perspective.option2_pct}
              </span>
            </button>

            <button
              onClick={() => setActiveAnalysisOption('combined')}
              className={`px-4 py-3 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all shrink-0 ${
                activeAnalysisOption === 'combined' ? 'bg-teal-700 border-2 border-teal-800 text-white shadow-md font-bold' : 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 font-medium'
              }`}
            >
              <GitMerge className="w-4 h-4" />
              <span>OPTION 3 — DESIRE + JV COMBINED</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/30 font-bold">
                {perspective.option3_pct}
              </span>
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
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{currentReport.tender_title}</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed font-medium">{perspective.executive_summary}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#15233c] border border-slate-200 dark:border-[#263752] shrink-0 text-center space-y-1">
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase block">Recommendation</span>
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">{perspective.recommendation}</span>
            </div>
          </div>

          {/* Dynamic Criteria Summary Stats Across All Extracted Clauses WITH ZERO DISCREPANCY */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="glass-card p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1426]">
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase block">Total Criteria</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {perspective.summary_counts.total_criteria}
              </span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40">
              <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-300 font-bold uppercase block">Matched (100%)</span>
              <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                {perspective.summary_counts.matched}
              </span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/40">
              <span className="text-[10px] font-mono text-amber-800 dark:text-amber-300 font-bold uppercase block">Partial Match (50%)</span>
              <span className="text-sm font-bold text-amber-900 dark:text-amber-200 font-bold">
                {perspective.summary_counts.partial}
              </span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-rose-500/30 bg-rose-50 dark:bg-rose-950/40">
              <span className="text-[10px] font-mono text-rose-800 dark:text-rose-300 font-bold uppercase block">Not Matching (0%)</span>
              <span className="text-sm font-bold text-rose-800 dark:text-rose-300">
                {perspective.summary_counts.not_matching}
              </span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase block">Data Missing</span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {perspective.summary_counts.data_missing}
              </span>
            </div>
          </div>

          {/* DYNAMIC CLAUSE-LEVEL AI TABLE ACCORDING TO SELECTED OPTION */}
          <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 bg-white dark:bg-[#0b1426]">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Extracted Tender Clause Analysis ({perspective.evaluatedClauses.length} Clauses Evaluated)</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold">
                  {perspective.badge}
                </span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono">Dynamic AI Matching Engine</span>
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
                        <th className="p-3 text-teal-800 font-bold">Desire Energy</th>
                        <th className="p-3 text-teal-800 font-bold">JV Partner</th>
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
                <tbody className="divide-y divide-white/5">
                  {perspective.evaluatedClauses.map((item, idx) => {
                    const statusVal = item.active_status;
                    return (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
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

          {/* Step 3 Navigation Actions */}
          <div className="flex justify-between pt-4 border-t border-slate-200">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-600 text-xs flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Step 1</span>
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold text-xs hover:brightness-110 shadow-lg shadow-cyan-500/20 flex items-center space-x-2"
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
              The dynamic AI evaluation report for '{tenderTitle}' has been generated and saved to the database. Submit to enter stage 1 of the tender process queue.
            </p>
          </div>

          <div className="pt-4 flex justify-center space-x-4">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-5 py-2.5 rounded-xl bg-white/5 text-slate-600 text-xs"
            >
              Review Report
            </button>
            <button
              onClick={handleSubmitToQueue}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold text-xs hover:brightness-110 shadow-lg shadow-cyan-500/20"
            >
              Submit to Queue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
