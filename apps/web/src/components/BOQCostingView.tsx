'use client';

import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  FileCheck, 
  ShieldCheck, 
  Calculator,
  ArrowRight,
  Info
} from 'lucide-react';
import { getAuthHeaders } from '@/lib/store';

export interface CostingCounts {
  MATCHED: number;
  REVIEW_LOOSE?: number;
  REVIEW_FUZZY?: number;
  REVIEW?: number;
  NOT_PRICED: number;
  UNMATCHED: number;
}

export const BOQCostingView: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<CostingCounts | null>(null);
  const [totalAmount, setTotalAmount] = useState<number | null>(null);
  const [rateSetHash, setRateSetHash] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState<string>('costed_boq.xlsx');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.xlsx')) {
      setError('Please upload a valid Excel (.xlsx) file.');
      return;
    }
    setFile(selectedFile);
    setError(null);
    setCounts(null);
    setTotalAmount(null);
    setDownloadUrl(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleRunCosting = async () => {
    if (!file) {
      setError('Please select an Excel (.xlsx) BOQ file to cost.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const authHeaders = getAuthHeaders();
      const res = await fetch('/api/v1/costing/run', {
        method: 'POST',
        headers: {
          ...authHeaders
        },
        body: formData
      });

      if (!res.ok) {
        let errDetail = `Server responded with status ${res.status}`;
        try {
          const errText = await res.text();
          try {
            const errJson = JSON.parse(errText);
            const msg = errJson.error || errJson.message || errJson.detail;
            if (msg) errDetail = `Status ${res.status}: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`;
          } catch {
            // not JSON (e.g. platform error page) — keep the status-only message
          }
        } catch {
          // body unreadable
        }
        throw new Error(errDetail);
      }

      // Read status counts from headers
      const countsHeader = res.headers.get('X-Costing-Counts');
      let parsedCounts: CostingCounts = { MATCHED: 0, NOT_PRICED: 0, UNMATCHED: 0 };
      if (countsHeader) {
        try {
          parsedCounts = JSON.parse(countsHeader);
        } catch (e) {
          console.warn('Could not parse X-Costing-Counts header:', countsHeader);
        }
      }

      // Read total from headers
      const totalHeader = res.headers.get('X-Costing-Total');
      const parsedTotal = totalHeader ? parseFloat(totalHeader) : 0;

      // Read rate set hash from headers
      const rateSet = res.headers.get('X-Costing-Rate-Set') || 'active-set';

      // Read binary blob for the costed xlsx
      const blob = await res.blob();
      const outUrl = URL.createObjectURL(blob);
      const outFilename = `${file.name.replace(/\.xlsx$/i, '')}_costed.xlsx`;

      setCounts(parsedCounts);
      setTotalAmount(parsedTotal);
      setRateSetHash(rateSet);
      setDownloadUrl(outUrl);
      setDownloadFilename(outFilename);

      // Automatically trigger download
      const link = document.createElement('a');
      link.href = outUrl;
      link.download = outFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err: any) {
      console.error('[COSTING_RUN_ERROR]', err);
      setError(err.message || 'An error occurred during costing execution.');
    } finally {
      setIsLoading(false);
    }
  };

  const reviewCount = counts 
    ? ((counts.REVIEW_LOOSE || 0) + (counts.REVIEW_FUZZY || 0) + (counts.REVIEW || 0))
    : 0;

  const totalLines = counts 
    ? (counts.MATCHED + reviewCount + counts.NOT_PRICED + counts.UNMATCHED)
    : 0;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
  };

  const formatCrores = (val: number) => {
    const cr = val / 10000000;
    return `₹${cr.toFixed(2)} Cr`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-card bg-white/95 dark:bg-[#0b1426] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">BOQ Costing Engine</h1>
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Deterministic v1.0
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Fills Purchase Rate (J), Execution Rate (K), and Total Amount (L = D*(J+K)) from verified Ajmer UWSS rate card.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs font-mono bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-slate-600 dark:text-slate-400">Strict Match Hierarchy • 100% Traceable</span>
          </div>
        </div>
      </div>

      {/* Main Upload Card */}
      <div className="glass-card bg-white/95 dark:bg-[#0b1426] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Upload Tender BOQ (.xlsx)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Upload a fresh tender BOQ workbook. The engine keeps workbook layout untouched and outputs a costed copy with an appended audit report.
          </p>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-slate-300 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-600 bg-slate-50/50 dark:bg-slate-900/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700">
              <Upload className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {file ? file.name : 'Click to select or drag & drop tender BOQ (.xlsx)'}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Supports standard format BOQ sheets (Cols A..L)'}
              </p>
            </div>
            {file && (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                <FileCheck className="w-3.5 h-3.5" />
                <span>File ready for costing</span>
              </span>
            )}
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start space-x-3 text-rose-800 dark:text-rose-300">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold">Costing Error</p>
              <p className="mt-0.5 text-rose-700 dark:text-rose-400">{error}</p>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex items-center justify-end space-x-3">
          {file && (
            <button
              onClick={() => {
                setFile(null);
                setCounts(null);
                setTotalAmount(null);
                setDownloadUrl(null);
                setError(null);
              }}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Clear
            </button>
          )}

          <button
            onClick={handleRunCosting}
            disabled={!file || isLoading}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              !file || isLoading
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/20'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Rates & Costing...</span>
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4" />
                <span>Run Costing Engine</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results Section */}
      {counts && totalAmount !== null && (
        <div className="glass-card bg-white/95 dark:bg-[#0b1426] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Costing Completed Successfully</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Processed {totalLines} BOQ lines against active rate set ({rateSetHash})
              </p>
            </div>

            {downloadUrl && (
              <a
                href={downloadUrl}
                download={downloadFilename}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Download Costed File (.xlsx)</span>
              </a>
            )}
          </div>

          {/* Grand Total Hero Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Total Bid Amount (Grand Total)
              </span>
              <div className="flex items-baseline space-x-3 mt-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                  {formatCurrency(totalAmount)}
                </span>
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                  ({formatCrores(totalAmount)})
                </span>
              </div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 text-left md:text-right font-mono">
              <p>Includes O&M (5%) Recomputed</p>
              <p className="text-[11px] text-slate-400">Sheet grand-total cell updated</p>
            </div>
          </div>

          {/* Status Counts Grid */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-3">
              Line Match Status Breakdown
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* MATCHED */}
              <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">MATCHED</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-900 dark:text-emerald-200 mt-2">
                  {counts.MATCHED}
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Context + description + unit exact
                </p>
              </div>

              {/* REVIEW */}
              <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300">REVIEW</span>
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                </div>
                <div className="text-2xl font-bold font-mono text-amber-900 dark:text-amber-200 mt-2">
                  {reviewCount}
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                  Loose or fuzzy match
                </p>
              </div>

              {/* NOT_PRICED */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">NOT_PRICED</span>
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-200 mt-2">
                  {counts.NOT_PRICED}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Left blank in bid (kept blank)
                </p>
              </div>

              {/* UNMATCHED */}
              <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-800 dark:text-rose-300">UNMATCHED</span>
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                </div>
                <div className="text-2xl font-bold font-mono text-rose-900 dark:text-rose-200 mt-2">
                  {counts.UNMATCHED}
                </div>
                <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5">
                  Not found in rate card (blank)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reference & Audit Info */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
        <div className="flex items-center space-x-2 font-bold text-slate-800 dark:text-slate-200">
          <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>How Matching Works</span>
        </div>
        <p className="leading-relaxed">
          The engine deterministically matches each BOQ line against verified rates from the Ajmer UWSS rate set (379 rates). Lines with identical header context, description, and normalized unit are marked <strong className="text-emerald-600 dark:text-emerald-400">MATCHED</strong>. Unmatched lines are left blank without estimation guessing. The costed workbook contains the populated rates (Cols J, K, L) plus an appended <strong className="text-slate-800 dark:text-slate-200">&ldquo;Costing Report&rdquo;</strong> worksheet.
        </p>
      </div>
    </div>
  );
};
