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
  Waves
} from 'lucide-react';
import { DepartmentRole, PermissionType, UserStatus } from '@/lib/types';

export type NavTab = 'dashboard' | 'wizard' | 'lifecycle' | 'costing' | 'competitors' | 'settings' | 'admin' | 'admin_config';

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
    { id: 'dashboard' as NavTab, label: 'Dashboard Overview', icon: LayoutDashboard,
  Calculator, badge: null, perm: 'eligibility', adminOnly: false },
    { id: 'wizard' as NavTab, label: 'Eligibility Check & Wizard', icon: Wand2, badge: 'Guided', perm: 'eligibility', adminOnly: false },
    { id: 'lifecycle' as NavTab, label: 'Tender Process Queue', icon: Workflow, badge: 'Workflow', perm: 'ai_analysis', adminOnly: false },
    { id: 'costing' as NavTab, label: 'BidMaster Costing Engine', icon: Calculator, badge: '164 Rates', perm: 'cost_estimation', adminOnly: false },
    { id: 'competitors' as NavTab, label: 'Competitor Analysis', icon: Swords, badge: 'Intel', perm: 'ai_analysis', adminOnly: false },
    { id: 'admin' as NavTab, label: 'Company Records (Admin)', icon: ShieldCheck, badge: 'Admin Only', perm: 'admin', adminOnly: true },
    { id: 'admin_config' as NavTab, label: 'AI System & Keys (Admin)', icon: FileCode, badge: 'Encrypted', perm: 'admin', adminOnly: true },
    { id: 'settings' as NavTab, label: 'System Settings (Admin)', icon: Settings, badge: 'Admin', perm: 'admin', adminOnly: true },
  ];

  // Dynamic RBAC Navigation Filter
  const navItems = allNavItems.filter(item => {
    if (activeRole === 'Admin') return true;
    if (userStatus === 'Pending') {
      return item.id === 'dashboard' || item.id === 'wizard';
    }
    return !item.adminOnly && (userPermissions.includes(item.perm as PermissionType) || userPermissions.includes('eligibility'));
  });

  return (
    <aside className="w-64 glass-card border-r border-white/10 p-4 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-65px)]">
      <div className="space-y-6">
        {/* Navigation Category Label */}
        <div className="px-3 pt-2 flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
            Platform Modules
          </span>
          <Waves className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
        </div>

        {/* Menu Items */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/10 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-300'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-cyan-400 text-aqua-950 font-bold'
                        : 'bg-white/5 text-slate-400 group-hover:bg-white/10'
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
      <div className="p-3.5 rounded-xl bg-aqua-950/80 border border-white/10 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white">Company Records Active</span>
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Company knowledge connected. Ready to evaluate municipal tender bids & costing.
        </p>
      </div>
    </aside>
  );
};
