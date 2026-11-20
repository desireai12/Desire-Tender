'use client';

import React, { useState, useRef, useMemo } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Eye,
  RefreshCw,
  HelpCircle,
  Building,
  Check,
  GitBranch,
  Copy,
  Layers,
  X,
} from 'lucide-react';
import type { DocumentDiscipline, GstBasis, SheetScoreResult, SorFileRecord } from '@/lib/boq-sor-comparison/types';
import {
  ALL_INDIAN_STATES_AND_UTS,
  getAuthoritiesByState,
} from '@/lib/boq-sor-comparison/stateAuthorityRegistry';

interface FileUploadSectionProps {
  files: SorFileRecord[];
  onUploadFile: (
    file: File,
  ) => Promise<
    | {
        file: SorFileRecord;
        sheets: SheetScoreResult[];
        is_duplicate?: boolean;
        message?: string;
        candidate_revisions?: any[];
      }
    | void
  >;
  onConfirmFile: (params: {
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
  }) => Promise<void>;
  onSetActiveVersion?: (file_id: string) => Promise<void>;
  onViewSkipped: (file: SorFileRecord) => void;
  isLoading: boolean;
}

export const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  files,
  onUploadFile,
  onConfirmFile,
  onSetActiveVersion,
  onViewSkipped,
  isLoading,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [duplicateNotice, setDuplicateNotice] = useState<{
    message: string;
    filename: string;
    fingerprint?: string;
  } | null>(null);

  const [selectedFileForModal, setSelectedFileForModal] = useState<{
    file: SorFileRecord;
    sheets: SheetScoreResult[];
    candidate_revisions?: any[];
  } | null>(null);

  // Modal editing states
  const [confirmedState, setConfirmedState] = useState('');
  const [confirmedAuthority, setConfirmedAuthority] = useState('');
  const [confirmedYear, setConfirmedYear] = useState('');
  const [confirmedDiscipline, setConfirmedDiscipline] = useState<DocumentDiscipline>('Civil');
  const [confirmedDocTitle, setConfirmedDocTitle] = useState('');
  const [confirmedTenderRef, setConfirmedTenderRef] = useState('');
  const [uploadType, setUploadType] = useState<'new_document' | 'revision'>('new_document');
  const [targetRevisionDocKey, setTargetRevisionDocKey] = useState('');
  const [isCustomAuth, setIsCustomAuth] = useState(false);

  // Server-side file table pagination (DEF-03)
  const [filesPage, setFilesPage] = useState<number>(1);
  const [filesPageSize, setFilesPageSize] = useState<number>(10);
  const [serverFiles, setServerFiles] = useState<SorFileRecord[] | null>(null);
  const [serverTotal, setServerTotal] = useState<number | null>(null);
  const [serverTotalPages, setServerTotalPages] = useState<number | null>(null);
  const [isFilesLoading, setIsFilesLoading] = useState<boolean>(false);

  const fetchPaginatedFiles = React.useCallback(async (page: number, pageSize: number) => {
    setIsFilesLoading(true);
    try {
      const res = await fetch(`/api/v1/sor-comparison/files?page=${page}&pageSize=${pageSize}`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data) && json.pagination) {
          setServerFiles(json.data);
          setServerTotal(json.pagination.total);
          setServerTotalPages(json.pagination.totalPages);
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch paginated files from server, using fallback:', err);
    } finally {
      setIsFilesLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPaginatedFiles(filesPage, filesPageSize);
  }, [fetchPaginatedFiles, filesPage, filesPageSize, files]);

  const totalFiles = serverTotal !== null ? serverTotal : files.length;
  const filesTotalPages = serverTotalPages !== null ? serverTotalPages : Math.max(1, Math.ceil(totalFiles / filesPageSize));
  const displayedFiles = serverFiles !== null ? serverFiles : files.slice((filesPage - 1) * filesPageSize, filesPage * filesPageSize);
  const [confirmedGst, setConfirmedGst] = useState<GstBasis>('unknown');
  const [selectedSheet, setSelectedSheet] = useState('');
  const [setActiveOnConfirm, setSetActiveOnConfirm] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic authorities for currently selected state
  const stateAuthorities = useMemo(() => {
    if (!confirmedState) return [];
    return getAuthoritiesByState(confirmedState);
  }, [confirmedState]);

  const handleFileProcess = async (fileObj: File) => {
    setDuplicateNotice(null);
    const res = await onUploadFile(fileObj);
    if (!res) return;

    if (res.is_duplicate) {
      setDuplicateNotice({
        message: res.message || 'Identical file content already uploaded. Duplicate extraction skipped.',
        filename: res.file.filename,
        fingerprint: res.file.content_fingerprint,
      });
      return;
    }

    setSelectedFileForModal(res);
    setConfirmedState(res.file.detected_state || '');
    setConfirmedAuthority(res.file.authority_code || '');
    setConfirmedYear(res.file.sor_year || '');
    setConfirmedDiscipline(res.file.discipline || 'Civil');
    setConfirmedDocTitle(res.file.document_title || res.file.filename.replace(/\.[^/.]+$/, ''));
    setConfirmedTenderRef(res.file.tender_reference || '');
    setUploadType(res.candidate_revisions && res.candidate_revisions.length > 0 ? 'revision' : 'new_document');
    setTargetRevisionDocKey(res.candidate_revisions && res.candidate_revisions[0]?.document_key || '');
    setConfirmedGst(res.file.gst_basis);
    setSelectedSheet(res.file.selected_sheet || '');
    setSetActiveOnConfirm(true);

    const matchesKnownAuth = stateAuthorities.some(
      (a) => a.authority_code === res.file.authority_code
    );
    setIsCustomAuth(!matchesKnownAuth && Boolean(res.file.authority_code));
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleFileProcess(e.target.files[0]);
    }
  };

  const handleConfirmExtraction = async () => {
    if (!selectedFileForModal || !confirmedState.trim()) return;
    await onConfirmFile({
      file_id: selectedFileForModal.file.id,
      state_name: confirmedState.trim(),
      authority_code: confirmedAuthority.trim() || undefined,
      sor_year: confirmedYear.trim() || undefined,
      discipline: confirmedDiscipline,
      document_title: confirmedDocTitle.trim() || undefined,
      tender_reference: confirmedTenderRef.trim() || undefined,
      upload_type: uploadType,
      target_revision_doc_key: uploadType === 'revision' ? targetRevisionDocKey : undefined,
      gst_basis: confirmedGst,
      selected_sheet: selectedSheet || selectedFileForModal.file.selected_sheet || '',
      set_active: setActiveOnConfirm,
    });
    setSelectedFileForModal(null);
  };

  return (
    <div className="space-y-6">
      {/* Duplicate Notice Banner */}
      {duplicateNotice && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start justify-between space-x-3 text-amber-900 dark:text-amber-200 text-xs shadow-sm animate-in fade-in">
          <div className="flex items-start space-x-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Duplicate Upload Prevented</p>
              <p className="mt-0.5">{duplicateNotice.message}</p>
              {duplicateNotice.fingerprint && (
                <p className="font-mono text-[10px] text-amber-700 dark:text-amber-300 mt-1">
                  SHA-256: {duplicateNotice.fingerprint}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setDuplicateNotice(null)}
            className="text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-100 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
            : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/50 dark:bg-slate-900/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700">
            {isLoading ? <Loader2 className="w-7 h-7 animate-spin" /> : <Upload className="w-7 h-7" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Click to select or drag & drop Government BOQ / SOR Excel file (.xlsx, .xls)
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Features binary SHA-256 fingerprinting, automatic revision versioning, and multi-state department detection.
            </p>
          </div>
        </div>
      </div>

      {/* Uploaded Files Table */}
      {totalFiles > 0 && (
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-[#0b1426] shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Uploaded State BOQ Files ({totalFiles})</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Every version is preserved with its binary SHA-256 fingerprint and source provenance.
              </p>
            </div>
            {totalFiles > 10 && (
              <div className="flex items-center space-x-3 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center space-x-1">
                  <span>Page size:</span>
                  <select
                    value={filesPageSize}
                    onChange={(e) => {
                      setFilesPageSize(Number(e.target.value));
                      setFilesPage(1);
                    }}
                    className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setFilesPage((p) => Math.max(1, p - 1))}
                    disabled={filesPage <= 1}
                    className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {filesPage} / {filesTotalPages}
                  </span>
                  <button
                    onClick={() => setFilesPage((p) => Math.min(filesTotalPages, p + 1))}
                    disabled={filesPage >= filesTotalPages}
                    className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                <tr>
                  <th className="p-3.5">File & Fingerprint</th>
                  <th className="p-3.5">State Group</th>
                  <th className="p-3.5">Authority / Year</th>
                  <th className="p-3.5">Version & Role</th>
                  <th className="p-3.5">Active Sheet</th>
                  <th className="p-3.5">GST</th>
                  <th className="p-3.5">Items</th>
                  <th className="p-3.5">Skipped</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {displayedFiles.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td className="p-3.5">
                      <div className="font-medium text-slate-900 dark:text-white flex items-center space-x-2">
                        <FileSpreadsheet className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="truncate max-w-[200px]" title={f.filename}>
                          {f.filename}
                        </span>
                      </div>
                      {f.content_fingerprint && (
                        <div
                          className="text-[10px] font-mono text-slate-400 mt-0.5"
                          title={`SHA-256: ${f.content_fingerprint}`}
                        >
                          SHA: {f.content_fingerprint.slice(0, 10)}...
                        </div>
                      )}
                    </td>
                    <td className="p-3.5">
                      {f.state_confirmed && f.state_name ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {f.state_name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          Pending: {f.detected_state || 'Unidentified'}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-[11px]">
                      {f.authority_code || '—'} {f.sor_year ? `(${f.sor_year})` : ''}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          v{f.version_number || 1}
                        </span>
                        {f.is_active !== false ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Active
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            Archived
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {f.selected_sheet || '—'}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {f.gst_basis}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {f.status === 'extracted' ? f.extracted_items_count : '—'}
                    </td>
                    <td className="p-3.5">
                      {f.status === 'extracted' ? (
                        <button
                          onClick={() => onViewSkipped(f)}
                          className="inline-flex items-center space-x-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-mono underline cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{f.skipped_rows_count}</span>
                        </button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right space-x-1.5">
                      {f.status === 'pending_confirmation' ? (
                        <button
                          onClick={() => {
                            setSelectedFileForModal({ file: f, sheets: [] });
                            setConfirmedState(f.detected_state || '');
                            setConfirmedAuthority(f.authority_code || '');
                            setConfirmedYear(f.sor_year || '');
                            setConfirmedGst(f.gst_basis);
                            setSelectedSheet(f.selected_sheet || '');
                            setSetActiveOnConfirm(true);
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm"
                        >
                          Confirm & Extract
                        </button>
                      ) : f.is_active === false && onSetActiveVersion ? (
                        <button
                          onClick={() => onSetActiveVersion(f.id)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800"
                          title="Designate this version as active for comparison"
                        >
                          Set Active
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Ready</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalFiles > 10 && (
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing {(filesPage - 1) * filesPageSize + 1} to {Math.min(filesPage * filesPageSize, totalFiles)} of {totalFiles} files
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setFilesPage((p) => Math.max(1, p - 1))}
                  disabled={filesPage <= 1}
                  className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {filesPage} / {filesTotalPages}
                </span>
                <button
                  onClick={() => setFilesPage((p) => Math.min(filesTotalPages, p + 1))}
                  disabled={filesPage >= filesTotalPages}
                  className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation & Metadata Review Modal */}
      {selectedFileForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0b1426] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Building className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>Review Metadata & Extraction Settings</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {selectedFileForModal.file.filename}
                </p>
                {selectedFileForModal.file.content_fingerprint && (
                  <p className="font-mono text-[10px] text-slate-400 mt-0.5">
                    SHA-256: {selectedFileForModal.file.content_fingerprint}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* State Input with All 28 Indian States + 8 UTs */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  State / Authority Jurisdiction *
                </label>
                <select
                  value={confirmedState}
                  onChange={(e) => {
                    setConfirmedState(e.target.value);
                    setConfirmedAuthority('');
                    setIsCustomAuth(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                >
                  <option value="">-- Select State or Central Scope --</option>
                  {ALL_INDIAN_STATES_AND_UTS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Detected: <strong className="text-slate-600 dark:text-slate-300">{selectedFileForModal.file.detected_state || 'Unknown'}</strong> (Confidence: {selectedFileForModal.file.detection_confidence})
                </p>
              </div>

              {/* Dynamic Authority Selector */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Government Authority / Department
                </label>
                {stateAuthorities.length > 0 && !isCustomAuth ? (
                  <div className="space-y-1.5">
                    <select
                      value={confirmedAuthority}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setIsCustomAuth(true);
                          setConfirmedAuthority('');
                        } else {
                          setConfirmedAuthority(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                    >
                      <option value="">-- Select Authority ({stateAuthorities.length} recognized) --</option>
                      {stateAuthorities.map((a) => (
                        <option key={a.authority_code} value={a.authority_code}>
                          {a.authority_code} — {a.authority_name}
                        </option>
                      ))}
                      <option value="__CUSTOM__">+ Other / Custom Authority Code...</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={confirmedAuthority}
                        onChange={(e) => setConfirmedAuthority(e.target.value)}
                        placeholder="e.g. UPJN, MJP, GWSSB, CPWD"
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono uppercase"
                      />
                      {stateAuthorities.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsCustomAuth(false)}
                          className="px-3 py-1.5 text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          Choose from list
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* SOR Year */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  SOR / Schedule Year
                </label>
                <input
                  type="text"
                  value={confirmedYear}
                  onChange={(e) => setConfirmedYear(e.target.value)}
                  placeholder="e.g. 2023, 2024, 2023-24"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                />
              </div>

              {/* Discipline & Work Category */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Discipline / Work Category *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Civil', 'Electrical', 'Mechanical', 'Plumbing', 'General', 'Other'] as DocumentDiscipline[]).map((disc) => (
                    <button
                      key={disc}
                      type="button"
                      onClick={() => setConfirmedDiscipline(disc)}
                      className={`px-2.5 py-1.5 rounded-xl border text-center font-medium transition-all ${
                        confirmedDiscipline === disc
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {disc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Document Title & Tender Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Document / Schedule Title
                  </label>
                  <input
                    type="text"
                    value={confirmedDocTitle}
                    onChange={(e) => setConfirmedDocTitle(e.target.value)}
                    placeholder="e.g. Civil Works SOR, DLB Working"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Tender / Package Reference (if applicable)
                  </label>
                  <input
                    type="text"
                    value={confirmedTenderRef}
                    onChange={(e) => setConfirmedTenderRef(e.target.value)}
                    placeholder="e.g. PKG-01, NIT-45, Zone-2"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Logical Document Designation: Independent Document vs Revision */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Document Identity Designation *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="upload-type"
                      value="new_document"
                      checked={uploadType === 'new_document'}
                      onChange={() => setUploadType('new_document')}
                      className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">New Independent Document</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="upload-type"
                      value="revision"
                      checked={uploadType === 'revision'}
                      onChange={() => setUploadType('revision')}
                      className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Revision / Version of Existing Document</span>
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {uploadType === 'new_document'
                    ? 'This document will be preserved as its own independent rate master. It will never deactivate or conflict with other files.'
                    : 'This document represents an updated version of an existing schedule and will participate in version switching.'}
                </p>

                {uploadType === 'revision' && (
                  <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                      Select Target Document Identity to Revise:
                    </label>
                    <select
                      value={targetRevisionDocKey}
                      onChange={(e) => setTargetRevisionDocKey(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-[11px]"
                    >
                      <option value="">-- Choose Target Document to Revise --</option>
                      {Array.from(new Set(files.filter(f => f.state_confirmed).map(f => f.document_key))).filter(Boolean).map((dk) => (
                        <option key={dk!} value={dk!}>
                          {dk}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Sheet Selection */}
              {selectedFileForModal.sheets.length > 0 && (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Select Data Sheet (Auto-ranked by score)
                  </label>
                  <select
                    value={selectedSheet}
                    onChange={(e) => setSelectedSheet(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                  >
                    {selectedFileForModal.sheets.map((s) => (
                      <option key={s.sheetName} value={s.sheetName}>
                        {s.sheetName} {s.isRecommended ? '⭐ (Recommended BOQ)' : `(${s.reason})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* GST Basis */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Rate GST Basis
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmedGst('ex_gst')}
                    className={`px-2.5 py-2 rounded-xl border text-center font-semibold transition-all ${
                      confirmedGst === 'ex_gst'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Ex-GST
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmedGst('incl_gst')}
                    className={`px-2.5 py-2 rounded-xl border text-center font-semibold transition-all ${
                      confirmedGst === 'incl_gst'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Incl-GST
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmedGst('unknown')}
                    className={`px-2.5 py-2 rounded-xl border text-center font-semibold transition-all ${
                      confirmedGst === 'unknown'
                        ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Unknown
                  </button>
                </div>
                {confirmedGst === 'unknown' && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                    Files with unknown GST basis are excluded from rate comparison until confirmed as Ex-GST or Incl-GST.
                  </p>
                )}
              </div>

              {/* Version Designation Option */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="set-active-version-checkbox"
                  checked={setActiveOnConfirm}
                  onChange={(e) => setSetActiveOnConfirm(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <label
                  htmlFor="set-active-version-checkbox"
                  className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Set as Active Version for comparison (supersedes older versions of this schedule)
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedFileForModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmExtraction}
                disabled={!confirmedState.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm flex items-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Extract Items</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
