'use client';

import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar, NavTab } from '@/components/Sidebar';
import { DashboardView } from '@/components/DashboardView';
import { AdminKnowledgeBase } from '@/components/AdminKnowledgeBase';
import { EligibilityChecker } from '@/components/EligibilityChecker';
import { CompetitorBattleCardsView } from '@/components/CompetitorBattleCardsView';
import { CostingEstimatorView } from '@/components/CostingEstimatorView';
import { SettingsView } from '@/components/SettingsView';

export default function Home() {
  const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini');
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedProject, setSelectedProject] = useState<string>('jjm');

  return (
    <div className="flex flex-col min-h-screen bg-[#101415] text-[#e0e3e5]">
      {/* Header Bar */}
      <Header 
        currentProvider={provider} 
        onProviderChange={setProvider}
        selectedProject={selectedProject}
        onProjectChange={setSelectedProject}
        onNavigateSettings={() => setActiveTab('settings')}
      />

      {/* Main Workspace Layout */}
      <div className="flex flex-1">
        {/* Navigation Sidebar */}
        <Sidebar 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />

        {/* Tab Content View Container */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
          {activeTab === 'dashboard' && (
            <DashboardView 
              onNavigate={(tab) => setActiveTab(tab)} 
              recentAssessmentScore={92}
            />
          )}

          {activeTab === 'admin' && (
            <AdminKnowledgeBase />
          )}

          {activeTab === 'eligibility' && (
            <EligibilityChecker currentProvider={provider} />
          )}

          {activeTab === 'competitors' && (
            <CompetitorBattleCardsView />
          )}

          {activeTab === 'costing' && (
            <CostingEstimatorView />
          )}

          {activeTab === 'settings' && (
            <SettingsView onProviderChange={setProvider} />
          )}
        </main>
      </div>
    </div>
  );
}
