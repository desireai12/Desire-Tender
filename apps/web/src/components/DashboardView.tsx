'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  Search, 
  MapPin, 
  Layers, 
  Building2, 
  GitMerge, 
  Calculator, 
  Swords, 
  Clock, 
  ArrowRight, 
  TrendingUp, 
  ShieldCheck, 
  CheckCircle2, 
  Globe2, 
  FileText,
  Bookmark,
  ChevronRight,
  Filter
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
  tendersCount?: number;
  onSelectTender?: (tenderTitle: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  onNavigate, 
  tendersCount = 4,
  onSelectTender 
}) => {
  const [homeSearchInput, setHomeSearchInput] = useState('');

  // Key stats inspired by BidAssist & Infralens
  const marketStats = [
    { label: 'Active Tenders in India', value: '48 Live', sub: 'Verified JJM & EPC Tenders', icon: Globe2, color: 'text-emerald-800 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/60' },
    { label: 'Total Market Value', value: '₹4,120.5 Cr', sub: 'Across 9 Target States', icon: TrendingUp, color: 'text-blue-800 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/60' },
    { label: 'Desire Turnover Match', value: '₹300.93 Cr', sub: 'Class-AA PHED Registered', icon: ShieldCheck, color: 'text-purple-800 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/60' },
    { label: 'Costing BOQ Rates', value: '244 Items', sub: 'Gujarat (Junagadh), Rajasthan & UP', icon: Calculator, color: 'text-amber-800 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/60' },
  ];

  // Top Sector Opportunities
  const topSectors = [
    { name: 'JJM & Rural Water', count: 18, value: '₹1,850 Cr', tag: 'Core Focus' },
    { name: 'Solar & Renewable (KUSUM)', count: 10, value: '₹840 Cr', tag: 'High Margin' },
    { name: 'STP & Wastewater Treatment', count: 8, value: '₹590 Cr', tag: 'AMRUT 2.0' },
    { name: 'Bulk Water Transmission', count: 6, value: '₹510 Cr', tag: 'EPC Pipeline' },
  ];

  // Top Indian States with Open Tenders
  const topStates = [
    { state: 'Rajasthan', count: 14, val: '₹1,420 Cr', authority: 'PHED & RUDSICO' },
    { state: 'Uttar Pradesh', count: 9, val: '₹980 Cr', authority: 'SWSM & UPJN' },
    { state: 'Maharashtra', count: 7, val: '₹650 Cr', authority: 'MJP & CIDCO' },
    { state: 'Gujarat', count: 6, val: '₹480 Cr', authority: 'GWSSB & GEDA' },
    { state: 'Madhya Pradesh', count: 4, val: '₹290 Cr', authority: 'MP Jal Nigam' },
  ];

  // Featured Priority Tenders (Clean BidAssist style cards)
  const priorityTenders = [
    {
      id: 'TND-RJ-2026-001',
      nit: 'NIT-PHED-JJM-ALW-44/2026',
      title: 'Solar Powered CWSS Rural Water Supply Scheme under Jal Jeevan Mission for 78 Villages in Alwar',
      authority: 'PHED Rajasthan • Alwar Circle',
      state: 'Rajasthan',
      sector: 'JJM & Rural Water',
      costCr: 48.50,
      daysLeft: 13,
      matchPct: 96,
      status: 'Direct Eligible',
    },
    {
      id: 'TND-RJ-2026-002',
      nit: 'NIT-RUDSICO-AMRUT2-STP-09',
      title: '25 MLD Sewage Treatment Plant (STP) with SBR Technology & Interception Sewer Line at Alwar Town',
      authority: 'RUDSICO Jaipur • AMRUT 2.0',
      state: 'Rajasthan',
      sector: 'STP & Wastewater',
      costCr: 36.53,
      daysLeft: 17,
      matchPct: 92,
      status: 'JV Recommended',
    },
    {
      id: 'TND-UP-2026-003',
      nit: 'SWSM-UP-JJM-PKG-114',
      title: 'Rural Water Supply Pipeline & Solar Feeder Scheme in 112 Gram Panchayats of Mirzapur & Sonbhadra',
      authority: 'SWSM Uttar Pradesh • Mirzapur Unit',
      state: 'Uttar Pradesh',
      sector: 'JJM & Rural Water',
      costCr: 112.40,
      daysLeft: 24,
      matchPct: 88,
      status: 'JV Recommended',
    },
    {
      id: 'TND-GJ-2026-005',
      nit: 'GWSSB-SUR-NCMS-2026-12',
      title: 'Turnkey Execution of Solar Submersible Pumps for Drinking Water Supply under PM-KUSUM Component-C',
      authority: 'GWSSB Gandhinagar • Surat Circle',
      state: 'Gujarat',
      sector: 'Solar & Renewable',
      costCr: 42.10,
      daysLeft: 10,
      matchPct: 98,
      status: 'Direct Eligible',
    }
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate('india_tenders');
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Modern Clean Search & Action Header (BidAssist / Infralens inspired) */}
      <div className="glass-card p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0b1426] shadow-sm relative overflow-hidden">
        <div className="max-w-4xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 text-xs font-mono font-bold flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>Desire Tender Intelligence Portal</span>
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Live Pan-India Water Infrastructure & Solar Opportunities
            </span>
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Find, Qualify & Estimate Winning Infrastructure Tenders
          </h2>

          {/* Clean Universal Search Bar */}
          <form onSubmit={handleSearchSubmit} className="pt-1">
            <div className="flex flex-col sm:flex-row items-center gap-2 bg-slate-50 dark:bg-slate-900/90 p-2 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-inner">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={homeSearchInput}
                  onChange={(e) => setHomeSearchInput(e.target.value)}
                  placeholder="Search live tenders by State (Rajasthan, UP, Maharashtra), Sector (JJM, Solar, STP), NIT No, or Authority..."
                  className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm rounded-xl bg-transparent border-0 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => onNavigate('india_tenders')}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer shrink-0"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  <span>Explore by State</span>
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#064e3b] dark:bg-[#059669] hover:bg-emerald-900 text-white font-bold text-xs flex items-center space-x-1.5 transition shadow-sm cursor-pointer shrink-0"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search Tenders</span>
                </button>
              </div>
            </div>
          </form>

          {/* Quick Suggestion Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-mono text-slate-400 font-bold">Trending:</span>
            {['JJM Rajasthan Water Supply', 'PM-KUSUM Solar Pumps', 'AMRUT 2.0 STP Sewage', 'Bulk DI Pipelines UP', 'Maharashtra Regional Schemes'].map((tag, idx) => (
              <button
                key={idx}
                onClick={() => onNavigate('india_tenders')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:text-emerald-800 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 text-[11px] font-medium transition cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Key Market Pulse Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {marketStats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="glass-card p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1527] flex items-center space-x-3.5 shadow-xs">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} shrink-0`}>
                <Icon className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold block truncate">
                  {stat.label}
                </span>
                <span className="text-base font-bold text-slate-900 dark:text-white block">
                  {stat.value}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate block">
                  {stat.sub}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. "Where in India Tenders Are Open (Sector-Wise)" Showcase Section */}
      <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#0d1527] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Globe2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>Where in India Tenders Are Open (Sector-Wise)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Live geographic tender distribution & sector volume across key Indian states
            </p>
          </div>

          <button
            onClick={() => onNavigate('india_tenders')}
            className="text-xs font-bold text-emerald-800 dark:text-emerald-400 hover:underline flex items-center space-x-1 self-start sm:self-auto cursor-pointer"
          >
            <span>Open Interactive Map & Matrix</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* State and Sector Cards Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top States Distribution */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                <span>Top Active Indian States</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">Total ₹3,820 Cr</span>
            </div>

            <div className="space-y-2">
              {topStates.map((st, idx) => (
                <div
                  key={idx}
                  onClick={() => onNavigate('india_tenders')}
                  className="p-2.5 rounded-lg bg-white dark:bg-[#0b1426] border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 transition flex items-center justify-between text-xs cursor-pointer group"
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="w-5 h-5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-bold text-[10px] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition">
                        {st.state}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                        {st.authority}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-slate-900 dark:text-white block">{st.val}</span>
                    <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                      {st.count} Active Tenders
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Sector Volumes */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                <span>Sector-Wise Opportunity Share</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">48 Open Tenders</span>
            </div>

            <div className="space-y-2">
              {topSectors.map((sec, idx) => (
                <div
                  key={idx}
                  onClick={() => onNavigate('india_tenders')}
                  className="p-2.5 rounded-lg bg-white dark:bg-[#0b1426] border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 transition flex items-center justify-between text-xs cursor-pointer group"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition">
                        {sec.name}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 font-bold">
                        {sec.tag}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                      {sec.count} Open Opportunities
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-slate-900 dark:text-white block">{sec.value}</span>
                    <span className="text-[10px] font-mono text-slate-400">Est. Volume</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Live High-Priority Tender Opportunities (Clean BidAssist Style Cards) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <FileText className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>Live Infrastructure Tenders (High Priority)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Active government tenders filtered by Desire Energy technical capabilities
            </p>
          </div>

          <button
            onClick={() => onNavigate('india_tenders')}
            className="text-xs font-bold text-emerald-800 dark:text-emerald-400 hover:underline flex items-center space-x-1 cursor-pointer"
          >
            <span>View All Tenders (48)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {priorityTenders.map((tender) => (
            <div
              key={tender.id}
              className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0d1527] hover:border-emerald-500 dark:hover:border-emerald-400 transition flex flex-col justify-between space-y-4 shadow-xs"
            >
              <div className="space-y-2.5">
                {/* Header tags */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                      {tender.nit}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-300 font-bold">
                      {tender.state}
                    </span>
                  </div>

                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    tender.status === 'Direct Eligible'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300'
                  }`}>
                    {tender.status}
                  </span>
                </div>

                {/* Title & Authority */}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                    {tender.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center space-x-1">
                    <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{tender.authority}</span>
                  </p>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left text-xs">
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase font-bold block">Tender Cost</span>
                    <span className="font-bold text-slate-900 dark:text-white">₹{tender.costCr} Cr</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase font-bold block">Closing In</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">{tender.daysLeft} Days</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase font-bold block">Eligibility Match</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">{tender.matchPct}%</span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => onNavigate('india_tenders')}
                  className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-emerald-700 flex items-center space-x-1"
                >
                  <span>Full NIT Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onNavigate('wizard')}
                    className="px-3 py-1.5 rounded-lg border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 text-xs font-bold hover:bg-purple-100 transition"
                  >
                    JV Combine
                  </button>

                  <button
                    onClick={() => onNavigate('eligibility')}
                    className="px-3.5 py-1.5 rounded-lg bg-[#064e3b] dark:bg-[#059669] text-white text-xs font-bold hover:bg-emerald-900 transition flex items-center space-x-1 shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Check Eligibility</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Clean Platform Tools Navigation Strip (Replacing clunky module boxes) */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#0d1527] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase text-slate-500 dark:text-slate-400 font-bold flex items-center space-x-1.5">
            <Building2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>Platform Engines & Workflows</span>
          </span>
          <span className="text-[11px] font-mono text-slate-400">Quick Access Toolbar</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { tab: 'eligibility' as NavTab, label: 'Eligibility Engine', desc: '10+ Clauses Audit', icon: Sparkles, color: 'text-emerald-700 dark:text-emerald-400' },
            { tab: 'wizard' as NavTab, label: 'JV / Combine Wizard', desc: 'Consortium Rules', icon: GitMerge, color: 'text-purple-700 dark:text-purple-400' },
            { tab: 'master_company' as NavTab, label: 'Company Master DB', desc: 'Financial Records', icon: Building2, color: 'text-blue-700 dark:text-blue-400' },
            { tab: 'competitors' as NavTab, label: 'Competitor Intel', desc: 'L&T, Wabag, Shakti', icon: Swords, color: 'text-amber-700 dark:text-amber-400' },
            { tab: 'lifecycle' as NavTab, label: 'Tender Process Queue', desc: `${tendersCount} Stage Pipeline`, icon: Layers, color: 'text-emerald-800 dark:text-emerald-300' },
            { tab: 'costing' as NavTab, label: 'Costing Estimator', desc: '244 BOQ Rates', icon: Calculator, color: 'text-teal-700 dark:text-teal-400' },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => onNavigate(item.tab)}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-400 text-left transition cursor-pointer group flex flex-col justify-between space-y-2.5"
              >
                <div className="flex items-center justify-between w-full">
                  <Icon className={`w-4 h-4 ${item.color}`} />
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition">
                    {item.label}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                    {item.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
