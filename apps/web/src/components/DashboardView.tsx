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
  Clock
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
  recentAssessmentScore?: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  recentAssessmentScore = 92
}) => {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 p-8 text-white shadow-md">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-400/10 border border-teal-400/30 text-teal-300 text-xs font-mono">
            <Sparkles className="w-3.5 h-3.5 text-teal-300" />
            <span>Water Infrastructure Procurement Intelligence</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-white tracking-tight leading-tight">
            Instant Eligibility. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-cyan-200 to-emerald-300">
              Intelligent Costing & Bid Strategy.
            </span>
          </h1>

          <p className="text-slate-300 text-base leading-relaxed">
            Automate tender criteria cross-retrieval against company financials, evaluate competitor win/loss patterns, and generate AI-optimized costing breakdowns in seconds.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <button
              onClick={() => onNavigate('eligibility')}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold transition-all shadow-md shadow-teal-500/20 group cursor-pointer"
            >
              <FileCheck2 className="w-5 h-5" />
              <span>Check Tender Eligibility</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>

            <button
              onClick={() => onNavigate('costing')}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
            >
              <Calculator className="w-5 h-5 text-teal-300" />
              <span>Costing Estimator V2</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Check Tender Eligibility */}
        <div 
          onClick={() => onNavigate('eligibility')}
          className="glass-card rounded-2xl p-6 hover:border-teal-500/50 transition-all cursor-pointer group space-y-4"
        >
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 group-hover:scale-105 transition-transform">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg text-slate-900 group-hover:text-teal-700 transition-colors">
              Check Tender Eligibility
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Upload municipal tender PDF/DOCX for automated RAG parameter evaluation.
            </p>
          </div>
          <div className="flex items-center text-xs font-semibold text-teal-700 pt-2">
            <span>Upload Document</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Tenders Assessed Stat Badge */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-mono border border-emerald-200 font-semibold">
              +24% this month
            </span>
          </div>
          <div>
            <div className="text-3xl font-display font-bold text-slate-900">48</div>
            <p className="text-xs text-slate-500 mt-1">
              Tenders Assessed with Average Match Score of{' '}
              <span className="text-emerald-700 font-bold">{recentAssessmentScore}%</span>
            </p>
          </div>
        </div>

        {/* Card 3: View Competitor Battle Cards */}
        <div 
          onClick={() => onNavigate('competitors')}
          className="glass-card rounded-2xl p-6 hover:border-purple-300 transition-all cursor-pointer group space-y-4"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 group-hover:scale-105 transition-transform">
            <Swords className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg text-slate-900 group-hover:text-purple-700 transition-colors">
              Competitor Battle Cards
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Side-by-side win/loss rationales, bidding patterns & markup strategies.
            </p>
          </div>
          <div className="flex items-center text-xs font-semibold text-purple-700 pt-2">
            <span>Explore 4 Competitors</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 4: Knowledge Base Status Indicator */}
        <div 
          onClick={() => onNavigate('admin')}
          className="glass-card rounded-2xl p-6 hover:border-teal-300 transition-all cursor-pointer group space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <Database className="w-6 h-6" />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-mono font-semibold border border-teal-200">
              12 Chunks Indexed
            </span>
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg text-slate-900 group-hover:text-teal-700 transition-colors">
              Knowledge Base Status
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Company Credentials, Balance Sheets, ISO Certs & Past Turnovers ready.
            </p>
          </div>
        </div>

        {/* Card 5: Costing Templates */}
        <div 
          onClick={() => onNavigate('costing')}
          className="glass-card rounded-2xl p-6 hover:border-teal-300 transition-all cursor-pointer group space-y-4 md:col-span-2 lg:col-span-2"
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg text-slate-900 group-hover:text-teal-700 transition-colors">
                Costing Estimation Engine V2
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                Interactive financial line-item breakdown with custom manual overrides & AI RAG bid amount comparison.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-teal-700" />
            <h2 className="font-display font-semibold text-lg text-slate-900">
              Recent Tender Activity & Assessment Feed
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500">Real-time Updates</span>
        </div>

        <div className="space-y-3">
          {/* Feed Item 1 */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-teal-300 transition">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-slate-900">
                  Municipal Water Filtration Plant Upgrade (Tender #MWP-2026-09)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assessed 10 mins ago • 4 Parameters Checked • RAG Match Verified
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 self-end sm:self-center">
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-mono text-xs font-bold border border-emerald-200">
                VERDICT: ELIGIBLE (92%)
              </span>
              <button 
                onClick={() => onNavigate('eligibility')}
                className="text-xs text-teal-700 hover:underline font-semibold"
              >
                View Details
              </button>
            </div>
          </div>

          {/* Feed Item 2 */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-amber-300 transition">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-slate-900">
                  Regional SCADA Telemetry & Pumping Pipeline (Tender #RST-8812)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assessed 2 hours ago • ISO 27001 Certificate Audit Pending
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 self-end sm:self-center">
              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-mono text-xs font-bold border border-amber-200">
                VERDICT: CONDITIONAL (78%)
              </span>
              <button 
                onClick={() => onNavigate('eligibility')}
                className="text-xs text-teal-700 hover:underline font-semibold"
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
