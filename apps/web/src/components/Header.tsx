'use client';

import React from 'react';
import { ShieldCheck, Cpu, Sparkles, Layers, Activity, LogOut, User, Sun, Moon } from 'lucide-react';
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
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
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
  theme: propTheme,
  onToggleTheme: propToggleTheme,
}) => {
  const [internalTheme, setInternalTheme] = React.useState<'light' | 'dark'>('light');

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('DESIRE_THEME') as 'light' | 'dark' | null;
      if (saved) {
        setInternalTheme(saved);
        document.documentElement.classList.add(saved);
        document.documentElement.classList.remove(saved === 'dark' ? 'light' : 'dark');
      }
    } catch (e) {}
  }, []);

  const activeTheme = propTheme || internalTheme;

  const handleToggle = () => {
    if (propToggleTheme) {
      propToggleTheme();
    } else {
      const next = activeTheme === 'light' ? 'dark' : 'light';
      setInternalTheme(next);
      try {
        localStorage.setItem('DESIRE_THEME', next);
        document.documentElement.classList.add(next);
        document.documentElement.classList.remove(next === 'dark' ? 'light' : 'dark');
      } catch (e) {}
    }
  };
  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-5 py-2.5 flex items-center justify-between shadow-xs transition-colors duration-200">
      {/* Brand & Logo */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-[#064e3b] dark:bg-emerald-600 flex items-center justify-center text-white shadow-sm shrink-0">
          <Layers className="w-4 h-4 stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-display text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              DESIRE <span className="text-[#064e3b] dark:text-emerald-400">TENDER INTELLIGENCE</span>
            </h1>
            <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase bg-emerald-100 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded font-bold">
              ENTERPRISE
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium hidden md:block">
            Water Infrastructure Lifecycle & Costing Engine • Jaipur HQ
          </p>
        </div>
      </div>

      {/* Control Actions & User Badge */}
      <div className="flex items-center space-x-2.5 shrink-0">
        {/* Dark / Light Theme Switcher Button */}
                {true && (
          <button
            type="button"
            onClick={handleToggle}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-emerald-400"
            title="Switch between Light Mode and Dark Mode"
          >
            {activeTheme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
                <span className="hidden sm:inline">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-700" />
                <span className="hidden sm:inline">Dark Mode</span>
              </>
            )}
          </button>
        )}

        {/* User Profile Badge */}
        {currentUser && (
          <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="w-5 h-5 rounded-full bg-[#064e3b] dark:bg-emerald-600 text-white flex items-center justify-center font-mono text-[10px] font-bold">
              {currentUser.employee_id?.slice(0, 3) || 'EMP'}
            </div>
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900 dark:text-white">
              <span>{currentUser.full_name || currentUser.employee_id}</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 font-bold">
                {currentUser.status}
              </span>
            </div>
          </div>
        )}

        {/* System Connected Badge */}
        <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
          <Activity className="w-3.5 h-3.5 text-emerald-800 dark:text-emerald-400 font-bold animate-pulse" />
          <span className="text-xs font-mono text-emerald-900 dark:text-emerald-300 font-bold">Knowledge: Connected</span>
        </div>

        {/* Admin Portal Button */}
        <button
          onClick={() => window.location.href = '/admin'}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition shadow-sm cursor-pointer"
          title="Open Admin Console (/admin)"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Admin Portal</span>
        </button>

        {/* Logout Action */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold transition cursor-pointer"
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
