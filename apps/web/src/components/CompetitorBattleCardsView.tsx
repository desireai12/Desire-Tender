'use client';

import React, { useState } from 'react';
import { 
  Swords, 
  ShieldAlert, 
  CheckCircle, 
  Crosshair, 
  BarChart2
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
      <div className="glass-card p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-purple-700 font-mono text-xs mb-1 font-semibold">
            <Swords className="w-4 h-4" />
            <span>PROVISION 6: COMPETITOR BATTLE CARDS MODULE</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-slate-900">
            Competitor Intelligence & Counter-Strategy Engine
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Analyze 12-month historical bidding patterns, discount margins, technical vulnerabilities, and AI-recommended counter-strategies.
          </p>
        </div>
        <div className="px-4 py-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 font-mono text-xs text-center shrink-0 font-semibold">
          3 Major Rivals Tracked
        </div>
      </div>

      {/* Competitor Selector Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {competitors.map((comp) => (
          <div
            key={comp.id}
            onClick={() => setSelectedCompetitorId(comp.id)}
            className={`p-6 rounded-2xl cursor-pointer transition-all border ${
              selectedCompetitorId === comp.id
                ? 'bg-teal-50/60 border-2 border-teal-600 shadow-md ring-2 ring-teal-600/10'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                Win Rate: {comp.historical_win_rate}
              </span>
              <BarChart2 className="w-4 h-4 text-purple-600" />
            </div>

            <h3 className="font-display font-bold text-lg text-slate-900 mb-2">{comp.name}</h3>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">12-Mo Discount Margin:</span>
                <span className="font-mono text-teal-700 font-bold">{comp.avg_discount_margin}</span>
              </div>
              <p className="text-slate-500 line-clamp-2 pt-1 leading-relaxed">{comp.bidding_pattern}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Side-by-Side Analysis Card for Active Competitor */}
      <div className="glass-card p-8 rounded-2xl space-y-8 border-t-4 border-t-teal-600">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <span className="text-xs font-mono text-teal-700 uppercase font-semibold">Active Battle Card Analysis</span>
            <h3 className="text-2xl font-display font-bold text-slate-900 mt-1">
              {activeCompetitor.name}
            </h3>
          </div>
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 font-mono text-xs font-medium">
              Historical Win Rate: <strong>{activeCompetitor.historical_win_rate}</strong>
            </span>
          </div>
        </div>

        {/* Strengths vs Vulnerabilities Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Key Strengths */}
          <div className="p-6 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-4">
            <h4 className="font-display font-semibold text-emerald-800 text-base flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span>Competitor Key Technical Advantages</span>
            </h4>
            <ul className="space-y-2 text-sm text-slate-700 font-medium">
              {activeCompetitor.strengths.map((str, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Vulnerabilities */}
          <div className="p-6 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-4">
            <h4 className="font-display font-semibold text-rose-800 text-base flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <span>Competitor Vulnerabilities & Weak Points</span>
            </h4>
            <ul className="space-y-2 text-sm text-slate-700 font-medium">
              {activeCompetitor.vulnerabilities.map((vul, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <span className="text-rose-600 font-bold">•</span>
                  <span>{vul}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Win/Loss Rationale */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <span className="text-xs font-mono text-slate-500 uppercase font-semibold">Historical Win/Loss Rationale</span>
          <p className="text-sm text-slate-800 leading-relaxed font-medium">
            "{activeCompetitor.win_loss_rationale}"
          </p>
        </div>

        {/* AI Counter Strategy Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white space-y-3 shadow-md">
          <div className="flex items-center space-x-2 text-teal-300 font-mono text-xs font-semibold">
            <Crosshair className="w-4 h-4 text-teal-300" />
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
