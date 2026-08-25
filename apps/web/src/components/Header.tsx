'use client';

import React from 'react';
import { ShieldCheck, Cpu, Sparkles, Layers, Activity } from 'lucide-react';

interface HeaderProps {
  currentProvider: 'gemini' | 'openai';
  onProviderChange: (provider: 'gemini' | 'openai') => void;
  onNavigateSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentProvider,
  onProviderChange,
  onNavigateSettings,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-xs">
      {/* Brand & Logo */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center shadow-md shadow-teal-600/20">
          <Layers className="w-5 h-5 text-white stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-display text-lg font-bold tracking-tight text-slate-900">
              DESIRE <span className="text-teal-700">TENDER INTELLIGENCE</span>
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-teal-50 text-teal-700 border border-teal-200 rounded-full font-semibold">
              PROD V2.4
            </span>
          </div>
          <p className="text-xs text-slate-500 hidden sm:block font-medium">
            Water Infrastructure Eligibility & Costing Engine
          </p>
        </div>
      </div>

      {/* Control Actions & Status */}
      <div className="flex items-center space-x-4">
        {/* System Status Indicator */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
          <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          <span className="text-xs font-mono text-emerald-700 font-medium">pgvector: Online</span>
        </div>

        {/* LLM Engine Provider Switcher */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => onProviderChange('gemini')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentProvider === 'gemini'
                ? 'bg-teal-700 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gemini 3 Flash</span>
          </button>
          <button
            onClick={() => onProviderChange('openai')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentProvider === 'openai'
                ? 'bg-teal-700 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>OpenAI GPT-4o</span>
          </button>
        </div>

        {/* Configure Keys Quick CTA */}
        {onNavigateSettings && (
          <button
            onClick={onNavigateSettings}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 border border-slate-300 font-medium transition"
          >
            <ShieldCheck className="w-4 h-4 text-teal-700" />
            <span className="hidden sm:inline">API Keys</span>
          </button>
        )}
      </div>
    </header>
  );
};
