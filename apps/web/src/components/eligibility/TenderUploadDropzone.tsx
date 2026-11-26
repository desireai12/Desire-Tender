'use client';

import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles,
  Lock,
  Layers,
  FileCheck2,
  RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { RADHANPUR_FIXTURE, MOCK_MODE_COST_LABEL } from '@/lib/new-eligibility/mockData';

export interface UploadedFileState {
  file: File | null;
  name: string;
  sizeMb: string;
  sha256: string;
  estimatedPages: number;
  status: 'idle' | 'processing' | 'ready' | 'error';
  errorMessage?: string;
}

export const TenderUploadDropzone: React.FC = () => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadState, setUploadState] = useState<UploadedFileState>({
    file: null,
    name: '',
    sizeMb: '',
    sha256: '',
    estimatedPages: 0,
    status: 'idle'
  });

  // Calculate browser-side SHA-256 without any server or network call
  const calculateSha256 = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const processFile = async (file: File) => {
    // 1. Validation: Must be PDF
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setUploadState({
        file: null,
        name: file.name,
        sizeMb: (file.size / (1024 * 1024)).toFixed(2),
        sha256: '',
        estimatedPages: 0,
        status: 'error',
        errorMessage: 'Invalid file format. Please upload a valid PDF tender document (.pdf).'
      });
      return;
    }

    // 2. Validation: Maximum 100MB
    const sizeInMb = file.size / (1024 * 1024);
    if (sizeInMb > 100) {
      setUploadState({
        file: null,
        name: file.name,
        sizeMb: sizeInMb.toFixed(2),
        sha256: '',
        estimatedPages: 0,
        status: 'error',
        errorMessage: 'File size exceeds 100MB limit. Please upload a document within 100MB.'
      });
      return;
    }

    // 3. Processing: Calculate SHA-256 & estimate pages (approx 16-25 KB per page for scanned text PDFs)
    setUploadState({
      file,
      name: file.name,
      sizeMb: sizeInMb.toFixed(2),
      sha256: 'Computing SHA-256 digest...',
      estimatedPages: Math.max(1, Math.round(file.size / 22000)),
      status: 'processing'
    });

    try {
      const hash = await calculateSha256(file);
      setUploadState({
        file,
        name: file.name,
        sizeMb: sizeInMb.toFixed(2),
        sha256: hash,
        estimatedPages: Math.max(1, Math.round(file.size / 22000)),
        status: 'ready'
      });
    } catch (err: any) {
      setUploadState({
        file: null,
        name: file.name,
        sizeMb: sizeInMb.toFixed(2),
        sha256: '',
        estimatedPages: 0,
        status: 'error',
        errorMessage: `Failed to process document digest: ${err?.message || 'Unknown error'}`
      });
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleLoadGoldenRadhanpur = () => {
    setUploadState({
      file: null,
      name: `${RADHANPUR_FIXTURE.pdfFile} (Golden Reference)`,
      sizeMb: (RADHANPUR_FIXTURE.pdfBytes / (1024 * 1024)).toFixed(2),
      sha256: RADHANPUR_FIXTURE.pdfSha256,
      estimatedPages: RADHANPUR_FIXTURE.totalPages,
      status: 'ready'
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Tender PDF Document Upload
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Client-side document validation, cryptographic integrity hash, and mock evaluation staging.
          </p>
        </div>

        {/* Quick Action Button */}
        <button
          onClick={handleLoadGoldenRadhanpur}
          type="button"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          Load Golden Radhanpur RWSS (175 Pages)
        </button>
      </div>

      {/* Mock Mode Notice Box */}
      <div className="flex items-start gap-3 p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-lg text-xs text-amber-800 dark:text-amber-300">
        <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">Vercel Preview Mock Mode Notice — {MOCK_MODE_COST_LABEL}</p>
          <p className="text-amber-700 dark:text-amber-400/90 leading-relaxed">
            Uploaded documents are processed strictly in client-side preview mode for this browser session only. Changes are not permanently saved, and zero live database writes or Supabase updates occur.
          </p>
        </div>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          dragActive
            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
            : 'border-slate-300 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-900/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Drag & Drop your tender PDF here, or <span className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2">browse files</span>
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Supports PDF documents up to 100MB. Cryptographic SHA-256 computed instantly.
            </p>
          </div>
        </div>
      </div>

      {/* Processing State */}
      {uploadState.status === 'processing' && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin" />
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">Calculating cryptographic hash...</p>
              <p className="text-[11px] text-slate-500">{uploadState.name} ({uploadState.sizeMb} MB)</p>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {uploadState.status === 'error' && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-800/60 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-red-900 dark:text-red-200">Validation Error</p>
            <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">{uploadState.errorMessage}</p>
          </div>
        </div>
      )}

      {/* Ready / Success State */}
      {uploadState.status === 'ready' && (
        <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{uploadState.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Size: <strong className="text-slate-700 dark:text-slate-300">{uploadState.sizeMb} MB</strong> | Estimated Pages: <strong className="text-slate-700 dark:text-slate-300">{uploadState.estimatedPages}</strong>
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Validated
            </span>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/70 rounded-lg p-2.5 border border-emerald-100 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 select-none">SHA-256:</span>
            <span className="text-slate-700 dark:text-slate-300 text-[11px] truncate max-w-[400px] sm:max-w-[500px]">
              {uploadState.sha256}
            </span>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => router.push('/tender-review?id=radhanpur')}
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition-colors shadow-sm"
            >
              <span>Launch Eligibility Review</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

