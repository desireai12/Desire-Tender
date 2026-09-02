'use client';

import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  Search, 
  Filter, 
  TrendingUp, 
  Building2, 
  Clock, 
  IndianRupee, 
  Calendar, 
  Sparkles, 
  Download, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Clock3, 
  FileText, 
  UserCheck, 
  ShieldAlert, 
  ArrowRight, 
  Edit3, 
  Eye, 
  Trophy, 
  XCircle, 
  Check, 
  Send, 
  ChevronRight, 
  X, 
  Bookmark, 
  Briefcase, 
  Activity, 
  BarChart3, 
  ExternalLink,
  MapPin,
  Flame,
  Zap,
  ArrowUpRight
} from 'lucide-react';
import { DepartmentRole } from '@/lib/types';
import { NavTab } from './Sidebar';

export interface TrackedTender {
  id: string;
  nit_number: string;
  title: string;
  authority: string;
  state: string;
  district: string;
  sector: 'JJM & Rural Water' | 'Solar & Renewable' | 'STP & Wastewater' | 'Water Transmission & Pipelines' | 'Urban Infra & Smart Water' | 'Canal & Lift Irrigation' | 'ESCO & Energy Efficiency';
  estimated_cost_cr: number;
  quoted_bid_cost_cr?: number;
  emd_lakhs: number;
  emd_status: 'Pending' | 'Paid (DD/BG Issued)' | 'Exempted' | 'Refunded';
  emd_instrument_no?: string;
  due_date: string;
  submission_date?: string;
  stage: 
    | '1_IDENTIFIED'
    | '2_PRE_BID'
    | '3_JV_ALIGNMENT'
    | '4_EMD_COMPLIANCE'
    | '5_SUBMITTED'
    | '6_TECHNICAL_EVAL'
    | '7_FINANCIAL_OPENING'
    | '8_AWARDED_WON'
    | '9_DROPPED';
  assigned_department: DepartmentRole;
  assigned_lead: string;
  win_probability_pct: number;
  jv_partner_needed: boolean;
  jv_partner_name?: string;
  remarks: string;
  audit_logs: {
    timestamp: string;
    actor: string;
    role: DepartmentRole;
    action: string;
    stage_changed_to: string;
    notes: string;
  }[];
  portal_url?: string;
}

