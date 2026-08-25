'use client';

import React from 'react';
import { 
  Sparkles, 
  GitMerge, 
  Building2, 
  Swords, 
  Layers, 
  Calculator, 
  FileCode, 
  ArrowRight, 
  CheckCircle2, 
  TrendingUp, 
  Award, 
  ShieldCheck, 
  FileText
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
  tendersCount?: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, tendersCount = 4 }) => {
  const modules = [
    {
      id: 'eligibility' as NavTab,
      title: 'Eligibility Analysis',
      desc: 'Evaluate Desire Alone vs JV Alone vs Desire + JV eligibility across 10+ clauses.',
      icon: Sparkles,
      badge: 'Step 1 Engine',
      color: 'from-emerald-500 to-teal-600',
    },
    {
      id: 'wizard' as NavTab,
      title: 'JV / Combine Analysis',
      desc: '6-Stage Guided Wizard to audit JV partner balance sheets & tender JV rules.',
      icon: GitMerge,
      badge: 'Consortium Audit',
      color: 'from-purple-500 to-indigo-600',
    },
    {
      id: 'master_company' as NavTab,
      title: 'Company Master DB',
      desc: 'Inspect Desire Energy & JV Partner 3-year turnover, net worth & licenses.',
      icon: Building2,
      badge: 'Financial Records',
      color: 'from-blue-500 to-cyan-600',
    },
    {
      id: 'competitors' as NavTab,
      title: 'Competitor Intelligence',
      desc: 'Analyze L&T, Wabag, Shakti Pumps, KBL & Tata Power bidding strategies.',
      icon: Swords,
      badge: 'Battle Cards',
      color: 'from-amber-500 to-orange-600',
    },
    {
      id: 'lifecycle' as NavTab,
      title: 'Tender Process Queue',
      desc: 'Track tenders through 6 enterprise stages with department authorization.',
      icon: Layers,
      badge: '6-Stage Pipeline',
      color: 'from-emerald-600 to-green-700',
    },
    {
      id: 'costing' as NavTab,
      title: 'BidMaster Costing Engine',
      desc: 'Area-wise BOQ rate calculator for Rajasthan, Gujarat & UP service prices.',
      icon: Calculator,
      badge: '164 Item Rates',
      color: 'from-teal-500 to-emerald-600',
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero Welcome Banner */}
      <div className="glass-card p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#0f1930] shadow-sm relative overflow-hidden">
        <div className="max-w-3xl space-y-3 relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 animate-pulse" />
            <span>Water Infrastructure Procurement & Intelligence Hub</span>
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Tender Assessment Command Center
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl font-medium">
            Upload tender PDFs, evaluate company eligibility, analyze JV consortium rules, manage department permissions across 6 stages, and calculate BOQ costs.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('eligibility')}
              className="px-5 py-2.5 rounded-xl bg-[#064e3b] dark:bg-[#059669] hover:bg-emerald-900 text-white font-bold text-xs flex items-center space-x-2 transition shadow-md cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch Eligibility Analysis</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>

            <button
              onClick={() => onNavigate('lifecycle')}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-900 dark:text-white font-bold text-xs border border-slate-200 dark:border-slate-700 flex items-center space-x-2 transition cursor-pointer"
            >
              <Layers className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>View Process Queue ({tendersCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6 Platform Modules Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span>Platform Modules & AI Tools</span>
          </h3>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-medium">Select module to launch</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.id}
                onClick={() => onNavigate(mod.id)}
                className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#0f1930] hover:border-emerald-500 dark:hover:border-emerald-400 transition-all duration-200 cursor-pointer group flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mod.color} text-white flex items-center justify-center shadow-md shrink-0`}>
                      <Icon className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                      {mod.badge}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-800 dark:group-hover:text-emerald-400 transition">
                    {mod.title}
                  </h4>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    {mod.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-400">
                  <span>Open Module</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Infrastructure Key Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase block">Desire Turnover</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">₹300.93 Cr Verified</span>
          </div>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 font-bold">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase block">PHED License</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">Class-A Registered</span>
          </div>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase block">Costing Rates</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">164 Items Loaded</span>
          </div>
        </div>
      </div>
    </div>
  );
};
