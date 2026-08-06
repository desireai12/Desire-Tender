'use client';

import React from 'react';
import { ShieldCheck, Cpu, Sparkles, Layers, Activity } from 'lucide-react';

interface HeaderProps {
  currentProvider: 'gemini' | 'openai';
  onProviderChange: (provider: 'gemini' | 'openai') => void;
  selectedProject?: string;
  onProjectChange?: (project: string) => void;
  onNavigateSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentProvider,
  onProviderChange,
  selectedProject = 'jjm',
  onProjectChange,
  onNavigateSettings,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full glass-card border-b border-white/10 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
      {/* Brand & Logo */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Layers className="w-5 h-5 text-aqua-950 stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-display text-lg font-bold tracking-tight text-white">
              DESIRE <span className="text-cyan-400">TENDER INTELLIGENCE</span>
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full">
              PROD V2.4
            </span>
          </div>
          <p className="text-xs text-[#b9cacb] hidden sm:block">
            Water Infrastructure Eligibility & Costing Engine • Jaipur HQ
          </p>
        </div>
      </div>

      {/* Control Actions & Status */}
      <div className="flex items-center space-x-4">
        {/* Project Selector Dropdown */}
        {onProjectChange && (
          <div className="flex items-center space-x-2 px-3 py-1 rounded-lg bg-aqua-950/90 border border-cyan-500/40">
            <span className="text-xs font-mono text-cyan-300 hidden xl:inline">Project:</span>
            <select
              value={selectedProject}
              onChange={(e) => onProjectChange(e.target.value)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
            >
              <option value="jjm" className="bg-[#101415] text-white">Jal Jeevan Mission (1,00,000+ Villages)</option>
              <option value="scada" className="bg-[#101415] text-white">Jaipur SCADA Telemetry (14+ Cities)</option>
              <option value="kusum" className="bg-[#101415] text-white">PM-Kusum Solar Pumping Project</option>
              <option value="panghat" className="bg-[#101415] text-white">Panghat Decentralized Water Mgmt</option>
            </select>
          </div>
        )}

        {/* System Status Indicator */}
        <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="text-xs font-mono text-emerald-300">pgvector: Online</span>
        </div>

        {/* LLM Engine Provider Switcher */}
        <div className="flex items-center space-x-1.5 bg-aqua-950/80 p-1 rounded-lg border border-white/10">
          <button
            onClick={() => onProviderChange('gemini')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              currentProvider === 'gemini'
                ? 'bg-cyan-400 text-aqua-950 font-bold shadow-md shadow-cyan-400/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gemini 3 Flash</span>
          </button>
          <button
            onClick={() => onProviderChange('openai')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              currentProvider === 'openai'
                ? 'bg-cyan-400 text-aqua-950 font-bold shadow-md shadow-cyan-400/20'
                : 'text-slate-400 hover:text-white'
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
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-cyan-300 border border-cyan-500/30 transition"
          >
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">API Keys</span>
          </button>
        )}
      </div>
    </header>
  );
};
