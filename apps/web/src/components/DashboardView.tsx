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
  AlertTriangle, 
  Clock,
  Layers,
  Award
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
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl glass-card border border-teal-200 p-8 bg-gradient-to-r from-aqua-900 via-aqua-800 to-teal-900/60 shadow-2xl shadow-cyan-500/10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-50 rounded-full blur-3xl -z-10 pointer-events-none" />
        
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Enterprise Water Infrastructure Procurement System</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-slate-900 tracking-tight leading-tight">
            Tender Assessment Wizard. <br />
            <span className="text-[#064e3b] font-extrabold">
              6-Stage Process Queue & Company Knowledge.
            </span>
          </h1>

          <p className="text-slate-600 text-base leading-relaxed">
            Upload tender documents, evaluate company eligibility, manage department permissions across 6 stages, and maintain historical bidding insights.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <button
              onClick={() => onNavigate('wizard')}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-[#064e3b] text-white font-bold font-bold hover:bg-[#064e3b] transition-all shadow-lg shadow-cyan-400/25 group"
            >
              <FileCheck2 className="w-5 h-5" />
              <span>Start Tender Assessment</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>

            <button
              onClick={() => onNavigate('lifecycle')}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl glass-card text-slate-900 hover:bg-white/10 border border-slate-250 transition-all"
            >
              <Calculator className="w-5 h-5 text-teal-800 font-semibold" />
              <span>Tender Process Queue ({tendersCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Guided Tender Wizard */}
        <div 
          onClick={() => onNavigate('wizard')}
          className="glass-card rounded-xl p-6 hover:border-teal-300 transition-all cursor-pointer group space-y-4 relative overflow-hidden"
        >
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 font-semibold group-hover:scale-110 transition-transform">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg text-slate-900 group-hover:text-teal-800 transition-colors">
              Start Guided Wizard
            </h3>
            <p className="text-xs text-slate-700 font-medium mt-1">
              Step 1 Eligibility Gate $\rightarrow$ Step 2 PDF Upload $\rightarrow$ Step 3 20s AI Analysis $\rightarrow$ Step 4 Report.
            </p>
          </div>
          <div className="flex items-center text-xs font-mono text-teal-800 font-semibold pt-2">
            <span>Launch 4-Step Wizard</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Lifecycle Queue Stat Badge */}
        <div 
          onClick={() => onNavigate('lifecycle')}
          className="glass-card rounded-xl p-6 hover:border-emerald-400/50 transition-all cursor-pointer group space-y-4 relative"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 font-bold">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold text-xs font-mono border border-emerald-200">
              Active Pipeline
            </span>
          </div>
          <div>
            <div className="text-3xl font-display font-bold text-slate-900">{tendersCount} Tenders</div>
            <p className="text-xs text-slate-700 font-medium mt-1">
              Progressing through 6 Enterprise Stages
            </p>
          </div>
        </div>

        {/* Card 3: View Competitor Battle Cards */}
        <div 
          onClick={() => onNavigate('competitors')}
          className="glass-card rounded-xl p-6 hover:border-purple-400/50 transition-all cursor-pointer group space-y-4"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 group-hover:scale-110 transition-transform">
            <Swords className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg text-slate-900 group-hover:text-purple-800 transition-colors">
              Competitor Battle Cards
            </h3>
            <p className="text-xs text-slate-700 font-medium mt-1">
              Analyze L&T, Wabag, Shakti Pumps, KBL & Tata Power bidding patterns.
            </p>
          </div>
          <div className="flex items-center text-xs font-mono text-purple-700 pt-2">
            <span>Explore 5 Competitors</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 3.5: BidMaster Costing Engine & 164 Rates */}
        <div 
          onClick={() => onNavigate('costing')}
          className="glass-card rounded-xl p-6 hover:border-teal-300 transition-all cursor-pointer group space-y-4"
        >
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 font-semibold group-hover:scale-110 transition-transform">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg text-slate-900 group-hover:text-teal-800 transition-colors">
              BidMaster Costing Engine
            </h3>
            <p className="text-xs text-slate-700 font-medium mt-1">
              Area-wise rates for Rajasthan, Gujarat & UP from Service Price Database.
            </p>
          </div>
          <div className="flex items-center text-xs font-mono text-teal-800 font-semibold pt-2">
            <span>Access 164 Rates</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 4: Admin Knowledge Base Status Indicator */}
        <div 
          onClick={() => onNavigate('admin')}
          className="glass-card rounded-xl p-6 hover:border-teal-400/50 transition-all cursor-pointer group space-y-4 md:col-span-4"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-800 font-bold">
              <Database className="w-6 h-6" />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-800 font-bold text-xs font-mono">
              Admin Portal Only
            </span>
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg text-slate-900 group-hover:text-teal-800 font-bold transition-colors">
              5 Dedicated Knowledge Base Modules & Asset Versioning
            </h3>
            <p className="text-xs text-slate-700 font-medium mt-1">
              Restricted exclusively to System Admin. Manage Company SOPs, ISO Licenses, Competitor Intel, Past BOQs & Self-Learning feedback logs.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="glass-card rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-teal-800 font-semibold" />
            <h2 className="font-display font-semibold text-lg text-slate-900">
              Recent Tender Lifecycle Pipeline Activity Feed
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-700 font-medium">Real-time Updates</span>
        </div>

        <div className="space-y-3">
          {/* Feed Item 1 */}
          <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-teal-200 transition">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 font-bold mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-medium text-sm text-slate-900">
                  Jal Jeevan Mission (JJM) Rural Water Supply (Tender #JJM-RJ-2026-44)
                </h4>
                <p className="text-xs text-slate-700 font-medium mt-0.5">
                  Category: RHDS • Stage 2 Complete • Verified ₹300.93 Cr turnover & 1,00,000+ villages
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 self-end sm:self-center">
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold font-mono text-xs font-bold border border-emerald-200">
                STAGE 2: APPROVED
              </span>
              <button 
                onClick={() => onNavigate('lifecycle')}
                className="text-xs text-teal-800 font-semibold hover:underline font-medium"
              >
                Open Lifecycle Queue
              </button>
            </div>
          </div>

          {/* Feed Item 2 */}
          <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-teal-200 transition">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-teal-50 text-teal-800 font-semibold mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-medium text-sm text-slate-900">
                  PM-Kusum Component-B Solar Pumping (Tender #KUSUM-UP-8812)
                </h4>
                <p className="text-xs text-slate-700 font-medium mt-0.5">
                  Category: KUSUM • Stage 3 In Progress • Estimation Team BOQ Construction
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 self-end sm:self-center">
              <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 font-semibold font-mono text-xs font-bold border border-teal-200">
                STAGE 3: COSTING IN PROGRESS
              </span>
              <button 
                onClick={() => onNavigate('lifecycle')}
                className="text-xs text-teal-800 font-semibold hover:underline font-medium"
              >
                Open Lifecycle Queue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
