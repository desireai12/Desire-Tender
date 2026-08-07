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
import { DepartmentRole, TenderProcess } from '@/lib/types';

export default function Home() {
  const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini');
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [activeRole, setActiveRole] = useState<DepartmentRole>('Business Development');

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
          user: 'BD Officer (Ankit Purohit)',
          department: 'Business Development',
          timestamp: '2026-08-06 10:15:00',
          action: 'Completed Step 1 Eligibility & Step 2 PDF Upload',
          status: 'Passed & Locked',
          next_pending_action: 'Estimation Team to construct Stage 3 BOQ'
        }
      ]
    },
    {
      id: '881202',
      tender_name: 'PM-Kusum Component-B Solar Pump Scheme (5,000 HP)',
      project_category: 'KUSUM',
      project_locked: true,
      department_assigned: 'Estimation Team',
      current_stage: '3_COST_ESTIMATION',
      stage_status: 'In Progress',
      created_at: '2026-08-05 14:00:00',
      updated_at: '2026-08-06 11:00:00',
      eligibility_result: {
        is_eligible: true,
        score: 93,
        reasoning: 'Verified Sunaquator RMS controller integration & REDA empanelment.'
      },
      boq_items: [
        { id: 'b-1', category: 'Equipment', item_name: '5 HP Submersible Solar Pump Set', unit_of_measure: 'Sets', quantity: 500, unit_cost: 145000, markup_percentage: 12, tax_percentage: 18 },
        { id: 'b-2', category: 'Equipment', item_name: 'Sunaquator 4G Telemetry Controller', unit_of_measure: 'Units', quantity: 500, unit_cost: 25000, markup_percentage: 15, tax_percentage: 18 }
      ],
      audit_trail: [
        {
          id: 'log-2',
          user: 'Sr Estimator (Deepak Khandelwal)',
          department: 'Estimation Team',
          timestamp: '2026-08-06 11:00:00',
          action: 'Added Sunaquator & Pump Line Items to Stage 3 BOQ',
          status: 'In Progress',
          next_pending_action: 'Management Stage 4 Apply Approval'
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

  return (
    <div className="flex flex-col min-h-screen bg-[#101415] text-[#e0e3e5]">
      {/* Header Bar with Department Role Switcher */}
      <Header 
        currentProvider={provider} 
        onProviderChange={setProvider}
        activeRole={activeRole}
        onRoleChange={setActiveRole}
        onNavigateSettings={() => setActiveTab(activeRole === 'Admin' ? 'admin_config' : 'settings')}
      />

      {/* Main Workspace Layout */}
      <div className="flex flex-1">
        {/* Navigation Sidebar */}
        <Sidebar 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
          activeRole={activeRole}
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
            <SettingsView onProviderChange={setProvider} />
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
