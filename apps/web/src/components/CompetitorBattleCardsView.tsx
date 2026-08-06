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
  historical_win_rate: string;
  bidding_pattern: string;
  avg_discount_margin: string;
  strengths: string[];
  vulnerabilities: string[];
  win_loss_rationale: string;
  recommended_counter_strategy: string;
}

export const CompetitorBattleCardsView: React.FC = () => {
  const [competitors] = useState<CompetitorData[]>([
    {
      id: 'comp-1',
      name: 'Apex Aqua Solutions',
      historical_win_rate: '64%',
      bidding_pattern: 'Aggressive Q3-Q4 municipal tender undercutting',
      avg_discount_margin: '12-15% below engineering baseline',
      strengths: [
        'Strong regional government ties',
        'Low civil labor costs',
        'Bulk pipe procurement discounts'
      ],
      vulnerabilities: [
        'Frequent PLC telemetry delays',
        'High post-warranty maintenance fees',
        'Legacy manual monitoring system'
      ],
      win_loss_rationale: 'Wins on initial low cap-ex price; loses when client evaluates 5-year operational lifecycle cost.',
      recommended_counter_strategy: 'Highlight 5-year SLA guarantees, automated cloud telemetry integration, and zero hidden maintenance fee guarantee.'
    },
    {
      id: 'comp-2',
      name: 'Vanguard Water Technologies',
      historical_win_rate: '58%',
      bidding_pattern: 'High markup bids with premium warranty packages',
      avg_discount_margin: '5-8% markup over market baseline',
      strengths: [
        'Proprietary ultrafiltration membranes',
        'High brand prestige in industrial water'
      ],
      vulnerabilities: [
        'Proprietary lock-in creates expensive spare parts',
        'Slow project deployment timelines'
      ],
      win_loss_rationale: 'Wins luxury industrial contracts; loses municipal tenders due to high long-term TCO.',
      recommended_counter_strategy: 'Emphasize non-proprietary open-standard hardware architecture to prevent expensive vendor lock-in.'
    },
    {
      id: 'comp-3',
      name: 'HydroFlow Infrastructure Ltd',
      historical_win_rate: '45%',
      bidding_pattern: 'Conservative bidding with minimal discount margin',
      avg_discount_margin: '2-4% below engineering baseline',
      strengths: [
        'Large fleet of excavation machinery',
        'ISO 9001, 14001 & 45001 certified'
      ],
      vulnerabilities: [
        'Weak AI & SCADA telemetry software team',
        'Subcontracts all software integration'
      ],
      win_loss_rationale: 'Struggles on tech-heavy tenders requiring automated flow-rate intelligence.',
      recommended_counter_strategy: 'Demonstrate our fully integrated RAG & SCADA telemetry platform for real-time leak detection.'
    }
  ]);

  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string>('comp-1');
  const activeCompetitor = competitors.find((c) => c.id === selectedCompetitorId) || competitors[0];

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
            Competitor Intelligence & Counter-Strategy Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Analyze 12-month historical bidding patterns, discount margins, technical vulnerabilities, and AI-recommended counter-strategies.
          </p>
        </div>
        <div className="px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono text-xs text-center shrink-0">
          3 Major Rivals Tracked
        </div>
      </div>

      {/* Competitor Selector Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {competitors.map((comp) => (
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
                Win Rate: {comp.historical_win_rate}
              </span>
              <BarChart2 className="w-4 h-4 text-purple-400" />
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
