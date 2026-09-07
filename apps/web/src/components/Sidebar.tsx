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
  Settings,
  Shield,
  ChevronRight
} from 'lucide-react';
import { DepartmentRole } from '@/lib/types';

export type NavTab = 
  | 'dashboard' 
  | 'india_tenders'
  | 'tender_tracker'
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

interface NavSection {
  title: string;
  items: {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description?: string;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  activeRole = 'Admin',
  userPermissions = [],
  userStatus = 'Active'
}) => {
  const navSections: NavSection[] = [
    {
      title: 'Tenders & Discovery',
      items: [
        { id: 'dashboard', label: 'Home Overview', icon: LayoutDashboard },
        { id: 'india_tenders', label: 'India Tenders Directory', icon: Globe2 },
        { id: 'tender_tracker', label: 'Live Tender Tracker', icon: Layers },
      ]
    },
    {
      title: 'Bidding & AI Engines',
      items: [
        { id: 'eligibility', label: 'Eligibility Analysis', icon: Sparkles },
        { id: 'wizard', label: 'JV & Combine Engine', icon: GitMerge },
        { id: 'costing', label: 'BidMaster Costing', icon: Calculator },
        { id: 'lifecycle', label: 'Tender Process Queue', icon: FileCode },
      ]
    },
    {
      title: 'Intelligence & Master DB',
      items: [
        { id: 'master_company', label: 'Company Master DB', icon: Building2 },
        { id: 'competitors', label: 'Competitors Profile', icon: Swords },
      ]
    },
    {
      title: 'Administration',
      items: [
        { id: 'admin', label: 'Admin Portal & Users', icon: ShieldCheck },
        { id: 'admin_config', label: 'Backend & AI Config', icon: Sliders },
      ]
    }
  ];

  return (
    <aside className="w-64 glass-card bg-white/95 dark:bg-[#0b1426] backdrop-blur-md border-r border-slate-200 dark:border-slate-800 p-3.5 flex flex-col justify-between hidden md:flex shrink-0 min-h-[calc(100vh-55px)] transition-colors duration-200">
      <div className="space-y-4 overflow-y-auto pr-1">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {/* Section Heading */}
            <div className="px-2.5 py-1 flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">
                {section.title}
              </span>
            </div>

            {/* Navigation Links */}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id || 
                  (item.id === 'master_company' && activeTab === 'companies') ||
                  (item.id === 'admin' && activeTab === 'admin_kb');

                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer group ${
                      isActive
                        ? 'bg-emerald-700 dark:bg-emerald-600 text-white font-bold shadow-sm shadow-emerald-900/20'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive 
                          ? 'text-white' 
                          : 'text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
                      }`} />
                      <span className="whitespace-nowrap text-[12px]">{item.label}</span>
                    </div>

                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-200 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Engine Status Card & System Settings */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
        <button
          onClick={() => onTabChange('settings')}
          className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition ${
            activeTab === 'settings'
              ? 'bg-emerald-700 dark:bg-emerald-600 text-white font-bold'
              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <span className="text-[12px]">System Settings</span>
        </button>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Admin Privileges</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-tight mt-1">
            Full access to all bidding stages & engines
          </p>
        </div>
      </div>
    </aside>
  );
};
