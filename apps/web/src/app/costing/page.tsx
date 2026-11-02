'use client';

import React from 'react';
import { BOQCostingView } from '@/components/BOQCostingView';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CostingPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-[#070d18] text-slate-800 dark:text-slate-200 p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
      <BOQCostingView />
    </div>
  );
}
