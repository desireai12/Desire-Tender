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
          bg: 'bg-emerald-50 border-emerald-300 text-emerald-800',
          icon: <CheckCircle2 className="w-7 h-7 text-emerald-700" />,
          ring: 'border-emerald-400',
          ringFill: '#10b981',
          banner: 'from-emerald-950/60 to-aqua-900',
          shadowColor: 'shadow-emerald-500/15',
        };
      case 'Conditional':
        return {
          bg: 'bg-amber-50 border-amber-300 text-amber-800',
          icon: <AlertTriangle className="w-7 h-7 text-amber-700" />,
          ring: 'border-amber-400',
          ringFill: '#f59e0b',
          banner: 'from-amber-950/60 to-aqua-900',
          shadowColor: 'shadow-amber-500/10',
        };
      case 'Ineligible':
        return {
          bg: 'bg-rose-50 border-rose-500/40 text-rose-800',
          icon: <XCircle className="w-7 h-7 text-rose-700" />,
          ring: 'border-rose-400',
          ringFill: '#f43f5e',
          banner: 'from-rose-950/60 to-aqua-900',
          shadowColor: 'shadow-rose-500/10',
        };
      default:
        return {
          bg: 'bg-white/5 border-slate-200 text-slate-600',
          icon: <Shield className="w-7 h-7 text-slate-500" />,
          ring: 'border-slate-600',
          ringFill: '#64748b',
          banner: 'from-aqua-900 to-aqua-800',
          shadowColor: 'shadow-slate-500/10',
        };
    }
  };

  const badge = getBadgeStyle();
  const circumference = 2 * Math.PI * 22;
  const strokeOffset = circumference - (score / 100) * circumference;

  return (
    <div className={`glass-card rounded-2xl p-6 border border-slate-200 shadow-xl ${badge.shadowColor} relative overflow-hidden`}>
      {/* Background glow orb */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none"
        style={{ background: `${badge.ringFill}15` }} />

      {/* Verdict Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-2xl border ${badge.bg}`}>
            {badge.icon}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[11px] uppercase font-mono tracking-widest text-slate-500">
                Bid Qualification Verdict
              </span>
              <span className={`text-xs px-3 py-1 rounded-full font-bold border ${badge.bg}`}>
                {verdict.toUpperCase()}
              </span>
            </div>
            <h2 className="text-2xl font-display font-bold text-white mt-1 tracking-tight">
              Tender Eligibility Assessment Report
            </h2>
          </div>
        </div>

        {/* Radial Score Badge */}
        <div className={`flex items-center gap-4 glass-card px-5 py-4 rounded-2xl border ${badge.ring} self-start md:self-auto shadow-md`}>
          <div className="text-right">
            <p className="text-[11px] font-mono uppercase text-slate-500">RAG Match Score</p>
            <p className="text-4xl font-display font-extrabold text-white tracking-tight">
              {score}
              <span className="text-base font-mono font-normal text-slate-500">/100</span>
            </p>
          </div>
          <div className="relative w-14 h-14 shrink-0">
            <svg viewBox="0 0 50 50" className="w-14 h-14 -rotate-90">
              <circle
                cx="25" cy="25" r="22"
                stroke="#272a2c"
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
        <h3 className="text-[11px] font-mono uppercase tracking-widest text-slate-500">
          AI Executive Summary
        </h3>
        <p className="text-sm text-slate-200 leading-relaxed max-w-4xl">
          {executiveSummary}
        </p>
      </div>
    </div>
  );
};
