'use client';

import React from 'react';
import { 
  FileCheck2, 
  Swords, 
  Database, 
  Calculator, 
  TrendingUp, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Clock
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
  tendersCount?: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  tendersCount = 2
}) => {
  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Sleek Compact Hero Banner */}
      <div className="relative overflow-hidden rounded-xl glass-card border border-slate-200/90 p-5 sm:p-6 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-800" />
            <span>Enterprise Water Infrastructure Procurement System</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-display font-extrabold text-slate-900 tracking-tight leading-tight">
            Tender Assessment Wizard. <br />
            <span className="text-[#064e3b] font-extrabold">
              6-Stage Process Queue & Company Knowledge.
            </span>
          </h1>

          <p className="text-slate-700 text-xs sm:text-sm leading-relaxed font-medium">
            Upload tender documents, evaluate company eligibility, manage department permissions across 6 stages, and maintain historical bidding insights.
          </p>

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              onClick={() => onNavigate('wizard')}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#064e3b] text-white font-bold text-xs hover:bg-[#043e2f] transition-all shadow-sm group"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Start Tender Assessment</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </button>

            <button
              onClick={() => onNavigate('lifecycle')}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-250 text-slate-900 text-xs font-semibold transition-all"
            >
              <Calculator className="w-4 h-4 text-emerald-800" />
              <span>Tender Process Queue ({tendersCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Action Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Guided Tender Wizard */}
        <div 
          onClick={() => onNavigate('wizard')}
          className="glass-card bg-white/85 backdrop-blur-md rounded-xl p-4 hover:border-emerald-500/50 transition-all cursor-pointer group space-y-2.5"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-900 font-bold group-hover:scale-105 transition-transform">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm text-slate-900 group-hover:text-emerald-900 transition-colors">
              Start Guided Wizard
            </h3>
            <p className="text-[11px] text-slate-600 font-medium mt-0.5 leading-snug">
              Step 1 Eligibility $ightarrow$ Step 2 PDF Upload $ightarrow$ Step 3 AI Analysis $ightarrow$ Step 4 Report.
            </p>
          </div>
          <div className="flex items-center text-[11px] font-mono text-emerald-900 font-bold pt-1">
            <span>Launch Wizard</span>
            <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Lifecycle Queue Stat Badge */}
        <div 
          onClick={() => onNavigate('lifecycle')}
          className="glass-card bg-white/85 backdrop-blur-md rounded-xl p-4 hover:border-emerald-500/50 transition-all cursor-pointer group space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-900 font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-950 font-bold text-[10px] font-mono border border-emerald-200">
              Active Pipeline
            </span>
          </div>
          <div>
            <div className="text-xl font-display font-extrabold text-slate-900">{tendersCount} Tenders</div>
            <p className="text-[11px] text-slate-600 font-medium mt-0.5">
              Progressing through 6 Enterprise Stages
            </p>
          </div>
        </div>

        {/* Card 3: View Competitor Battle Cards */}
        <div 
          onClick={() => onNavigate('competitors')}
          className="glass-card bg-white/85 backdrop-blur-md rounded-xl p-4 hover:border-purple-300 transition-all cursor-pointer group space-y-2.5"
        >
          <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 group-hover:scale-105 transition-transform">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm text-slate-900 group-hover:text-purple-900 transition-colors">
              Competitor Profiles
            </h3>
            <p className="text-[11px] text-slate-600 font-medium mt-0.5 leading-snug">
              Analyze L&T, Wabag, Shakti Pumps, KBL & Tata Power bidding patterns.
            </p>
          </div>
          <div className="flex items-center text-[11px] font-mono text-purple-800 font-bold pt-1">
            <span>View 5 Competitors</span>
            <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 4: BidMaster Costing Engine */}
        <div 
          onClick={() => onNavigate('costing')}
          className="glass-card bg-white/85 backdrop-blur-md rounded-xl p-4 hover:border-emerald-500/50 transition-all cursor-pointer group space-y-2.5"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-900 font-bold group-hover:scale-105 transition-transform">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm text-slate-900 group-hover:text-emerald-900 transition-colors">
              BidMaster Costing
            </h3>
            <p className="text-[11px] text-slate-600 font-medium mt-0.5 leading-snug">
              Area-wise rates for Rajasthan, Gujarat & UP from Service Price DB.
            </p>
          </div>
          <div className="flex items-center text-[11px] font-mono text-emerald-900 font-bold pt-1">
            <span>Access 164 Rates</span>
            <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="glass-card bg-white/85 backdrop-blur-md rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-emerald-800" />
            <h2 className="font-display font-bold text-sm text-slate-900">
              Recent Tender Lifecycle Activity
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-600 font-medium">Real-time Updates</span>
        </div>

        <div className="space-y-2.5">
          <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-bold text-xs text-slate-900">
                  Jal Jeevan Mission (JJM) Rural Water Supply (#JJM-RJ-2026-44)
                </h4>
                <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                  Category: RHDS • Stage 2 Complete • Verified ₹300.93 Cr turnover & 1,00,000+ villages
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-950 font-bold text-[10px] font-mono shrink-0">
              STAGE 2: APPROVED
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
