'use client';

import React from 'react';
import { API_BASE_URL } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Upload, RefreshCw, CheckCircle2, FileText } from 'lucide-react';

interface TenderUploadModalProps {
  currentProvider: 'gemini' | 'openai';
  projectCategory?: string;
  onAnalysisComplete: (data: any) => void;
}

export const TenderUploadModal: React.FC<TenderUploadModalProps> = ({
  currentProvider,
  projectCategory = 'STP',
  onAnalysisComplete,
}) => {
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [uploadedFile, setUploadedFile] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith('.pdf')) {
      setErrorMsg('Only PDF files are supported.');
      return;
    }

    setUploadedFile(file.name);
    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      let uploadedFilePath: string | null = null;
      if (supabase) {
        try {
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const storagePath = `tenders/${Date.now()}_${safeName}`;
          const { error: storageErr } = await supabase.storage
            .from('tender-uploads')
            .upload(storagePath, file, { upsert: true });

          if (!storageErr) {
            uploadedFilePath = storagePath;
          }
        } catch (sErr) {
          console.warn('Supabase storage exception in upload modal:', sErr);
        }
      }

      let res: Response;
      if (uploadedFilePath) {
        res = await fetch(`${API_BASE_URL}/tender/analyze?provider=${currentProvider}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_path: uploadedFilePath,
            filename: file.name,
            project_category: projectCategory,
          }),
        });
      } else {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('filename', file.name);
        formData.append('project_category', projectCategory);

        res = await fetch(`${API_BASE_URL}/tender/analyze?provider=${currentProvider}`, {
          method: 'POST',
          body: formData,
        });
      }

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'rejected' || data.is_rejected_non_tender) {
          setErrorMsg(data.message || data.reason || 'Document Rejected: Not a valid tender document.');
        } else if (data.status === 'error') {
          setErrorMsg(data.message || 'Could not complete analysis. Please retry.');
        } else if (data.evaluation_report || data.report) {
          onAnalysisComplete(data.evaluation_report || data.report);
        }
      } else {
        const errJson = await res.json().catch(() => null);
        setErrorMsg(errJson?.message || errJson?.detail || 'Server error during analysis. Please retry.');
      }
    } catch {
      setErrorMsg('Network error connecting to backend server. Please retry.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-cyan-500/20 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-display font-semibold text-slate-900 flex items-center space-x-2">
            <Upload className="w-5 h-5 text-teal-800 font-semibold" />
            <span>Upload Tender Mandate PDF</span>
          </h3>
          <p className="text-xs text-slate-700 font-medium mt-0.5">
            PyMuPDF extracts & chunks text, then runs RAG retrieval vs company credentials via{' '}
            <span className="text-teal-800 font-semibold">{currentProvider === 'gemini' ? 'Google Gemini 1.5 Flash' : 'GPT-4o'}</span>.
          </p>
        </div>
        {uploadedFile && (
          <span className="text-xs font-mono text-emerald-800 flex items-center space-x-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-800 font-bold" />
            <span className="max-w-xs truncate">{uploadedFile}</span>
          </span>
        )}
      </div>

      <div className="relative border-2 border-dashed border-teal-200 hover:border-cyan-400 rounded-xl p-8 text-center transition-all bg-slate-50/40 group cursor-pointer">
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          disabled={isAnalyzing}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 font-semibold group-hover:scale-110 transition-transform">
            {isAnalyzing ? (
              <RefreshCw className="w-7 h-7 animate-spin" />
            ) : (
              <FileText className="w-7 h-7" />
            )}
          </div>
          <p className="text-sm font-semibold text-slate-900">
            {isAnalyzing
              ? 'Running RAG evaluation... Querying vector store...'
              : 'Drop tender mandate PDF here or click to browse'}
          </p>
          <p className="text-xs text-slate-700 font-medium">
            Supported: .pdf | Automatic text extraction, chunking & similarity retrieval via pgvector
          </p>
        </div>
      </div>

      {errorMsg && (
        <p className="text-xs font-mono text-amber-700 px-2">{errorMsg}</p>
      )}
    </div>
  );
};
