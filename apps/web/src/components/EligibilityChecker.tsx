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

  const desireComp = companies.find(c => c.type === 'Desire Energy') || { name: 'Desire Energy Solutions Pvt. Ltd.', average_turnover: 300.93 };
  const jvComp = companies.find(c => c.id === selectedJvPartnerId) || { name: 'Divija Construction', average_turnover: 37.01 };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 rounded-2xl border border-white/10">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">Dynamic AI Tender Eligibility Engine</h1>
            <p className="text-xs text-slate-400">
              Upload ANY tender PDF to dynamically extract clauses & evaluate Desire Alone vs JV Alone vs Desire + JV.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Tender & Analysis Toolbar */}
      <form onSubmit={handleRunAnalysis} className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* File Upload Box */}
          <div className="md:col-span-2 space-y-1">
            <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Upload Tender PDF (or Select Working Project)
            </label>
            <div className="flex items-center space-x-3">
              <label className="flex-1 flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 cursor-pointer hover:border-cyan-500/40 transition-all">
                <span className="text-xs text-slate-300 truncate">
                  {tenderFile ? tenderFile.name : tenderTitleInput}
                </span>
                <Upload className="w-4 h-4 text-cyan-400 shrink-0 ml-2" />
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
            <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Tender Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-white/10">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <GitMerge className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-xs text-slate-400">Select JV Partner for Evaluation:</span>
            <select
              value={selectedJvPartnerId}
              onChange={(e) => setSelectedJvPartnerId(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
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
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-aqua-950 font-bold text-xs hover:brightness-110 shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 transition-all"
          >
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Analyze Tender with AI Engine</span>
          </button>
        </div>
      </form>

      {/* AI Summary Dashboard Cards (Section 10) */}
      {report && (
        <div className="space-y-6">
          {/* Executive Verdict Banner */}
          <div className="glass-card p-6 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-900 via-aqua-950/60 to-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-0.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                  report.verdict === 'Eligible' 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {report.verdict}
                </span>
                <span className="text-xs font-mono text-cyan-400">Score: {report.eligibility_score}%</span>
              </div>
              <h2 className="text-lg font-bold text-white">{report.tender_title}</h2>
              <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">{report.executive_summary}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 shrink-0 text-center space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Recommendation</span>
              <span className="text-xs font-bold text-cyan-300 block">{report.recommendation}</span>
            </div>
          </div>

          {/* 3 Dynamic Analysis Options Tabs (Section 4, 5, 6) */}
          <div className="flex items-center space-x-2 border-b border-white/10 pb-2 overflow-x-auto">
            <button
              onClick={() => setActiveAnalysisOption('desire')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all shrink-0 ${
                activeAnalysisOption === 'desire'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>OPTION 1 — DESIRE ALONE</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10">
                {report.desire_alone?.fulfilled_pct}
              </span>
            </button>

            <button
              onClick={() => setActiveAnalysisOption('jv')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all shrink-0 ${
                activeAnalysisOption === 'jv'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-lg shadow-teal-500/10'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>OPTION 2 — JV ALONE</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10">
                {report.jv_alone?.fulfilled_pct}
              </span>
            </button>

            <button
              onClick={() => setActiveAnalysisOption('combined')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all shrink-0 ${
                activeAnalysisOption === 'combined'
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-aqua-950 font-bold shadow-lg shadow-cyan-500/20'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <GitMerge className="w-4 h-4" />
              <span>OPTION 3 — DESIRE + JV COMBINED</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/30 font-bold">
                {report.combined_jv?.fulfilled_pct}
              </span>
            </button>
          </div>

          {/* Summary Criteria Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="glass-card p-3 rounded-xl border border-white/10">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Total Criteria</span>
              <span className="text-sm font-bold text-white">{report.summary_counts?.total_criteria || 5}</span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <span className="text-[10px] font-mono text-emerald-400 uppercase block">Matched</span>
              <span className="text-sm font-bold text-emerald-300">{report.summary_counts?.matched || 4}</span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <span className="text-[10px] font-mono text-amber-400 uppercase block">Partial Match</span>
              <span className="text-sm font-bold text-amber-300">{report.summary_counts?.partial || 1}</span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-rose-500/20 bg-rose-500/5">
              <span className="text-[10px] font-mono text-rose-400 uppercase block">Not Matching</span>
              <span className="text-sm font-bold text-rose-300">{report.summary_counts?.not_matching || 0}</span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-slate-500/20 bg-slate-500/5">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Data Missing</span>
              <span className="text-sm font-bold text-slate-300">{report.summary_counts?.data_missing || 0}</span>
            </div>
          </div>

          {/* Clause-Level AI Analysis Table (Section 7, 8, 9) */}
          <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Clause-Level AI Qualification Breakdown</h3>
                <p className="text-xs text-slate-400">Extracted Tender Clauses vs Master Company Credentials</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-mono text-[10px] uppercase tracking-wider bg-slate-900/60">
                    <th className="p-3">Clause & Title</th>
                    <th className="p-3">Tender Requirement</th>
                    <th className="p-3 text-cyan-300">Desire Energy</th>
                    <th className="p-3 text-teal-300">JV Partner</th>
                    <th className="p-3 text-white">Combined Result</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Gap & Notes</th>
                    <th className="p-3">Required Doc</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {report.clauses_breakdown?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="p-3">
                        <span className="font-mono text-[10px] text-cyan-400 block">{item.clause_no} ({item.page_ref})</span>
                        <span className="font-semibold text-white">{item.clause_title}</span>
                      </td>
                      <td className="p-3 text-slate-300">{item.tender_requirement}</td>
                      <td className="p-3 text-cyan-300 font-mono">{item.desire_value}</td>
                      <td className="p-3 text-teal-300 font-mono">{item.jv_value}</td>
                      <td className="p-3 text-white font-mono font-bold">{item.combined_value}</td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            item.status === 'MATCH'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : item.status === 'PARTIAL MATCH'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : item.status === 'NOT MATCHING'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : item.status === 'DATA NOT AVAILABLE'
                              ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                              : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          }`}
                        >
                          {item.status === 'MATCH' && <CheckCircle2 className="w-3 h-3" />}
                          {item.status === 'NOT MATCHING' && <XCircle className="w-3 h-3" />}
                          {item.status === 'DATA NOT AVAILABLE' && <HelpCircle className="w-3 h-3" />}
                          <span>{item.status}</span>
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 text-[11px]">{item.gap_notes}</td>
                      <td className="p-3 text-slate-300 font-mono text-[11px]">{item.required_doc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
