'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  CheckCircle2, 
  HelpCircle, 
  Clock, 
  Building2, 
  Users, 
  FileCheck2, 
  ChevronDown, 
  ChevronUp,
  AlertOctagon,
  Sparkles,
  Info
} from 'lucide-react';
import {
  RADHANPUR_EVALUATION,
  RADHANPUR_FIXTURE
} from '@/lib/new-eligibility/mockData';

export const DualEvaluationTab: React.FC = () => {
  const [activeScenario, setActiveScenario] = useState<'standalone' | 'jv'>('standalone');
  const [openGroup, setOpenGroup] = useState<string | null>('financial');

  const evalData = RADHANPUR_EVALUATION;
  const cq = evalData.corporateQualification;
  const pr = evalData.proposalReadiness;
  const jvPolicy = RADHANPUR_FIXTURE.jvPolicy;

  const techCannotCheckCount = cq.technicalGroup.criteria.filter(c => c.status === 'CANNOT_CHECK').length;
  const techPassingCriteria = cq.technicalGroup.criteria.filter(c => c.status === 'PASS');
  const techUnresolvedCriteria = cq.technicalGroup.criteria.filter(c => c.status !== 'PASS');
  const scenario1 = cq.scenarioDetails?.scenario1;
  const scenario2 = cq.scenarioDetails?.scenario2;

  const toggleGroup = (groupId: string) => {
    setOpenGroup(openGroup === groupId ? null : groupId);
  };

  return (
    <div className="space-y-6">
      {/* Scenario Switcher Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveScenario('standalone')}
            type="button"
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeScenario === 'standalone'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Desire Energy (Sole Bidder Scenario)</span>
          </button>

          <button
            onClick={() => setActiveScenario('jv')}
            type="button"
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeScenario === 'jv'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Joint Venture / Consortium Scenario</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-400 pr-3 hidden sm:block">
          Deterministic Rule Engine (Stage 3B)
        </div>
      </div>

      {/* SCENARIO 1: DESIRE ENERGY STANDALONE */}
      {activeScenario === 'standalone' && (
        <div className="space-y-6">
          {/* Dual Top Dimension Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dimension 1: Corporate Qualification */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm border-t-4 border-t-amber-500 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Dimension 1: Corporate Qualification
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  {cq.status}
                </span>
              </div>

              <div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Qualification Under Review
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  {cq.verdictSummary}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Financial Eligibility:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {cq.financialGroup.status} ({cq.financialGroup.criteria.length}/{cq.financialGroup.criteria.length})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Technical Eligibility:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {cq.technicalGroup.status} ({techCannotCheckCount} Unnominated)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Other Legal & Statutory:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {cq.otherGroup.status} ({cq.otherGroup.criteria.length}/{cq.otherGroup.criteria.length})
                  </span>
                </div>
              </div>
            </div>

            {/* Dimension 2: Proposal Readiness */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm border-t-4 border-t-orange-500 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Dimension 2: Proposal Readiness
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 dark:bg-orange-950/70 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-700">
                  <Clock className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                  {pr.status}
                </span>
              </div>

              <div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {pr.missingItems.length} Submission Items Pending
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  {pr.verdictSummary}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                {pr.missingItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Overall Tender Verdict Banner */}
          <div className="p-4 bg-slate-900 text-white dark:bg-slate-800 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold">
                  OVERALL TENDER VERDICT
                </span>
                <span className="text-sm font-bold text-amber-400">
                  {evalData.overallVerdict}
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-3xl">
                {evalData.overallVerdictText}
              </p>
            </div>

            <span className="text-[11px] font-mono text-slate-400 shrink-0">
              Evaluated: {evalData.evaluatedAt}
            </span>
          </div>

          {/* Detailed Group Breakdown (Report Order: Financial, Technical, Others) */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Detailed Criterion Group Breakdown (Rule Order: Financial, Technical, Others)
            </h3>

            {/* GROUP A: FINANCIAL ELIGIBILITY */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div 
                onClick={() => toggleGroup('financial')}
                className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                    A
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {cq.financialGroup.groupTitle}
                      </span>
                      <span className="px-2 py-0.2 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        {cq.financialGroup.status} ({cq.financialGroup.criteria.length}/{cq.financialGroup.criteria.length})
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {cq.financialGroup.summaryLine}
                    </p>
                  </div>
                </div>

                {openGroup === 'financial' ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </div>

              {openGroup === 'financial' && (
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-3 text-xs">
                  {scenario1 && (
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        1. {scenario1.name} — [{scenario1.status}]
                      </p>
                      <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                        {scenario1.details}
                      </p>
                      <div className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 space-y-0.5 pl-2 border-l-2 border-emerald-500">
                        {Object.entries(scenario1.adjustedTurnovers).map(([fy, row]) => (
                          <div key={fy}>
                            • FY {fy}: ₹{row.raw.toFixed(2)} Cr × {row.multiplier.toFixed(2)} = ₹{row.adjusted.toFixed(2)} Cr [{row.status}]
                          </div>
                        ))}
                        <div>
                          • 3rd Highest Adjusted Turnover: ₹{scenario1.thirdHighestCr.toFixed(2)} Cr (Threshold: ₹{scenario1.thresholdCr.toFixed(2)} Cr) | Exp: {scenario1.experienceYears} yrs [{scenario1.experienceStatus}]
                        </div>
                      </div>
                    </div>
                  )}

                  {scenario2 && (
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        2. {scenario2.name} — [{scenario2.status}]
                      </p>
                      <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                        {scenario2.details}
                      </p>
                      <div className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 pl-2 border-l-2 border-emerald-500">
                        • 3rd Highest Adjusted Turnover: ₹{scenario2.thirdHighestCr.toFixed(2)} Cr vs ₹{scenario2.thresholdCr.toFixed(2)} Cr required [{scenario2.turnoverStatus}]
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      Evaluated Financial Criteria ({cq.financialGroup.criteria.length}):
                    </p>
                    <div className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 space-y-1">
                      {cq.financialGroup.criteria.map(c => (
                        <div key={c.id}>✓ {c.id} {c.title}: {c.actualAchieved} [{c.status}]</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* GROUP B: TECHNICAL ELIGIBILITY */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div 
                onClick={() => toggleGroup('technical')}
                className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold">
                    B
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {cq.technicalGroup.groupTitle}
                      </span>
                      <span className="px-2 py-0.2 rounded text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                        {cq.technicalGroup.status} ({techCannotCheckCount} Unnominated)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {cq.technicalGroup.summaryLine}
                    </p>
                  </div>
                </div>

                {openGroup === 'technical' ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </div>

              {openGroup === 'technical' && (
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-3 text-xs">
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      Passing Technical Requirements ({techPassingCriteria.length}):
                    </p>
                    <div className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 space-y-1">
                      {techPassingCriteria.map(c => (
                        <div key={c.id}>✓ {c.id} {c.title}: {c.actualAchieved} [{c.status}]</div>
                      ))}
                    </div>
                  </div>

                  {techUnresolvedCriteria.length > 0 && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800/60 space-y-2">
                      <p className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        Pending Technical Personnel Nominations ({techUnresolvedCriteria.length}):
                      </p>
                      <div className="font-mono text-[11px] text-amber-900 dark:text-amber-300 space-y-1.5 pl-2">
                        {techUnresolvedCriteria.map(c => (
                          <div key={c.id}>
                            <div>• {c.id}: {c.title} [{c.status}]</div>
                            <div className="text-[10px] text-amber-700 dark:text-amber-400 pl-3">
                              {c.actualAchieved}{c.missingField ? ` (Missing: ${c.missingField})` : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 italic mt-1">
                        Rule: An unidentified individual cannot be evaluated as PASS. Technical eligibility propagates to CANNOT_CHECK.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* GROUP C: OTHER ELIGIBILITY */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div 
                onClick={() => toggleGroup('others')}
                className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                    C
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {cq.otherGroup.groupTitle}
                      </span>
                      <span className="px-2 py-0.2 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        {cq.otherGroup.status} ({cq.otherGroup.criteria.length}/{cq.otherGroup.criteria.length})
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {cq.otherGroup.summaryLine}
                    </p>
                  </div>
                </div>

                {openGroup === 'others' ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </div>

              {openGroup === 'others' && (
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-3 text-xs">
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      Statutory Compliance & Legal Standing:
                    </p>
                    <div className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 space-y-1">
                      {cq.otherGroup.criteria.map(c => (
                        <div key={c.id}>✓ {c.id} {c.title}: {c.actualAchieved} [{c.status}]</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SCENARIO 2: JOINT VENTURE STRICT PROHIBITION BANNER */}
      {activeScenario === 'jv' && (
        <div className="space-y-6">
          {/* Prominent Red Alert Banner */}
          <div className="p-6 bg-red-50 dark:bg-red-950/50 border-2 border-red-500 dark:border-red-600 rounded-xl space-y-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/60 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <AlertOctagon className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                  CRITICAL DISQUALIFICATION WARNING ({jvPolicy.scope})
                </span>
                <h3 className="text-xl font-extrabold text-red-900 dark:text-red-100">
                  {jvPolicy.tender_specific_jv_allowed
                    ? 'JOINT VENTURE PERMITTED'
                    : 'JOINT VENTURE / CONSORTIUM STRICTLY PROHIBITED'}
                </h3>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-red-200 dark:border-red-800 text-xs text-red-950 dark:text-red-200 space-y-2">
              <div className="font-semibold text-slate-900 dark:text-white">
                Governing Tender Clause: <span className="font-mono text-red-600">{jvPolicy.source_evidence}</span>
              </div>
              <p className="leading-relaxed">
                {jvPolicy.prohibition_reason}
              </p>
            </div>

            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Strategic Recommendation for Desire Energy
              </div>
              <p className="leading-relaxed text-emerald-800 dark:text-emerald-300">
                Desire Energy must bid strictly as a Sole Bidder (Single Entity in its own name and style). Do NOT attach JV agreements, consortium MOUs, or partner credentials.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

