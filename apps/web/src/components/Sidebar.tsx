'use client';

import React from 'react';
import { 
  LayoutDashboard, 
  Database, 
  FileCheck2, 
  Swords, 
  Calculator, 
  Settings,
  Waves
} from 'lucide-react';

export type NavTab = 'dashboard' | 'admin' | 'eligibility' | 'competitors' | 'costing' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'admin' as NavTab, label: 'Knowledge Base', icon: Database, badge: 'Admin' },
    { id: 'eligibility' as NavTab, label: 'Check Eligibility', icon: FileCheck2, badge: 'V1 Core' },
    { id: 'competitors' as NavTab, label: 'Battle Cards', icon: Swords, badge: 'Intel' },
    { id: 'costing' as NavTab, label: 'Costing Estimator', icon: Calculator, badge: 'V2 AI' },
    { id: 'settings' as NavTab, label: 'Settings & Keys', icon: Settings, badge: null },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-65px)] shadow-xs">
      <div className="space-y-6">
        {/* Navigation Category Label */}
        <div className="px-3 pt-2 flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
            Platform Modules
          </span>
          <Waves className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
        </div>

        {/* Menu Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-teal-50 text-teal-900 border border-teal-200/80 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-teal-700' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-teal-700 text-white font-bold'
                        : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Water Infra Plant Status Card */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-800">System Active</span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Supabase pgvector RAG active. Ready to evaluate municipal tender bids & costing.
        </p>
      </div>
    </aside>
  );
};
