'use client';

import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar, NavTab } from '@/components/Sidebar';
import { DashboardView } from '@/components/DashboardView';
import { AdminKnowledgeBase } from '@/components/AdminKnowledgeBase';
import { AdminBackendConfig } from '@/components/AdminBackendConfig';
import { TenderWizard } from '@/components/TenderWizard';
import { TenderLifecycleTracker } from '@/components/TenderLifecycleTracker';
import { CompetitorBattleCardsView } from '@/components/CompetitorBattleCardsView';
import { SettingsView } from '@/components/SettingsView';
import { LoginLanding } from '@/components/LoginLanding';
import { AdminPortal } from '@/components/AdminPortal';
import { DepartmentRole, TenderProcess, UserProfile } from '@/lib/types';
import { ShieldAlert } from 'lucide-react';

const DEFAULT_USER: UserProfile = {
  id: 'usr-101',
  employee_id: 'EMP001',
  full_name: 'Ankit Purohit',
  email: 'ankit.purohit@desireenergy.com',
  phone: '9829012345',
  role: 'Administrator',
  department: 'Admin',
  status: 'Active',
  permissions: ['eligibility', 'ai_analysis', 'cost_estimation', 'bid_decision', 'bid_details', 'tender_result', 'admin'],
  assigned_projects: ['SOLAR', 'RHDS', 'KUSUM', 'EPC', 'ESCO', 'STP'],
  registered_at: '2026-08-01 09:00:00',
  last_login: new Date().toISOString()
};

export default function Home() {
  const [viewMode, setViewMode] = useState<'user' | 'admin'>('user');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini');
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [activeRole, setActiveRole] = useState<DepartmentRole>('Business Development');

  // Handle Login Success
  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setActiveRole(user.department);
    if (user.department === 'Admin') {
      setViewMode('admin');
    } else {
      setViewMode('user');
      setActiveTab(user.status === 'Pending' ? 'wizard' : 'dashboard');
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setCurrentUser(null);
    setViewMode('user');
    setActiveRole('Business Development');
    setActiveTab('dashboard');
  };

  // Initial Tender Processes Queue
  const [tendersQueue, setTendersQueue] = useState<TenderProcess[]>([
    {
      id: '881201',
      tender_name: 'Jal Jeevan Mission (JJM) Rural Water Supply Package IV',
      project_category: 'RHDS',
      project_locked: true,
      department_assigned: 'Business Development',
      current_stage: '2_AI_ANALYSIS',
      stage_status: 'Completed',
      created_at: '2026-08-06 09:30:00',
      updated_at: '2026-08-06 10:15:00',
      eligibility_result: {
        is_eligible: true,
        score: 95,
        reasoning: 'Verified ₹285 Cr turnover & 1,00,000+ village operations.'
      },
      audit_trail: [
        {
          id: 'log-1',
          user: 'BD Officer (EMP001)',
          department: 'Business Development',
          timestamp: '2026-08-06 10:15:00',
          action: 'Completed Step 1 Eligibility & Step 2 PDF Upload',
          status: 'Passed & Locked',
          next_pending_action: 'Estimation Team to construct Stage 3 BOQ'
        }
      ]
    }
  ]);

  const handleAddNewTender = (newProcess: TenderProcess) => {
    setTendersQueue((prev) => [newProcess, ...prev]);
    setActiveTab('lifecycle');
  };

  const handleUpdateTender = (updatedProcess: TenderProcess) => {
    setTendersQueue((prev) => prev.map((t) => (t.id === updatedProcess.id ? updatedProcess : t)));
  };

  // If user is not logged in, render the clean Login / Create Account Landing Page first
  if (!currentUser) {
    return (
      <LoginLanding 
        onLoginSuccess={handleLoginSuccess}
        onNavigateAdmin={() => window.location.href = '/admin'}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#101415] text-[#e0e3e5]">
      {/* Header Bar with User Badge & Logout */}
      <Header 
        currentProvider={provider} 
        onProviderChange={setProvider}
        activeRole={activeRole}
        onRoleChange={setActiveRole}
        currentUser={currentUser}
        onLogout={handleLogout}
        onNavigateSettings={() => setActiveTab(activeRole === 'Admin' ? 'admin_config' : 'settings')}
        onNavigateAdminPortal={() => window.location.href = '/admin'}
      />

      {/* Pending User Approval Banner */}
      {currentUser.status === 'Pending' && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>First-Time User Notice:</strong> Your account is pending Admin approval. You currently have access to <strong>Eligibility Checking</strong>. Additional modules will unlock after Admin approval.
            </span>
          </div>
          <button
            onClick={() => setViewMode('admin')}
            className="text-[11px] font-mono underline hover:text-white"
          >
            Admin Portal (/admin)
          </button>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="flex flex-1">
        {/* Navigation Sidebar */}
        <Sidebar 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
          activeRole={activeRole}
          userPermissions={currentUser.permissions}
          userStatus={currentUser.status}
        />

        {/* Tab Content View Container */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
          {activeTab === 'dashboard' && (
            <DashboardView 
              onNavigate={(tab) => setActiveTab(tab)} 
              tendersCount={tendersQueue.length}
            />
          )}

          {activeTab === 'wizard' && (
            <TenderWizard 
              currentProvider={provider}
              activeRole={activeRole}
              onTenderCreated={handleAddNewTender}
            />
          )}

          {activeTab === 'lifecycle' && (
            <TenderLifecycleTracker 
              tenders={tendersQueue}
              activeRole={activeRole}
              onUpdateTender={handleUpdateTender}
            />
          )}

          {activeTab === 'competitors' && (
            <CompetitorBattleCardsView />
          )}

          {activeTab === 'settings' && (
            <SettingsView activeRole={activeRole} onProviderChange={setProvider} />
          )}

          {activeTab === 'admin' && (
            <AdminKnowledgeBase activeRole={activeRole} />
          )}

          {activeTab === 'admin_config' && (
            <AdminBackendConfig activeRole={activeRole} />
          )}
        </main>
      </div>
    </div>
  );
}
