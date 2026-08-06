'use client';

import React from 'react';
import { Check, AlertCircle, X, TableProperties } from 'lucide-react';

interface ParameterItem {
  parameter: string;
  tender_requirement: string;
  company_capability: string;
  status: 'Met' | 'Partially Met' | 'Not Met' | string;
  gap_notes?: string;
}

interface MatrixTableProps {
  parameters: ParameterItem[];
}

export const MatrixTable: React.FC<MatrixTableProps> = ({ parameters }) => {
  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('met') && !s.includes('partially') && !s.includes('not')) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
          <Check className="w-3.5 h-3.5" />
          Met
        </span>
      );
    }
    if (s.includes('partially')) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
          <AlertCircle className="w-3.5 h-3.5" />
          Partially Met
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30">
        <X className="w-3.5 h-3.5" />
        Not Met
      </span>
    );
  };

  const metCount = parameters.filter((p) => p.status?.toLowerCase() === 'met').length;
  const totalCount = parameters.length;

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-white/10 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <TableProperties className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-display font-semibold text-white">
              Critical Parameter Comparison Matrix
            </h3>
            <p className="text-xs text-slate-400">
              Tender mandate cross-validated against company credential vector store
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono px-4 py-2 rounded-xl bg-aqua-950/80 border border-white/10">
          <span className="text-emerald-400 font-bold">{metCount} Met</span>
          <span className="text-slate-500">/</span>
          <span className="text-white">{totalCount} Total</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-[11px] font-mono text-slate-400 uppercase">
              <th className="py-3 px-4">Evaluation Criterion</th>
              <th className="py-3 px-4">Tender Mandate</th>
              <th className="py-3 px-4">Company Capability</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4">Audit Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {parameters.map((item, idx) => (
              <tr key={idx} className="hover:bg-white/5 transition-colors group">
                <td className="py-4 px-4 font-semibold text-white group-hover:text-cyan-300 transition-colors max-w-[200px]">
                  {item.parameter}
                </td>
                <td className="py-4 px-4 text-slate-300 text-xs leading-relaxed max-w-xs">
                  {item.tender_requirement}
                </td>
                <td className="py-4 px-4 text-slate-200 text-xs leading-relaxed max-w-xs">
                  {item.company_capability}
                </td>
                <td className="py-4 px-4 text-center">
                  {getStatusBadge(item.status)}
                </td>
                <td className="py-4 px-4 text-xs text-slate-400 italic">
                  {item.gap_notes || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
