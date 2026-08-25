'use client';

import React, { useState, useEffect } from 'react';
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
  Database,
  Plus,
  Trash2,
  Edit3,
  AlertTriangle,
  Download
} from 'lucide-react';
import { 
  TenderProcess, 
  TenderStage, 
  DepartmentRole, 
  BOQLineItem, 
  AuditLog 
} from '@/lib/types';
import { generateBOQExcelReport } from '@/lib/excelExport';

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

  // Stage viewing state (allows user to click any stage header to view its details)
  const [viewingStage, setViewingStage] = useState<TenderStage>(activeTender?.current_stage || '1_ELIGIBILITY');

  // Sync viewing stage when active tender changes
  useEffect(() => {
    if (activeTender) {
      setViewingStage(activeTender.current_stage);
    }
  }, [activeTender?.id, activeTender?.current_stage]);

  // Stage 1 State
  const [stage1Verdict, setStage1Verdict] = useState<'Eligible' | 'Partially Eligible' | 'Not Eligible'>(
    activeTender?.eligibility_result?.status_verdict || (activeTender?.eligibility_result?.is_eligible ? 'Eligible' : 'Not Eligible')
  );
  const [stage1Remarks, setStage1Remarks] = useState<string>(
    activeTender?.eligibility_result?.reasoning || 'Verified against company financial records (₹300.93 Cr turnover) and active Class-A PHED license.'
  );

  // Stage 2 State
  const [stage2Remarks, setStage2Remarks] = useState<string>('Technical specifications and compliance matrix verified by Engineering department.');

  // Stage 3 BOQ Form & Inline Editing State
  const [boqItems, setBOQItems] = useState<BOQLineItem[]>(activeTender?.boq_items || [
    { id: 'boq-1', category: 'Equipment', item_name: 'Solar Submersible Pump Sets (5 HP)', unit_of_measure: 'Sets', quantity: 150, unit_cost: 135000, markup_percentage: 12, tax_percentage: 18 },
    { id: 'boq-2', category: 'Raw Materials', item_name: 'HDPE Distribution Pipeline (110mm)', unit_of_measure: 'Meters', quantity: 25000, unit_cost: 680, markup_percentage: 10, tax_percentage: 18 },
    { id: 'boq-3', category: 'Equipment', item_name: 'IoT Telemetry Controller & Flow Sensors', unit_of_measure: 'Units', quantity: 150, unit_cost: 28000, markup_percentage: 15, tax_percentage: 18 }
  ]);
  const [newBOQCategory, setNewBOQCategory] = useState<BOQLineItem['category']>('Equipment');
  const [newBOQItemName, setNewBOQItemName] = useState<string>('');
  const [newBOQQuantity, setNewBOQQuantity] = useState<number>(100);
  const [newBOQUnitCost, setNewBOQUnitCost] = useState<number>(4500);

  // Stage 4 Decision State
  const [didApplyDecision, setDidApplyDecision] = useState<boolean>(activeTender?.did_apply ?? true);
  const [applyDecisionReason, setApplyDecisionReason] = useState<string>(
    activeTender?.apply_decision_reason || 'Approved to bid. High win probability based on Jaipur HQ execution track record and competitive solar pricing.'
  );

  // Stage 5 Bid Details State
  const [bidAmount, setBidAmount] = useState<number>(activeTender?.bid_details?.bid_amount || 145000000);
  const [emdAmount, setEmdAmount] = useState<number>(activeTender?.bid_details?.emd_amount || 2900000);
  const [emdReference, setEmdReference] = useState<string>(activeTender?.bid_details?.emd_reference || 'BG-SBI-JPR-2026-9941');
  const [tenderCode, setTenderCode] = useState<string>(activeTender?.bid_details?.tender_id_code || `PHED-RJ-${activeTender?.id || '2026'}`);
  const [submittedBy, setSubmittedBy] = useState<string>(activeTender?.bid_details?.submitted_by || 'Ankit Purohit (Tender Head)');
  const [submissionRemarks, setSubmissionRemarks] = useState<string>(activeTender?.bid_details?.remarks || 'Submitted online via RajCOMP portal with digital signature.');

  // Stage 6 Result & Competitive Intelligence State
  const [resultStatus, setResultStatus] = useState<'Won' | 'Lost' | 'Cancelled' | 'Under Evaluation'>(activeTender?.result_status || 'Won');
  const [winnerCompany, setWinnerCompany] = useState<string>(activeTender?.lost_reason_details?.winner_company || 'L&T Water IC');
  const [winningPrice, setWinningPrice] = useState<number>(activeTender?.lost_reason_details?.winning_price || 138000000);
  const [l2Company, setL2Company] = useState<string>(activeTender?.lost_reason_details?.l2_company || 'Desire Energy Solutions');
  const [l2Price, setL2Price] = useState<number>(activeTender?.lost_reason_details?.l2_price || 145000000);
  const [l3Company, setL3Company] = useState<string>(activeTender?.lost_reason_details?.l3_company || 'Va Tech Wabag');
  const [l3Price, setL3Price] = useState<number>(activeTender?.lost_reason_details?.l3_price || 152000000);
  const [ourRank, setOurRank] = useState<string>(activeTender?.lost_reason_details?.our_rank || 'L2 (2nd Lowest)');
  const [lostReason, setLostReason] = useState<string>(activeTender?.lost_reason_details?.reasons || 'L1 competitor undercut on civil excavation and piping labor unit rates.');
  const [lessonsLearned, setLessonsLearned] = useState<string>(activeTender?.lost_reason_details?.lessons_learned || 'Negotiate volume discounts for HDPE pipe suppliers in district clusters.');

  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Sync state when active tender changes
  useEffect(() => {
    if (activeTender) {
      if (activeTender.boq_items && activeTender.boq_items.length > 0) {
        setBOQItems(activeTender.boq_items);
      }
      if (activeTender.did_apply !== undefined) {
        setDidApplyDecision(activeTender.did_apply);
      }
      if (activeTender.bid_details) {
        setBidAmount(activeTender.bid_details.bid_amount);
        setEmdAmount(activeTender.bid_details.emd_amount);
        setTenderCode(activeTender.bid_details.tender_id_code);
      }
      if (activeTender.result_status) {
        setResultStatus(activeTender.result_status);
      }
    }
  }, [activeTender?.id]);

  if (!activeTender) {
    return (
      <div className="glass-card p-12 rounded-2xl text-center space-y-4">
        <Workflow className="w-12 h-12 text-teal-800 font-semibold mx-auto" />
        <h3 className="text-xl font-display font-bold text-slate-900">No Active Tenders in Process Queue</h3>
        <p className="text-xs text-slate-700 font-medium">Use the Tender Assessment Wizard to create a new tender entry.</p>
      </div>
    );
  }

  // 6 Stages Mapping
  const stagesList: Array<{ 
    stage: TenderStage; 
    stepNum: number; 
    label: string; 
    dept: DepartmentRole; 
    desc: string 
  }> = [
    { stage: '1_ELIGIBILITY', stepNum: 1, label: '1. Eligibility Check', dept: 'Business Development', desc: 'Criteria & Experience Evaluation' },
    { stage: '2_AI_ANALYSIS', stepNum: 2, label: '2. Tender Analysis', dept: 'Engineering', desc: 'Clause & Compliance Breakdown' },
    { stage: '3_COST_ESTIMATION', stepNum: 3, label: '3. Cost Estimation', dept: 'Estimation Team', desc: 'BOQ Unit Rates & Pricing' },
    { stage: '4_DECISION', stepNum: 4, label: '4. Bid Decision', dept: 'Business Development', desc: 'Apply / Do Not Apply Decision' },
    { stage: '5_BID_DETAILS', stepNum: 5, label: '5. Bid Details', dept: 'Tender Team', desc: 'Bid Amount & Submission' },
    { stage: '6_TENDER_RESULT', stepNum: 6, label: '6. Tender Result', dept: 'Tender Team', desc: 'Win/Loss & Market Intelligence' }
  ];

  const getStageIndex = (s: TenderStage) => stagesList.findIndex(st => st.stage === s);
  const currentStageIdx = getStageIndex(activeTender.current_stage);

  // Check Department RBAC Permission for Active Stage
  const canUserEditStage = (stageDept: DepartmentRole) => {
    if ((activeRole as string) === 'Admin') return true;
    if (stageDept === 'Business Development' && (activeRole === 'Business Development' || activeRole === 'Management')) return true;
    if (stageDept === 'Tender Team' && (activeRole === 'Tender Team' || activeRole === 'Finance' || activeRole === 'Management')) return true;
    return activeRole === stageDept;
  };

  // Generic helper to advance stage
  const advanceToStage = (nextStage: TenderStage, actionText: string, nextPending: string) => {
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
    setViewingStage(nextStage);

    setFeedbackToast(`Tender #${activeTender.id} advanced to ${nextStage.replace('_', ' ')}!`);
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  // Stage 1 Action: Complete Eligibility
  const handleCompleteStage1 = () => {
    const isEligible = stage1Verdict !== 'Not Eligible';
    const updated: TenderProcess = {
      ...activeTender,
      eligibility_result: {
        is_eligible: isEligible,
        score: isEligible ? 95 : 35,
        reasoning: stage1Remarks,
        status_verdict: stage1Verdict
      }
    };
    onUpdateTender(updated);
    advanceToStage(
      '2_AI_ANALYSIS', 
      `Stage 1 Completed: Verdict ${stage1Verdict}`, 
      'Engineering Department to complete Stage 2 Tender Analysis'
    );
  };

  // Stage 2 Action: Complete Analysis
  const handleCompleteStage2 = () => {
    advanceToStage(
      '3_COST_ESTIMATION', 
      `Stage 2 Tender Analysis Approved: ${stage2Remarks}`, 
      'Estimation Team to construct Stage 3 Costing BOQ'
    );
  };

  // Stage 3 BOQ Items Management (Add, Edit Unit Cost, Delete)
  const handleAddBOQItem = () => {
    if (!newBOQItemName) return;
    const newItem: BOQLineItem = {
      id: `boq-${Date.now()}`,
      category: newBOQCategory,
      item_name: newBOQItemName,
      unit_of_measure: 'Units',
      quantity: newBOQQuantity,
      unit_cost: newBOQUnitCost,
      markup_percentage: 12,
      tax_percentage: 18
    };

    const updatedItems = [...boqItems, newItem];
    setBOQItems(updatedItems);
    
    const updated: TenderProcess = {
      ...activeTender,
      boq_items: updatedItems,
    };
    onUpdateTender(updated);

    setNewBOQItemName('');
    setFeedbackToast(`New unit rate for '${newItem.item_name}' saved to Company Knowledge Base.`);
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  const handleUpdateUnitCost = (id: string, newCost: number) => {
    const updatedItems = boqItems.map(item => item.id === id ? { ...item, unit_cost: newCost } : item);
    setBOQItems(updatedItems);
    onUpdateTender({ ...activeTender, boq_items: updatedItems });
  };

  const handleDeleteBOQItem = (id: string) => {
    const updatedItems = boqItems.filter(item => item.id !== id);
    setBOQItems(updatedItems);
    onUpdateTender({ ...activeTender, boq_items: updatedItems });
  };

  // Stage 3 Action: Complete BOQ Costing
  const handleCompleteStage3 = () => {
    const updated: TenderProcess = {
      ...activeTender,
      boq_items: boqItems
    };
    onUpdateTender(updated);
    advanceToStage(
      '4_DECISION',
      `Stage 3 Cost Estimation Finalized (Total Items: ${boqItems.length})`,
      'Business Development & Management to record Stage 4 Apply Decision'
    );
  };

  // Stage 4 Action: Record Decision
  const handleCompleteStage4 = () => {
    const nextStage = didApplyDecision ? '5_BID_DETAILS' : '4_DECISION';
    const actionMsg = didApplyDecision 
      ? 'Stage 4 Decision: APPROVED TO BID' 
      : `Stage 4 Decision: DO NOT BID (Reason: ${applyDecisionReason})`;

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      user: `Officer (${activeRole})`,
      department: activeRole,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      action: actionMsg,
      status: didApplyDecision ? 'Approved' : 'Stopped (No Bid)',
      next_pending_action: didApplyDecision ? 'Tender Team to fill Stage 5 Bid Details' : 'Process Closed'
    };

    const updated: TenderProcess = {
      ...activeTender,
      did_apply: didApplyDecision,
      apply_decision_reason: applyDecisionReason,
      current_stage: didApplyDecision ? '5_BID_DETAILS' : '4_DECISION',
      stage_status: didApplyDecision ? 'Completed' : 'Rejected',
      updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
      audit_trail: [newLog, ...activeTender.audit_trail]
    };

    onUpdateTender(updated);
    if (didApplyDecision) {
      setViewingStage('5_BID_DETAILS');
    }
  };

  // Stage 5 Action: Submit Bid Details
  const handleCompleteStage5 = () => {
    const updated: TenderProcess = {
      ...activeTender,
      bid_details: {
        bid_amount: bidAmount,
        bid_date: new Date().toISOString().slice(0, 10),
        emd_amount: emdAmount,
        emd_reference: emdReference,
        tender_id_code: tenderCode,
        supporting_docs_attached: ['Financial_Turnover.pdf', 'ClassA_License.pdf'],
        submitted_by: submittedBy,
        remarks: submissionRemarks
      }
    };
    onUpdateTender(updated);
    advanceToStage(
      '6_TENDER_RESULT',
      `Stage 5 Bid Details Submitted (Amount: ₹${(bidAmount / 10000000).toFixed(2)} Cr)`,
      'Tender Team to record Stage 6 Final Outcome & Competitive Intelligence'
    );
  };

  // Stage 6 Action: Finalize Outcome & Commit to Knowledge Base
  const handleFinalizeStage6 = () => {
    const priceDiff = bidAmount - winningPrice;
    const priceDiffPct = bidAmount > 0 ? (priceDiff / bidAmount) * 100 : 0;

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      user: `Tender Officer (${activeRole})`,
      department: activeRole,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      action: `Finalized Stage 6 Result: ${resultStatus} (Rank: ${ourRank})`,
      status: resultStatus,
      next_pending_action: 'Self-Learning Feedback Loop Committed to Company Knowledge Base'
    };

    const updated: TenderProcess = {
      ...activeTender,
      current_stage: '6_TENDER_RESULT',
      stage_status: 'Completed',
      result_status: resultStatus,
      lost_reason_details: {
        winner_company: winnerCompany,
        winning_price: winningPrice,
        l2_company: l2Company,
        l2_price: l2Price,
        l3_company: l3Company,
        l3_price: l3Price,
        our_rank: ourRank,
        price_difference_amount: priceDiff,
        price_difference_pct: Number(priceDiffPct.toFixed(1)),
        reasons: lostReason,
        lessons_learned: lessonsLearned
      },
      audit_trail: [newLog, ...activeTender.audit_trail]
    };

    onUpdateTender(updated);

    setFeedbackToast(`Tender #${activeTender.id} outcome (${resultStatus}) committed to Company Knowledge Base!`);
    setTimeout(() => setFeedbackToast(null), 5000);
  };

  // Calculate live total BOQ cost
  const totalBOQCost = boqItems.reduce((acc, item) => {
    const lineTotal = item.quantity * item.unit_cost;
    const withMarkup = lineTotal * (1 + item.markup_percentage / 100);
    const withTax = withMarkup * (1 + item.tax_percentage / 100);
    return acc + withTax;
  }, 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Toast Notification for Knowledge Base Feedback Loop */}
      {feedbackToast && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs flex items-center justify-between shadow-2xl animate-bounce">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5" />
            <span>{feedbackToast}</span>
          </div>
          <span className="text-[10px] font-mono uppercase bg-slate-50 text-emerald-800 px-2.5 py-0.5 rounded-md">
            Company Knowledge Updated
          </span>
        </div>
      )}

      {/* Module Banner */}
      <div className="glass-card p-6 rounded-2xl border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-teal-800 font-semibold font-mono text-xs mb-1">
            <Workflow className="w-4 h-4" />
            <span>ENTERPRISE TENDER PROCESS QUEUE • 6 STAGES</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-slate-900">
            Tender Process Queue & Lifecycle Pipeline
          </h2>
          <p className="text-xs text-slate-700 font-medium mt-1">
            Progress tenders through 6 sequential stages. Current User Role: <strong className="text-teal-800">{activeRole}</strong>
          </p>
        </div>

        {/* Active Tender Selector */}
        <div className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-50/80 border border-slate-200 shrink-0">
          <span className="text-xs font-mono text-slate-700 font-medium">Select Tender:</span>
          <select
            value={selectedTenderId}
            onChange={(e) => setSelectedTenderId(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
          >
            {tenders.map((t) => (
              <option key={t.id} value={t.id} className="bg-slate-50 text-slate-900">
                #{t.id} — {t.tender_name.slice(0, 35)}... ({t.project_category})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 6-Stage Pipeline Stepper Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stagesList.map((s, idx) => {
          const isCurrentActive = activeTender.current_stage === s.stage;
          const isPassed = currentStageIdx > idx;
          const isViewing = viewingStage === s.stage;

          return (
            <button
              key={s.stage}
              type="button"
              onClick={() => setViewingStage(s.stage)}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                isViewing
                  ? 'bg-slate-900 text-white border-2 border-teal-500 shadow-md shadow-slate-900/10'
                  : isPassed
                  ? 'bg-emerald-50 border border-emerald-300 text-emerald-950'
                  : isCurrentActive
                  ? 'bg-teal-50 border-2 border-teal-600 text-teal-950'
                  : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                <span className={`font-bold ${isViewing ? 'text-teal-300' : isPassed ? 'text-emerald-700' : isCurrentActive ? 'text-teal-800' : 'text-slate-500'}`}>
                  {isPassed ? '✅ DONE' : isCurrentActive ? '🔄 ACTIVE' : '⏳ PENDING'}
                </span>
                <span className={`font-medium ${isViewing ? 'text-slate-400' : 'text-slate-500'}`}>{s.dept.split(' ')[0]}</span>
              </div>
              <div className={`font-bold text-xs truncate ${isViewing ? 'text-white' : 'text-slate-900'}`}>{s.label}</div>
              <div className={`text-[10px] font-medium truncate mt-0.5 ${isViewing ? 'text-slate-700 font-medium' : 'text-slate-600'}`}>{s.desc}</div>
            </button>
          );
        })}
      </div>

      {/* Viewing Stage Detail Banner */}
      <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 text-slate-600">
          <span className="font-mono text-teal-800 font-semibold font-bold">STAGE VIEW:</span>
          <span className="font-semibold text-slate-900">
            {stagesList.find(s => s.stage === viewingStage)?.label}
          </span>
          <span className="text-slate-700 font-medium">• Assigned Department:</span>
          <strong className="text-teal-800">
            {stagesList.find(s => s.stage === viewingStage)?.dept}
          </strong>
        </div>

        {/* RBAC Badge */}
        {!canUserEditStage(stagesList.find(s => s.stage === viewingStage)?.dept || 'Admin') ? (
          <div className="px-3 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-bold font-mono text-[11px] flex items-center space-x-1">
            <Lock className="w-3 h-3 text-amber-700" />
            <span>View-Only Mode (Switch Role to {stagesList.find(s => s.stage === viewingStage)?.dept} to edit)</span>
          </div>
        ) : (
          <div className="px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-[11px] flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800 font-bold" />
            <span>Role Authorized ({activeRole})</span>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* STAGE 1: ELIGIBILITY CHECK ACTION CARD */}
      {/* ========================================== */}
      {viewingStage === '1_ELIGIBILITY' && (
        <div className="glass-card p-6 sm:p-8 rounded-2xl space-y-6 border-2 border-teal-300">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-teal-800 font-semibold" />
              <h3 className="text-lg font-display font-bold text-slate-900">
                Stage 1 — Company Qualification & Eligibility Assessment
              </h3>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
              Department: Business Development
            </span>
          </div>

          {/* Qualification Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-1">
              <span className="text-[11px] font-mono uppercase text-slate-700 font-medium">Financial Turnover</span>
              <div className="text-sm font-bold text-slate-900">₹300.93 Cr Verified</div>
              <p className="text-[11px] text-emerald-800 font-bold">Exceeds ₹150 Cr requirement</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-1">
              <span className="text-[11px] font-mono uppercase text-slate-700 font-medium">Track Record</span>
              <div className="text-sm font-bold text-slate-900">1,00,000+ Villages</div>
              <p className="text-[11px] text-emerald-800 font-bold">JJM / ESCO / Solar pumps</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-1">
              <span className="text-[11px] font-mono uppercase text-slate-700 font-medium">Licenses & ISO</span>
              <div className="text-sm font-bold text-slate-900">Class-A PHED License</div>
              <p className="text-[11px] text-emerald-800 font-bold">Active & Valid in Rajasthan</p>
            </div>
          </div>

          {/* Eligibility Verdict Form */}
          <div className="space-y-4 p-5 rounded-xl bg-slate-50/60 border border-slate-200">
            <label className="text-xs font-mono uppercase text-slate-600 block">Eligibility Verdict *</label>
            <div className="flex flex-wrap gap-3">
              {(['Eligible', 'Partially Eligible', 'Not Eligible'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  disabled={!canUserEditStage('Business Development')}
                  onClick={() => setStage1Verdict(v)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${
                    stage1Verdict === v
                      ? v === 'Eligible'
                        ? 'bg-emerald-400 text-white border-emerald-300 shadow-md shadow-emerald-400/20'
                        : v === 'Partially Eligible'
                        ? 'bg-amber-400 text-white border-amber-300'
                        : 'bg-rose-500 text-slate-900 border-rose-400'
                      : 'bg-slate-50 text-slate-700 font-medium border-slate-200'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-mono uppercase text-slate-600 block">Officer Remarks / Qualification Notes</label>
              <textarea
                value={stage1Remarks}
                disabled={!canUserEditStage('Business Development')}
                onChange={(e) => setStage1Remarks(e.target.value)}
                rows={2}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-250 text-xs text-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Action Button */}
          {canUserEditStage('Business Development') && (
            <div className="flex justify-end pt-2">
              <button
                onClick={handleCompleteStage1}
                className="flex items-center space-x-2 px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 text-white font-bold text-xs hover:brightness-110 transition shadow-lg shadow-cyan-400/20"
              >
                <span>Approve Stage 1 Eligibility & Unlock Stage 2 (Tender Analysis)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* STAGE 2: TENDER ANALYSIS ACTION CARD */}
      {/* ========================================== */}
      {viewingStage === '2_AI_ANALYSIS' && (
        <div className="glass-card p-6 sm:p-8 rounded-2xl space-y-6 border-2 border-teal-300">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-teal-800 font-semibold" />
              <h3 className="text-lg font-display font-bold text-slate-900">
                Stage 2 — Tender Specification & Clause Breakdown Analysis
              </h3>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
              Department: Engineering
            </span>
          </div>

          {/* Uploaded File Info */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-teal-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-6 h-6 text-teal-800 font-semibold" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Uploaded Document: {activeTender.uploaded_files?.tender_pdf || 'Tender_Specification_Package.pdf'}
                </h4>
                <p className="text-[11px] text-slate-700 font-medium mt-0.5">
                  Analyzed against Company Knowledge Base & Technical Standards
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-md font-mono text-[10px] bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
              Analyzed
            </span>
          </div>

          {/* Clause Analysis Sample Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase text-teal-800">Technical Compliance Summary</h4>
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-lg bg-slate-50/60 border border-slate-200 flex items-center justify-between">
                <div>
                  <strong className="text-slate-900">Sec 4.2 — HDPE Pipeline Pressure Rating (PN-10)</strong>
                  <p className="text-[11px] text-slate-700 font-medium">Compliant with ISO 4427 standards.</p>
                </div>
                <span className="text-emerald-800 font-bold font-mono text-[10px]">Pass</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50/60 border border-slate-200 flex items-center justify-between">
                <div>
                  <strong className="text-slate-900">Sec 6.1 — Solar Inverter Efficiency (&gt; 98.5%)</strong>
                  <p className="text-[11px] text-slate-700 font-medium">Matched with Sunaquator RMS controller specs.</p>
                </div>
                <span className="text-emerald-800 font-bold font-mono text-[10px]">Pass</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 p-4 rounded-xl bg-slate-50/60 border border-slate-200">
            <label className="text-xs font-mono uppercase text-slate-600 block">Engineering Compliance Remarks</label>
            <textarea
              value={stage2Remarks}
              disabled={!canUserEditStage('Engineering')}
              onChange={(e) => setStage2Remarks(e.target.value)}
              rows={2}
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-250 text-xs text-slate-900 focus:outline-none"
            />
          </div>

          {/* Action Button */}
          {canUserEditStage('Engineering') && (
            <div className="flex justify-end pt-2">
              <button
                onClick={handleCompleteStage2}
                className="flex items-center space-x-2 px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 text-white font-bold text-xs hover:brightness-110 transition shadow-lg shadow-cyan-400/20"
              >
                <span>Approve Stage 2 Technical Analysis & Unlock Stage 3 (Cost Estimation)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* STAGE 3: COST ESTIMATION & EDITABLE BOQ */}
      {/* ========================================== */}
      {viewingStage === '3_COST_ESTIMATION' && (
        <div className="glass-card p-6 sm:p-8 rounded-2xl space-y-6 border-2 border-teal-300">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center space-x-2">
              <Calculator className="w-5 h-5 text-teal-800 font-semibold" />
              <h3 className="text-lg font-display font-bold text-slate-900">
                Stage 3 — Cost Estimation & Interactive BOQ Pricing
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                Department: Estimation Team
              </span>
            </div>
          </div>

          {/* Learning Feedback Indicator */}
          <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-800 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-teal-800 font-semibold shrink-0" />
            <span>
              <strong>Continuous AI Learning Active:</strong> Any manual edits to unit rates below will update the Company Knowledge Base to refine future tender cost estimations!
            </span>
          </div>

          {/* Editable BOQ Table */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h4 className="text-xs font-mono uppercase text-slate-900">BOQ Unit Rate Breakdown Table</h4>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => generateBOQExcelReport(activeTender, boqItems)}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-500/30 text-emerald-800 border border-emerald-300 text-xs font-semibold transition cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-800 font-bold" />
                  <span>Export Costing Excel (.xls)</span>
                </button>
                <div className="text-right">
                  <span className="text-xs font-mono text-slate-700 font-medium">Total Estimated Cost: </span>
                  <strong className="text-base font-display font-bold text-teal-800">
                    ₹{(totalBOQCost / 10000000).toFixed(2)} Cr
                  </strong>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-teal-800 font-mono uppercase text-[11px]">
                  <tr>
                    <th className="p-3">Category</th>
                    <th className="p-3">Item Description</th>
                    <th className="p-3 text-right">Quantity</th>
                    <th className="p-3 text-right">Unit Rate (₹)</th>
                    <th className="p-3 text-right">Markup %</th>
                    <th className="p-3 text-right">Total (₹)</th>
                    {canUserEditStage('Estimation Team') && <th className="p-3 text-center">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {boqItems.map((item) => {
                    const lineTotal = item.quantity * item.unit_cost * (1 + item.markup_percentage / 100) * (1 + item.tax_percentage / 100);
                    return (
                      <tr key={item.id} className="hover:bg-white/5 transition">
                        <td className="p-3 font-mono text-teal-800">{item.category}</td>
                        <td className="p-3 font-semibold text-slate-900">{item.item_name}</td>
                        <td className="p-3 text-right font-mono">{item.quantity} {item.unit_of_measure}</td>
                        <td className="p-3 text-right font-mono">
                          {canUserEditStage('Estimation Team') ? (
                            <input
                              type="number"
                              value={item.unit_cost}
                              onChange={(e) => handleUpdateUnitCost(item.id, Number(e.target.value))}
                              className="w-24 px-2 py-1 bg-slate-50 border border-teal-200 rounded text-right text-slate-900 font-mono text-xs focus:border-cyan-400"
                            />
                          ) : (
                            <span>₹{item.unit_cost.toLocaleString()}</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono">{item.markup_percentage}%</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-800 font-bold">
                          ₹{Math.round(lineTotal).toLocaleString()}
                        </td>
                        {canUserEditStage('Estimation Team') && (
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleDeleteBOQItem(item.id)}
                              className="p-1 rounded text-rose-800 font-bold hover:bg-rose-100 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Custom BOQ Line Item */}
          {canUserEditStage('Estimation Team') && (
            <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-200 space-y-3">
              <h4 className="text-xs font-mono uppercase text-teal-800">Add BOQ Line Item to Cost Model</h4>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <select
                  value={newBOQCategory}
                  onChange={(e) => setNewBOQCategory(e.target.value as BOQLineItem['category'])}
                  className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-250 text-xs text-slate-900"
                >
                  <option value="Equipment">Equipment</option>
                  <option value="Raw Materials">Raw Materials</option>
                  <option value="Labour">Labour</option>
                  <option value="Logistics">Logistics</option>
                  <option value="Subcontractor">Subcontractor</option>
                </select>

                <input
                  type="text"
                  placeholder="Item Name (e.g. Pump Controller)"
                  value={newBOQItemName}
                  onChange={(e) => setNewBOQItemName(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-250 text-xs text-slate-900 sm:col-span-2"
                />

                <input
                  type="number"
                  placeholder="Qty"
                  value={newBOQQuantity}
                  onChange={(e) => setNewBOQQuantity(Number(e.target.value))}
                  className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-250 text-xs text-slate-900"
                />

                <input
                  type="number"
                  placeholder="Unit Cost (₹)"
                  value={newBOQUnitCost}
                  onChange={(e) => setNewBOQUnitCost(Number(e.target.value))}
                  className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-250 text-xs text-slate-900"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleAddBOQItem}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-teal-800 text-white font-bold font-bold text-xs hover:bg-teal-800 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Line Item & Update Learning</span>
                </button>
              </div>
            </div>
          )}

          {/* Action Button */}
          {canUserEditStage('Estimation Team') && (
            <div className="flex justify-end pt-2">
              <button
                onClick={handleCompleteStage3}
                className="flex items-center space-x-2 px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 text-white font-bold text-xs hover:brightness-110 transition shadow-lg shadow-cyan-400/20"
              >
                <span>Finalize BOQ Costing & Unlock Stage 4 (Bid Decision)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* STAGE 4: BID DECISION ACTION CARD */}
      {/* ========================================== */}
      {viewingStage === '4_DECISION' && (
        <div className="glass-card p-6 sm:p-8 rounded-2xl space-y-6 border-2 border-purple-500/40">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-purple-700" />
              <h3 className="text-lg font-display font-bold text-slate-900">
                Stage 4 — Executive Management & BD Bid Decision
              </h3>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
              Department: Business Development / Management
            </span>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-mono uppercase text-slate-600 block">Bid Application Decision *</label>
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                disabled={!canUserEditStage('Business Development')}
                onClick={() => setDidApplyDecision(true)}
                className={`px-6 py-3 rounded-xl font-bold text-xs transition border ${
                  didApplyDecision
                    ? 'bg-emerald-400 text-white border-emerald-300 shadow-lg shadow-emerald-400/20'
                    : 'bg-slate-50 text-slate-700 font-medium border-slate-200'
                }`}
              >
                YES — Proceed to Bid Submission
              </button>

              <button
                type="button"
                disabled={!canUserEditStage('Business Development')}
                onClick={() => setDidApplyDecision(false)}
                className={`px-6 py-3 rounded-xl font-bold text-xs transition border ${
                  !didApplyDecision
                    ? 'bg-rose-500 text-slate-900 border-rose-400 shadow-lg shadow-rose-500/20'
                    : 'bg-slate-50 text-slate-700 font-medium border-slate-200'
                }`}
              >
                NO — Do Not Bid
              </button>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-mono uppercase text-slate-600 block">Decision Rationale & Strategic Comments</label>
              <textarea
                value={applyDecisionReason}
                disabled={!canUserEditStage('Business Development')}
                onChange={(e) => setApplyDecisionReason(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-250 text-xs text-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Action Button */}
          {canUserEditStage('Business Development') && (
            <div className="flex justify-end pt-2">
              <button
                onClick={handleCompleteStage4}
                className="flex items-center space-x-2 px-8 py-3 rounded-xl bg-gradient-to-r from-purple-400 to-teal-400 text-white font-bold text-xs hover:brightness-110 transition shadow-lg shadow-purple-400/20"
              >
                <span>Record Bid Decision & Advance to Stage 5 (Bid Details)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* STAGE 5: BID DETAILS ACTION CARD */}
      {/* ========================================== */}
      {viewingStage === '5_BID_DETAILS' && (
        <div className="glass-card p-6 sm:p-8 rounded-2xl space-y-6 border-2 border-emerald-300">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-emerald-800 font-bold" />
              <h3 className="text-lg font-display font-bold text-slate-900">
                Stage 5 — Bid Submission & Tender Documentation Details
              </h3>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              Department: Tender Team / Finance
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-600">Submitted Bid Amount (₹) *</label>
              <input
                type="number"
                disabled={!canUserEditStage('Tender Team')}
                value={bidAmount}
                onChange={(e) => setBidAmount(Number(e.target.value))}
                className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-250 text-xs text-slate-900 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-600">EMD Deposit Amount (₹) *</label>
              <input
                type="number"
                disabled={!canUserEditStage('Tender Team')}
                value={emdAmount}
                onChange={(e) => setEmdAmount(Number(e.target.value))}
                className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-250 text-xs text-slate-900 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-600">EMD Guarantee Reference</label>
              <input
                type="text"
                disabled={!canUserEditStage('Tender Team')}
                value={emdReference}
                onChange={(e) => setEmdReference(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-250 text-xs text-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-600">Tender Reference ID / Portal Code</label>
              <input
                type="text"
                disabled={!canUserEditStage('Tender Team')}
                value={tenderCode}
                onChange={(e) => setTenderCode(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-250 text-xs text-slate-900 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-600">Submitted By Officer</label>
              <input
                type="text"
                disabled={!canUserEditStage('Tender Team')}
                value={submittedBy}
                onChange={(e) => setSubmittedBy(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-250 text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-600">Submission Remarks & Digital Sign-off</label>
            <textarea
              value={submissionRemarks}
              disabled={!canUserEditStage('Tender Team')}
              onChange={(e) => setSubmissionRemarks(e.target.value)}
              rows={2}
              className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-250 text-xs text-slate-900 focus:outline-none"
            />
          </div>

          {/* Action Button */}
          {canUserEditStage('Tender Team') && (
            <div className="flex justify-end pt-2">
              <button
                onClick={handleCompleteStage5}
                className="flex items-center space-x-2 px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-white font-bold text-xs hover:brightness-110 transition shadow-lg shadow-emerald-400/20"
              >
                <span>Submit Bid Details & Unlock Stage 6 (Tender Result)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* STAGE 6: TENDER RESULT & KNOWLEDGE CAPTURE */}
      {/* ========================================== */}
      {viewingStage === '6_TENDER_RESULT' && (
        <div className="glass-card p-6 sm:p-8 rounded-2xl space-y-6 border-2 border-emerald-300">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-emerald-800 font-bold" />
              <h3 className="text-lg font-display font-bold text-slate-900">
                Stage 6 — Final Tender Outcome & Competitive Intelligence Capture
              </h3>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              Department: Tender Team / Management
            </span>
          </div>

          {/* Outcome Status Selector */}
          <div className="space-y-3">
            <label className="text-xs font-mono uppercase text-slate-600 block">Final Result Status *</label>
            <div className="flex flex-wrap gap-3">
              {(['Won', 'Lost', 'Under Evaluation', 'Cancelled'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  disabled={!canUserEditStage('Tender Team')}
                  onClick={() => setResultStatus(st)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition border ${
                    resultStatus === st
                      ? st === 'Won'
                        ? 'bg-emerald-400 text-white border-emerald-300 shadow-md shadow-emerald-400/20'
                        : st === 'Lost'
                        ? 'bg-rose-500 text-slate-900 border-rose-400'
                        : 'bg-amber-400 text-white border-amber-300'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Detailed Competitive Bidding Breakdown (L1, L2, L3) */}
          {resultStatus === 'Lost' && (
            <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-4">
              <h4 className="text-xs font-mono uppercase text-teal-800">
                Competitive Bidding Ranking & Market Prices (L1 / L2 / L3)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-700 font-medium">Winning Company (L1)</label>
                  <input
                    type="text"
                    disabled={!canUserEditStage('Tender Team')}
                    value={winnerCompany}
                    onChange={(e) => setWinnerCompany(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 border border-slate-250 text-xs text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-700 font-medium">L1 Winning Bid Price (₹)</label>
                  <input
                    type="number"
                    disabled={!canUserEditStage('Tender Team')}
                    value={winningPrice}
                    onChange={(e) => setWinningPrice(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-slate-50 border border-slate-250 text-xs text-slate-900 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-700 font-medium">Our Final Rank</label>
                  <input
                    type="text"
                    disabled={!canUserEditStage('Tender Team')}
                    value={ourRank}
                    onChange={(e) => setOurRank(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 border border-slate-250 text-xs text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-700 font-medium">L2 Company & Price (₹)</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      disabled={!canUserEditStage('Tender Team')}
                      value={l2Company}
                      onChange={(e) => setL2Company(e.target.value)}
                      className="w-1/2 p-2 rounded-lg bg-slate-50 border border-slate-250 text-xs text-slate-900"
                    />
                    <input
                      type="number"
                      disabled={!canUserEditStage('Tender Team')}
                      value={l2Price}
                      onChange={(e) => setL2Price(Number(e.target.value))}
                      className="w-1/2 p-2 rounded-lg bg-slate-50 border border-slate-250 text-xs text-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-700 font-medium">L3 Company & Price (₹)</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      disabled={!canUserEditStage('Tender Team')}
                      value={l3Company}
                      onChange={(e) => setL3Company(e.target.value)}
                      className="w-1/2 p-2 rounded-lg bg-slate-50 border border-slate-250 text-xs text-slate-900"
                    />
                    <input
                      type="number"
                      disabled={!canUserEditStage('Tender Team')}
                      value={l3Price}
                      onChange={(e) => setL3Price(Number(e.target.value))}
                      className="w-1/2 p-2 rounded-lg bg-slate-50 border border-slate-250 text-xs text-slate-900 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <label className="text-xs font-mono text-slate-700 font-medium">Primary Reason for Loss / Observations</label>
                <textarea
                  value={lostReason}
                  disabled={!canUserEditStage('Tender Team')}
                  onChange={(e) => setLostReason(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-250 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-700 font-medium">Lessons Learned & AI Strategy Takeaways</label>
                <textarea
                  value={lessonsLearned}
                  disabled={!canUserEditStage('Tender Team')}
                  onChange={(e) => setLessonsLearned(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-250 text-xs text-slate-900 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Action Button */}
          {canUserEditStage('Tender Team') && (
            <div className="flex justify-end pt-2">
              <button
                onClick={handleFinalizeStage6}
                className="flex items-center space-x-2 px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-white font-bold text-xs hover:brightness-110 transition shadow-xl shadow-emerald-400/20"
              >
                <Sparkles className="w-4 h-4" />
                <span>Finalize Result & Index into Company Knowledge Base</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* AUDIT TRAIL TIMELINE & HISTORY */}
      {/* ========================================== */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-teal-800 font-semibold" />
            <h3 className="font-display font-semibold text-base text-slate-900">
              Complete Audit Trail & Lifecycle Timeline (#TND-{activeTender.id})
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-700 font-medium">{activeTender.audit_trail.length} Logs Recorded</span>
        </div>

        <div className="space-y-3">
          {activeTender.audit_trail.map((log) => (
            <div key={log.id} className="p-4 rounded-xl bg-slate-50/60 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900">{log.user}</span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 font-mono text-[10px] border border-purple-200">
                    Dept: {log.department}
                  </span>
                  <span className="text-slate-700 font-medium font-mono">{log.timestamp}</span>
                </div>
                <p className="text-slate-800 font-medium font-medium">{log.action}</p>
                <p className="text-teal-800 font-mono text-[11px]">Next Action: {log.next_pending_action}</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold font-mono text-xs font-bold border border-emerald-200 self-start sm:self-center shrink-0">
                {log.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
