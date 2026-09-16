'use client';

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { supabase } from '@/lib/supabase';
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
  Download
} from 'lucide-react';
import { CompanyRecord } from './CompanyDetailsView';

export interface ClauseBreakdownItem {
  clause_no: string;
  clause_title: string;
  requirement_type: string;
  tender_requirement: string;
  required_value: string;
  desire_value: string;
  jv_value: string;
  combined_value: string;
  applicable_jv_rule: string;
  status: 'MATCH' | 'PARTIAL MATCH' | 'NOT MATCHING' | 'DATA NOT AVAILABLE' | 'NOT APPLICABLE' | 'REQUIRES MANUAL REVIEW';
  desire_status?: 'MATCH' | 'PARTIAL MATCH' | 'NOT MATCHING' | 'DATA NOT AVAILABLE';
  jv_status?: 'MATCH' | 'PARTIAL MATCH' | 'NOT MATCHING' | 'DATA NOT AVAILABLE';
  fulfilled_pct: string;
  gap_notes: string;
  required_doc: string;
  page_ref: string;
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
  };
}

export const EligibilityChecker: React.FC = () => {
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('RHDS');
  // Auto-select optimal partner based on sector: RHDS -> Adroit, EPC -> Vinod H Patel, STP -> Divija
  const [selectedJvPartnerId, setSelectedJvPartnerId] = useState<string>('comp-aapl-05');
  const [tenderFile, setTenderFile] = useState<File | null>(null);
  const [tenderTitleInput, setTenderTitleInput] = useState<string>('');
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [activeAnalysisOption, setActiveAnalysisOption] = useState<'desire' | 'jv' | 'combined'>('combined');
  const [report, setReport] = useState<DynamicTenderEvaluationReport | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Sector-to-Partner Auto-Selection Mapping
  const getOptimalPartnerIdForCategory = (cat: string) => {
    switch (cat.toUpperCase()) {
      case 'EPC': return 'comp-vhp-04'; // Vinod H Patel (₹191.39 Cr Avg Turnover - Bulk Pipelines)
      case 'RHDS': return 'comp-aapl-05'; // Adroit Associates (₹35.22 Cr - Roshni JJM Scheme)
      case 'STP': return 'comp-divija-02'; // Divija Construction (₹37.01 Cr - 136 km Sewer)
      case 'SOLAR':
      case 'KUSUM': return 'comp-techno-06'; // Techno Electric (₹280 Cr Solar EPC)
      default: return 'comp-vhp-04';
    }
  };

  // Auto-update JV partner selection and auto-run dynamic tender analysis on category change or initial mount
  useEffect(() => {
    const optimal = getOptimalPartnerIdForCategory(selectedCategory);
    setSelectedJvPartnerId(optimal);
    handleRunAnalysis(undefined, selectedCategory, optimal);
  }, [selectedCategory]);

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
  const handleRunAnalysis = async (e?: React.FormEvent, catOverride?: string, partnerOverride?: string, fileOverride?: File | null) => {
    if (e) e.preventDefault();
    setAnalyzing(true);
    setAnalysisError(null);

    const cat = catOverride || selectedCategory;
    const partner = partnerOverride || selectedJvPartnerId;
    const fileToUse = fileOverride !== undefined ? fileOverride : tenderFile;

    try {
      let uploadedFilePath: string | null = null;
      if (fileToUse && supabase) {
        try {
          const safeName = fileToUse.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const storagePath = `tenders/${Date.now()}_${safeName}`;
          const { error: storageErr } = await supabase.storage
            .from('tender-uploads')
            .upload(storagePath, fileToUse, { upsert: true });

          if (!storageErr) {
            uploadedFilePath = storagePath;
          }
        } catch (sErr) {
          console.warn('Supabase storage upload exception in EligibilityChecker:', sErr);
        }
      }

      let res: Response;
      if (uploadedFilePath) {
        res = await fetch(`${API_BASE_URL}/tender/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_path: uploadedFilePath,
            filename: fileToUse?.name || 'uploaded_document.pdf',
            project_category: cat,
            tender_title: fileToUse ? fileToUse.name : tenderTitleInput,
            jv_partner_id: partner,
          }),
        });
      } else {
        const formData = new FormData();
        if (fileToUse) {
          formData.append('file', fileToUse);
          formData.append('filename', fileToUse.name);
        }
        formData.append('project_category', cat);
        formData.append('tender_title', fileToUse ? fileToUse.name : tenderTitleInput);
        formData.append('jv_partner_id', partner);

        res = await fetch(`${API_BASE_URL}/tender/analyze`, {
          method: 'POST',
          body: formData,
        });
      }

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'rejected' || data.is_rejected_non_tender) {
          setAnalysisError(data.message || data.reason || 'Document Rejected: Not a valid tender document.');
        } else if (data.status === 'error') {
          setAnalysisError(data.message || 'Could not complete analysis. Please retry.');
        } else {
          const rep = data.evaluation_report || data.report;
          if (rep) {
            setReport(rep);
          } else {
            setAnalysisError('Tender analysis service returned an empty report.');
          }
        }
      } else {
        const errJson = await res.json().catch(() => null);
        setAnalysisError(errJson?.message || errJson?.detail || `Tender analysis server returned error status ${res.status}.`);
      }
    } catch (e) {
      console.error('Tender analysis error:', e);
      setAnalysisError('Failed to communicate with analysis server. Please retry.');
    } finally {
      setAnalyzing(false);
    }
  };

  const desireComp = companies.find(c => c.type === 'Desire Energy') || { name: 'Desire Energy Solutions Pvt. Ltd.', average_turnover: 300.93, net_worth: 95.0 };
  const jvComp = companies.find(c => c.id === selectedJvPartnerId) || 
    (selectedJvPartnerId === 'comp-vhp-04' ? { name: 'Vinod H Patel & Co.', average_turnover: 191.39, net_worth: 33.37 } :
     selectedJvPartnerId === 'comp-aapl-05' ? { name: 'Adroit Associates Pvt. Ltd.', average_turnover: 35.22, net_worth: 14.27 } :
     { name: 'Divija Construction', average_turnover: 37.01, net_worth: 6.58 });

  // Dynamic clause & score evaluator for each perspective (Desire alone / JV alone / Combined)
  const getPerspectiveData = () => {
    if (!report) return null;
    const clauses = report.clauses_breakdown || [];
    const totalCount = clauses.length || 1;

    // Helper to evaluate a specific perspective
    const evaluatePerspective = (mode: 'desire' | 'jv' | 'combined') => {
      const evaluated = clauses.map((c: any) => {
        let val = c.combined_value;
        let status: 'MATCH' | 'PARTIAL MATCH' | 'NOT MATCHING' | 'DATA NOT AVAILABLE' = (c.combined_status || c.status) as any || 'MATCH';
        let pct = 100;

        // Desire evaluation on this clause
        let dStatus: 'MATCH' | 'PARTIAL MATCH' | 'NOT MATCHING' | 'DATA NOT AVAILABLE' = c.desire_status || 'MATCH';
        let dPct = c.desire_pct !== undefined ? c.desire_pct : (dStatus === 'MATCH' ? 100 : dStatus === 'PARTIAL MATCH' ? 50 : 0);
        if (!c.desire_status) {
          const dVal = (c.desire_value || '').toLowerCase();
          if (dVal.includes('data not') || dVal.includes('missing')) {
            dStatus = 'DATA NOT AVAILABLE'; dPct = 0;
          } else if (dVal.includes('not matching') || dVal.includes('lacks requirement') || dVal.includes('0% standalone') || dVal.includes('ineligible') || dVal.includes('cannot bid') || dVal.includes('not met') || dVal.includes('lacks certification')) {
            dStatus = 'NOT MATCHING'; dPct = 0;
          } else if (dVal.includes('partial match') || dVal.includes('partial')) {
            dStatus = 'PARTIAL MATCH'; dPct = 50;
          } else {
            dStatus = 'MATCH'; dPct = 100;
          }
        }

        // JV evaluation on this clause
        let jStatus: 'MATCH' | 'PARTIAL MATCH' | 'NOT MATCHING' | 'DATA NOT AVAILABLE' = c.jv_status || 'MATCH';
        let jPct = c.jv_pct !== undefined ? c.jv_pct : (jStatus === 'MATCH' ? 100 : jStatus === 'PARTIAL MATCH' ? 50 : 0);
        if (!c.jv_status) {
          const jVal = (c.jv_value || '').toLowerCase();
          if (jVal.includes('data not') || jVal.includes('missing')) {
            jStatus = 'DATA NOT AVAILABLE'; jPct = 0;
          } else if (jVal.includes('not matching') || jVal.includes('lacks requirement') || jVal.includes('0% standalone') || jVal.includes('ineligible') || jVal.includes('cannot bid') || jVal.includes('not met') || jVal.includes('lacks certification')) {
            jStatus = 'NOT MATCHING'; jPct = 0;
          } else if (jVal.includes('partial match') || jVal.includes('partial')) {
            jStatus = 'PARTIAL MATCH'; jPct = 50;
          } else {
            jStatus = 'MATCH'; jPct = 100;
          }
        }

        let cStatus: 'MATCH' | 'PARTIAL MATCH' | 'NOT MATCHING' | 'DATA NOT AVAILABLE' = c.combined_status || c.status || 'MATCH';
        let cPct = c.combined_pct !== undefined ? c.combined_pct : (cStatus === 'MATCH' ? 100 : cStatus === 'PARTIAL MATCH' ? 50 : 0);

        let gapNotes = c.gap_notes || '';
        if (mode === 'desire') {
          val = c.desire_value || '';
          status = dStatus;
          pct = dPct;
          if (dStatus === 'MATCH') {
            gapNotes = 'Desire Energy standalone fully meets requirement.';
          } else if (dStatus === 'PARTIAL MATCH') {
            gapNotes = `Desire Energy standalone satisfies ${dPct}% of requirement.`;
          } else {
            gapNotes = 'Desire Energy lacks this specific standalone qualification requirement.';
          }
        } else if (mode === 'jv') {
          val = c.jv_value || '';
          status = jStatus;
          pct = jPct;
          if (jStatus === 'MATCH') {
            gapNotes = `${jvComp.name} standalone fully meets requirement.`;
          } else if (jStatus === 'PARTIAL MATCH') {
            gapNotes = `${jvComp.name} standalone satisfies ${jPct}% of requirement.`;
          } else {
            gapNotes = `${jvComp.name} lacks this specific standalone qualification requirement.`;
          }
        } else {
          val = c.combined_value || `${c.desire_value || ''} + ${c.jv_value || ''}`;
          status = cStatus;
          pct = cPct;
        }

        return {
          ...c,
          active_val: val,
          active_status: status,
          active_pct: pct,
          gap_notes: gapNotes
        };
      });

      const matched = evaluated.filter((c: any) => c.active_status === 'MATCH').length;
      const partial = evaluated.filter((c: any) => c.active_status === 'PARTIAL MATCH').length;
      const notMatching = evaluated.filter((c: any) => c.active_status === 'NOT MATCHING').length;
      const missing = evaluated.filter((c: any) => c.active_status === 'DATA NOT AVAILABLE').length;

      const totalPctSum = evaluated.reduce((sum: number, item: any) => sum + (item.active_pct || 0), 0);
      const score = Math.min(100, Math.round(totalPctSum / totalCount));

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
        recommendation = `PARTNER QUALIFIED STANDALONE — ${jvComp.name} satisfies ${activeEval.pctStr} standalone. (For Desire Energy to bid, form Option 3 Consortium as Lead).`;
      } else if (activeEval.score >= 60) {
        verdict = 'Partner Partially Eligible Standalone (Incomplete Alone)';
        recommendation = `PARTNER INCOMPLETE STANDALONE — ${jvComp.name} satisfies ${activeEval.pctStr} standalone (cannot bid alone due to gaps). Must join Desire Energy as Lead Member via Option 3 Consortium.`;
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
      executive_summary: activeAnalysisOption === 'desire'
        ? `Desire Energy Standalone AI Analysis: Evaluated ${totalCount} extracted tender clauses for '${report.tender_title}' against Desire Energy credentials (₹${desireComp.average_turnover} Cr avg turnover, ₹${desireComp.net_worth} Cr net worth). Desire Energy satisfies ${activeEval.pctStr} of requirements with ${activeEval.counts.matched} criteria fully met and ${activeEval.counts.partial} partial.`
        : activeAnalysisOption === 'jv'
        ? `${jvComp.name} Standalone AI Analysis: Evaluated ${totalCount} extracted tender clauses against ${jvComp.name} company credentials (₹${jvComp.average_turnover} Cr avg turnover, ₹${jvComp.net_worth} Cr net worth). Partner satisfies ${activeEval.pctStr} of requirements with ${activeEval.counts.matched} criteria met.`
        : `Combined Consortium AI Analysis: Evaluated ${totalCount} extracted tender clauses against Desire Energy + ${jvComp.name} master data with 100% turnover pooling. Combined consortium achieves ${activeEval.pctStr} qualification across all financial, technical, and licensing criteria.`,
      summary_counts: activeEval.counts,
      evaluatedClauses: activeEval.evaluated,
      tabScores: {
        desire: desireEval.pctStr,
        jv: jvEval.pctStr,
        combined: combinedEval.pctStr
      }
    };
  };

  const perspective = getPerspectiveData();

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
                  accept=".pdf,.doc,.docx,.md,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setTenderFile(f);
                      setTenderTitleInput(f.name);
                      handleRunAnalysis(undefined, selectedCategory, selectedJvPartnerId, f);
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
              onChange={(e) => {
                const newCat = e.target.value;
                setSelectedCategory(newCat);
                const optimal = getOptimalPartnerIdForCategory(newCat);
                setSelectedJvPartnerId(optimal);
                handleRunAnalysis(undefined, newCat, optimal, tenderFile);
              }}
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
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center space-x-2">
              <GitMerge className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Select JV Partner for Evaluation:</span>
            </div>
            <select
              value={selectedJvPartnerId}
              onChange={(e) => {
                const newPartner = e.target.value;
                setSelectedJvPartnerId(newPartner);
                handleRunAnalysis(undefined, selectedCategory, newPartner, tenderFile);
              }}
              className="bg-slate-100 dark:bg-[#15233c] border border-slate-200 dark:border-[#263752] rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            >
              {companies.filter(c => c.type === 'JV Partner').map(c => (
                <option key={c.id} value={c.id}>{c.name} (Avg ₹{c.average_turnover} Cr | Net Worth: ₹{c.net_worth} Cr)</option>
              ))}
              {companies.filter(c => c.type === 'JV Partner').length === 0 && (
                <>
                  <option value="comp-vhp-04">VINOD H PATEL & CO. (Avg ₹191.39 Cr | Net Worth: ₹33.37 Cr)</option>
                  <option value="comp-aapl-05">ADROIT ASSOCIATES PVT LTD (Avg ₹35.22 Cr | Net Worth: ₹14.27 Cr)</option>
                  <option value="comp-divija-02">DIVIJA CONSTRUCTION (Avg ₹37.01 Cr | Net Worth: ₹6.58 Cr)</option>
                </>
              )}
            </select>

            {/* Optimal Partner Match Badge */}
            {selectedJvPartnerId === getOptimalPartnerIdForCategory(selectedCategory) ? (
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>OPTIMAL MATCH FOR {selectedCategory} SECTOR</span>
              </span>
            ) : (
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bold flex items-center space-x-1">
                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                <span>RECOMMENDED: {
                  getOptimalPartnerIdForCategory(selectedCategory) === 'comp-vhp-04' ? 'VINOD H PATEL' :
                  getOptimalPartnerIdForCategory(selectedCategory) === 'comp-aapl-05' ? 'ADROIT ASSOCIATES' :
                  getOptimalPartnerIdForCategory(selectedCategory) === 'comp-divija-02' ? 'DIVIJA CONSTRUCTION' : 'TECHNO ELECTRIC'
                }</span>
              </span>
            )}
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
        <div className="space-y-6">
          {/* 3 Dynamic Analysis Options Selection Tabs */}
          <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
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

          {/* Dynamic Criteria Summary Stats (Perfect Mathematical Consistency: Matched + Partial + NotMatching + Missing = Total) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="glass-card p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1426]">
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase block">Total Criteria</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">{perspective.summary_counts.total_criteria}</span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40">
              <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-300 font-bold uppercase block">Matched (100%)</span>
              <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">{perspective.summary_counts.matched}</span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/40">
              <span className="text-[10px] font-mono text-amber-800 dark:text-amber-300 font-bold uppercase block">Partial Match (50%)</span>
              <span className="text-sm font-bold text-amber-900 dark:text-amber-200 font-bold">{perspective.summary_counts.partial}</span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-rose-500/30 bg-rose-50 dark:bg-rose-950/40">
              <span className="text-[10px] font-mono text-rose-800 dark:text-rose-300 font-bold uppercase block">Not Matching (0%)</span>
              <span className="text-sm font-bold text-rose-800 dark:text-rose-300">{perspective.summary_counts.not_matching}</span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase block">Data Missing</span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{perspective.summary_counts.data_missing}</span>
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
                  <tr className="border-b border-slate-200 dark:border-[#263752] text-slate-700 dark:text-teal-300 font-medium font-mono text-[10px] uppercase tracking-wider bg-slate-100 dark:bg-[#111c33]">
                    <th className="p-3">Clause & Page</th>
                    <th className="p-3">Tender Requirement</th>
                    {activeAnalysisOption === 'desire' && <th className="p-3 text-emerald-800 dark:text-emerald-400 font-bold">Desire Energy Capability</th>}
                    {activeAnalysisOption === 'jv' && <th className="p-3 text-purple-800 dark:text-purple-400 font-bold">{jvComp.name} Capability</th>}
                    {activeAnalysisOption === 'combined' && (
                      <>
                        <th className="p-3 text-emerald-800 dark:text-emerald-400 font-bold">Desire Energy</th>
                        <th className="p-3 text-purple-800 dark:text-purple-400 font-bold">JV Partner</th>
                        <th className="p-3 text-slate-900 dark:text-white font-bold">Combined Result</th>
                        <th className="p-3">Applicable JV Rule</th>
                      </>
                    )}
                    <th className="p-3">Match Status</th>
                    <th className="p-3">Fulfilled %</th>
                    <th className="p-3">Gap & Notes</th>
                    <th className="p-3">Required Doc</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {perspective.evaluatedClauses.map((item, idx) => {
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
                            <td className="p-3 text-slate-600 dark:text-slate-400 font-mono text-[11px]">{item.applicable_jv_rule}</td>
                          </>
                        )}
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              statusVal === 'MATCH'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : statusVal === 'PARTIAL MATCH'
                                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-800'
                                : statusVal === 'NOT MATCHING'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {statusVal === 'MATCH' && <CheckCircle2 className="w-3 h-3" />}
                            {statusVal === 'NOT MATCHING' && <XCircle className="w-3 h-3" />}
                            {statusVal === 'DATA NOT AVAILABLE' && <HelpCircle className="w-3 h-3" />}
                            <span>{statusVal}</span>
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {item.active_pct}%
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300 font-medium text-[11px]">{item.gap_notes}</td>
                        <td className="p-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">{item.required_doc}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
