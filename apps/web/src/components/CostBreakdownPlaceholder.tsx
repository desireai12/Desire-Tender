'use client';

import React from 'react';
import { Calculator, TrendingUp, Layers } from 'lucide-react';

interface CostComponent {
  category: string;
  estimated_percentage: number;
  description: string;
}

interface CostBreakdownPlaceholderProps {
  costStructure: CostComponent[];
}

export const CostBreakdownPlaceholder: React.FC<CostBreakdownPlaceholderProps> = ({ costStructure }) => {
  const totalPercentage = costStructure.reduce((acc, c) => acc + c.estimated_percentage, 0);

  return (
    <div className="glass-card rounded-2xl p-6 border border-slate-200">
      <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-700">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-display font-semibold text-white">
              AI Baseline Cost Structure Breakdown
            </h3>
            <p className="text-xs text-slate-500">
              RAG-inferred cost proportions derived from competitor bidding data & past project intelligence
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-mono">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>V2 Costing Available</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {costStructure.map((item, idx) => {
          const widthPercent = (item.estimated_percentage / (totalPercentage || 100)) * 100;
          return (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-50/60 border border-white/8 hover:border-teal-200 transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">{item.category}</span>
                <span className="text-base font-display font-bold text-teal-800">
                  {item.estimated_percentage}%
                </span>
              </div>

              <div className="w-full h-1.5 bg-slate-200/60 rounded-full overflow-hidden">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-teal-500 transition-all duration-500"
                  style={{ width: `${widthPercent}%` }}
                />
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
