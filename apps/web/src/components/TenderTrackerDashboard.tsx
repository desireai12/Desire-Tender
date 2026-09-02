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
  MapPin
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
  { id: '1_IDENTIFIED', label: 'Identified / Discovered', icon: Search, color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  { id: '2_PRE_BID', label: 'Pre-Bid & Queries', icon: Clock3, color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  { id: '3_JV_ALIGNMENT', label: 'JV Alignment & Deed', icon: UserCheck, color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  { id: '4_EMD_COMPLIANCE', label: 'EMD & Docs Prepared', icon: ShieldAlert, color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' },
  { id: '5_SUBMITTED', label: 'Bid Submitted (e-Proc)', icon: Send, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  { id: '6_TECHNICAL_EVAL', label: 'Technical Scrutiny', icon: Activity, color: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800' },
  { id: '7_FINANCIAL_OPENING', label: 'Financial Opening (L1)', icon: BarChart3, color: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800' },
  { id: '8_AWARDED_WON', label: 'Awarded / LoA (Won)', icon: Trophy, color: 'bg-green-600 text-white font-bold border-green-700' },
  { id: '9_DROPPED', label: 'Dropped / Regretted', icon: XCircle, color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800' }
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
    setUpdateRemarks(tender.remarks);
    setUpdateNotes('');
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
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* ─── HEADER BANNER & KPI STATS ────────────────────────────────────────── */}
      <div className="glass-card bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-12 -translate-y-8">
          <Layers className="w-96 h-96 text-white" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                PAN-INDIA PROCUREMENT ENGINE
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
              Tender Bidding Tracker & Pipeline Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-medium">
              Track open tenders selected across India, monitor professional procurement stages, manage EMD deposits, and log department status updates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('india_tenders')}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition shadow-lg cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Select Pan-India Open Tenders</span>
              </button>
            )}
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 mt-6 border-t border-white/10">
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Total Pipeline Value</span>
              <IndianRupee className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white">
              ₹{kpis.totalPipelineValueCr.toFixed(2)} Cr
            </div>
            <div className="text-[10px] text-emerald-300 font-mono mt-0.5">
              Across {kpis.totalCount} selected tenders
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Bids Submitted</span>
              <Send className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {kpis.submittedCount} Tenders
            </div>
            <div className="text-[10px] text-cyan-300 font-mono mt-0.5">
              Active e-Procurement bids
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>EMD & BG Locked</span>
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white">
              ₹{kpis.emdLockedLakhs.toFixed(2)} Lakhs
            </div>
            <div className="text-[10px] text-amber-300 font-mono mt-0.5">
              Active Bank Guarantee / DDs
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Awarded / Won</span>
              <Trophy className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {kpis.wonCount} ({kpis.totalCount > 0 ? Math.round((kpis.wonCount / kpis.totalCount)*100) : 0}%)
            </div>
            <div className="text-[10px] text-emerald-300 font-mono mt-0.5">
              ₹{kpis.wonValueCr.toFixed(2)} Cr Won Value
            </div>
          </div>
        </div>
      </div>

      {/* ─── FILTERS & SEARCH BAR ────────────────────────────────────────────── */}
      <div className="glass-card bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tender title, NIT, authority, city..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-medium"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Sector Dropdown */}
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
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
              className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Workflow Stages</option>
              {WORKFLOW_STAGES.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('board')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${viewMode === 'board' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}
              >
                Kanban Pipeline
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${viewMode === 'table' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}
              >
                Table View
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── KANBAN BOARD VIEW ────────────────────────────────────────────────── */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-x-auto pb-4">
          {WORKFLOW_STAGES.map((stage) => {
            const StageIcon = stage.icon;
            const stageTenders = filteredTenders.filter(t => t.stage === stage.id);
            const totalStageValCr = stageTenders.reduce((acc, t) => acc + t.estimated_cost_cr, 0);

            return (
              <div 
                key={stage.id}
                className="flex flex-col rounded-2xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3 min-w-[280px]"
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
                  <div className="flex items-center space-x-2">
                    <div className={`p-1.5 rounded-lg border ${stage.color}`}>
                      <StageIcon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                        {stage.label}
                      </h3>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {stageTenders.length} {stageTenders.length === 1 ? 'tender' : 'tenders'}
                      </span>
                    </div>
                  </div>
                  {totalStageValCr > 0 && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                      ₹{totalStageValCr.toFixed(1)} Cr
                    </span>
                  )}
                </div>

                {/* Cards Container */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                  {stageTenders.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center text-slate-400 text-xs py-8 font-medium">
                      No tenders in this stage
                    </div>
                  ) : (
                    stageTenders.map((tender) => (
                      <div
                        key={tender.id}
                        className="glass-card bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition space-y-3 group"
                      >
                        {/* Title & NIT */}
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-mono text-emerald-800 dark:text-emerald-400 font-semibold mb-1">
                            <span className="truncate max-w-[170px]">{tender.nit_number}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold shrink-0">
                              {tender.state}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                            {tender.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                            {tender.authority}
                          </p>
                        </div>

                        {/* Values */}
                        <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs">
                          <div>
                            <span className="text-[9px] font-mono text-slate-600 dark:text-slate-400 block uppercase">Est. Value</span>
                            <span className="font-bold text-slate-900 dark:text-white font-mono">₹{tender.estimated_cost_cr} Cr</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-mono text-slate-600 dark:text-slate-400 block uppercase">EMD Deposit</span>
                            <span className="font-bold text-amber-800 dark:text-amber-400 font-mono">₹{tender.emd_lakhs} L</span>
                          </div>
                        </div>

                        {/* EMD & Department Status */}
                        <div className="flex items-center justify-between text-[10px] font-medium pt-1">
                          <span className={`px-2 py-0.5 rounded-full font-bold ${
                            tender.emd_status === 'Paid (DD/BG Issued)' 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                          }`}>
                            EMD: {tender.emd_status}
                          </span>

                          <span className="text-slate-600 dark:text-slate-400 font-semibold truncate max-w-[110px]">
                            👤 {tender.assigned_lead.split(' ')[0]}
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                          <button
                            onClick={() => handleOpenUpdateModal(tender)}
                            className="w-full flex items-center justify-center space-x-1 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Update Status & Notes</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── TABLE VIEW ──────────────────────────────────────────────────────── */}
      {viewMode === 'table' && (
        <div className="glass-card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[10px] uppercase">
                  <th className="p-3.5 font-bold">NIT & Title</th>
                  <th className="p-3.5 font-bold">Authority & Location</th>
                  <th className="p-3.5 font-bold">Sector</th>
                  <th className="p-3.5 font-bold">Est Value</th>
                  <th className="p-3.5 font-bold">EMD Deposit</th>
                  <th className="p-3.5 font-bold">Workflow Stage</th>
                  <th className="p-3.5 font-bold">Assigned Lead</th>
                  <th className="p-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
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
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="p-3.5 max-w-xs">
                          <div className="font-mono text-[10px] font-bold text-emerald-800 dark:text-emerald-400">{t.nit_number}</div>
                          <div className="font-bold text-slate-900 dark:text-white line-clamp-1 mt-0.5">{t.title}</div>
                        </td>
                        <td className="p-3.5 max-w-xs">
                          <div className="font-medium text-slate-700 dark:text-slate-300 truncate">{t.authority}</div>
                          <div className="text-[10px] text-slate-600 dark:text-slate-400">{t.district}, {t.state}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {t.sector}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">
                          ₹{t.estimated_cost_cr} Cr
                        </td>
                        <td className="p-3.5">
                          <div className="font-mono font-bold text-amber-800 dark:text-amber-400">₹{t.emd_lakhs} L</div>
                          <div className="text-[9px] text-slate-600 dark:text-slate-400">{t.emd_status}</div>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${stageObj?.color || ''}`}>
                            {stageObj?.label || t.stage}
                          </span>
                        </td>
                        <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300">
                          {t.assigned_lead}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleOpenUpdateModal(t)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-xs font-bold border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
                          >
                            Update
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

      {/* ─── STATUS UPDATE MODAL ──────────────────────────────────────────────── */}
      {editingTender && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="glass-card bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-emerald-900 to-teal-900 text-white flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  {editingTender.nit_number}
                </span>
                <h3 className="text-base font-bold text-white mt-1 line-clamp-1">
                  {editingTender.title}
                </h3>
                <p className="text-xs text-slate-300">
                  {editingTender.authority} • Est: ₹{editingTender.estimated_cost_cr} Cr
                </p>
              </div>
              <button onClick={() => setEditingTender(null)} className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveStatusUpdate} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Workflow Stage */}
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Procurement Workflow Stage *
                  </label>
                  <select
                    value={updateStage}
                    onChange={(e) => setUpdateStage(e.target.value as TrackedTender['stage'])}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {WORKFLOW_STAGES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* EMD Deposit Status */}
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    EMD Deposit Status
                  </label>
                  <select
                    value={updateEMDStatus}
                    onChange={(e) => setUpdateEMDStatus(e.target.value as TrackedTender['emd_status'])}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Pending">Pending EMD Payment</option>
                    <option value="Paid (DD/BG Issued)">Paid (DD / BG Issued)</option>
                    <option value="Exempted">Exempted under MSME / Class-A</option>
                    <option value="Refunded">Refunded by Department</option>
                  </select>
                </div>

                {/* Quoted Bid Cost */}
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Quoted Bid Amount (₹ Crores)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={updateQuotedCost}
                    onChange={(e) => setUpdateQuotedCost(Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* EMD Instrument Number */}
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    EMD DD / Bank Guarantee No.
                  </label>
                  <input
                    type="text"
                    value={updateEMDInst}
                    onChange={(e) => setUpdateEMDInst(e.target.value)}
                    placeholder="e.g. BG-KOTAK-99210-2026"
                    className="w-full text-xs font-mono px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Assigned Department */}
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Assigned Department
                  </label>
                  <select
                    value={updateDept}
                    onChange={(e) => setUpdateDept(e.target.value as DepartmentRole)}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
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
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Assigned Lead Officer
                  </label>
                  <input
                    type="text"
                    value={updateLead}
                    onChange={(e) => setUpdateLead(e.target.value)}
                    placeholder="e.g. Ankit Purohit (Head Tender)"
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  Current Tender Status Summary & Remarks
                </label>
                <textarea
                  rows={2}
                  value={updateRemarks}
                  onChange={(e) => setUpdateRemarks(e.target.value)}
                  placeholder="Enter current status summary..."
                  className="w-full text-xs px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Audit Log Note */}
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  Add Timestamped Audit Log Entry
                </label>
                <input
                  type="text"
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  placeholder="e.g. Uploaded digitally signed financial proposal to e-procurement portal."
                  className="w-full text-xs px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Previous Audit Logs History */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Audit History & Status Log</span>
                </h4>
                <div className="space-y-2 max-h-36 overflow-y-auto text-xs pr-1">
                  {editingTender.audit_logs.map((log, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{log.actor} ({log.role})</span>
                        <span>{log.timestamp}</span>
                      </div>
                      <div className="font-bold text-xs">{log.action}</div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{log.notes}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTender(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-md cursor-pointer flex items-center space-x-1.5"
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
