'use client';

import React from 'react';
import { API_BASE_URL } from '@/lib/api';
import { Upload, RefreshCw, CheckCircle2, FileText } from 'lucide-react';

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
    <div className="glass-card rounded-2xl p-6 border border-cyan-500/20 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-display font-semibold text-white flex items-center space-x-2">
            <Upload className="w-5 h-5 text-cyan-400" />
            <span>Upload Tender Mandate PDF</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            PyMuPDF extracts & chunks text, then runs RAG retrieval vs company credentials via{' '}
            <span className="text-cyan-400">{currentProvider === 'gemini' ? 'Google Gemini 1.5 Flash' : 'GPT-4o'}</span>.
          </p>
        </div>
        {uploadedFile && (
          <span className="text-xs font-mono text-emerald-300 flex items-center space-x-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="max-w-xs truncate">{uploadedFile}</span>
          </span>
        )}
      </div>

      <div className="relative border-2 border-dashed border-cyan-500/30 hover:border-cyan-400 rounded-xl p-8 text-center transition-all bg-aqua-950/40 group cursor-pointer">
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          disabled={isAnalyzing}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
            {isAnalyzing ? (
              <RefreshCw className="w-7 h-7 animate-spin" />
            ) : (
              <FileText className="w-7 h-7" />
            )}
          </div>
          <p className="text-sm font-semibold text-white">
            {isAnalyzing
              ? 'Running RAG evaluation... Querying vector store...'
              : 'Drop tender mandate PDF here or click to browse'}
          </p>
          <p className="text-xs text-slate-400">
            Supported: .pdf | Automatic text extraction, chunking & similarity retrieval via pgvector
          </p>
        </div>
      </div>

      {errorMsg && (
        <p className="text-xs font-mono text-amber-400 px-2">{errorMsg}</p>
      )}
    </div>
  );
};
