'use client';

import React from 'react';
import { ShieldCheck, Cpu, Sparkles, Layers, Activity } from 'lucide-react';

import { UserProfile, DepartmentRole } from '@/lib/types';
import { LogOut, User } from 'lucide-react';

interface HeaderProps {
  currentProvider: 'gemini' | 'openai';
  onProviderChange: (provider: 'gemini' | 'openai') => void;
  activeRole: DepartmentRole;
  onRoleChange: (role: DepartmentRole) => void;
  currentUser?: UserProfile | null;
  onLogout?: () => void;
  onNavigateSettings?: () => void;
  onNavigateAdminPortal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentProvider,
  onProviderChange,
  activeRole,
  onRoleChange,
  currentUser,
  onLogout,
  onNavigateSettings,
  onNavigateAdminPortal,
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
              DESIRE <span className="text-cyan-400">TENDER INTELLIGENCE SYSTEM</span>
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full">
              ENTERPRISE LIFECYCLE
            </span>
          </div>
          <p className="text-xs text-[#b9cacb] hidden sm:block">
            Water Infrastructure Lifecycle & Costing Engine • Jaipur HQ
          </p>
        </div>
      </div>

      {/* Control Actions & Department Role Information */}
      <div className="flex items-center space-x-3 flex-wrap gap-y-2">
        {/* User Profile / Employee ID Badge */}
        {currentUser && (
          <div className="flex items-center space-x-2.5 px-3.5 py-1.5 rounded-xl bg-aqua-950/90 border border-cyan-500/30">
            <div className="w-6 h-6 rounded-full bg-cyan-400/20 flex items-center justify-center text-cyan-300 font-mono text-xs">
              {currentUser.employee_id?.slice(0, 3) || 'EMP'}
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                <span>{currentUser.full_name || currentUser.employee_id}</span>
                <span className="font-mono text-[10px] text-cyan-300">({currentUser.employee_id})</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                  currentUser.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {currentUser.status}
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-400">{currentUser.email}</p>
            </div>
          </div>
        )}

        {/* Role Switcher (Visible to Admin Only for multi-department management) */}
        {(activeRole as string) === 'Admin' && (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-purple-950/80 border border-purple-500/40">
            <span className="text-xs font-mono text-purple-300 hidden md:inline">Admin Override:</span>
            <select
              value={activeRole}
              onChange={(e) => onRoleChange(e.target.value as DepartmentRole)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              <option value="Admin" className="bg-[#101415] text-white">Department: Admin (Full Access)</option>
              <option value="Business Development" className="bg-[#101415] text-white">View As: Business Development</option>
              <option value="Engineering" className="bg-[#101415] text-white">View As: Engineering</option>
              <option value="Estimation Team" className="bg-[#101415] text-white">View As: Estimation Team</option>
              <option value="Management" className="bg-[#101415] text-white">View As: Management</option>
              <option value="Tender Team" className="bg-[#101415] text-white">View As: Tender Team</option>
              <option value="Procurement" className="bg-[#101415] text-white">View As: Procurement</option>
              <option value="Finance" className="bg-[#101415] text-white">View As: Finance</option>
            </select>
          </div>
        )}

        {/* System Status Indicator */}
        <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="text-xs font-mono text-emerald-300">Company Knowledge: Connected</span>
        </div>

        {/* Admin-Only Control Actions (Engine Provider Switcher & Admin Backend Config) */}
        {(activeRole as string) === 'Admin' && (
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
              <span>Engine: Gemini</span>
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
              <span>Engine: OpenAI</span>
            </button>
          </div>
        )}

        {/* Admin Backend & AI Instructions Button */}
        <button
          onClick={() => window.location.href = '/admin'}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs transition shadow-lg shadow-purple-500/20"
          title="Open Admin Console (/admin) to view & edit Project AI Instructions"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Admin Portal &amp; AI Instructions</span>
        </button>

        {/* Logout Action Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition cursor-pointer"
            title="Sign Out of Session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        )}
      </div>
    </header>
  );
};
