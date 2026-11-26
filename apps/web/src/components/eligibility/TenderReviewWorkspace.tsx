'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Sparkles, 
  Table as TableIcon, 
  Layers, 
  FileText, 
  CheckCircle2, 
  HelpCircle, 
  Clock, 
  ShieldCheck, 
  Lock,
  ChevronRight,
  Printer,
  Scale
} from 'lucide-react';
import { 
  RADHANPUR_CRITERIA_MASTER, 
  RADHANPUR_TABLES_MASTER,
  RADHANPUR_FIXTURE,
  RADHANPUR_EVALUATION,
  RADHANPUR_EXTRACTION_STATS,
  MOCK_MODE_COST_LABEL,
  MockCriterion,
  MockTable
} from '@/lib/new-eligibility/mockData';
import { ExtractionProgressBar } from './ExtractionProgressBar';
import { CriteriaReviewTab } from './CriteriaReviewTab';
import { TableReviewTab } from './TableReviewTab';
import { DualEvaluationTab } from './DualEvaluationTab';
import { FinalReportTab } from './FinalReportTab';

interface TenderReviewWorkspaceProps {
  tenderId?: string;
}

export const TenderReviewWorkspace: React.FC<TenderReviewWorkspaceProps> = ({
  tenderId = 'radhanpur'
}) => {
  const [activeTab, setActiveTab] = useState<'criteria' | 'tables' | 'evaluation' | 'report'>('criteria');

  // Client-side mutable state for criteria (for mock approve, edit, reject actions)
  const [criteriaList, setCriteriaList] = useState<MockCriterion[]>(RADHANPUR_CRITERIA_MASTER);

  // Client-side mutable state for tables (for cell edits)
  const [tablesList, setTablesList] = useState<MockTable[]>(RADHANPUR_TABLES_MASTER);

  const handleUpdateCriterion = (updated: MockCriterion) => {
    setCriteriaList(prev => prev.map(c => c.criterion_id === updated.criterion_id ? updated : c));
  };

  const handleUpdateTable = (updatedTable: MockTable) => {
    setTablesList(prev => prev.map(t => t.table_index === updatedTable.table_index ? updatedTable : t));
  };

  // Calculate live review counts
  const approvedCount = criteriaList.filter(c => c.review_status === 'APPROVED').length;
  const editedCount = criteriaList.filter(c => c.review_status === 'EDITED').length;
  const rejectedCount = criteriaList.filter(c => c.review_status === 'REJECTED').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Breadcrumb Navigation & Top Metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Link 
            href="/"
            className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            Dashboard
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link 
            href="/tender-eligibility"
            className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            Tender Eligibility
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px] sm:max-w-xs">
            Radhanpur RWSS (GWSSB)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/tender-eligibility"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Tender Queue</span>
          </Link>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
            <Lock className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            {MOCK_MODE_COST_LABEL}
          </span>
        </div>
      </div>

      {/* Main Review Workspace Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
                {RADHANPUR_FIXTURE.department}
              </span>
              <span className="text-xs font-mono text-slate-500">
                Tender ID: {RADHANPUR_FIXTURE.tenderId}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                VERIFIED FIXTURE
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              {RADHANPUR_FIXTURE.title} — Review Workspace
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400 pt-0.5">
              <span>Estimated Cost: <strong className="text-emerald-600 dark:text-emerald-400">{RADHANPUR_FIXTURE.estimatedCostLabel}</strong></span>
              <span>•</span>
              <span>Total Document: <strong>{RADHANPUR_FIXTURE.totalPages} Pages</strong> ({RADHANPUR_EXTRACTION_STATS.totalBatches} Batches)</span>
              <span>•</span>
              <span>Audited Criteria: <strong>{criteriaList.length} Verified Clauses</strong></span>
              <span>•</span>
              <span>Structural Tables: <strong>{tablesList.length} Reconstructed</strong></span>
            </div>
          </div>

          {/* Dual Verdict Badges */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400">Corporate Status</div>
              <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mt-0.5">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{RADHANPUR_EVALUATION.corporateQualification.status}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400">Proposal Readiness</div>
              <div className="font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{RADHANPUR_EVALUATION.proposalReadiness.status}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-900 text-white dark:bg-slate-800 rounded-lg border border-slate-700 text-xs">
              <div className="text-[10px] uppercase font-bold text-amber-400">Overall Verdict</div>
              <div className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                <span>{RADHANPUR_EVALUATION.overallVerdict}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Human Review Counters */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-400 font-semibold select-none">Mock Review State (Session-Only — Not Saved to Database):</span>
          <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
            {approvedCount} Approved
          </span>
          <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800">
            {editedCount} Overrides / Edits
          </span>
          <span className="px-2 py-0.5 rounded bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-bold border border-red-200 dark:border-red-800">
            {rejectedCount} Rejected
          </span>
        </div>
      </div>

      {/* Section 1: Extraction Progress Bar & Metrics */}
      <ExtractionProgressBar />

      {/* Section 2: Tabbed Review Workspace */}
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-800">
          <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('criteria')}
              type="button"
              className={`py-3 px-4 border-b-2 text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'criteria'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>41 Criteria Review</span>
              <span className="px-1.5 py-0.2 text-[11px] rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                {criteriaList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('tables')}
              type="button"
              className={`py-3 px-4 border-b-2 text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'tables'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <TableIcon className="w-4 h-4" />
              <span>Reconstructed Tables</span>
              <span className="px-1.5 py-0.2 text-[11px] rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                {tablesList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('evaluation')}
              type="button"
              className={`py-3 px-4 border-b-2 text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'evaluation'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>Dual Eligibility Evaluation</span>
            </button>

            <button
              onClick={() => setActiveTab('report')}
              type="button"
              className={`py-3 px-4 border-b-2 text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'report'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Final Evaluation Report</span>
            </button>
          </nav>
        </div>

        {/* Active Tab Content */}
        <div className="pt-2">
          {activeTab === 'criteria' && (
            <CriteriaReviewTab
              criteria={criteriaList}
              onUpdateCriterion={handleUpdateCriterion}
            />
          )}

          {activeTab === 'tables' && (
            <TableReviewTab
              tables={tablesList}
              onUpdateTable={handleUpdateTable}
            />
          )}

          {activeTab === 'evaluation' && (
            <DualEvaluationTab />
          )}

          {activeTab === 'report' && (
            <FinalReportTab />
          )}
        </div>
      </div>
    </div>
  );
};