export const WORKFLOW_STAGES = [
  { id: '1_IDENTIFIED', stepIndex: 1, label: 'Identified / Discovered', icon: Search, badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-800', barColor: 'bg-blue-500' },
  { id: '2_PRE_BID', stepIndex: 2, label: 'Pre-Bid & Queries', icon: Clock3, badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800', barColor: 'bg-amber-500' },
  { id: '3_JV_ALIGNMENT', stepIndex: 3, label: 'JV Alignment & Deed', icon: UserCheck, badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-800', barColor: 'bg-purple-500' },
  { id: '4_EMD_COMPLIANCE', stepIndex: 4, label: 'EMD & Docs Prepared', icon: ShieldAlert, badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800', barColor: 'bg-indigo-500' },
  { id: '5_SUBMITTED', stepIndex: 5, label: 'Bid Submitted (e-Proc)', icon: Send, badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800', barColor: 'bg-emerald-500' },
  { id: '6_TECHNICAL_EVAL', stepIndex: 6, label: 'Technical Scrutiny', icon: Activity, badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800', barColor: 'bg-cyan-500' },
  { id: '7_FINANCIAL_OPENING', stepIndex: 7, label: 'Financial Opening (L1)', icon: BarChart3, badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border-teal-300 dark:border-teal-800', barColor: 'bg-teal-500' },
  { id: '8_AWARDED_WON', stepIndex: 8, label: 'Awarded / LoA (Won)', icon: Trophy, badgeColor: 'bg-emerald-600 text-white border-emerald-700', barColor: 'bg-emerald-600' },
  { id: '9_DROPPED', stepIndex: 9, label: 'Dropped / Regretted', icon: XCircle, badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800', barColor: 'bg-rose-500' }
];

export const INITIAL_TRACKED_TENDERS: TrackedTender[] = [
  {
    id: 'tr-001',
    nit_number: 'NIB-01/2026-27/PHED-BALOTRA',
    title: 'Jal Jeevan Mission Balotra Rural Water Supply Scheme Package IV (HDPE Pipeline & 5 OHSRs)',
    authority: 'PHED Public Health Engineering Department Rajasthan',
    state: 'Rajasthan',
    district: 'Balotra',
    sector: 'JJM & Rural Water',
    estimated_cost_cr: 142.50,
    quoted_bid_cost_cr: 138.80,
    emd_lakhs: 285.00,
    emd_status: 'Paid (DD/BG Issued)',
    emd_instrument_no: 'BG-KOTAK-99210-2026',
    due_date: '2026-09-18',
    submission_date: '2026-09-01',
    stage: '5_SUBMITTED',
    assigned_department: 'Tender Team',
    assigned_lead: 'Ankit Purohit (Head Tender)',
    win_probability_pct: 88,
    jv_partner_needed: false,
    remarks: 'Bid successfully uploaded to Rajasthan e-Procurement portal. Acknowledgement receipt generated.',
    audit_logs: [
      {
        timestamp: '2026-09-01 16:45:00',
        actor: 'Ankit Purohit',
        role: 'Tender Team',
        action: 'Bid Submitted',
        stage_changed_to: 'Bid Submitted (e-Procurement)',
        notes: 'Submitted online with digitally signed financial proposal. Quoted ₹138.80 Cr (2.6% discount).'
      },
      {
        timestamp: '2026-08-28 11:20:00',
        actor: 'Deepak Khandelwal',
        role: 'Estimation Team',
        action: 'EMD Bank Guarantee Issued',
        stage_changed_to: 'EMD & Docs Prepared',
        notes: 'Kotak Mahindra Bank BG of ₹285 Lakhs attached.'
      }
    ],
    portal_url: 'https://eproc.rajasthan.gov.in'
  },
  {
    id: 'tr-002',
    nit_number: 'AMRUT-2.0/RAJ/SEWERAGE/44',
    title: 'RUDSICO Alwar Town Sewerage Scheme & 35.25 MLD SBR Sewage Treatment Plant',
    authority: 'RUDSICO Rajasthan Urban Infrastructure Project',
    state: 'Rajasthan',
    district: 'Alwar',
    sector: 'STP & Wastewater',
    estimated_cost_cr: 36.53,
    quoted_bid_cost_cr: 35.10,
    emd_lakhs: 73.06,
    emd_status: 'Paid (DD/BG Issued)',
    emd_instrument_no: 'DD-SBI-001248',
    due_date: '2026-09-12',
    stage: '3_JV_ALIGNMENT',
    assigned_department: 'Management',
    assigned_lead: 'Dharmesh Khandelwal (Director)',
    win_probability_pct: 75,
    jv_partner_needed: true,
    jv_partner_name: 'Divija Construction (49% Share)',
    remarks: 'JV Deed executed with Divija Construction to bridge technical sewerage gap. Solvency attached.',
    audit_logs: [
      {
        timestamp: '2026-08-30 14:00:00',
        actor: 'Dharmesh Khandelwal',
        role: 'Management',
        action: 'JV Deed Signed',
        stage_changed_to: 'JV Alignment & Deed',
        notes: 'Formed 51:49 JV with Divija Construction to satisfy 35 MLD SBR experience clause.'
      }
    ],
    portal_url: 'https://eproc.rajasthan.gov.in'
  },
  {
    id: 'tr-003',
    nit_number: 'REDA/KUSUM-B/2026/09',
    title: 'PM-Kusum Component-B Off-Grid Solar Pumping Systems (5000 Solar Pumps with RMS 4G)',
    authority: 'REDA Rajasthan Renewable Energy Corporation',
    state: 'Rajasthan',
    district: 'Jaipur / Jodhpur',
    sector: 'Solar & Renewable',
    estimated_cost_cr: 94.00,
    quoted_bid_cost_cr: 89.50,
    emd_lakhs: 188.00,
    emd_status: 'Paid (DD/BG Issued)',
    emd_instrument_no: 'BG-ICICI-44102-2026',
    due_date: '2026-09-25',
    stage: '2_PRE_BID',
    assigned_department: 'Engineering',
    assigned_lead: 'Suresh Sharma (Chief Eng)',
    win_probability_pct: 92,
    jv_partner_needed: false,
    remarks: 'Pre-bid queries regarding Sunaquator 4G telemetry RMS protocols submitted to REDA.',
    audit_logs: [
      {
        timestamp: '2026-08-25 10:30:00',
        actor: 'Suresh Sharma',
        role: 'Engineering',
        action: 'Pre-Bid Queries Submitted',
        stage_changed_to: 'Pre-Bid & Queries',
        notes: 'Clarification sought on BIS pump efficiency certification dates.'
      }
    ],
    portal_url: 'https://energy.rajasthan.gov.in'
  },
  {
    id: 'tr-004',
    nit_number: 'UPJN/JJM/GORAKHPUR/2026/18',
    title: 'SWSM UP Jal Jeevan Mission Rural Water Supply & Water Treatment Works',
    authority: 'State Water & Sanitation Mission UP (SWSM)',
    state: 'Uttar Pradesh',
    district: 'Gorakhpur',
    sector: 'JJM & Rural Water',
    estimated_cost_cr: 215.00,
    emd_lakhs: 430.00,
    emd_status: 'Pending',
    due_date: '2026-10-05',
    stage: '1_IDENTIFIED',
    assigned_department: 'Business Development',
    assigned_lead: 'Vikas Verma (Tender Head)',
    win_probability_pct: 65,
    jv_partner_needed: false,
    remarks: 'Identified from Pan-India Open Tenders database. Eligibility analysis in progress.',
    audit_logs: [
      {
        timestamp: '2026-09-02 11:00:00',
        actor: 'Vikas Verma',
        role: 'Tender Team',
        action: 'Tender Selected for Bidding',
        stage_changed_to: 'Identified / Discovered',
        notes: 'Selected from Pan-India Tenders list. High strategic value (₹215 Cr).'
      }
    ],
    portal_url: 'https://etender.up.nic.in'
  }
];

interface TenderTrackerDashboardProps {
  tenders?: TrackedTender[];
  activeRole?: DepartmentRole;
  onNavigateTab?: (tab: NavTab) => void;
  onUpdateTendersList?: (updatedList: TrackedTender[]) => void;
}

export const TenderTrackerDashboard: React.FC<TenderTrackerDashboardProps> = ({
  tenders: propTenders,
  activeRole = 'Admin',
  onNavigateTab,
  onUpdateTendersList
}) => {
  const [trackerTenders, setTrackerTenders] = useState<TrackedTender[]>(propTenders || INITIAL_TRACKED_TENDERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');

  // Modal State for Updating Status
  const [editingTender, setEditingTender] = useState<TrackedTender | null>(null);
  const [updateStage, setUpdateStage] = useState<TrackedTender['stage']>('1_IDENTIFIED');
  const [updateQuotedCost, setUpdateQuotedCost] = useState<number>(0);
  const [updateEMDStatus, setUpdateEMDStatus] = useState<TrackedTender['emd_status']>('Pending');
  const [updateEMDInst, setUpdateEMDInst] = useState<string>('');
  const [updateLead, setUpdateLead] = useState<string>('');
  const [updateDept, setUpdateDept] = useState<DepartmentRole>('Tender Team');
  const [updateWinProb, setUpdateWinProb] = useState<number>(75);
  const [updateRemarks, setUpdateRemarks] = useState<string>('');
  const [updateNotes, setUpdateNotes] = useState<string>('');

  // Synchronize when props update
  React.useEffect(() => {
    if (propTenders && propTenders.length > 0) {
      setTrackerTenders(propTenders);
    }
  }, [propTenders]);

  const handleOpenUpdateModal = (tender: TrackedTender) => {
    setEditingTender(tender);
    setUpdateStage(tender.stage);
    setUpdateQuotedCost(tender.quoted_bid_cost_cr || tender.estimated_cost_cr);
    setUpdateEMDStatus(tender.emd_status);
    setUpdateEMDInst(tender.emd_instrument_no || '');
    setUpdateLead(tender.assigned_lead);
    setUpdateDept(tender.assigned_department);
    setUpdateWinProb(tender.win_probability_pct || 75);
    setUpdateRemarks(tender.remarks);
    setUpdateNotes('');
  };

  const handleAdvanceNextStage = (tender: TrackedTender, e: React.MouseEvent) => {
    e.stopPropagation();
    const currStageIndex = WORKFLOW_STAGES.findIndex(s => s.id === tender.stage);
    if (currStageIndex >= 0 && currStageIndex < WORKFLOW_STAGES.length - 2) {
      const nextStageObj = WORKFLOW_STAGES[currStageIndex + 1];
      const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

      const newLog = {
        timestamp,
        actor: activeRole || 'Department User',
        role: activeRole,
        action: `Quick Advanced to ${nextStageObj.label}`,
        stage_changed_to: nextStageObj.label,
        notes: `Advanced tender stage from ${WORKFLOW_STAGES[currStageIndex].label} to ${nextStageObj.label}.`
      };

      const updated: TrackedTender = {
        ...tender,
        stage: nextStageObj.id as TrackedTender['stage'],
        audit_logs: [newLog, ...tender.audit_logs]
      };

      const nextList = trackerTenders.map(t => t.id === updated.id ? updated : t);
      setTrackerTenders(nextList);
      if (onUpdateTendersList) onUpdateTendersList(nextList);
    }
  };

  const handleSaveStatusUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTender) return;

    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const stageObj = WORKFLOW_STAGES.find(s => s.id === updateStage);

    const newLog = {
      timestamp,
      actor: updateLead || 'Department User',
      role: activeRole,
      action: `Status Updated to ${stageObj?.label || updateStage}`,
      stage_changed_to: stageObj?.label || updateStage,
      notes: updateNotes.trim() || updateRemarks.trim() || 'Updated stage and details.'
    };

    const updated: TrackedTender = {
      ...editingTender,
      stage: updateStage,
      quoted_bid_cost_cr: Number(updateQuotedCost),
      emd_status: updateEMDStatus,
      emd_instrument_no: updateEMDInst.trim(),
      assigned_lead: updateLead.trim(),
      assigned_department: updateDept,
      win_probability_pct: Number(updateWinProb),
      remarks: updateRemarks.trim(),
      audit_logs: [newLog, ...editingTender.audit_logs]
    };

    const nextList = trackerTenders.map(t => t.id === updated.id ? updated : t);
    setTrackerTenders(nextList);
    if (onUpdateTendersList) onUpdateTendersList(nextList);
    setEditingTender(null);
  };

  // Filter Tenders
  const filteredTenders = useMemo(() => {
    return trackerTenders.filter(t => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        t.title.toLowerCase().includes(q) ||
        t.nit_number.toLowerCase().includes(q) ||
        t.authority.toLowerCase().includes(q) ||
        t.state.toLowerCase().includes(q) ||
        t.district.toLowerCase().includes(q);
      
      const matchesSector = selectedSector === 'ALL' || t.sector === selectedSector;
      const matchesStage = selectedStage === 'ALL' || t.stage === selectedStage;
      const matchesState = selectedState === 'ALL' || t.state === selectedState;

      return matchesSearch && matchesSector && matchesStage && matchesState;
    });
  }, [trackerTenders, searchQuery, selectedSector, selectedStage, selectedState]);

  // Analytics KPIs
  const kpis = useMemo(() => {
    const totalCount = trackerTenders.length;
    const totalPipelineValueCr = trackerTenders.reduce((acc, t) => acc + t.estimated_cost_cr, 0);
    const submittedCount = trackerTenders.filter(t => ['5_SUBMITTED', '6_TECHNICAL_EVAL', '7_FINANCIAL_OPENING', '8_AWARDED_WON'].includes(t.stage)).length;
    const emdLockedLakhs = trackerTenders.filter(t => t.emd_status === 'Paid (DD/BG Issued)').reduce((acc, t) => acc + t.emd_lakhs, 0);
    const wonTenders = trackerTenders.filter(t => t.stage === '8_AWARDED_WON');
    const wonValueCr = wonTenders.reduce((acc, t) => acc + (t.quoted_bid_cost_cr || t.estimated_cost_cr), 0);

    return {
      totalCount,
      totalPipelineValueCr,
      submittedCount,
      emdLockedLakhs,
      wonCount: wonTenders.length,
      wonValueCr
    };
  }, [trackerTenders]);

  const handleExportCSV = () => {
    const headers = ['NIT Number', 'Tender Title', 'Authority', 'State', 'Sector', 'Est Cost (Cr)', 'Quoted Cost (Cr)', 'EMD (Lakhs)', 'EMD Status', 'Current Stage', 'Assigned Lead', 'Remarks'];
    const rows = filteredTenders.map(t => [
      `"${t.nit_number}"`,
      `"${t.title.replace(/"/g, '""')}"`,
      `"${t.authority}"`,
      `"${t.state}"`,
      `"${t.sector}"`,
      t.estimated_cost_cr,
      t.quoted_bid_cost_cr || '',
      t.emd_lakhs,
      `"${t.emd_status}"`,
      `"${WORKFLOW_STAGES.find(s => s.id === t.stage)?.label || t.stage}"`,
      `"${t.assigned_lead}"`,
      `"${(t.remarks || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Desire_Tender_Bidding_Tracker_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn text-slate-900 dark:text-slate-100 font-sans">
      {/* ─── EXECUTIVE BANNER & KPI STATS ────────────────────────────────────── */}
      <div className="bg-[#064e3b] dark:bg-[#06172e] text-white p-6 sm:p-7 rounded-3xl shadow-xl relative overflow-hidden border border-emerald-700 dark:border-slate-800">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-12 -translate-y-8">
          <Layers className="w-96 h-96 text-emerald-300" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 tracking-wider">
                ⚡ DYNAMIC BIDDING TRACKER & PIPELINE
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Pan-India Tender Bidding Dashboard
            </h1>
            <p className="text-xs text-emerald-100 dark:text-slate-200 max-w-2xl font-normal leading-relaxed">
              Track open tenders selected across India, manage EMD/BG instruments, log professional stage transitions, and analyze win margins.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('india_tenders')}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold transition-all shadow-md hover:scale-[1.01] cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Select Pan-India Tenders</span>
              </button>
            )}
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/20 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV Report</span>
            </button>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 mt-6 border-t border-white/15">
          <div className="p-4 rounded-2xl bg-[#022c22] dark:bg-slate-800/90 border border-emerald-500/30 dark:border-slate-700 text-white shadow-sm">
            <div className="flex items-center justify-between text-emerald-200 dark:text-slate-300 text-xs font-semibold mb-1">
              <span>Total Pipeline Value</span>
              <IndianRupee className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
              ₹{kpis.totalPipelineValueCr.toFixed(2)} Cr
            </div>
            <div className="text-[11px] text-emerald-300 font-medium font-mono mt-1">
              Across {kpis.totalCount} selected tenders
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#022c22] dark:bg-slate-800/90 border border-emerald-500/30 dark:border-slate-700 text-white shadow-sm">
            <div className="flex items-center justify-between text-cyan-200 dark:text-slate-300 text-xs font-semibold mb-1">
              <span>Bids Submitted</span>
              <Send className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
              {kpis.submittedCount} Tenders
            </div>
            <div className="text-[11px] text-cyan-300 font-medium font-mono mt-1">
              Active e-Procurement bids
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#022c22] dark:bg-slate-800/90 border border-emerald-500/30 dark:border-slate-700 text-white shadow-sm">
            <div className="flex items-center justify-between text-amber-200 dark:text-slate-300 text-xs font-semibold mb-1">
              <span>EMD & BG Locked</span>
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
              ₹{kpis.emdLockedLakhs.toFixed(2)} L
            </div>
            <div className="text-[11px] text-amber-300 font-medium font-mono mt-1">
              Bank Guarantees & DDs
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#022c22] dark:bg-slate-800/90 border border-emerald-500/30 dark:border-slate-700 text-white shadow-sm">
            <div className="flex items-center justify-between text-emerald-200 dark:text-slate-300 text-xs font-semibold mb-1">
              <span>Awarded / Won</span>
              <Trophy className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
              {kpis.wonCount} ({kpis.totalCount > 0 ? Math.round((kpis.wonCount / kpis.totalCount)*100) : 0}%)
            </div>
            <div className="text-[11px] text-emerald-300 font-medium font-mono mt-1">
              ₹{kpis.wonValueCr.toFixed(2)} Cr Contract Value
            </div>
          </div>
        </div>
      </div>

      {/* ─── CONTROLS & CLEAN FILTERS ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 text-slate-900 dark:text-slate-100">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tender title, NIT, authority, city..."
              className="w-full pl-10 pr-9 py-2 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Sector Dropdown */}
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Sectors</option>
              <option value="JJM & Rural Water">JJM & Rural Water</option>
              <option value="Solar & Renewable">Solar & Renewable</option>
              <option value="STP & Wastewater">STP & Wastewater</option>
              <option value="Water Transmission & Pipelines">Water Transmission</option>
            </select>

            {/* Stage Dropdown */}
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Workflow Stages</option>
              {WORKFLOW_STAGES.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>

            {/* Layout Toggle */}
            <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('board')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${viewMode === 'board' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'}`}
              >
                Kanban
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${viewMode === 'table' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'}`}
              >
                Table List
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SLEEK FLUID KANBAN BOARD VIEW ────────────────────────────────────── */}
      {viewMode === 'board' && (
        <div className="flex overflow-x-auto gap-4 pb-6 pt-1 w-full min-w-full custom-scrollbar">
          {WORKFLOW_STAGES.map((stage) => {
            const StageIcon = stage.icon;
            const stageTenders = filteredTenders.filter(t => t.stage === stage.id);
            const totalStageValCr = stageTenders.reduce((acc, t) => acc + t.estimated_cost_cr, 0);

            return (
              <div 
                key={stage.id}
                className="flex flex-col rounded-2xl bg-slate-50/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 p-3.5 w-[320px] shrink-0 shadow-xs hover:shadow-md transition"
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
                  <div className="flex items-center space-x-2">
                    <div className={`p-1.5 rounded-lg border font-bold ${stage.badgeColor}`}>
                      <StageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                        {stage.label}
                      </h3>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-medium">
                        {stageTenders.length} {stageTenders.length === 1 ? 'tender' : 'tenders'}
                      </span>
                    </div>
                  </div>

                  {totalStageValCr > 0 && (
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      ₹{totalStageValCr.toFixed(1)} Cr
                    </span>
                  )}
                </div>

                {/* Cards Container */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[620px] pr-1">
                  {stageTenders.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 dark:text-slate-500 text-xs py-10 font-medium">
                      No tenders in this stage
                    </div>
                  ) : (
                    stageTenders.map((tender) => {
                      const currStageIndex = WORKFLOW_STAGES.findIndex(s => s.id === tender.stage);
                      const isWinning = tender.stage === '8_AWARDED_WON';

                      return (
                        <div
                          key={tender.id}
                          className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs hover:shadow-md hover:border-emerald-500 dark:hover:border-emerald-400 transition duration-200 space-y-3 group relative"
                        >
                          {/* Top Bar: NIT & State */}
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="truncate max-w-[160px] bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                              {tender.nit_number}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium shrink-0 border border-slate-200 dark:border-slate-600">
                              {tender.state}
                            </span>
                          </div>

                          {/* Title & Authority */}
                          <div>
                            <h4 className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2 leading-relaxed group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                              {tender.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 flex items-center space-x-1">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{tender.authority}</span>
                            </p>
                          </div>

                          {/* Financial Metric Box */}
                          <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/60 text-xs">
                            <div>
                              <span className="text-[9px] font-mono text-slate-400 uppercase font-semibold block">
                                Est. Value
                              </span>
                              <span className="font-bold text-slate-900 dark:text-white font-mono text-xs">
                                ₹{tender.estimated_cost_cr} Cr
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] font-mono text-slate-400 uppercase font-semibold block">
                                EMD Deposit
                              </span>
                              <span className="font-bold text-amber-700 dark:text-amber-300 font-mono text-xs">
                                ₹{tender.emd_lakhs} L
                              </span>
                            </div>
                          </div>

                          {/* Win Probability Bar */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-300 font-medium">
                              <span>Win Probability</span>
                              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{tender.win_probability_pct}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                style={{ width: `${tender.win_probability_pct}%` }}
                              />
                            </div>
                          </div>

                          {/* EMD & Lead Officer */}
                          <div className="flex items-center justify-between text-[11px] pt-0.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                              tender.emd_status === 'Paid (DD/BG Issued)' 
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            }`}>
                              {tender.emd_status}
                            </span>

                            <span className="text-slate-600 dark:text-slate-300 text-[11px] font-medium truncate max-w-[120px]">
                              👤 {tender.assigned_lead.split(' ')[0]}
                            </span>
                          </div>

                          {/* Action Bar */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                            <button
                              onClick={() => handleOpenUpdateModal(tender)}
                              className="flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition cursor-pointer shadow-2xs"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Update Status & Notes</span>
                            </button>

                            {currStageIndex < WORKFLOW_STAGES.length - 2 && !isWinning && (
                              <button
                                onClick={(e) => handleAdvanceNextStage(tender, e)}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-emerald-600 hover:text-white text-slate-600 dark:text-slate-300 transition cursor-pointer"
                                title="Advance to Next Stage"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── CLEAN TABLE VIEW ────────────────────────────────────────────────── */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden text-slate-900 dark:text-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-wider font-semibold">
                  <th className="p-3.5">NIT & Title</th>
                  <th className="p-3.5">Authority & Location</th>
                  <th className="p-3.5">Sector</th>
                  <th className="p-3.5">Est Value</th>
                  <th className="p-3.5">EMD Deposit</th>
                  <th className="p-3.5">Workflow Stage</th>
                  <th className="p-3.5">Assigned Lead</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTenders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                      No matching tender bidding trackers found.
                    </td>
                  </tr>
                ) : (
                  filteredTenders.map(t => {
                    const stageObj = WORKFLOW_STAGES.find(s => s.id === t.stage);
                    return (
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                        <td className="p-3.5 max-w-xs">
                          <div className="font-mono text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">{t.nit_number}</div>
                          <div className="font-semibold text-slate-900 dark:text-white line-clamp-1 mt-0.5">{t.title}</div>
                        </td>
                        <td className="p-3.5 max-w-xs">
                          <div className="font-medium text-slate-800 dark:text-slate-200 truncate">{t.authority}</div>
                          <div className="text-[10px] text-slate-500">{t.district}, {t.state}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {t.sector}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">
                          ₹{t.estimated_cost_cr} Cr
                        </td>
                        <td className="p-3.5">
                          <div className="font-mono font-bold text-amber-700 dark:text-amber-400">₹{t.emd_lakhs} L</div>
                          <div className="text-[10px] text-slate-500">{t.emd_status}</div>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${stageObj?.badgeColor || ''}`}>
                            {stageObj?.label || t.stage}
                          </span>
                        </td>
                        <td className="p-3.5 font-medium text-slate-800 dark:text-slate-200">
                          {t.assigned_lead}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleOpenUpdateModal(t)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition cursor-pointer"
                          >
                            Update Status
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── STATUS UPDATE & AUDIT LOG MODAL ──────────────────────────────────── */}
      {editingTender && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 text-slate-900 dark:text-slate-100">
            {/* Modal Header */}
            <div className="p-5 bg-[#064e3b] dark:bg-[#06172e] text-white flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-semibold uppercase px-2.5 py-0.5 rounded bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                  {editingTender.nit_number}
                </span>
                <h3 className="text-base font-bold text-white mt-1 line-clamp-1">
                  {editingTender.title}
                </h3>
                <p className="text-xs text-emerald-100 dark:text-slate-300 font-medium">
                  {editingTender.authority} • Est: ₹{editingTender.estimated_cost_cr} Cr
                </p>
              </div>
              <button onClick={() => setEditingTender(null)} className="p-1.5 rounded-lg text-white/80 hover:bg-white/10 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveStatusUpdate} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-slate-900 dark:text-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Workflow Stage */}
                <div>
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                    Procurement Workflow Stage *
                  </label>
                  <select
                    value={updateStage}
                    onChange={(e) => setUpdateStage(e.target.value as TrackedTender['stage'])}
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {WORKFLOW_STAGES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* EMD Deposit Status */}
                <div>
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                    EMD Deposit Status
                  </label>
                  <select
                    value={updateEMDStatus}
                    onChange={(e) => setUpdateEMDStatus(e.target.value as TrackedTender['emd_status'])}
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Pending">Pending EMD Payment</option>
                    <option value="Paid (DD/BG Issued)">Paid (DD / BG Issued)</option>
                    <option value="Exempted">Exempted under MSME / Class-A</option>
                    <option value="Refunded">Refunded by Department</option>
                  </select>
                </div>

                {/* Quoted Bid Cost */}
                <div>
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                    Quoted Bid Amount (₹ Crores)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={updateQuotedCost}
                    onChange={(e) => setUpdateQuotedCost(Number(e.target.value))}
                    className="w-full text-xs font-mono font-semibold px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* EMD Instrument Number */}
                <div>
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                    EMD DD / Bank Guarantee No.
                  </label>
                  <input
                    type="text"
                    value={updateEMDInst}
                    onChange={(e) => setUpdateEMDInst(e.target.value)}
                    placeholder="e.g. BG-KOTAK-99210-2026"
                    className="w-full text-xs font-mono font-medium px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Assigned Department */}
                <div>
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                    Assigned Department
                  </label>
                  <select
                    value={updateDept}
                    onChange={(e) => setUpdateDept(e.target.value as DepartmentRole)}
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Tender Team">Tender Team</option>
                    <option value="Estimation Team">Estimation Team</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Business Development">Business Development</option>
                    <option value="Management">Management</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>

                {/* Assigned Lead */}
                <div>
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                    Assigned Lead Officer
                  </label>
                  <input
                    type="text"
                    value={updateLead}
                    onChange={(e) => setUpdateLead(e.target.value)}
                    placeholder="e.g. Ankit Purohit (Head Tender)"
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                  Current Tender Status Summary & Remarks
                </label>
                <textarea
                  rows={2}
                  value={updateRemarks}
                  onChange={(e) => setUpdateRemarks(e.target.value)}
                  placeholder="Enter current status summary..."
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Audit Log Note */}
              <div>
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                  Add Timestamped Audit Log Entry
                </label>
                <input
                  type="text"
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  placeholder="e.g. Uploaded digitally signed financial proposal to e-procurement portal."
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Audit Logs History */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>Audit History & Status Log</span>
                </h4>
                <div className="space-y-2 max-h-36 overflow-y-auto text-xs pr-1">
                  {editingTender.audit_logs.map((log, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-0.5">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">{log.actor} ({log.role})</span>
                        <span>{log.timestamp}</span>
                      </div>
                      <div className="font-semibold text-xs text-slate-900 dark:text-white">{log.action}</div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">{log.notes}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTender(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-md cursor-pointer flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Status Update</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
