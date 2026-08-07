'use client';

import React, { useState } from 'react';
import { 
  Workflow, 
  CheckCircle2, 
  Clock, 
  Lock, 
  Building2, 
  Calculator, 
  Check, 
  AlertCircle, 
  Trophy, 
  XCircle, 
  Sparkles, 
  FileText, 
  UserCheck, 
  ShieldAlert, 
  ArrowRight,
  Database
} from 'lucide-react';
import { 
  TenderProcess, 
  TenderStage, 
  DepartmentRole, 
  BOQLineItem, 
  AuditLog 
} from '@/lib/types';

interface TenderLifecycleTrackerProps {
  tenders: TenderProcess[];
  activeRole: DepartmentRole;
  onUpdateTender: (updated: TenderProcess) => void;
}

export const TenderLifecycleTracker: React.FC<TenderLifecycleTrackerProps> = ({
  tenders,
  activeRole,
  onUpdateTender,
}) => {
  const [selectedTenderId, setSelectedTenderId] = useState<string>(tenders[0]?.id || '');
  const activeTender = tenders.find((t) => t.id === selectedTenderId) || tenders[0];

  // Stage 3 BOQ Form State
  const [newBOQItemName, setNewBOQItemName] = useState<string>('');
  const [newBOQQuantity, setNewBOQQuantity] = useState<number>(100);
  const [newBOQUnitCost, setNewBOQUnitCost] = useState<number>(4500);

  // Stage 4 Decision State
  const [didApplyDecision, setDidApplyDecision] = useState<boolean>(true);
  const [applyDecisionReason, setApplyDecisionReason] = useState<string>('High win probability based on Desire Energy Jaipur credentials and competitive AquaLogix telemetry pricing.');

  // Stage 5 Bid Details State
  const [bidAmount, setBidAmount] = useState<number>(145000000);
  const [emdAmount, setEmdAmount] = useState<number>(2900000);
  const [tenderCode, setTenderCode] = useState<string>('PHED-RJ-2026-8812');

  // Stage 6 Result & Self-Learning State
  const [resultStatus, setResultStatus] = useState<'Won' | 'Lost' | 'Cancelled' | 'Under Evaluation'>('Won');
  const [winnerCompany, setWinnerCompany] = useState<string>('L&T Water IC');
  const [winningPrice, setWinningPrice] = useState<number>(138000000);
  const [lostReason, setLostReason] = useState<string>('Rival undercut on civil excavation rate.');
  const [lessonsLearned, setLessonsLearned] = useState<string>('Optimize localized civil labor procurement in district hubs for future packages.');

  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  if (!activeTender) {
    return (
      <div className="glass-card p-12 rounded-2xl text-center space-y-4">
        <Workflow className="w-12 h-12 text-cyan-400 mx-auto" />
        <h3 className="text-xl font-display font-bold text-white">No Active Tenders in Lifecycle Pipeline</h3>
        <p className="text-xs text-slate-400">Use the Tender Wizard to start a new tender process.</p>
      </div>
    );
  }

  // Handle Stage Advancement
  const advanceStage = (nextStage: TenderStage, actionText: string, nextPending: string) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      user: `Officer (${activeRole})`,
      department: activeRole,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      action: actionText,
      status: 'Completed',
      next_pending_action: nextPending
    };

    const updated: TenderProcess = {
      ...activeTender,
      current_stage: nextStage,
      stage_status: 'Completed',
      updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
      audit_trail: [newLog, ...activeTender.audit_trail]
    };

    onUpdateTender(updated);
  };

  // Stage 3: Add BOQ Item
  const handleAddBOQItem = () => {
    if (!newBOQItemName) return;

    const newItem: BOQLineItem = {
      id: `boq-${Date.now()}`,
      category: 'Equipment',
      item_name: newBOQItemName,
      unit_of_measure: 'Units',
      quantity: newBOQQuantity,
      unit_cost: newBOQUnitCost,
      markup_percentage: 15,
      tax_percentage: 18
    };

    const updatedItems = [...(activeTender.boq_items || []), newItem];
    const updated: TenderProcess = {
      ...activeTender,
      boq_items: updatedItems,
      current_stage: '3_COST_ESTIMATION',
      stage_status: 'In Progress'
    };

    onUpdateTender(updated);
    setNewBOQItemName('');
  };

  // Stage 6: Finalize Result & Trigger Self-Learning
  const handleFinalizeResult = () => {
    const priceDiff = bidAmount - winningPrice;
    const priceDiffPct = bidAmount > 0 ? (priceDiff / bidAmount) * 100 : 0;

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      user: `Tender Officer (${activeRole})`,
      department: activeRole,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      action: `Finalized Stage 6 Tender Result: ${resultStatus}`,
      status: resultStatus,
      next_pending_action: 'Self-Learning Feedback Loop Committed to AI Knowledge Base'
    };

    const updated: TenderProcess = {
      ...activeTender,
      current_stage: '6_TENDER_RESULT',
      stage_status: 'Completed',
      result_status: resultStatus,
      lost_reason_details: resultStatus === 'Lost' ? {
        winner_company: winnerCompany,
        winning_price: winningPrice,
        price_difference_amount: priceDiff,
        price_difference_pct: roundVal(priceDiffPct, 1),
        reasons: lostReason,
        lessons_learned: lessonsLearned
      } : undefined,
      audit_trail: [newLog, ...activeTender.audit_trail]
    };

    onUpdateTender(updated);

    // Show Self-Learning Confirmation Toast
    setFeedbackToast(`Tender #${activeTender.id} (${resultStatus}) committed to AI Knowledge Base for future RAG training.`);
    setTimeout(() => setFeedbackToast(null), 5000);
  };

  const roundVal = (v: number, dec: number) => Number(v.toFixed(dec));

  const stagesList: Array<{ stage: TenderStage; label: string; dept: string }> = [
    { stage: '1_ELIGIBILITY', label: '1. Eligibility', dept: 'Business Dev' },
    { stage: '2_AI_ANALYSIS', label: '2. AI Report', dept: 'Engineering' },
    { stage: '3_COST_ESTIMATION', label: '3. Costing BOQ', dept: 'Estimation Team' },
    { stage: '4_DECISION', label: '4. Apply Decision', dept: 'Management' },
    { stage: '5_BID_DETAILS', label: '5. Bid Details', dept: 'Tender Team' },
    { stage: '6_TENDER_RESULT', label: '6. Win/Loss Result', dept: 'Tender Team' }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Toast Notification */}
      {feedbackToast && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-aqua-950 font-bold text-xs flex items-center justify-between shadow-2xl animate-bounce">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5" />
            <span>{feedbackToast}</span>
          </div>
          <span className="text-[10px] font-mono uppercase bg-aqua-950 text-emerald-300 px-2 py-0.5 rounded-md">Self-Learning Active</span>
        </div>
      )}

      {/* Module Banner */}
      <div className="glass-card p-6 rounded-2xl border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-purple-400 font-mono text-xs mb-1">
            <Workflow className="w-4 h-4" />
            <span>ENTERPRISE TENDER LIFECYCLE TRACKER • 6 STAGES</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-white">
            Tender Progress Pipeline & Department Ownership
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Every tender advances through 6 distinct stages. Active Role: <strong className="text-purple-300">{activeRole}</strong>
          </p>
        </div>

        {/* Select Active Tender Dropdown */}
        <div className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-aqua-950/80 border border-white/10 shrink-0">
          <span className="text-xs font-mono text-slate-400">Select Tender:</span>
          <select
            value={selectedTenderId}
            onChange={(e) => setSelectedTenderId(e.target.value)}
            className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
          >
            {tenders.map((t) => (
              <option key={t.id} value={t.id} className="bg-[#101415] text-white">
                #{t.id} — {t.tender_name.slice(0, 35)}... ({t.project_category})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 6-Stage Pipeline Visual Stepper */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stagesList.map((s, idx) => {
          const isCurrent = activeTender.current_stage === s.stage;
          const isPassed = stagesList.findIndex(st => st.stage === activeTender.current_stage) > idx;

          return (
            <div
              key={s.stage}
              className={`p-3.5 rounded-xl border transition-all ${
                isCurrent
                  ? 'bg-gradient-to-br from-purple-950 to-aqua-900 border-purple-400 shadow-lg shadow-purple-500/20 ring-1 ring-purple-400'
                  : isPassed
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                  : 'bg-aqua-950/40 border-white/5 opacity-50'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                <span className={isPassed ? 'text-emerald-400 font-bold' : isCurrent ? 'text-purple-300 font-bold' : 'text-slate-500'}>
                  {isPassed ? 'DONE' : isCurrent ? 'ACTIVE' : 'PENDING'}
                </span>
                <span className="text-slate-400">{s.dept}</span>
              </div>
              <div className="font-display font-semibold text-xs text-white truncate">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* ACTIVE STAGE WORKFLOW ACTION CARDS */}

      {/* Stage 3: Cost Estimation (Estimation Team) */}
      {activeTender.current_stage === '3_COST_ESTIMATION' && (
        <div className="glass-card p-8 rounded-2xl space-y-6 border-2 border-cyan-500/40">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center space-x-2">
              <Calculator className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-display font-bold text-white">Stage 3 — Cost Estimation & BOQ Pricing</h3>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              Assigned: Estimation Team
            </span>
          </div>

          {/* RBAC Warning */}
          {activeRole !== 'Estimation Team' && activeRole !== 'Admin' && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Permission Notice: Only the <strong>Estimation Team</strong> can add or edit BOQ line item pricing.</span>
            </div>
          )}

          {/* Add BOQ Line Item Form */}
          {(activeRole === 'Estimation Team' || activeRole === 'Admin') && (
            <div className="p-4 rounded-xl bg-aqua-950/60 border border-white/10 space-y-3">
              <h4 className="text-xs font-mono uppercase text-cyan-300">Add BOQ Component Line Item</h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Item Name (e.g. Sunaquator Pump)"
                  value={newBOQItemName}
                  onChange={(e) => setNewBOQItemName(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-aqua-950 border border-white/15 text-xs text-white"
                />
                <input
                  type="number"
                  placeholder="Quantity"
                  value={newBOQQuantity}
                  onChange={(e) => setNewBOQQuantity(Number(e.target.value))}
                  className="px-3 py-2 rounded-lg bg-aqua-950 border border-white/15 text-xs text-white"
                />
                <input
                  type="number"
                  placeholder="Unit Cost (₹)"
                  value={newBOQUnitCost}
                  onChange={(e) => setNewBOQUnitCost(Number(e.target.value))}
                  className="px-3 py-2 rounded-lg bg-aqua-950 border border-white/15 text-xs text-white"
                />
                <button
                  onClick={handleAddBOQItem}
                  className="px-4 py-2 rounded-lg bg-cyan-400 text-aqua-950 font-bold text-xs hover:bg-cyan-300 transition"
                >
                  Add BOQ Item
                </button>
              </div>
            </div>
          )}

          {/* Advance to Stage 4 Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => advanceStage('4_DECISION', 'Completed Stage 3 BOQ Cost Estimation', 'Management to issue Stage 4 Apply Decision')}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 text-aqua-950 font-bold text-xs hover:brightness-110 transition shadow-lg shadow-cyan-400/20"
            >
              <span>Finalize Costing & Advance to Stage 4 (Decision)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Stage 4: Decision (Management) */}
      {activeTender.current_stage === '4_DECISION' && (
        <div className="glass-card p-8 rounded-2xl space-y-6 border-2 border-purple-500/40">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-display font-bold text-white">Stage 4 — Executive Management Bid Approval Decision</h3>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
              Assigned: Management
            </span>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-mono uppercase text-slate-300 block">Did We Apply / Proceed to Bid?</label>
            <div className="flex space-x-4">
              <button
                onClick={() => setDidApplyDecision(true)}
                className={`px-6 py-3 rounded-xl font-bold text-xs transition border ${
                  didApplyDecision ? 'bg-emerald-400 text-aqua-950 border-emerald-300 shadow-lg shadow-emerald-400/20' : 'bg-aqua-950 text-slate-400 border-white/10'
                }`}
              >
                YES — Proceed to Bid Submission
              </button>
              <button
                onClick={() => setDidApplyDecision(false)}
                className={`px-6 py-3 rounded-xl font-bold text-xs transition border ${
                  !didApplyDecision ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/20' : 'bg-aqua-950 text-slate-400 border-white/10'
                }`}
              >
                NO — Do Not Bid
              </button>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-mono uppercase text-slate-300 block">Executive Approval Rationale</label>
              <textarea
                value={applyDecisionReason}
                onChange={(e) => setApplyDecisionReason(e.target.value)}
                rows={2}
                className="w-full p-3 rounded-xl bg-aqua-950/80 border border-white/15 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => advanceStage('5_BID_DETAILS', `Stage 4 Approval: Did Apply = ${didApplyDecision}`, 'Tender Team to enter Stage 5 Submission Details')}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-400 to-teal-400 text-aqua-950 font-bold text-xs hover:brightness-110 transition shadow-lg shadow-purple-400/20"
            >
              <span>Approve & Advance to Stage 5 (Bid Details)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Stage 5 & 6: Bid Details & Tender Result (Tender Team) */}
      {(activeTender.current_stage === '5_BID_DETAILS' || activeTender.current_stage === '6_TENDER_RESULT') && (
        <div className="glass-card p-8 rounded-2xl space-y-6 border-2 border-emerald-500/40">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-display font-bold text-white">Stage 5 & 6 — Bid Submission & Win/Loss Self-Learning Result</h3>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              Assigned: Tender Team
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400">Final Submitted Bid Amount (₹)</label>
              <input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(Number(e.target.value))}
                className="w-full p-2.5 rounded-lg bg-aqua-950 border border-white/15 text-xs text-white font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400">EMD Deposit Amount (₹)</label>
              <input
                type="number"
                value={emdAmount}
                onChange={(e) => setEmdAmount(Number(e.target.value))}
                className="w-full p-2.5 rounded-lg bg-aqua-950 border border-white/15 text-xs text-white font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400">Tender Reference ID</label>
              <input
                type="text"
                value={tenderCode}
                onChange={(e) => setTenderCode(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-aqua-950 border border-white/15 text-xs text-white font-mono"
              />
            </div>
          </div>

          {/* Stage 6 Result & Lessons Learned */}
          <div className="p-6 rounded-2xl bg-aqua-950/80 border border-white/10 space-y-4">
            <h4 className="text-sm font-display font-bold text-white">Stage 6 Final Tender Outcome & Self-Learning Knowledge Capture</h4>

            <div className="flex space-x-3">
              {(['Won', 'Lost', 'Cancelled', 'Under Evaluation'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setResultStatus(st)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${
                    resultStatus === st
                      ? st === 'Won'
                        ? 'bg-emerald-400 text-aqua-950 border-emerald-300 shadow-md shadow-emerald-400/20'
                        : 'bg-rose-500 text-white border-rose-400'
                      : 'bg-aqua-950 text-slate-300 border-white/10'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {resultStatus === 'Lost' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400">Winning Competitor Company</label>
                  <input
                    type="text"
                    value={winnerCompany}
                    onChange={(e) => setWinnerCompany(e.target.value)}
                    className="w-full p-2 rounded-lg bg-aqua-950 border border-white/15 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400">Winning Price (₹)</label>
                  <input
                    type="number"
                    value={winningPrice}
                    onChange={(e) => setWinningPrice(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-aqua-950 border border-white/15 text-xs text-white"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-400">Lessons Learned & AI Strategy Takeaways</label>
              <textarea
                value={lessonsLearned}
                onChange={(e) => setLessonsLearned(e.target.value)}
                rows={2}
                className="w-full p-2.5 rounded-lg bg-aqua-950 border border-white/15 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleFinalizeResult}
              className="flex items-center space-x-2 px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-aqua-950 font-bold text-xs hover:brightness-110 transition shadow-xl shadow-emerald-400/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>Finalize Result & Index into AI Knowledge Base</span>
            </button>
          </div>
        </div>
      )}

      {/* AUDIT TRAIL TIMELINE */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <h3 className="font-display font-semibold text-base text-white">
              Complete Audit Trail & Timeline (#TND-{activeTender.id})
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">{activeTender.audit_trail.length} Logs Recorded</span>
        </div>

        <div className="space-y-3">
          {activeTender.audit_trail.map((log) => (
            <div key={log.id} className="p-4 rounded-xl bg-aqua-950/60 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-white">{log.user}</span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 font-mono text-[10px] border border-purple-500/30">
                    Dept: {log.department}
                  </span>
                  <span className="text-slate-400 font-mono">{log.timestamp}</span>
                </div>
                <p className="text-slate-200 font-medium">{log.action}</p>
                <p className="text-cyan-300 font-mono text-[11px]">Next Action: {log.next_pending_action}</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/30 self-start sm:self-center shrink-0">
                {log.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
