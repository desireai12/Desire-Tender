'use client';

import React, { useState, useEffect } from 'react';
import { 
  GitMerge, 
  Building2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Layers, 
  Calculator, 
  ShieldCheck, 
  ArrowRight, 
  Award, 
  FileCheck2, 
  Loader2,
  RefreshCw,
  Zap,
  TrendingUp,
  Sliders,
  ChevronRight,
  Database
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { CompanyRecord } from './CompanyDetailsView';

export interface JVEvaluationResult {
  id: string;
  tender_name: string;
  project_category: string;
  desire_company: string;
  jv_partner: string;
  desire_alone: {
    score: number;
    status: string;
    fulfilled_pct: string;
  };
  jv_alone: {
    score: number;
    status: string;
    fulfilled_pct: string;
  };
  combined_jv: {
    score: number;
    status: string;
    fulfilled_pct: string;
  };
  matrix_breakdown: {
    criterion: string;
    tender_requirement: string;
    desire_contribution: string;
    jv_contribution: string;
    combined_result: string;
    applicable_jv_rule: string;
    qualification_pct: string;
    status: string;
  }[];
  jv_rules_audit: {
    rule: string;
    requirement: string;
    actual: string;
    status: string;
  }[];
  created_at: string;
}

export const CombineAnalysisView: React.FC = () => {
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('RHDS');
  const [desireCompanyId, setDesireCompanyId] = useState<string>('comp-desire-01');
  const [jvPartnerId, setJvPartnerId] = useState<string>('comp-divija-02');
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<JVEvaluationResult | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Fetch Companies on Mount
  useEffect(() => {
    const loadMasterData = async () => {
      let comps: CompanyRecord[] = [];
      try {
        const res = await fetch(`${API_BASE_URL}/companies`);
        if (res.ok) {
          const data = await res.json();
          if (data.companies && Array.isArray(data.companies)) comps = data.companies;
        }
      } catch (e) {}

      if (comps.length === 0 && isSupabaseConfigured && supabase) {
        try {
          const { data: dbComps } = await supabase.from('companies').select('*');
          if (dbComps && dbComps.length > 0) comps = dbComps as CompanyRecord[];
        } catch (e) {}
      }

      setCompanies(comps);
      if (comps.length > 0) {
        const desireObj = comps.find(c => c.type === 'Desire Energy') || comps[0];
        const jvObj = comps.find(c => c.type === 'JV Partner') || comps[1] || comps[0];
        setDesireCompanyId(desireObj.id);
        setJvPartnerId(jvObj.id);
      }
    };
    loadMasterData();
  }, []);

  // Run Combination Calculation Engine
  const handleRunEvaluation = async () => {
    setEvaluating(true);

    try {
      const res = await fetch(`${API_BASE_URL}/eligibility/combine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tender_category: selectedCategory,
          desire_id: desireCompanyId,
          jv_partner_id: jvPartnerId
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.evaluation) {
          setEvaluation(data.evaluation);
        }
      }
    } catch (e) {} finally {
      setEvaluating(false);
    }
  };

  // Run initial evaluation on load
  useEffect(() => {
    handleRunEvaluation();
  }, [selectedCategory, desireCompanyId, jvPartnerId]);

  const desireComp = companies.find(c => c.id === desireCompanyId) || { name: 'Desire Energy Solutions Pvt. Ltd.', average_turnover: 300.93, net_worth: 95.0 };
  const jvComp = companies.find(c => c.id === jvPartnerId) || { name: 'Divija Construction', average_turnover: 37.01, net_worth: 6.58 };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 rounded-2xl border border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-teal-100 text-teal-900 border border-teal-300 font-bold font-semibold border border-teal-200">
            <GitMerge className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-wide">JV & Combine Eligibility Engine</h1>
            <p className="text-xs text-slate-700 font-medium">
              Evaluate Desire Alone vs JV Partner Alone vs Combined JV Eligibility under RHDS & Tender-specific rules.
            </p>
          </div>
        </div>

        <button
          onClick={handleRunEvaluation}
          disabled={evaluating}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold text-xs hover:brightness-110 shadow-lg shadow-cyan-500/20 transition-all shrink-0"
        >
          {evaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span>Re-Calculate Eligibility</span>
        </button>
      </div>

      {/* Selector Controls Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 glass-card p-4 rounded-xl border border-slate-200">
        {/* Tender Category */}
        <div className="space-y-1">
          <label className="text-[11px] font-mono text-slate-700 font-medium uppercase tracking-wider">Working Tender Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-slate-100 border border-slate-200 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-cyan-500"
          >
            <option value="RHDS">RHDS Jal Jeevan Mission Rural Water Supply (Min ₹60 Cr Turnover)</option>
            <option value="STP">STP & Sewerage Package 44 AMRUT 2.0 (Min ₹54.8 Cr Turnover)</option>
            <option value="SOLAR">Solar PV EPC Project (Min ₹50 Cr Turnover)</option>
            <option value="KUSUM">PM-Kusum Solar Pump Scheme (Min ₹25 Cr Turnover)</option>
            <option value="EPC">Turnkey Civil & Electrical EPC (Min ₹100 Cr Turnover)</option>
            <option value="ESCO">ESCO Energy Efficiency (Min ₹20 Cr Turnover)</option>
          </select>
        </div>

        {/* Desire Entity Selector */}
        <div className="space-y-1">
          <label className="text-[11px] font-mono text-slate-700 font-medium uppercase tracking-wider">Desire Energy Entity</label>
          <select
            value={desireCompanyId}
            onChange={(e) => setDesireCompanyId(e.target.value)}
            className="w-full bg-slate-100 border border-slate-200 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-cyan-500"
          >
            {companies.filter(c => c.type === 'Desire Energy' || c.name.includes('DESIRE')).map(c => (
              <option key={c.id} value={c.id}>{c.name} (Avg ₹{c.average_turnover} Cr)</option>
            ))}
            {companies.length === 0 && <option value="comp-desire-01">DESIRE ENERGY SOLUTIONS PVT LTD (₹300.93 Cr)</option>}
          </select>
        </div>

        {/* JV Partner Selector */}
        <div className="space-y-1">
          <label className="text-[11px] font-mono text-slate-700 font-medium uppercase tracking-wider">Select JV Partner(s)</label>
          <select
            value={jvPartnerId}
            onChange={(e) => setJvPartnerId(e.target.value)}
            className="w-full bg-slate-100 border border-slate-200 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-cyan-500"
          >
            {companies.filter(c => c.type !== 'Desire Energy').map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.type} - Avg ₹{c.average_turnover} Cr)</option>
            ))}
            {companies.length === 0 && <option value="comp-divija-02">DIVIJA CONSTRUCTION (JV Partner - ₹37.01 Cr)</option>}
          </select>
        </div>
      </div>

      {/* 3-Pillar Comparison Cards (Desire Alone vs JV Alone vs Combined JV) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Desire Energy Alone */}
        <div className="glass-card p-5 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 border border-teal-300 font-bold border border-teal-200">
              Desire Energy Alone
            </span>
            <span className="text-xs font-bold font-mono text-teal-800 font-semibold">
              {evaluation?.desire_alone?.fulfilled_pct || '501.5%'}
            </span>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{desireComp.name}</h3>
            <p className="text-xs text-slate-700 font-medium mt-1">Standalone capability evaluation</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 border border-slate-200 space-y-1.5 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-slate-700 font-medium">Avg Turnover:</span>
              <span className="font-bold text-slate-900">₹{desireComp.average_turnover || 300.93} Cr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700 font-medium">Net Worth:</span>
              <span className="font-bold text-teal-800 font-bold">₹{desireComp.net_worth || 95.0} Cr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700 font-medium">Status:</span>
              <span className="font-bold text-emerald-800 font-bold">{evaluation?.desire_alone?.status || 'Eligible'}</span>
            </div>
          </div>
        </div>

        {/* JV Partner Alone */}
        <div className="glass-card p-5 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 border border-teal-300 font-bold font-bold border border-teal-500/30">
              JV Partner Alone
            </span>
            <span className="text-xs font-bold font-mono text-teal-800 font-bold">
              {evaluation?.jv_alone?.fulfilled_pct || '61.7%'}
            </span>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{jvComp.name}</h3>
            <p className="text-xs text-slate-700 font-medium mt-1">Partner standalone capability evaluation</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 border border-slate-200 space-y-1.5 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-slate-700 font-medium">Avg Turnover:</span>
              <span className="font-bold text-slate-900">₹{jvComp.average_turnover || 37.01} Cr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700 font-medium">Net Worth:</span>
              <span className="font-bold text-teal-800 font-bold">₹{jvComp.net_worth || 6.58} Cr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700 font-medium">Status:</span>
              <span className="font-bold text-amber-900 font-bold">{evaluation?.jv_alone?.status || 'Partially Eligible'}</span>
            </div>
          </div>
        </div>

        {/* Combined JV (DESPL + Partner) */}
        <div className="glass-card p-5 rounded-2xl border border-teal-300 bg-gradient-to-br from-cyan-500/10 to-teal-500/5 space-y-4 shadow-xl shadow-cyan-500/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-800 text-white font-bold">
              Combined JV
            </span>
            <span className="text-xs font-bold font-mono text-teal-800">
              {evaluation?.combined_jv?.fulfilled_pct || '563.2%'}
            </span>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900">Combined Consortium Result</h3>
            <p className="text-xs text-slate-600 mt-1">Pooled turnover, credentials & JV rules compliance</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 border border-teal-200 space-y-1.5 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-slate-700 font-medium">Combined Turnover:</span>
              <span className="font-bold text-teal-800">₹{((desireComp.average_turnover||300.93) + (jvComp.average_turnover||37.01)).toFixed(2)} Cr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700 font-medium">Combined Net Worth:</span>
              <span className="font-bold text-teal-800 font-bold">₹{((desireComp.net_worth||95) + (jvComp.net_worth||6.58)).toFixed(2)} Cr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700 font-medium">Final Verdict:</span>
              <span className="font-bold text-emerald-800 font-bold">{evaluation?.combined_jv?.status || 'Eligible Through JV'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive Comparative Matrix Table (Section 3 & 4 Requirement) */}
      <div className="glass-card p-6 rounded-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-teal-100 text-teal-900 border border-teal-300 font-bold font-semibold">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Combined Eligibility Breakdown Matrix</h2>
              <p className="text-xs text-slate-700 font-medium">Tender Requirement vs Desire Contribution vs JV Contribution vs Combined Result</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-700 font-medium font-mono text-[11px] uppercase tracking-wider bg-slate-100 border border-slate-200">
                <th className="p-3">Eligibility Criterion</th>
                <th className="p-3">Tender Requirement</th>
                <th className="p-3 text-teal-800">Desire Energy</th>
                <th className="p-3 text-teal-800 font-bold">JV Partner</th>
                <th className="p-3 text-slate-900">Combined Result</th>
                <th className="p-3">Applicable JV Rule</th>
                <th className="p-3">Fulfilled %</th>
                <th className="p-3">Final Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {evaluation?.matrix_breakdown?.map((row, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-colors">
                  <td className="p-3 font-semibold text-slate-900">{row.criterion}</td>
                  <td className="p-3 text-slate-600">{row.tender_requirement}</td>
                  <td className="p-3 text-teal-800 font-mono font-medium">{row.desire_contribution}</td>
                  <td className="p-3 text-teal-800 font-bold font-mono font-medium">{row.jv_contribution}</td>
                  <td className="p-3 font-bold text-slate-900 font-mono">{row.combined_result}</td>
                  <td className="p-3 text-slate-700 font-medium font-mono text-[11px]">{row.applicable_jv_rule}</td>
                  <td className="p-3 font-mono font-bold text-teal-800 font-semibold">{row.qualification_pct}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{row.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* JV Rules Audit Checklist (Section 4 & 5 Requirement) */}
      <div className="glass-card p-6 rounded-2xl border border-slate-200 space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">RHDS Tender JV Rules Audit Checklist</h2>
            <p className="text-xs text-slate-700 font-medium">Verification of equity shares, lead member mandate, and credential restriction rules</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {evaluation?.jv_rules_audit?.map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-100 border border-slate-200 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{item.rule}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {item.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-700 font-medium">Requirement: <span className="text-slate-200 font-mono">{item.requirement}</span></p>
              <p className="text-[11px] text-slate-700 font-medium">Actual: <span className="text-teal-800 font-mono font-bold">{item.actual}</span></p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
