'use client';

import React, { useState } from 'react';
import { 
  Swords, 
  TrendingDown, 
  ShieldAlert, 
  CheckCircle, 
  Crosshair, 
  Zap, 
  BarChart2, 
  Award,
  Layers
} from 'lucide-react';

interface CompetitorData {
  id: string;
  name: string;
  category: 'EPC' | 'ESCO' | 'SOLAR' | 'STP' | 'KUSUM' | 'RHDS';
  historical_win_rate: string;
  bidding_pattern: string;
  avg_discount_margin: string;
  strengths: string[];
  vulnerabilities: string[];
  win_loss_rationale: string;
  recommended_counter_strategy: string;
}

export const CompetitorBattleCardsView: React.FC = () => {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');

  const [competitors] = useState<CompetitorData[]>([
    {
      id: 'comp-1',
      name: 'Larsen & Toubro (L&T Water & Effluent IC)',
      category: 'EPC',
      historical_win_rate: '68%',
      bidding_pattern: 'High-value mega EPC tenders (>₹500 Cr) with low margin discounts',
      avg_discount_margin: '5-8% below engineering baseline',
      strengths: [
        'Pan-India EPC brand equity and massive balance sheet',
        'In-house mega pipeline procurement discounts',
        'Extensive civil engineering technical manpower'
      ],
      vulnerabilities: [
        'High corporate overhead cost makes them uncompetitive on mid-sized rural packages (<₹100 Cr)',
        'Slow execution agility on remote village Jal Jeevan Mission packages',
        'Higher mobilization lead time (60+ days)'
      ],
      win_loss_rationale: 'Wins large metro WTP/STP mega projects; loses mid-scale state water supply packages to agile regional aggregators like Desire Energy.',
      recommended_counter_strategy: 'Leverage Desire Energy\'s agile Jaipur operations and 15% lower overhead to undercut L&T on mid-sized rural packages (<₹150 Cr).'
    },
    {
      id: 'comp-2',
      name: 'VA Tech Wabag Ltd',
      category: 'STP',
      historical_win_rate: '62%',
      bidding_pattern: 'Aggressive STP & wastewater treatment plant tenders with MBR/SBR technology',
      avg_discount_margin: '10-12% below baseline',
      strengths: [
        'Proprietary MBR/SBR biological sewage treatment tech licenses',
        'Global reference track record in 50+ MLD municipal STPs',
        'Strong relationships with State Pollution Control Boards'
      ],
      vulnerabilities: [
        'Limited presence in solar water pumping (PM-Kusum)',
        'High post-warranty chemical & membrane replacement costs',
        'Proprietary PLC software lock-in'
      ],
      win_loss_rationale: 'Wins high-tech municipal STP contracts; struggles on decentralized solar-powered water schemes.',
      recommended_counter_strategy: 'Highlight Desire Energy\'s integrated Sunaquator solar controllers and open-standard AquaLogix IoT telemetry to lower 10-year client O&M costs.'
    },
    {
      id: 'comp-3',
      name: 'Shakti Pumps India Ltd',
      category: 'SOLAR',
      historical_win_rate: '65%',
      bidding_pattern: 'Aggressive bidding on PM-Kusum Component-B & off-grid solar pump tenders',
      avg_discount_margin: '8-11% below MNRE benchmark cost',
      strengths: [
        'In-house solar submersible pump manufacturing',
        'Strong dealer network in Madhya Pradesh and UP',
        'BIS & MNRE test certifications for solar pumps'
      ],
      vulnerabilities: [
        'Higher unit hardware pricing compared to aggregated suppliers',
        'Limited capability in turnkey civil distribution pipeline execution',
        'Software telemetry portal lacks AI predictive maintenance analytics'
      ],
      win_loss_rationale: 'Wins standalone pump supply tenders; loses turnkey water supply EPC packages requiring civil storage & pipeline works.',
      recommended_counter_strategy: 'Emphasize Desire Energy\'s end-to-end EPC + AquaLogix AI telemetry package, offering complete village pipeline distribution beyond just pump hardware.'
    },
    {
      id: 'comp-4',
      name: 'Kirloskar Brothers Ltd (KBL)',
      category: 'ESCO',
      historical_win_rate: '55%',
      bidding_pattern: 'Conservative pricing with focus on pump efficiency regeneration',
      avg_discount_margin: '3-6% below engineering estimate',
      strengths: [
        'Decades-old legacy brand in heavy duty municipal water pumps',
        'Strong hydraulic R&D testing facilities',
        'Extensive service center network'
      ],
      vulnerabilities: [
        'Slow adoption of cloud-native IoT AI telemetry software',
        'Higher equipment capital cost',
        'Requires third-party integration for solar PV arrays'
      ],
      win_loss_rationale: 'Wins pump replacement supply orders; loses ESCO performance contracts where guaranteed energy savings require 24/7 AI telemetry.',
      recommended_counter_strategy: 'Demonstrate Desire Energy\'s BEE Grade-1 accredited ESCO model with guaranteed 20%+ power savings backed by live AquaLogix cloud dashboards.'
    },
    {
      id: 'comp-5',
      name: 'Tata Power Solar Systems',
      category: 'KUSUM',
      historical_win_rate: '60%',
      bidding_pattern: 'Premium pricing backed by Tata brand quality assurance',
      avg_discount_margin: '4-7% discount margin',
      strengths: [
        'Tier-1 Solar PV Module manufacturing (ALMM listed)',
        'Strong corporate financial credit rating (AAA)',
        'Extensive clean energy brand recognition'
      ],
      vulnerabilities: [
        'Slower 48-hour field service SLA in remote rural villages',
        'Higher total project bid pricing',
        'Limited experience in rural Over-Head Tank (OHT) civil works'
      ],
      win_loss_rationale: 'Wins premium utility-scale solar projects; loses village-level PM-Kusum tenders due to higher price tags and slower local field deployment.',
      recommended_counter_strategy: 'Highlight Desire Energy\'s 2,000+ local field workforce across 1,00,000+ villages, offering guaranteed 24-hour SLA resolution at 12% lower cost.'
    }
  ]);

  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string>('comp-1');

  const filteredCompetitors = competitors.filter(
    (c) => activeCategoryFilter === 'ALL' || c.category === activeCategoryFilter
  );

  const activeCompetitor =
    filteredCompetitors.find((c) => c.id === selectedCompetitorId) || filteredCompetitors[0] || competitors[0];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Module Banner */}
      <div className="glass-card p-6 rounded-2xl border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-purple-400 font-mono text-xs mb-1">
            <Swords className="w-4 h-4" />
            <span>PROVISION 6: COMPETITOR BATTLE CARDS MODULE</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-white">
            Indian Water & Solar Sector Competitor Intelligence
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Analyze 12-month historical bidding patterns, discount margins, technical vulnerabilities, and AI counter-strategies for L&T, Wabag, Shakti Pumps, KBL & Tata Power.
          </p>
        </div>
        <div className="px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono text-xs text-center shrink-0">
          5 Major Rivals Tracked
        </div>
      </div>

      {/* Vertical Category Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-mono text-slate-400 uppercase mr-2">Filter Vertical:</span>
        {['ALL', 'EPC', 'ESCO', 'SOLAR', 'STP', 'KUSUM', 'RHDS'].map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setActiveCategoryFilter(cat);
              const match = competitors.find((c) => cat === 'ALL' || c.category === cat);
              if (match) setSelectedCompetitorId(match.id);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
              activeCategoryFilter === cat
                ? 'bg-purple-500 text-white border-purple-400 font-bold shadow-md shadow-purple-500/20'
                : 'bg-aqua-950/60 text-slate-300 border-white/10 hover:border-purple-400/40'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Competitor Selector Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredCompetitors.map((comp) => (
          <div
            key={comp.id}
            onClick={() => setSelectedCompetitorId(comp.id)}
            className={`glass-card p-6 rounded-2xl cursor-pointer transition-all border ${
              selectedCompetitorId === comp.id
                ? 'border-purple-400 bg-purple-950/40 shadow-xl shadow-purple-500/15 ring-1 ring-purple-400/50'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
                Category: {comp.category}
              </span>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                Win Rate: {comp.historical_win_rate}
              </span>
            </div>

            <h3 className="font-display font-bold text-lg text-white mb-2">{comp.name}</h3>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-slate-400">12-Mo Discount Margin:</span>
                <span className="font-mono text-cyan-300 font-medium">{comp.avg_discount_margin}</span>
              </div>
              <p className="text-slate-400 line-clamp-2 pt-1">{comp.bidding_pattern}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Side-by-Side Analysis Card for Active Competitor */}
      <div className="glass-card p-8 rounded-2xl space-y-8 border-t-4 border-t-purple-400">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <span className="text-xs font-mono text-purple-400 uppercase">Active Battle Card Analysis</span>
            <h3 className="text-2xl font-display font-bold text-white mt-1">
              {activeCompetitor.name}
            </h3>
          </div>
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono text-xs">
              Historical Win Rate: <strong>{activeCompetitor.historical_win_rate}</strong>
            </span>
          </div>
        </div>

        {/* Strengths vs Vulnerabilities Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Key Strengths */}
          <div className="p-6 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-4">
            <h4 className="font-display font-semibold text-emerald-400 text-base flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span>Competitor Key Technical Advantages</span>
            </h4>
            <ul className="space-y-2 text-sm text-slate-200">
              {activeCompetitor.strengths.map((str, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Vulnerabilities */}
          <div className="p-6 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-4">
            <h4 className="font-display font-semibold text-rose-400 text-base flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5" />
              <span>Competitor Vulnerabilities & Weak Points</span>
            </h4>
            <ul className="space-y-2 text-sm text-slate-200">
              {activeCompetitor.vulnerabilities.map((vul, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>{vul}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Win/Loss Rationale */}
        <div className="p-5 rounded-xl bg-aqua-950/80 border border-white/10 space-y-2">
          <span className="text-xs font-mono text-slate-400 uppercase">Historical Win/Loss Rationale</span>
          <p className="text-sm text-slate-200 leading-relaxed font-medium">
            "{activeCompetitor.win_loss_rationale}"
          </p>
        </div>

        {/* AI Counter Strategy Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-cyan-950/80 via-aqua-900 to-teal-950/80 border border-cyan-400/40 space-y-3 shadow-lg shadow-cyan-500/10">
          <div className="flex items-center space-x-2 text-cyan-300 font-mono text-xs">
            <Crosshair className="w-4 h-4 text-cyan-400" />
            <span>AI RECOMMENDED BID COUNTER-STRATEGY</span>
          </div>
          <p className="text-base text-white font-semibold leading-relaxed">
            {activeCompetitor.recommended_counter_strategy}
          </p>
        </div>
      </div>
    </div>
  );
};
