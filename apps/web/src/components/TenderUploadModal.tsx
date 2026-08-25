'use client';

import React from 'react';
import { Upload, RefreshCw, CheckCircle2, FileText } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

interface TenderUploadModalProps {
  currentProvider: 'gemini' | 'openai';
  onAnalysisComplete: (data: any) => void;
}

export const TenderUploadModal: React.FC<TenderUploadModalProps> = ({
  currentProvider,
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

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(
        `${API_BASE_URL}/tender/analyze?provider=${currentProvider}`,
        { method: 'POST', body: formData }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.evaluation_report) {
          onAnalysisComplete(data.evaluation_report);
        }
      } else {
        setErrorMsg('Server error during analysis. Displaying demo report.');
      }
    } catch {
      setErrorMsg('Backend not reachable. Demo report is displayed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-slate-200 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-display font-semibold text-slate-900 flex items-center space-x-2">
            <Upload className="w-5 h-5 text-teal-700" />
            <span>Upload Tender Mandate PDF</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            PyMuPDF extracts & chunks text, then runs RAG retrieval vs company credentials via{' '}
            <span className="text-teal-700 font-semibold">{currentProvider === 'gemini' ? 'Google Gemini 1.5 Flash' : 'GPT-4o'}</span>.
          </p>
        </div>
        {uploadedFile && (
          <span className="text-xs font-mono text-emerald-700 font-semibold flex items-center space-x-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="max-w-xs truncate">{uploadedFile}</span>
          </span>
        )}
      </div>

      <div className="relative border-2 border-dashed border-teal-300 hover:border-teal-500 rounded-xl p-8 text-center transition-all bg-teal-50/30 group cursor-pointer">
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          disabled={isAnalyzing}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-teal-100 border border-teal-200 flex items-center justify-center text-teal-700 group-hover:scale-105 transition-transform">
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
          <p className="text-xs text-slate-500">
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
