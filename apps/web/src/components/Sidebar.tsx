'use client';

import React from 'react';
import { 
  LayoutDashboard,
  Calculator, 
  Wand2, 
  Workflow, 
  Swords, 
  Settings, 
  ShieldCheck,
  FileCode,
  Waves,
  Building2,
  GitMerge,
  FolderGit2
} from 'lucide-react';
import { DepartmentRole, PermissionType, UserStatus } from '@/lib/types';

export type NavTab = 'dashboard' | 'wizard' | 'lifecycle' | 'costing' | 'companies' | 'competitors' | 'combine' | 'admin' | 'admin_config' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  activeRole: DepartmentRole;
  userPermissions?: PermissionType[];
  userStatus?: UserStatus;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  onTabChange, 
  activeRole,
  userPermissions = ['eligibility', 'ai_analysis', 'cost_estimation', 'bid_decision', 'bid_details', 'tender_result', 'admin'],
  userStatus = 'Active'
}) => {
  const allNavItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard Overview', icon: LayoutDashboard, badge: null, perm: 'eligibility', adminOnly: false },
    { id: 'wizard' as NavTab, label: 'Eligibility Analysis', icon: Wand2, badge: 'AI Dynamic', perm: 'eligibility', adminOnly: false },
    { id: 'combine' as NavTab, label: 'JV / Combine Analysis', icon: GitMerge, badge: 'Engine', perm: 'eligibility', adminOnly: false },
    { id: 'companies' as NavTab, label: 'Company Details (Master)', icon: Building2, badge: 'Master DB', perm: 'eligibility', adminOnly: false },
    { id: 'competitors' as NavTab, label: 'Competitors Profile', icon: Swords, badge: 'Intel', perm: 'ai_analysis', adminOnly: false },
    { id: 'lifecycle' as NavTab, label: 'Tender Process Queue', icon: Workflow, badge: 'Queue', perm: 'ai_analysis', adminOnly: false },
    { id: 'costing' as NavTab, label: 'BidMaster Costing Engine', icon: Calculator, badge: '164 Rates', perm: 'cost_estimation', adminOnly: false },
    { id: 'admin' as NavTab, label: 'Documents Vault (Admin)', icon: FolderGit2, badge: 'Vault', perm: 'admin', adminOnly: false },
    { id: 'admin_config' as NavTab, label: 'AI System & Prompts', icon: FileCode, badge: 'Encrypted', perm: 'admin', adminOnly: true },
    { id: 'settings' as NavTab, label: 'System Settings', icon: Settings, badge: 'Admin', perm: 'admin', adminOnly: true },
  ];

  // Dynamic RBAC Navigation Filter
  const navItems = allNavItems.filter(item => {
    if ((activeRole as string) === 'Admin') return true;
    if (userStatus === 'Pending') {
      return item.id === 'dashboard' || item.id === 'wizard' || item.id === 'companies' || item.id === 'combine';
    }
    return !item.adminOnly || (activeRole as string) === 'Admin';
  });

  return (
    <aside className="w-64 glass-card bg-white/85 backdrop-blur-md border-r border-slate-200 p-4 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-65px)]">
      <div className="space-y-6">
        {/* Navigation Category Label */}
        <div className="px-3 pt-2 flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-700 font-medium">
            Platform Modules
          </span>
          <Waves className="w-3.5 h-3.5 text-teal-800 font-semibold animate-pulse" />
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
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs transition-all group ${
                  isActive
                    ? 'bg-[#064e3b] text-white font-bold shadow-md shadow-emerald-950/20 border-l-4 border-l-emerald-400'
                    : 'text-slate-900 font-semibold hover:bg-emerald-50 hover:text-emerald-950'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon
                    className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-800 font-bold group-hover:text-emerald-900'
                    }`}
                  />
                  <span className={isActive ? 'text-white font-bold' : 'text-slate-900 font-bold'}>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      isActive
                        ? 'bg-emerald-800 text-white border border-emerald-500'
                        : 'bg-slate-100 text-slate-800 border border-slate-200 group-hover:bg-emerald-100 group-hover:text-emerald-900'
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

      {/* System Status Card */}
      <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-900">RHDS Engine Active</span>
          <span className="w-2 h-2 rounded-full bg-teal-700 animate-ping" />
        </div>
        <p className="text-[11px] text-slate-700 font-medium leading-relaxed">
          Master Company DB & Combined JV Eligibility calculation engine online.
        </p>
      </div>
    </aside>
  );
};
