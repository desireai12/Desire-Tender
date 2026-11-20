'use client';

import React from 'react';
import { X, AlertCircle, FileText, CheckCircle } from 'lucide-react';
import type { SkippedRowRecord } from '@/lib/boq-sor-comparison/types';

interface SkippedRowsModalProps {
  isOpen: boolean;
  filename: string;
  skippedRows: SkippedRowRecord[];
  onClose: () => void;
}

export const SkippedRowsModal: React.FC<SkippedRowsModalProps> = ({
  isOpen,
  filename,
  skippedRows,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0b1426] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Skipped Rows Audit Log ({skippedRows.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {filename} • Every filtered row is recorded with auditable reason
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {skippedRows.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No rows were skipped in this file.
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                  <tr>
                    <th className="p-3 w-16">Row</th>
                    <th className="p-3 w-48">Skip Reason</th>
                    <th className="p-3">Raw Content / Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-slate-700 dark:text-slate-300">
                  {skippedRows.map((sr, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{sr.source_row}</td>
                      <td className="p-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          {sr.skip_reason}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] font-sans truncate max-w-md">
                        {String(sr.raw_data?.desc || sr.raw_data?.itemNo || JSON.stringify(sr.raw_data))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            Close Log
          </button>
        </div>
      </div>
    </div>
  );
};

