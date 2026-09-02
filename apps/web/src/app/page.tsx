'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Sidebar, NavTab } from '@/components/Sidebar';
import { DashboardView } from '@/components/DashboardView';
import { IndiaTendersSectorView, IndiaTenderItem } from '@/components/IndiaTendersSectorView';
import { EligibilityChecker } from '@/components/EligibilityChecker';
import { AdminKnowledgeBase } from '@/components/AdminKnowledgeBase';
import { AdminBackendConfig } from '@/components/AdminBackendConfig';
import { TenderWizard } from '@/components/TenderWizard';
import { TenderLifecycleTracker } from '@/components/TenderLifecycleTracker';
import { CompetitorBattleCardsView } from '@/components/CompetitorBattleCardsView';
import { CompanyDetailsView } from '@/components/CompanyDetailsView';
import { CombineAnalysisView } from '@/components/CombineAnalysisView';
import { CostingEstimatorView } from '@/components/CostingEstimatorView';
import { SettingsView } from '@/components/SettingsView';
import { LoginLanding } from '@/components/LoginLanding';
import { AdminPortal } from '@/components/AdminPortal';
import { TenderTrackerDashboard, TrackedTender, INITIAL_TRACKED_TENDERS } from '@/components/TenderTrackerDashboard';
import { DepartmentRole, TenderProcess, UserProfile } from '@/lib/types';
import { ShieldAlert, Loader2, Sparkles } from 'lucide-react';
import { getActiveUserSession, saveUserSession, clearUserSession } from '@/lib/store';
import { API_BASE_URL } from '@/lib/api';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const DEFAULT_SEED_TENDER: TenderProcess = {
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
    reasoning: 'Verified ₹300.93 Cr turnover & 1,00,000+ village operations.'
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
};

const DEFAULT_ADMIN_USER: UserProfile = {
  id: 'usr-admin-01',
  employee_id: 'ADMIN001',
  full_name: 'Chief Administrator',
  email: 'admin@desireenergy.com',
  phone: '9876543210',
  role: 'Chief Administrator',
  department: 'Admin',
  status: 'Active',
  permissions: ['eligibility', 'ai_analysis', 'cost_estimation', 'bid_decision', 'bid_details', 'tender_result', 'admin'],
  assigned_projects: ['RHDS', 'STP', 'SOLAR', 'KUSUM', 'EPC', 'ESCO'],
  registered_at: '2026-08-01',
  last_login: new Date().toISOString()
};

