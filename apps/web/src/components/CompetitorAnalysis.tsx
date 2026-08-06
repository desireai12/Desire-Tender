'use client';

import React from 'react';
import { Swords, TrendingDown, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

interface CompetitorItem {
  competitor_name: string;
  historical_win_rate: string;
  key_strengths: string[];
  recommended_counter_strategy: string;
}

interface CompetitorAnalysisProps {
  competitors: CompetitorItem[];
}

export const CompetitorAnalysis: React.FC<CompetitorAnalysisProps> = ({ competitors }) => {
  return (
    <div className="glass-card rounded-2xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-display font-semibold text-white">
              Competitor Intelligence Summary
            </h3>
            <p className="text-xs text-slate-400">
              Historical win rates & counter-bid strategies from RAG vector analysis
            </p>
          </div>
        </div>
        <span className="text-xs font-mono text-purple-400 border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 rounded-lg">
          {competitors.length} Rivals Tracked
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {competitors.map((comp, idx) => (
          <div
            key={idx}
            className="p-5 rounded-xl bg-aqua-950/60 border border-white/8 hover:border-purple-400/30 transition-all space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <h4 className="font-display font-bold text-white text-base">{comp.competitor_name}</h4>
              <span className="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono shrink-0">
                {comp.historical_win_rate} Win Rate
              </span>
            </div>

            {comp.key_strengths?.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-mono uppercase text-slate-400">Key Strengths</p>
                <ul className="space-y-1">
                  {comp.key_strengths.slice(0, 3).map((s, i) => (
                    <li key={i} className="flex items-start space-x-2 text-xs text-slate-300">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-purple-950/50 border border-purple-500/20 space-y-1.5">
              <p className="text-[11px] font-mono uppercase text-purple-400">Counter-Strategy</p>
              <p className="text-xs text-slate-200 leading-relaxed">
                {comp.recommended_counter_strategy}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
