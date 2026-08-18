'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Sidebar, NavTab } from '@/components/Sidebar';
import { DashboardView } from '@/components/DashboardView';
import { AdminKnowledgeBase } from '@/components/AdminKnowledgeBase';
import { AdminBackendConfig } from '@/components/AdminBackendConfig';
import { TenderWizard } from '@/components/TenderWizard';
import { TenderLifecycleTracker } from '@/components/TenderLifecycleTracker';
import { CompetitorBattleCardsView } from '@/components/CompetitorBattleCardsView';
import { CostingEstimatorView } from '@/components/CostingEstimatorView';
import { SettingsView } from '@/components/SettingsView';
import { LoginLanding } from '@/components/LoginLanding';
import { AdminPortal } from '@/components/AdminPortal';
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
};

export default function Home() {
  const [viewMode, setViewMode] = useState<'user' | 'admin'>('user');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isInitializingSession, setIsInitializingSession] = useState<boolean>(true);
  const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini');
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [activeRole, setActiveRole] = useState<DepartmentRole>('Business Development');
  const [tendersQueue, setTendersQueue] = useState<TenderProcess[]>([DEFAULT_SEED_TENDER]);

  // RESTORE AUTHENTICATION SESSION ON MOUNT (AUTO-LOAD WORKSPACE WITHOUT USER LOGIN)
  useEffect(() => {
    try {
      const activeSessionUser = getActiveUserSession();
      if (activeSessionUser) {
        setCurrentUser(activeSessionUser);
        setActiveRole(activeSessionUser.department);
        if (activeSessionUser.department === 'Admin') {
          setViewMode('admin');
        } else {
          setViewMode('user');
        }
      } else {
        // Direct access to Tender Workspace without requiring login
        const defaultUser: UserProfile = {
          id: 'usr-default',
          employee_id: 'EMP001',
          full_name: 'Desire Tender Specialist',
          email: 'tender@desireenergy.com',
          phone: '9999999999',
          role: 'Tender Specialist',
          department: 'Business Development',
          status: 'Active',
          permissions: ['eligibility', 'ai_analysis', 'cost_estimation', 'bid_decision', 'bid_details', 'tender_result'],
          assigned_projects: ['RHDS', 'STP', 'SOLAR', 'KUSUM', 'EPC', 'ESCO'],
          registered_at: '2026-08-01',
          last_login: new Date().toISOString()
        };
        setCurrentUser(defaultUser);
        setActiveRole('Business Development');
      }
    } catch (e) {} finally {
      setIsInitializingSession(false);
    }
  }, []);

  // LOAD LIVE TENDERS FROM API AND DIRECT SUPABASE DB ON MOUNT
  useEffect(() => {
    const fetchTendersFromDb = async () => {
      let loadedTenders: TenderProcess[] = [];

      // 1. Try Vercel Serverless API first
      try {
        const res = await fetch(`${API_BASE_URL}/tenders`);
        if (res.ok) {
          const data = await res.json();
          if (data.tenders && Array.isArray(data.tenders) && data.tenders.length > 0) {
            loadedTenders = data.tenders;
          }
        }
      } catch (err) {}

      // 2. Query Supabase directly as bulletproof fallback
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

  // Handle Login Success — PERSIST SESSION
  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setActiveRole(user.department);
    saveUserSession(user);
    if (user.department === 'Admin') {
      setViewMode('admin');
    } else {
      setViewMode('user');
      setActiveTab(user.status === 'Pending' ? 'wizard' : 'dashboard');
    }
  };

  // Handle Logout — CLEAR SESSION
  const handleLogout = () => {
    clearUserSession();
    setCurrentUser(null);
    setViewMode('user');
    setActiveRole('Business Development');
    setActiveTab('dashboard');
  };

  // PERSIST NEW TENDER LIVE TO DATABASE & API
  const handleAddNewTender = async (newProcess: TenderProcess) => {
    setTendersQueue((prev) => [newProcess, ...prev]);
    setActiveTab('lifecycle');

    // 1. Send to Vercel Serverless API
    try {
      await fetch(`${API_BASE_URL}/tenders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProcess)
      });
    } catch (e) {}

    // 2. Direct Supabase write so record immediately exists in Supabase PostgreSQL
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

    // 1. Send to Vercel Serverless API
    try {
      await fetch(`${API_BASE_URL}/tenders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProcess)
      });
    } catch (e) {}

    // 2. Direct Supabase write
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

        // Stream BOQ items to Supabase boq_items table for historical learning!
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

  // Render Loading Splash Screen while checking persistent session on refresh
  if (isInitializingSession) {
    return (
      <div className="min-h-screen bg-[#0d1112] flex flex-col items-center justify-center text-white space-y-4 font-mono">
        <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center space-x-3">
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          <span className="text-sm font-bold tracking-wide">Checking authentication session...</span>
        </div>
      </div>
    );
  }

  // If user is not logged in after session check, render Login / Create Account Landing Page
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

          {activeTab === 'costing' && (
            <CostingEstimatorView />
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
