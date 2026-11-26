'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  Calendar, 
  FileText, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  ShieldCheck, 
  AlertTriangle,
  Layers,
  Table as TableIcon,
  HelpCircle,
  Lock,
  ArrowLeft
} from 'lucide-react';
import {
  MOCK_AVAILABLE_TENDERS,
  MockTenderSummary,
  RADHANPUR_EXTRACTION_STATS,
  RADHANPUR_FIXTURE,
  MOCK_MODE_COST_LABEL
} from '@/lib/new-eligibility/mockData';
import { TenderUploadDropzone } from './TenderUploadDropzone';

export const TenderEligibilityDashboard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredTenders = MOCK_AVAILABLE_TENDERS.filter(tender => {
    const matchesSearch = 
      tender.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tender.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tender.jvPolicy.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || tender.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const verifiedCount = MOCK_AVAILABLE_TENDERS.filter(t => t.status === 'VERIFIED_FIXTURE').length;

  const getStatusBadge = (status: MockTenderSummary['status']) => {
    switch (status) {
      case 'VERIFIED_FIXTURE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            VERIFIED FIXTURE
          </span>
        );
      case 'DEMO_ONLY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            DEMO ONLY
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Main Dashboard</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/80">
              <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              Deterministic Engine (Stage 3B)
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300/80 dark:border-purple-700/80">
              <Lock className="w-3 h-3 text-purple-600 dark:text-purple-400" />
              {MOCK_MODE_COST_LABEL}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Tender Eligibility & Review Dashboard
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Audit extracted tender criteria, inspect verified tabular structures, and evaluate company qualification with strict evidence verification and zero hallucination.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/tender-review?id=radhanpur"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition-colors shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>Open Golden Radhanpur Review</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2">
            <span>Available Tenders</span>
            <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{MOCK_AVAILABLE_TENDERS.length} Entries</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{verifiedCount} Verified Fixture • {MOCK_AVAILABLE_TENDERS.length - verifiedCount} Demo</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2">
            <span>Verified Pages Accounted</span>
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{RADHANPUR_FIXTURE.totalPages} Pages</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{RADHANPUR_EXTRACTION_STATS.successfulBatches}/{RADHANPUR_EXTRACTION_STATS.totalBatches} Batches (100%)</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2">
            <span>Extracted Criteria</span>
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">41 Clauses</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Golden Radhanpur Master</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2">
            <span>Verified Tables</span>
            <TableIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">23 Tables</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Golden Radhanpur Reconstructed</div>
        </div>
      </div>

      {/* Available Tenders Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Available Tenders in Review Queue</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {filteredTenders.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select the verified fixture to inspect criteria, review reconstructed tables, and execute deterministic evaluation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search tenders, departments..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('VERIFIED_FIXTURE')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === 'VERIFIED_FIXTURE'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Verified Fixture
              </button>
              <button
                onClick={() => setStatusFilter('DEMO_ONLY')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === 'DEMO_ONLY'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Demo Only
              </button>
            </div>
          </div>
        </div>

        {/* Tenders List */}
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {filteredTenders.map(tender => (
            <div
              key={tender.id}
              className="p-5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {tender.department}
                  </span>
                  {getStatusBadge(tender.status)}
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {tender.title}
                </h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                  <span>Est. Cost: <strong className="text-emerald-700 dark:text-emerald-400">{tender.estimatedCost}</strong></span>
                  <span>•</span>
                  <span>
                    Pages: <strong>{tender.totalPages ?? 'N/A'}</strong>
                    {!tender.isDemo ? ` (${RADHANPUR_EXTRACTION_STATS.totalBatches} Batches)` : ''}
                  </span>
                  <span>•</span>
                  <span>Criteria: <strong>{tender.totalCriteria ?? 'N/A'}</strong></span>
                  <span>•</span>
                  <span>Tables: <strong>{tender.totalTables ?? 'N/A'}</strong></span>
                  <span>•</span>
                  <span>JV Policy: <strong className="text-slate-700 dark:text-slate-300">{tender.jvPolicy}</strong></span>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-3">
                {tender.status === 'VERIFIED_FIXTURE' ? (
                  <Link
                    href={`/tender-review?id=${tender.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    <span>Open Eligibility Review</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed">
                    Demo Entry (No Source PDF)
                  </span>
                )}
              </div>
            </div>
          ))}

          {filteredTenders.length === 0 && (
            <div className="p-12 text-center text-slate-500 text-xs">
              No tenders found matching your search and filter criteria.
            </div>
          )}
        </div>
      </div>

      {/* Tender Upload Dropzone Component */}
      <TenderUploadDropzone />
    </div>
  );
};

