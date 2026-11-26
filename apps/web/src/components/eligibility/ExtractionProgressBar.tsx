'use client';

import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Layers, 
  Table as TableIcon, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  DollarSign, 
  Sparkles,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import {
  RADHANPUR_BATCH_METRICS,
  RADHANPUR_EXTRACTION_STATS,
  RADHANPUR_CATEGORY_COUNTS,
  RADHANPUR_TABLES_MASTER,
  MOCK_MODE_COST_LABEL
} from '@/lib/new-eligibility/mockData';

export const ExtractionProgressBar: React.FC = () => {
  const [showBatchDrawer, setShowBatchDrawer] = useState(false);

  const financialCriteriaCount = RADHANPUR_CATEGORY_COUNTS['A. FINANCIAL_ELIGIBILITY'] ?? 0;
  const technicalCriteriaCount = RADHANPUR_CATEGORY_COUNTS['B. TECHNICAL_ELIGIBILITY'] ?? 0;
  const otherCriteriaCount = RADHANPUR_CATEGORY_COUNTS['C. OTHER_ELIGIBILITY'] ?? 0;
  const checklistScopeTermsCount =
    (RADHANPUR_CATEGORY_COUNTS['D. BID_SUBMISSION_CHECKLIST'] ?? 0) +
    (RADHANPUR_CATEGORY_COUNTS['E. CONTRACT_TERMS'] ?? 0) +
    (RADHANPUR_CATEGORY_COUNTS['F. TECHNICAL_SPECS_AND_SCOPE'] ?? 0);

  const financialTablesCount = RADHANPUR_TABLES_MASTER.filter(t => t.category.includes('FINANCIAL')).length;
  const technicalTablesCount = RADHANPUR_TABLES_MASTER.filter(t => t.category.includes('TECHNICAL')).length;
  const otherTablesCount = RADHANPUR_TABLES_MASTER.length - financialTablesCount - technicalTablesCount;

  const progressPct = Math.round(
    (RADHANPUR_EXTRACTION_STATS.successfulBatches / RADHANPUR_EXTRACTION_STATS.totalBatches) * 100
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
      {/* Top Header & 100% Progress Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              100% Structural Discovery & Extraction Progress
            </h3>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
              {RADHANPUR_EXTRACTION_STATS.totalPages} / {RADHANPUR_EXTRACTION_STATS.totalPages} Pages ({progressPct}%)
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>{RADHANPUR_EXTRACTION_STATS.successfulBatches} / {RADHANPUR_EXTRACTION_STATS.totalBatches} Batches Complete</span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{MOCK_MODE_COST_LABEL}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden p-0.5">
          <div 
            className="bg-gradient-to-r from-emerald-600 to-teal-500 h-full rounded-full transition-all duration-500 shadow-sm"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Category Breakdown & Quality Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Financial Category */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Financial</p>
          <p className="text-base font-extrabold text-slate-900 dark:text-white mt-1">{financialCriteriaCount} Criteria</p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">{financialTablesCount} Reconstructed Tables</p>
        </div>

        {/* Technical Category */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Technical</p>
          <p className="text-base font-extrabold text-slate-900 dark:text-white mt-1">{technicalCriteriaCount} Criteria</p>
          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">{technicalTablesCount} Reconstructed Tables</p>
        </div>

        {/* Others / Legal + Checklist/Terms/Scope */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Others & Terms</p>
          <p className="text-base font-extrabold text-slate-900 dark:text-white mt-1">{otherCriteriaCount} Others • {checklistScopeTermsCount} Checklist/Terms</p>
          <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">{otherTablesCount} Other Tables</p>
        </div>

        {/* Unreadable Pages */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Unreadable</p>
          <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{RADHANPUR_EXTRACTION_STATS.unreadablePages} Pages</p>
          <p className="text-[11px] text-slate-500">{RADHANPUR_EXTRACTION_STATS.ocrFallbackPages} OCR fallback</p>
        </div>

        {/* Failed Batches */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Extraction Fails</p>
          <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{RADHANPUR_EXTRACTION_STATS.failedBatches} Failed</p>
          <p className="text-[11px] text-slate-500">{RADHANPUR_EXTRACTION_STATS.successfulBatches}/{RADHANPUR_EXTRACTION_STATS.totalBatches} First-attempt pass</p>
        </div>

        {/* Corrigenda Status */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Corrigenda</p>
          <p className="text-base font-extrabold text-amber-600 dark:text-amber-400 mt-1">0 Internal</p>
          <p className="text-[11px] text-slate-500">External not verified</p>
        </div>
      </div>

      {/* Batch Details Drawer Toggle */}
      <div className="pt-1">
        <button
          onClick={() => setShowBatchDrawer(!showBatchDrawer)}
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
        >
          <span>{showBatchDrawer ? 'Hide' : 'View'} {RADHANPUR_EXTRACTION_STATS.totalBatches}-Batch Accounting Details</span>
          {showBatchDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showBatchDrawer && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {RADHANPUR_BATCH_METRICS.map(b => (
                <div 
                  key={b.batch_number}
                  className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">Batch {b.batch_number}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                      ✓
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">Pages {b.start_page}–{b.end_page}</p>
                  <p className="text-[10px] text-slate-400">
                    {b.clauses} clauses • {b.tables} tables • {b.anchors} anchors
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