export default function Home() {
  const [viewMode, setViewMode] = useState<'user' | 'admin'>('user');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isInitializingSession, setIsInitializingSession] = useState<boolean>(true);
  const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [trackedTenders, setTrackedTenders] = useState<TrackedTender[]>(INITIAL_TRACKED_TENDERS);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('DESIRE_THEME') as 'light' | 'dark' | null;
      if (savedTheme === 'dark') {
        setTheme('dark');
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        setTheme('light');
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {}
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    try {
      localStorage.setItem('DESIRE_THEME', nextTheme);
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {}
  };

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [activeRole, setActiveRole] = useState<DepartmentRole>('Admin');
  const [tendersQueue, setTendersQueue] = useState<TenderProcess[]>([DEFAULT_SEED_TENDER]);
  const [selectedTenderToAnalyze, setSelectedTenderToAnalyze] = useState<IndiaTenderItem | null>(null);

  // RESTORE AUTHENTICATION SESSION ON MOUNT (AUTO-LOAD AS ADMIN USER)
  useEffect(() => {
    try {
      const activeSessionUser = getActiveUserSession();
      if (activeSessionUser) {
        // Upgrade existing session to Admin if previously restricted
        const adminUser = {
          ...activeSessionUser,
          department: 'Admin' as DepartmentRole,
          status: 'Active' as const,
          permissions: ['eligibility', 'ai_analysis', 'cost_estimation', 'bid_decision', 'bid_details', 'tender_result', 'admin'] as any
        };
        setCurrentUser(adminUser);
        setActiveRole('Admin');
        saveUserSession(adminUser);
      } else {
        setCurrentUser(DEFAULT_ADMIN_USER);
        setActiveRole('Admin');
        saveUserSession(DEFAULT_ADMIN_USER);
      }
    } catch (e) {} finally {
      setIsInitializingSession(false);
    }
  }, []);

  // LOAD LIVE TENDERS FROM API AND DIRECT SUPABASE DB ON MOUNT
  useEffect(() => {
    const fetchTendersFromDb = async () => {
      let loadedTenders: TenderProcess[] = [];

      try {
        const res = await fetch(`${API_BASE_URL}/tenders`);
        if (res.ok) {
          const data = await res.json();
          if (data.tenders && Array.isArray(data.tenders) && data.tenders.length > 0) {
            loadedTenders = data.tenders;
          }
        }
      } catch (err) {}

      if (loadedTenders.length === 0 && isSupabaseConfigured && supabase) {
        try {
          const { data: dbTenders, error } = await supabase
            .from('tenders')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && dbTenders && dbTenders.length > 0) {
            loadedTenders = dbTenders as TenderProcess[];
          }
        } catch (dbErr) {}
      }

      if (loadedTenders.length > 0) {
        setTendersQueue(loadedTenders);
      }
    };
    fetchTendersFromDb();
  }, []);

  // Handle Login Success
  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setActiveRole(user.department);
    saveUserSession(user);
    setActiveTab('dashboard');
  };

  // Handle Logout
  const handleLogout = () => {
    clearUserSession();
    setCurrentUser(null);
    setActiveRole('Admin');
    setActiveTab('dashboard');
  };

  // Import Tender from India Sector Explorer into Queue / Engine
  const handleImportTender = (tender: IndiaTenderItem) => {
    setSelectedTenderToAnalyze(tender);
  };

  const handleSelectForBidding = (item: IndiaTenderItem) => {
    const existing = trackedTenders.find(t => t.id === item.id || t.nit_number === item.nit_number);
    if (!existing) {
      const newTracked: TrackedTender = {
        id: item.id || `tr-${Date.now()}`,
        nit_number: item.nit_number,
        title: item.title,
        authority: item.authority,
        state: item.state,
        district: item.district,
        sector: item.sector,
        estimated_cost_cr: item.estimated_cost_cr,
        emd_lakhs: item.emd_lakhs,
        emd_status: 'Pending',
        due_date: item.due_date,
        stage: '1_IDENTIFIED',
        assigned_department: 'Tender Team',
        assigned_lead: `${currentUser?.full_name || 'Tender Lead'}`,
        win_probability_pct: item.eligibility_match_pct,
        jv_partner_needed: item.desire_qual_status === 'JV Recommended',
        remarks: `Selected from Pan-India Open Tenders. Scope highlights: ${item.scope_highlights.slice(0, 2).join('; ')}`,
        audit_logs: [
          {
            timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
            actor: currentUser?.full_name || 'Tender Officer',
            role: activeRole,
            action: 'Selected for Bidding',
            stage_changed_to: 'Identified / Discovered',
            notes: `Added from Pan-India sector tenders list (${item.sector}). Est Value: ₹${item.estimated_cost_cr} Cr.`
          }
        ],
        portal_url: item.portal_url
      };
      setTrackedTenders([newTracked, ...trackedTenders]);
    }
    setActiveTab('tender_tracker');
  };

  // Role Change Handler
  const handleRoleChange = (newRole: DepartmentRole) => {
    setActiveRole(newRole);
    if (currentUser) {
      const updatedUser = { ...currentUser, department: newRole };
      setCurrentUser(updatedUser);
      saveUserSession(updatedUser);
    }
  };

  // PERSIST NEW TENDER LIVE TO DATABASE & API
  const handleAddNewTender = async (newProcess: TenderProcess) => {
    setTendersQueue((prev) => [newProcess, ...prev]);
    setActiveTab('lifecycle');

    try {
      await fetch(`${API_BASE_URL}/tenders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProcess)
      });
    } catch (e) {}

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('tenders').upsert({
          id: newProcess.id,
          tender_name: newProcess.tender_name,
          project_category: newProcess.project_category,
          project_locked: newProcess.project_locked || false,
          department_assigned: newProcess.department_assigned,
          current_stage: newProcess.current_stage || '1_ELIGIBILITY',
          stage_status: newProcess.stage_status || 'In Progress',
          eligibility_result: newProcess.eligibility_result || null,
          ai_report: newProcess.ai_report || null,
          bid_decision: (newProcess as any).bid_decision || (newProcess.did_apply !== undefined ? { did_apply: newProcess.did_apply, reason: newProcess.apply_decision_reason } : null),
          bid_submission: (newProcess as any).bid_submission || newProcess.bid_details || null,
          tender_result: (newProcess as any).tender_result || (newProcess.result_status ? { result_status: newProcess.result_status, lost_details: newProcess.lost_reason_details } : null),
          audit_trail: newProcess.audit_trail || [],
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      } catch (e) {}
    }
  };

  // PERSIST UPDATED TENDER STAGE LIVE TO DATABASE & API
  const handleUpdateTender = async (updatedProcess: TenderProcess) => {
    setTendersQueue((prev) => prev.map((t) => (t.id === updatedProcess.id ? updatedProcess : t)));

    try {
      await fetch(`${API_BASE_URL}/tenders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProcess)
      });
    } catch (e) {}

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('tenders').upsert({
          id: updatedProcess.id,
          tender_name: updatedProcess.tender_name,
          project_category: updatedProcess.project_category,
          project_locked: updatedProcess.project_locked || false,
          department_assigned: updatedProcess.department_assigned,
          current_stage: updatedProcess.current_stage || '1_ELIGIBILITY',
          stage_status: updatedProcess.stage_status || 'In Progress',
          eligibility_result: updatedProcess.eligibility_result || null,
          ai_report: updatedProcess.ai_report || null,
          bid_decision: (updatedProcess as any).bid_decision || (updatedProcess.did_apply !== undefined ? { did_apply: updatedProcess.did_apply, reason: updatedProcess.apply_decision_reason } : null),
          bid_submission: (updatedProcess as any).bid_submission || updatedProcess.bid_details || null,
          tender_result: (updatedProcess as any).tender_result || (updatedProcess.result_status ? { result_status: updatedProcess.result_status, lost_details: updatedProcess.lost_reason_details } : null),
          audit_trail: updatedProcess.audit_trail || [],
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

        if (updatedProcess.boq_items && updatedProcess.boq_items.length > 0) {
          const boqRows = updatedProcess.boq_items.map(b => ({
            id: b.id,
            tender_id: updatedProcess.id,
            category: b.category,
            item_name: b.item_name,
            quantity: b.quantity,
            unit_of_measure: b.unit_of_measure,
            unit_cost: b.unit_cost,
            markup_percentage: b.markup_percentage,
            tax_percentage: b.tax_percentage,
            created_at: new Date().toISOString()
          }));
          await supabase.from('boq_items').upsert(boqRows, { onConflict: 'id' });
        }
      } catch (e) {}
    }
  };

  if (isInitializingSession) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center text-slate-900 space-y-4 font-mono">
        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 flex items-center space-x-3">
          <Loader2 className="w-6 h-6 text-teal-800 font-semibold animate-spin" />
          <span className="text-sm font-bold tracking-wide">Initializing Admin Session...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginLanding 
        onLoginSuccess={handleLoginSuccess}
        onNavigateAdmin={() => {
          setCurrentUser(DEFAULT_ADMIN_USER);
          setActiveRole('Admin');
          saveUserSession(DEFAULT_ADMIN_USER);
          setActiveTab('dashboard');
        }}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-transparent text-slate-800">
      {/* Header Bar with User Badge & Role Switcher */}
      <Header 
        currentProvider={provider} 
        onProviderChange={setProvider}
        activeRole={activeRole}
        onRoleChange={handleRoleChange}
        currentUser={currentUser}
        onLogout={handleLogout}
        onNavigateSettings={() => setActiveTab('admin_config')}
        onNavigateAdminPortal={() => setActiveTab('admin')}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

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
        <main className="flex-1 p-5 sm:p-7 max-w-7xl mx-auto w-full space-y-6">
          {activeTab === 'dashboard' && (
            <DashboardView 
              onNavigate={(tab) => setActiveTab(tab)} 
              tendersCount={tendersQueue.length}
            />
          )}

          {activeTab === 'india_tenders' && (
            <IndiaTendersSectorView
              onNavigate={(tab) => setActiveTab(tab)}
              onImportTender={handleImportTender}
              onSelectForBidding={handleSelectForBidding}
            />
          )}

          {activeTab === 'tender_tracker' && (
            <TenderTrackerDashboard
              tenders={trackedTenders}
              activeRole={activeRole}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onUpdateTendersList={(updated) => setTrackedTenders(updated)}
            />
          )}

          {activeTab === 'eligibility' && (
            <EligibilityChecker />
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

          {(activeTab === 'companies' || activeTab === 'master_company') && (
            <CompanyDetailsView />
          )}

          {activeTab === 'combine' && (
            <CombineAnalysisView />
          )}

          {activeTab === 'costing' && (
            <CostingEstimatorView />
          )}

          {activeTab === 'competitors' && (
            <CompetitorBattleCardsView />
          )}

          {activeTab === 'settings' && (
            <SettingsView activeRole={activeRole} onProviderChange={setProvider} />
          )}

          {(activeTab === 'admin' || activeTab === 'admin_kb') && (
            <AdminPortal onBackToUserPortal={() => setActiveTab('dashboard')} />
          )}

          {activeTab === 'admin_config' && (
            <AdminBackendConfig activeRole={activeRole} />
          )}
        </main>
      </div>
    </div>
  );
}
