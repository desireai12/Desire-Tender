'use client';

import React from 'react';
import { ShieldCheck, Cpu, Sparkles, Layers, Activity, LogOut, User } from 'lucide-react';
import { UserProfile, DepartmentRole } from '@/lib/types';

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
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-slate-200 px-5 py-2.5 flex items-center justify-between shadow-xs">
      {/* Brand & Logo */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-[#064e3b] flex items-center justify-center text-white shadow-sm shrink-0">
          <Layers className="w-4 h-4 stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-display text-sm font-bold tracking-tight text-slate-900">
              DESIRE <span className="text-[#064e3b]">TENDER INTELLIGENCE</span>
            </h1>
            <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase bg-emerald-100 text-emerald-950 border border-emerald-300 rounded font-bold">
              ENTERPRISE
            </span>
          </div>
          <p className="text-[11px] text-slate-600 font-medium hidden md:block">
            Water Infrastructure Lifecycle & Costing Engine • Jaipur HQ
          </p>
        </div>
      </div>

      {/* Control Actions & User Badge */}
      <div className="flex items-center space-x-3 shrink-0">
        {/* User Profile Badge */}
        {currentUser && (
          <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">
            <div className="w-5 h-5 rounded-full bg-[#064e3b] text-white flex items-center justify-center font-mono text-[10px] font-bold">
              {currentUser.employee_id?.slice(0, 3) || 'EMP'}
            </div>
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900">
              <span>{currentUser.full_name || currentUser.employee_id}</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-100 text-emerald-900 font-bold">
                {currentUser.status}
              </span>
            </div>
          </div>
        )}

        {/* System Connected Badge */}
        <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200">
          <Activity className="w-3.5 h-3.5 text-emerald-800 font-bold animate-pulse" />
          <span className="text-xs font-mono text-emerald-900 font-bold">Knowledge: Connected</span>
        </div>

        {/* Admin Portal Button */}
        <button
          onClick={() => window.location.href = '/admin'}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition shadow-sm"
          title="Open Admin Console (/admin)"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Admin Portal</span>
        </button>

        {/* Logout Action */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-semibold transition cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        )}
      </div>
    </header>
  );
};
