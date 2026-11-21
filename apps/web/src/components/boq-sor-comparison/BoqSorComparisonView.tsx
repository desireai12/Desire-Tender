'use client';

import React, { useState } from 'react';
import {
  Scale,
  Upload,
  Layers,
  GitCompare,
  BarChart3,
  Sparkles,
  Download,
  Building,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { FileUploadSection } from './FileUploadSection';
import { ItemMatchingReview } from './ItemMatchingReview';
import { ComparisonDashboard } from './ComparisonDashboard';
import { SkippedRowsModal } from './SkippedRowsModal';
import type { DocumentDiscipline, GstBasis, SheetScoreResult, SkippedRowRecord, SorFileRecord } from '@/lib/boq-sor-comparison/types';

export const BoqSorComparisonView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<
    'upload' | 'state_compare' | 'matching' | 'rate_analysis' | 'insights' | 'export'
  >(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sub = params.get('subtab') || params.get('tab');
      if (sub && ['upload', 'state_compare', 'matching', 'rate_analysis', 'insights', 'export'].includes(sub)) {
        return sub as any;
      }
    }
    return 'upload';
  });

  const [files, setFiles] = useState<SorFileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [datasetRefreshKey, setDatasetRefreshKey] = useState(0);

  const refreshFiles = async () => {
    try {
      const r = await fetch('/api/v1/sor-comparison/files');
      const data = await r.json();
      if (data && Array.isArray(data.files)) {
        setFiles(data.files);
      }
    } catch (err) {
      console.error('Failed to load files:', err);
    }
  };

  React.useEffect(() => {
    refreshFiles();
  }, []);

  // Skipped rows modal state
  const [skippedModalFile, setSkippedModalFile] = useState<SorFileRecord | null>(null);
  const [modalSkippedRows, setModalSkippedRows] = useState<SkippedRowRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleUploadFile = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/v1/sor-comparison/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Upload failed with status ${res.status}`);
      }

      const data = await res.json();
      if (data.is_duplicate) {
        return {
          file: data.existing_file || data.file,
          sheets: [],
          is_duplicate: true,
          message: data.message,
        };
      }
      return {
        file: data.file,
        sheets: data.sheets as SheetScoreResult[],
        candidate_revisions: data.candidate_revisions,
      };
    } catch (err: any) {
      console.error('[SOR_UPLOAD_ERROR]', err);
      setError(err.message || 'Failed to upload and analyze file');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmFile = async (params: {
    file_id: string;
    state_name: string;
    authority_code?: string;
    sor_year?: string;
    discipline?: DocumentDiscipline;
    document_title?: string;
    tender_reference?: string;
    upload_type: 'new_document' | 'revision';
    target_revision_doc_key?: string;
    gst_basis: GstBasis;
    selected_sheet: string;
    set_active?: boolean;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/sor-comparison/confirm-and-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson.correlation_id
          ? `${errJson.error} [Ref: ${errJson.correlation_id}]`
          : (errJson.error || `Extraction and persistence failed with status ${res.status}`);
        throw new Error(errMsg);
      }

      const data = await res.json();
      setFiles((prev) => {
        const exists = prev.some((f) => f.id === params.file_id);
        if (exists) {
          return prev.map((f) => (f.id === params.file_id ? data.file : f));
        } else {
          return [data.file, ...prev];
        }
      });
    } catch (err: any) {
      console.error('[SOR_EXTRACT_ERROR]', err);
      setError(err.message || 'Failed to extract items from sheet');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenSkippedRows = async (file: SorFileRecord) => {
    try {
      const res = await fetch(`/api/v1/sor-comparison/skipped-rows?file_id=${file.id}`);
      if (res.ok) {
        const data = await res.json();
        setModalSkippedRows(data.skipped || []);
        setSkippedModalFile(file);
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to load skipped rows:', err);
    }
  };

  const handleSetActiveVersion = async (file_id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/sor-comparison/set-active-version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to update active version');
      }
      const data = await res.json();
      if (data.files) {
        setFiles(data.files);
      }
      // Increment refresh key to trigger reactive refetching in downstream dashboards and matching reviews
      setDatasetRefreshKey((prev) => prev + 1);
    } catch (err: any) {
      console.error('[SOR_SET_ACTIVE_ERROR]', err);
      setError(err.message || 'Failed to update active version');
    } finally {
      setIsLoading(false);
    }
  };

  // Group files by confirmed state
  const stateGroups = React.useMemo(() => {
    const groups: Record<string, SorFileRecord[]> = {};
    for (const f of files) {
      if (f.state_confirmed && f.state_name) {
        groups[f.state_name] = groups[f.state_name] || [];
        groups[f.state_name].push(f);
      }
    }
    return groups;
  }, [files]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-card bg-white/95 dark:bg-[#0b1426] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shrink-0">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">BOQ SOR Comparison</h1>
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  Cross-State Benchmark
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Multi-state Government BOQ / SOR rate comparator with hierarchical item matching, GST normalization, and state-level consolidation.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <Building className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-slate-600 dark:text-slate-400">
              {Object.keys(stateGroups).length} State Groups • {files.length} Files Loaded
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 mt-6 border-b border-slate-100 dark:border-slate-800 pb-1 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveSubTab('upload')}
            className={`px-4 py-2 rounded-xl flex items-center space-x-2 transition-all cursor-pointer ${
              activeSubTab === 'upload'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload & Files</span>
          </button>

          <button
            onClick={() => setActiveSubTab('state_compare')}
            className={`px-4 py-2 rounded-xl flex items-center space-x-2 transition-all cursor-pointer ${
              activeSubTab === 'state_compare'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>State Groups ({Object.keys(stateGroups).length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('matching')}
            className={`px-4 py-2 rounded-xl flex items-center space-x-2 transition-all cursor-pointer ${
              activeSubTab === 'matching'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <GitCompare className="w-4 h-4" />
            <span>Item Matching</span>
          </button>

          <button
            onClick={() => setActiveSubTab('rate_analysis')}
            className={`px-4 py-2 rounded-xl flex items-center space-x-2 transition-all cursor-pointer ${
              activeSubTab === 'rate_analysis'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Rate Analysis & Charts</span>
          </button>

          <button
            onClick={() => setActiveSubTab('insights')}
            className={`px-4 py-2 rounded-xl flex items-center space-x-2 transition-all cursor-pointer ${
              activeSubTab === 'insights'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Insights</span>
          </button>

          <button
            onClick={() => setActiveSubTab('export')}
            className={`px-4 py-2 rounded-xl flex items-center space-x-2 transition-all cursor-pointer ${
              activeSubTab === 'export'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start space-x-3 text-rose-800 dark:text-rose-300 text-xs">
          <Info className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Error</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Tab 1: Upload & Files */}
      {activeSubTab === 'upload' && (
        <FileUploadSection
          files={files}
          onUploadFile={handleUploadFile}
          onConfirmFile={handleConfirmFile}
          onSetActiveVersion={handleSetActiveVersion}
          onViewSkipped={handleOpenSkippedRows}
          isLoading={isLoading}
        />
      )}

      {/* Tab 2: State Comparison (State-Level Consolidation Overview) */}
      {activeSubTab === 'state_compare' && (
        <div className="space-y-4">
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-white dark:bg-[#0b1426] shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Active State Comparison Groups ({Object.keys(stateGroups).length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              All files belonging to the same state are consolidated into one group. Adding multiple files from the same state enriches that state's rate master without creating duplicate columns.
            </p>

            {Object.keys(stateGroups).length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No state files confirmed yet. Please upload and confirm BOQ files in the &ldquo;Upload &amp; Files&rdquo; tab.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(stateGroups).map(([state, stateFiles]) => (
                  <div
                    key={state}
                    className="p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                        <Building className="w-4 h-4 text-indigo-600" />
                        <span>{state}</span>
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        {stateFiles.length} {stateFiles.length === 1 ? 'Source' : 'Sources'}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-indigo-100 dark:border-indigo-900/30 text-xs">
                      <p className="font-semibold text-slate-700 dark:text-slate-300">Source Workbooks:</p>
                      <ul className="space-y-1 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {stateFiles.map((sf) => (
                          <li key={sf.id} className="flex items-center justify-between">
                            <span className="truncate max-w-[280px]">• {sf.filename}</span>
                            <span className="text-emerald-600 font-bold">{sf.extracted_items_count} items</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Item Matching & Review (Phase 2 Step B) */}
      {activeSubTab === 'matching' && <ItemMatchingReview key={`matching-${datasetRefreshKey}`} />}

      {/* Phase 3: Analytics, Dashboard, Charts, Insights & Export */}
      {(activeSubTab === 'rate_analysis' || activeSubTab === 'insights' || activeSubTab === 'export') && (
        <ComparisonDashboard
          key={`dashboard-${datasetRefreshKey}`}
          files={files}
          onBackToMatching={() => setActiveSubTab('matching')}
        />
      )}

      {/* Skipped Rows Modal */}
      {skippedModalFile && (
        <SkippedRowsModal
          isOpen={isModalOpen}
          filename={skippedModalFile.filename}
          skippedRows={modalSkippedRows}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};

