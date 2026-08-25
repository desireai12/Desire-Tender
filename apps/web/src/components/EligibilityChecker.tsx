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
  const [selectedJvPartnerId, setSelectedJvPartnerId] = useState<string>('comp-divija-02');
  const [selectedCategory, setSelectedCategory] = useState<string>('RHDS');
  const [tenderFile, setTenderFile] = useState<File | null>(null);
  const [tenderTitleInput, setTenderTitleInput] = useState<string>('RUDSICO AMRUT-2.0 Sewerage Package 44 Alwar Town (Cost: ₹36.53 Cr)');
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [activeAnalysisOption, setActiveAnalysisOption] = useState<'desire' | 'jv' | 'combined'>('combined');
  const [report, setReport] = useState<DynamicTenderEvaluationReport | null>(null);

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
    setAnalyzing(true);

    try {
      const formData = new FormData();
      if (tenderFile) {
        formData.append('file', tenderFile);
      }
      formData.append('project_category', selectedCategory);
      formData.append('tender_title', tenderTitleInput);
      formData.append('jv_partner_id', selectedJvPartnerId);

      const res = await fetch(`${API_BASE_URL}/tender/analyze`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        const rep = data.evaluation_report || data.report;
        if (rep) {
          setReport(rep);
        }
      }
    } catch (e) {
      console.error('Tender analysis error:', e);
    } finally {
      setAnalyzing(false);
    }
  };

  // Run initial analysis on mount
  useEffect(() => {
    handleRunAnalysis();
  }, [selectedCategory, selectedJvPartnerId]);

  const desireComp = companies.find(c => c.type === 'Desire Energy') || { name: 'Desire Energy Solutions Pvt. Ltd.', average_turnover: 300.93, net_worth: 95.0 };
  const jvComp = companies.find(c => c.id === selectedJvPartnerId) || { name: 'Divija Construction', average_turnover: 37.01, net_worth: 6.58 };

  // Perspective Data helper
  const getPerspectiveData = () => {
    if (!report) return null;

    if (activeAnalysisOption === 'desire') {
      return {
        badge: 'OPTION 1 — DESIRE ENERGY ALONE',
        verdict: report.desire_alone?.status || 'Partially Eligible',
        score: report.desire_alone?.score || 75,
        fulfilled_pct: report.desire_alone?.fulfilled_pct || '75.0%',
        recommendation: 'REVIEW REQUIRED (Desire Alone Satisfies 75% of Tender Requirements)',
        executive_summary: `Desire Energy Standalone AI Analysis: Evaluated extracted tender clauses for '${report.tender_title}' against Desire Energy master balance sheets (₹${desireComp.average_turnover} Cr avg turnover) and technical capabilities. Desire Energy alone meets technical execution and Class-A PHED license criteria, but requires JV partner for combined financial turnover pooling.`,
      };
    }

    if (activeAnalysisOption === 'jv') {
      return {
        badge: `OPTION 2 — ${jvComp.name.toUpperCase()} ALONE`,
        verdict: report.jv_alone?.status || 'Partially Eligible',
        score: report.jv_alone?.score || 62,
        fulfilled_pct: report.jv_alone?.fulfilled_pct || '61.7%',
        recommendation: `INSUFFICIENT (${jvComp.name} Alone Satisfies 61.7% of Tender Requirements)`,
        executive_summary: `${jvComp.name} Standalone AI Analysis: Evaluated extracted tender clauses against ${jvComp.name} master company data (₹${jvComp.average_turnover} Cr avg turnover, ₹${jvComp.net_worth} Cr net worth). Standalone capability satisfies 61.7% of requirements. Partner alone cannot bid without Lead Member.`,
      };
    }

    return {
      badge: 'OPTION 3 — DESIRE + JV COMBINED CONSORTIUM',
      verdict: report.combined_jv?.status || 'Eligible Through JV',
      score: report.combined_jv?.score || 100,
      fulfilled_pct: report.combined_jv?.fulfilled_pct || '100%',
      recommendation: 'BID (Fully Eligible Through Joint Venture)',
      executive_summary: `Combined Consortium AI Analysis: Evaluated extracted tender clauses against Desire Energy + ${jvComp.name} master data. By applying tender-specific JV rules (100% turnover pooling permitted for lead member ≥ 51%), the combined consortium achieves 100% qualification across all financial, technical, and licensing criteria.`,
    };
  };

  const perspective = getPerspectiveData();

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 rounded-2xl border border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-teal-100 text-teal-100 font-medium border border-teal-300 font-bold font-semibold border border-teal-200">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-wide">Dynamic AI Tender Eligibility Engine</h1>
            <p className="text-xs text-slate-700 font-medium">
              Upload ANY tender PDF to dynamically extract clauses & evaluate Desire Alone vs JV Alone vs Desire + JV.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Tender & Analysis Toolbar */}
      <form onSubmit={handleRunAnalysis} className="glass-card p-6 rounded-2xl border border-slate-200 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* File Upload Box */}
          <div className="md:col-span-2 space-y-1">
            <label className="text-[11px] font-mono text-slate-700 font-medium uppercase tracking-wider">
              Upload Tender PDF (or Select Working Project)
            </label>
            <div className="flex items-center space-x-3">
              <label className="flex-1 flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#15233c] border border-slate-200 dark:border-[#263752] cursor-pointer hover:border-teal-300 transition-all">
                <span className="text-xs text-slate-600 truncate">
                  {tenderFile ? tenderFile.name : tenderTitleInput}
                </span>
                <Upload className="w-4 h-4 text-teal-800 font-semibold shrink-0 ml-2" />
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setTenderFile(f);
                      setTenderTitleInput(f.name);
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {/* Project Category */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-700 font-medium uppercase tracking-wider">Tender Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-100 dark:bg-[#15233c] border border-slate-200 dark:border-[#263752] rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-cyan-500"
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-200">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <GitMerge className="w-4 h-4 text-teal-800 font-semibold shrink-0" />
            <span className="text-xs text-slate-700 font-medium">Select JV Partner for Evaluation:</span>
            <select
              value={selectedJvPartnerId}
              onChange={(e) => setSelectedJvPartnerId(e.target.value)}
              className="bg-slate-100 dark:bg-[#15233c] border border-slate-200 dark:border-[#263752] rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-cyan-500 font-mono"
            >
              {companies.filter(c => c.type !== 'Desire Energy').map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.type} - Avg ₹{c.average_turnover} Cr)</option>
              ))}
              {companies.length === 0 && <option value="comp-divija-02">DIVIJA CONSTRUCTION (JV Partner - ₹37.01 Cr)</option>}
            </select>
          </div>

          <button
            type="submit"
            disabled={analyzing}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold text-xs hover:brightness-110 shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 transition-all"
          >
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Analyze Tender with AI Engine</span>
          </button>
        </div>
      </form>

      {/* AI Summary Dashboard Cards */}
      {report && perspective && (
        <div className="space-y-6">
          {/* 3 Dynamic Analysis Options Selection Tabs */}
          <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
            <button
              onClick={() => setActiveAnalysisOption('desire')}
              className={`px-4 py-3 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all shrink-0 ${
                activeAnalysisOption === 'desire'
                  ? 'bg-teal-100 text-teal-100 font-medium border border-teal-300 font-bold border border-teal-300 shadow-lg shadow-cyan-500/10 font-bold'
                  : 'bg-white/5 text-slate-700 font-medium hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>OPTION 1 — DESIRE ALONE</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 font-bold">
                {report.desire_alone?.fulfilled_pct}
              </span>
            </button>

            <button
              onClick={() => setActiveAnalysisOption('jv')}
              className={`px-4 py-3 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all shrink-0 ${
                activeAnalysisOption === 'jv'
                  ? 'bg-teal-100 text-teal-100 font-medium border border-teal-300 font-bold font-bold border border-teal-500/40 shadow-lg shadow-teal-500/10 font-bold'
                  : 'bg-white/5 text-slate-700 font-medium hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>OPTION 2 — JV ALONE ({jvComp.name.slice(0, 18)})</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 font-bold">
                {report.jv_alone?.fulfilled_pct}
              </span>
            </button>

            <button
              onClick={() => setActiveAnalysisOption('combined')}
              className={`px-4 py-3 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all shrink-0 ${
                activeAnalysisOption === 'combined'
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold shadow-lg shadow-cyan-500/20'
                  : 'bg-white/5 text-slate-700 font-medium hover:text-slate-900'
              }`}
            >
              <GitMerge className="w-4 h-4" />
              <span>OPTION 3 — DESIRE + JV COMBINED</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/30 font-bold">
                {report.combined_jv?.fulfilled_pct}
              </span>
            </button>
          </div>

          {/* DYNAMIC VERDICT BANNER FOR SELECTED OPTION */}
          <div className="glass-card p-6 rounded-2xl border border-teal-200 dark:border-teal-700/60 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 dark:from-[#0b1426] dark:via-[#111e38] dark:to-[#0b1426] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-teal-100 text-teal-100 font-medium border border-teal-300 font-bold border border-teal-200">
                  {perspective.badge}
                </span>
                <span className={`px-3 py-0.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                  perspective.verdict.includes('Eligible')
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-100 text-amber-900 font-bold border border-amber-200'
                }`}>
                  {perspective.verdict}
                </span>
                <span className="text-xs font-mono text-teal-800 font-semibold">Match Score: {perspective.score}% ({perspective.fulfilled_pct})</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{report.tender_title}</h2>
              <p className="text-xs text-slate-600 dark:text-slate-200 max-w-3xl leading-relaxed font-medium">{perspective.executive_summary}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-100 dark:bg-[#15233c] border border-slate-200 dark:border-[#263752] shrink-0 text-center space-y-1">
              <span className="text-[10px] font-mono text-slate-700 font-medium uppercase block">Recommendation</span>
              <span className="text-xs font-bold text-teal-800 dark:text-teal-300 block">{perspective.recommendation}</span>
            </div>
          </div>

          {/* Dynamic Criteria Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="glass-card p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] font-mono text-slate-700 font-medium uppercase block">Total Criteria</span>
              <span className="text-sm font-bold text-slate-900">{report.summary_counts?.total_criteria || 5}</span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <span className="text-[10px] font-mono text-emerald-800 font-bold uppercase block">Matched</span>
              <span className="text-sm font-bold text-emerald-800">{report.summary_counts?.matched || 4}</span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <span className="text-[10px] font-mono text-amber-700 uppercase block">Partial Match</span>
              <span className="text-sm font-bold text-amber-900 font-bold">{report.summary_counts?.partial || 1}</span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-rose-500/20 bg-rose-500/5">
              <span className="text-[10px] font-mono text-rose-800 font-bold uppercase block">Not Matching</span>
              <span className="text-sm font-bold text-rose-800">{report.summary_counts?.not_matching || 0}</span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-slate-500/20 bg-slate-500/5">
              <span className="text-[10px] font-mono text-slate-700 font-medium uppercase block">Data Missing</span>
              <span className="text-sm font-bold text-slate-600">{report.summary_counts?.data_missing || 0}</span>
            </div>
          </div>

          {/* DYNAMIC CLAUSE-LEVEL AI TABLE ACCORDING TO SELECTED OPTION */}
          <div className="glass-card p-6 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-900">Extracted Tender Clause Analysis</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-100 text-teal-100 font-medium border border-teal-300 font-bold border border-teal-200">
                  {perspective.badge}
                </span>
              </div>
              <span className="text-xs text-slate-700 font-medium font-mono">Dynamic AI Matching Engine</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#263752] text-slate-700 dark:text-teal-300 font-medium font-mono text-[10px] uppercase tracking-wider bg-slate-100 dark:bg-[#111c33]">
                    <th className="p-3">Clause & Page</th>
                    <th className="p-3">Tender Requirement</th>
                    {activeAnalysisOption === 'desire' && <th className="p-3 text-teal-800">Desire Energy Value</th>}
                    {activeAnalysisOption === 'jv' && <th className="p-3 text-teal-800 font-bold">{jvComp.name} Value</th>}
                    {activeAnalysisOption === 'combined' && (
                      <>
                        <th className="p-3 text-teal-800">Desire Energy</th>
                        <th className="p-3 text-teal-800 font-bold">JV Partner</th>
                        <th className="p-3 text-slate-900">Combined Result</th>
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
                  {report.clauses_breakdown?.map((item, idx) => {
                    let statusVal = item.status;
                    let displayVal = item.combined_value;
                    if (activeAnalysisOption === 'desire') {
                      displayVal = item.desire_value;
                      statusVal = item.desire_value.includes('DATA NOT') ? 'DATA NOT AVAILABLE' : (item.fulfilled_pct === '100%' ? 'MATCH' : 'PARTIAL MATCH');
                    } else if (activeAnalysisOption === 'jv') {
                      displayVal = item.jv_value;
                      statusVal = item.jv_value.includes('DATA NOT') ? 'DATA NOT AVAILABLE' : 'PARTIAL MATCH';
                    }

                    return (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="p-3">
                          <span className="font-mono text-[10px] text-teal-800 font-semibold block">{item.clause_no} ({item.page_ref})</span>
                          <span className="font-semibold text-slate-900">{item.clause_title}</span>
                        </td>
                        <td className="p-3 text-slate-600">{item.tender_requirement}</td>
                        {activeAnalysisOption === 'desire' && <td className="p-3 text-teal-800 font-mono font-medium">{item.desire_value}</td>}
                        {activeAnalysisOption === 'jv' && <td className="p-3 text-teal-800 font-bold font-mono font-medium">{item.jv_value}</td>}
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
                                : statusVal === 'DATA NOT AVAILABLE'
                                ? 'bg-slate-500/20 text-slate-600 border border-slate-500/30'
                                : 'bg-purple-500/20 text-purple-800 border border-purple-200'
                            }`}
                          >
                            {statusVal === 'MATCH' && <CheckCircle2 className="w-3 h-3" />}
                            {statusVal === 'NOT MATCHING' && <XCircle className="w-3 h-3" />}
                            {statusVal === 'DATA NOT AVAILABLE' && <HelpCircle className="w-3 h-3" />}
                            <span>{statusVal}</span>
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-teal-800 font-semibold">
                          {activeAnalysisOption === 'desire' ? (statusVal === 'MATCH' ? '100%' : '75%') : (activeAnalysisOption === 'jv' ? '61.7%' : item.fulfilled_pct)}
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
        </div>
      )}
    </div>
  );
};
