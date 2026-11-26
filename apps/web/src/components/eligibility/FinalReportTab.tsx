'use client';

import React, { useState } from 'react';
import { 
  Terminal, 
  FileText, 
  Copy, 
  Check, 
  Download, 
  ShieldCheck, 
  Sparkles,
  HelpCircle,
  Clock,
  Printer
} from 'lucide-react';
import {
  RADHANPUR_TERMINAL_REPORT,
  RADHANPUR_MARKDOWN_REPORT,
  RADHANPUR_EVALUATION
} from '@/lib/new-eligibility/mockData';

export const FinalReportTab: React.FC = () => {
  const [viewMode, setViewMode] = useState<'terminal' | 'markdown'>('terminal');
  const [copied, setCopied] = useState(false);

  const reportData = RADHANPUR_EVALUATION;
  const cq = reportData.corporateQualification;
  const pr = reportData.proposalReadiness;
  const activeContent = viewMode === 'terminal' ? RADHANPUR_TERMINAL_REPORT : RADHANPUR_MARKDOWN_REPORT;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = viewMode === 'terminal' ? 'txt' : 'md';
    const mime = viewMode === 'terminal' ? 'text/plain;charset=utf-8' : 'text/markdown;charset=utf-8';
    const element = document.createElement('a');
    const file = new Blob([activeContent], { type: mime });
    element.href = URL.createObjectURL(file);
    element.download = `Desire_Tender_Report_${reportData.tenderId}.${ext}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
          <button
            onClick={() => setViewMode('terminal')}
            type="button"
            className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'terminal'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Monospace Terminal View</span>
          </button>

          <button
            onClick={() => setViewMode('markdown')}
            type="button"
            className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'markdown'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Executive Markdown View</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Report'}</span>
          </button>

          <button
            onClick={handleDownload}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .{viewMode === 'terminal' ? 'TXT' : 'MD'}</span>
          </button>
        </div>
      </div>

      {/* DUAL TOP CARDS PREVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Corporate Qualification */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm border-t-4 border-t-amber-500 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              1. Corporate Qualification
            </span>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
              {cq.status}
            </span>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">
            {cq.verdictSummary}
          </div>
          <div className="pt-2 text-[11px] text-slate-500 space-y-0.5">
            <div>• Financial Eligibility: <strong>{cq.financialGroup.status}</strong></div>
            <div>• Technical Eligibility: <strong>{cq.technicalGroup.status}</strong></div>
            <div>• Other Eligibility: <strong>{cq.otherGroup.status}</strong></div>
          </div>
        </div>

        {/* Card 2: Proposal Readiness */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm border-t-4 border-t-orange-500 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              2. Proposal Readiness
            </span>
            <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
              {pr.status}
            </span>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">
            {pr.verdictSummary}
          </div>
          <div className="pt-2 text-[11px] text-slate-500">
            Pending Items: <strong>{pr.missingItems.length} Instruments</strong>
          </div>
        </div>
      </div>

      {/* VIEW 1: MONOSPACE TERMINAL VIEW */}
      {viewMode === 'terminal' && (
        <div className="bg-slate-950 text-slate-200 rounded-xl border border-slate-800 p-6 shadow-md overflow-x-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="ml-2 font-bold text-slate-300">deterministic_evaluation_report.txt (Output Stream)</span>
            </div>
            <span>Standard: ANSI-Safe Monospace Box-Drawing</span>
          </div>

          <pre className="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre select-all">
            {RADHANPUR_TERMINAL_REPORT}
          </pre>
        </div>
      )}

      {/* VIEW 2: EXECUTIVE MARKDOWN VIEW */}
      {viewMode === 'markdown' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-sm space-y-6 text-sm text-slate-800 dark:text-slate-200">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              {reportData.tenderTitle}
            </h2>
            <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
              <span>Bidder: <strong>{reportData.bidderName}</strong> ({reportData.bidderCin})</span>
              <span>•</span>
              <span>Tender Ref: <strong>{reportData.tenderId}</strong></span>
              <span>•</span>
              <span>Evaluated: <strong>{reportData.evaluatedAt}</strong></span>
            </div>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
              Overall Tender Verdict: {reportData.overallVerdict}
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
              {reportData.overallVerdictText}
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              Section 1: Financial Eligibility ({cq.financialGroup.status})
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {cq.financialGroup.summaryLine}
            </p>
            {cq.scenarioDetails?.scenario1 && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs font-mono space-y-1">
                {Object.entries(cq.scenarioDetails.scenario1.adjustedTurnovers).map(([fy, row]) => (
                  <div key={fy}>
                    • FY {fy}: Raw ₹{row.raw.toFixed(2)} Cr × {row.multiplier.toFixed(2)} = Adjusted ₹{row.adjusted.toFixed(2)} Cr [{row.status}]
                  </div>
                ))}
                <div>
                  • 3rd Highest Adjusted Turnover: ₹{cq.scenarioDetails.scenario1.thirdHighestCr.toFixed(2)} Cr (Scenario 1 ≥ ₹{cq.scenarioDetails.scenario1.thresholdCr.toFixed(2)} Cr, Scenario 2 ≥ ₹{cq.scenarioDetails.scenario2.thresholdCr.toFixed(2)} Cr)
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              Section 2: Technical Eligibility ({cq.technicalGroup.status})
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {cq.technicalGroup.summaryLine}
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              Section 3: Other Statutory & Legal Standing ({cq.otherGroup.status})
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {cq.otherGroup.summaryLine}
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Full Generated Markdown Output
            </h3>
            <pre className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg font-mono text-[11px] text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap">
              {RADHANPUR_MARKDOWN_REPORT}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

