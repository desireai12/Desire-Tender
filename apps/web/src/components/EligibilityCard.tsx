'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Shield, Award } from 'lucide-react';

interface EligibilityCardProps {
  verdict: 'Eligible' | 'Conditional' | 'Ineligible';
  score: number;
  executiveSummary: string;
}

export const EligibilityCard: React.FC<EligibilityCardProps> = ({
  verdict,
  score,
  executiveSummary,
}) => {
  const getBadgeStyle = () => {
    switch (verdict) {
      case 'Eligible':
        return {
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold',
          icon: <CheckCircle2 className="w-7 h-7 text-emerald-600" />,
          ringFill: '#059669',
        };
      case 'Conditional':
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-700 font-bold',
          icon: <AlertTriangle className="w-7 h-7 text-amber-600" />,
          ringFill: '#d97706',
        };
      case 'Ineligible':
        return {
          bg: 'bg-rose-50 border-rose-200 text-rose-700 font-bold',
          icon: <XCircle className="w-7 h-7 text-rose-600" />,
          ringFill: '#e11d48',
        };
      default:
        return {
          bg: 'bg-slate-100 border-slate-200 text-slate-700',
          icon: <Shield className="w-7 h-7 text-slate-500" />,
          ringFill: '#64748b',
        };
    }
  };

  const badge = getBadgeStyle();
  const circumference = 2 * Math.PI * 22;
  const strokeOffset = circumference - ((score || 0) / 100) * circumference;

  return (
    <div className="glass-card rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
      {/* Verdict Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-2xl border ${badge.bg}`}>
            {badge.icon}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[11px] uppercase font-mono tracking-wider text-slate-500 font-semibold">
                Bid Qualification Verdict
              </span>
              <span className={`text-xs px-3 py-1 rounded-full border ${badge.bg}`}>
                {verdict ? verdict.toUpperCase() : 'ELIGIBLE'}
              </span>
            </div>
            <h2 className="text-2xl font-display font-bold text-slate-900 mt-1 tracking-tight">
              Tender Eligibility Assessment Report
            </h2>
          </div>
        </div>

        {/* Radial Score Badge */}
        <div className="flex items-center gap-4 bg-slate-50 px-5 py-4 rounded-2xl border border-slate-200 self-start md:self-auto shadow-xs">
          <div className="text-right">
            <p className="text-[11px] font-mono uppercase text-slate-500 font-semibold">RAG Match Score</p>
            <p className="text-4xl font-display font-extrabold text-slate-900 tracking-tight">
              {score}
              <span className="text-base font-mono font-normal text-slate-400">/100</span>
            </p>
          </div>
          <div className="relative w-14 h-14 shrink-0">
            <svg viewBox="0 0 50 50" className="w-14 h-14 -rotate-90">
              <circle
                cx="25" cy="25" r="22"
                stroke="#e2e8f0"
                strokeWidth="4"
                fill="none"
              />
              <circle
                cx="25" cy="25" r="22"
                stroke={badge.ringFill}
                strokeWidth="4"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Award className="w-5 h-5" style={{ color: badge.ringFill }} />
            </div>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="pt-5 space-y-2">
        <h3 className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
          AI Executive Summary
        </h3>
        <p className="text-sm text-slate-700 leading-relaxed max-w-4xl font-medium">
          {executiveSummary}
        </p>
      </div>
    </div>
  );
};
