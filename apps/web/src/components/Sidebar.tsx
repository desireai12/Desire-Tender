'use client';

import React from 'react';
import { 
  LayoutDashboard, 
  Globe2,
  Sparkles, 
  GitMerge, 
  Building2, 
  Swords, 
  Layers, 
  Calculator, 
  FileCode, 
  ShieldCheck, 
  Sliders,
  MapPin
} from 'lucide-react';
import { DepartmentRole } from '@/lib/types';

export type NavTab = 
  | 'dashboard' 
  | 'india_tenders'
  | 'eligibility' 
  | 'wizard' 
  | 'combine'
  | 'lifecycle' 
  | 'master_company' 
  | 'companies'
  | 'competitors' 
  | 'costing' 
  | 'admin_kb' 
  | 'admin'
  | 'admin_config'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  activeRole?: DepartmentRole;
  userPermissions?: string[];
  userStatus?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  activeRole = 'Business Development',
  userPermissions = [],
  userStatus = 'Active'
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Home Overview', icon: LayoutDashboard, badge: 'Home' },
    { id: 'india_tenders' as NavTab, label: 'India Tenders (Sector-Wise)', icon: Globe2, badge: 'Pan-India' },
    { id: 'eligibility' as NavTab, label: 'Eligibility Analysis', icon: Sparkles, badge: 'AI Dynamic' },
    { id: 'wizard' as NavTab, label: 'JV / Combine Analysis', icon: GitMerge, badge: 'Engine' },
    { id: 'master_company' as NavTab, label: 'Company Details (Master)', icon: Building2, badge: 'Master DB' },
    { id: 'competitors' as NavTab, label: 'Competitors Profile', icon: Swords, badge: 'Intel' },
    { id: 'lifecycle' as NavTab, label: 'Tender Process Queue', icon: Layers, badge: 'Queue' },
    { id: 'costing' as NavTab, label: 'BidMaster Costing Engine', icon: Calculator, badge: '244 Rates' },
    { id: 'admin_kb' as NavTab, label: 'Documents Vault (Admin)', icon: FileCode, badge: 'Vault' },
  ];

  return (
    <aside className="w-60 glass-card bg-white/95 dark:bg-[#0b1426] backdrop-blur-md border-r border-slate-200 dark:border-slate-800 p-3 flex flex-col justify-between hidden md:flex shrink-0 min-h-[calc(100vh-55px)] transition-colors duration-200">
      <div className="space-y-4">
        {/* Navigation Section Title */}
        <div className="px-3 pt-1 flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
            Platform Modules
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>

        {/* Main Navigation Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || 
              (item.id === 'master_company' && activeTab === 'companies');

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer group ${
                  isActive
                    ? 'bg-[#064e3b] dark:bg-[#059669] text-white font-bold shadow-md shadow-emerald-900/20'
                    : 'text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-600 dark:text-slate-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                    isActive
                      ? 'bg-white/20 text-white font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Engine Status Card */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <button
          onClick={() => onTabChange('settings')}
          className={`w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition ${
            activeTab === 'settings'
              ? 'bg-[#064e3b] dark:bg-[#059669] text-white font-bold'
              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>System Settings</span>
        </button>

        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 space-y-1 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-900 dark:text-white">Tender AI Engine Online</span>
            <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-ping" />
          </div>
          <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium leading-tight">
            Pan-India Sector Tenders & Combined JV Eligibility Active.
          </p>
        </div>
      </div>
    </aside>
  );
};
