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
  ArrowUpRight,
  SlidersHorizontal,
  ChevronLeft,
  Users,
  ChevronDown,
  FileSpreadsheet,
  CheckSquare,
  Globe2,
  Radio,
  RefreshCw,
  Play,
  Square
} from 'lucide-react';
import { DepartmentRole } from '@/lib/types';
import { NavTab } from './Sidebar';

import overallTendersRaw from '@/data/overall_tenders.json';
import progressTrackerRaw from '@/data/progress_tracker.json';
import bidOrNoBidRaw from '@/data/bid_or_no_bid.json';
import omTendersRaw from '@/data/om_tenders.json';
import orderBookingRaw from '@/data/order_booking.json';
import trackerSummaryRaw from '@/data/tracker_summary.json';

export interface TrackedTender {
  id: string;
  nit_number: string;
  title: string;
  authority: string;
  state: string;
  district: string;
  sector: string;
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
  portal_url?: string;
  audit_logs?: {
    timestamp: string;
    actor: string;
    role: DepartmentRole;
    action: string;
    stage_changed_to: string;
    notes: string;
  }[];
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
    sector: 'JJM & Rural Water Supply',
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
    portal_url: 'https://eproc.rajasthan.gov.in'
  },
  {
    id: 'tr-002',
    nit_number: 'AMRUT-2.0/RAJ/SEWERAGE/44',
    title: 'RUDSICO Alwar Town Sewerage Scheme & 35.25 MLD SBR Sewage Treatment Plant',
    authority: 'RUDSICO Rajasthan Urban Infrastructure Project',
    state: 'Rajasthan',
    district: 'Alwar',
    sector: 'STP & Sewerage Network',
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
    portal_url: 'https://eproc.rajasthan.gov.in'
  },
  {
    id: 'tr-003',
    nit_number: 'REDA/KUSUM-B/2026/09',
    title: 'PM-Kusum Component-B Off-Grid Solar Pumping Systems (5000 Solar Pumps with RMS 4G)',
    authority: 'REDA Rajasthan Renewable Energy Corporation',
    state: 'Rajasthan',
    district: 'Jaipur / Jodhpur',
    sector: 'Solar & Renewable Energy',
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
    portal_url: 'https://energy.rajasthan.gov.in'
  },
  {
    id: 'tr-004',
    nit_number: 'UPJN/JJM/GORAKHPUR/2026/18',
    title: 'SWSM UP Jal Jeevan Mission Rural Water Supply & Water Treatment Works',
    authority: 'State Water & Sanitation Mission UP (SWSM)',
    state: 'Uttar Pradesh',
    district: 'Gorakhpur',
    sector: 'JJM & Rural Water Supply',
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
    portal_url: 'https://etender.up.nic.in'
  }
];

type SubViewType = 'overall' | 'progress' | 'bonb' | 'om' | 'order' | 'kanban';

interface TenderTrackerDashboardProps {
  tenders?: TrackedTender[];
  activeRole?: DepartmentRole;
  onNavigateTab?: (tab: NavTab) => void;
  onUpdateTendersList?: (updatedList: TrackedTender[]) => void;
  onSelectTenderForAnalysis?: (tender: any) => void;
}

export const TenderTrackerDashboard: React.FC<TenderTrackerDashboardProps> = ({
  tenders: propTenders,
  activeRole = 'Admin',
  onNavigateTab,
  onUpdateTendersList,
  onSelectTenderForAnalysis
}) => {
  const [activeSubView, setActiveSubView] = useState<SubViewType>('overall');
  const [trackerTenders, setTrackerTenders] = useState<TrackedTender[]>(propTenders || INITIAL_TRACKED_TENDERS);

  // Dynamic Overall Tenders with Live Govt Portal Ingestion
  const [allOverallTenders, setAllOverallTenders] = useState<any[]>(overallTendersRaw as any[]);

  // Overall Tenders Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('ALL');
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState<'value_desc' | 'value_asc' | 'due_date' | 'id'>('value_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Selected tender for details modal (bidders, etc.)
  const [inspectingTender, setInspectingTender] = useState<any | null>(null);

  // ─── GOVERNMENT PORTALS SCANNER MODAL STATE ───────────────────────────
  const [showGovtScannerModal, setShowGovtScannerModal] = useState(false);
  const [isScanningGovtPortals, setIsScanningGovtPortals] = useState(false);
  const [scannerStates, setScannerStates] = useState<string[]>(['Rajasthan', 'Haryana', 'Uttar Pradesh']);
  const [scannerKeywords, setScannerKeywords] = useState<string[]>([
    'Solar', 'STP or treatment', 'Water Supply', 'Sewerage', 'JJM', 'Irrigation', 'SCADA'
  ]);
  const [customKeywordInput, setCustomKeywordInput] = useState('');
  const [minThresholdCr, setMinThresholdCr] = useState<number>(10.0);
  const [discoveredScanResults, setDiscoveredScanResults] = useState<any[]>([]);
  const [scanStatusMessage, setScanStatusMessage] = useState<string>('');
  const [scanError, setScanError] = useState<string>('');

  const AVAILABLE_GOVT_PORTALS = [
    { name: 'Rajasthan', url: 'https://eproc.rajasthan.gov.in/nicgep/app' },
    { name: 'Haryana', url: 'https://etenders.hry.nic.in/nicgep/app' },
    { name: 'Uttar Pradesh', url: 'https://etender.up.nic.in/nicgep/app' },
    { name: 'Madhya Pradesh', url: 'https://mptenders.gov.in/nicgep/app' },
    { name: 'Delhi', url: 'https://govtprocurement.delhi.gov.in/nicgep/app' },
    { name: 'Maharashtra', url: 'https://mahatenders.gov.in/nicgep/app' },
    { name: 'Punjab', url: 'https://eproc.punjab.gov.in/nicgep/app' },
    { name: 'Odisha', url: 'https://tendersodisha.gov.in/nicgep/app' },
    { name: 'Tamil Nadu', url: 'https://tntenders.gov.in/nicgep/app' },
    { name: 'Central (All India)', url: 'https://etenders.gov.in/eprocure/app' }
  ];

  const KEYWORD_GROUP_PRESETS: Record<string, string[]> = {
    'Water Supply & JJM': ['Water Supply', 'Supply Scheme', 'RWSS', 'UWSS', 'WSS', 'Drinking Water', 'JJM', 'Turnkey', 'Augmentation', 'Amrut', 'Tubewell', 'Intake Well'],
    'STP & Wastewater': ['STP or treatment', 'FSTP', 'Sewerage', 'Sewer', 'Reuse', 'SBM', 'Swachh bharat mission', 'waste', 'CETP OR ETP', 'ZLD', 'TTP'],
    'Solar & Renewable': ['SOLAR', 'Solar Energy Based', 'Solar Based', 'SPV', 'Dual Pumps', 'Solar Pumps', 'Pumping System', 'Solar Based Micro Irrigation', 'REIL (CPPP)'],
    'Irrigation & Canal': ['Irrigation', 'Lift Irrigation', 'Micro Irrigation', 'PDN, PIPE DISTRIBUTION NETWORK', 'Canal'],
    'SCADA & Automation': ['SCADA', 'Automation', 'PLC', 'Centralized Water Management', 'IOT Based'],
    'ESCO & Efficiency': ['ESCO', 'Energy Efficient', 'PPP Model', 'Pumps']
  };

  const handleRunLivePortalScan = async () => {
    if (scannerStates.length === 0) {
      setScanError('Please select at least one State Portal.');
      return;
    }
    if (scannerKeywords.length === 0) {
      setScanError('Please select or enter at least one keyword.');
      return;
    }

    setIsScanningGovtPortals(true);
    setScanError('');
    setDiscoveredScanResults([]);
    setScanStatusMessage(`Connecting to ${scannerStates.join(', ')} portals with ${scannerKeywords.length} keywords (Threshold ≥ ₹${minThresholdCr} Cr)...`);

    try {
      const res = await fetch('/api/v1/scraper/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          states: scannerStates,
          keywords: scannerKeywords,
          min_value_cr: minThresholdCr,
          max_per_kw: 6,
          auto_update_tracker: true
        })
      });

      if (!res.ok) {
        throw new Error(`Scraper returned status ${res.status}`);
      }

      const data = await res.json();
      const discovered = data.tenders || [];
      setDiscoveredScanResults(discovered);

      if (discovered.length > 0) {
        setScanStatusMessage(`Scan Complete: Found ${discovered.length} high-value tenders (≥ ₹${minThresholdCr} Cr). Automatically updated Tracker!`);
        // Merge into local allOverallTenders state immediately
        setAllOverallTenders(prev => {
          const existingIds = new Set(prev.map(t => t.tender_id));
          const newOnes = discovered.filter((t: any) => !existingIds.has(t.tender_id));
          return [...newOnes, ...prev];
        });
      } else {
        setScanStatusMessage(`Scan Complete: All active tenders found in this cycle had value < ₹${minThresholdCr} Cr (filtered out by your rule).`);
      }
    } catch (err: any) {
      setScanError(`Scan Error: ${err.message || 'Failed to connect to government portals'}`);
    } finally {
      setIsScanningGovtPortals(false);
    }
  };

  const toggleScannerState = (stateName: string) => {
    setScannerStates(prev => 
      prev.includes(stateName) ? prev.filter(s => s !== stateName) : [...prev, stateName]
    );
  };

  const toggleScannerKeyword = (kw: string) => {
    setScannerKeywords(prev => 
      prev.includes(kw) ? prev.filter(k => k !== kw) : [...prev, kw]
    );
  };

  const addPresetKeywords = (kws: string[]) => {
    setScannerKeywords(prev => Array.from(new Set([...prev, ...kws])));
  };

  // Filter Overall Tenders
  const filteredOverallTenders = useMemo(() => {
    return allOverallTenders.filter(t => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = (t.tender_id || '').toLowerCase().includes(q);
        const matchTitle = (t.title || '').toLowerCase().includes(q);
        const matchDept = (t.department || '').toLowerCase().includes(q);
        const matchLoc = (t.location || '').toLowerCase().includes(q);
        const matchBidder = (t.bidders || []).some((b: string) => b.toLowerCase().includes(q));
        if (!matchId && !matchTitle && !matchDept && !matchLoc && !matchBidder) return false;
      }

      // State Filter
      if (selectedState !== 'ALL' && t.state !== selectedState) return false;

      // Sector Filter
      if (selectedSector !== 'ALL' && t.sector !== selectedSector) return false;

      // Status Filter
      if (selectedStatus !== 'ALL' && t.status !== selectedStatus) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'value_desc') return (b.value_cr || 0) - (a.value_cr || 0);
      if (sortBy === 'value_asc') return (a.value_cr || 0) - (b.value_cr || 0);
      if (sortBy === 'due_date') return (b.due_date || '').localeCompare(a.due_date || '');
      return (a.tender_id || '').localeCompare(b.tender_id || '');
    });
  }, [searchQuery, selectedState, selectedSector, selectedStatus, sortBy]);

  // Paginated overall tenders
  const totalPages = Math.max(1, Math.ceil(filteredOverallTenders.length / pageSize));
  const paginatedOverallTenders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOverallTenders.slice(start, start + pageSize);
  }, [filteredOverallTenders, currentPage, pageSize]);

  // States List with Counts
  const stateOptions = useMemo(() => {
    const counts = (trackerSummaryRaw as any).state_breakdown || {};
    const sorted = Object.entries(counts).sort((a: any, b: any) => b[1] - a[1]);
    return sorted;
  }, []);

  // Sector List with Counts
  const sectorOptions = useMemo(() => {
    const counts = (trackerSummaryRaw as any).sector_breakdown || {};
    return Object.entries(counts).sort((a: any, b: any) => b[1] - a[1]);
  }, []);

  // Status List with Counts
  const statusOptions = useMemo(() => {
    const counts = (trackerSummaryRaw as any).status_breakdown || {};
    return Object.entries(counts).sort((a: any, b: any) => b[1] - a[1]);
  }, []);

  const handleExportCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    const keys = Object.keys(data[0]).filter(k => k !== 'bidders');
    const csvRows = [];
    csvRows.push(keys.join(','));
    for (const row of data) {
      const values = keys.map(k => {
        const val = row[k] === null || row[k] === undefined ? '' : String(row[k]);
        return `"${val.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('live')) {
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
    }
    if (s.includes('financial')) {
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800';
    }
    if (s.includes('technical')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-800';
    }
    if (s.includes('aoc') || s.includes('awarded')) {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-300 dark:border-purple-800';
    }
    if (s.includes('cancel')) {
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800';
    }
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
  };

  const getPriorityBadge = (priority: string) => {
    const p = (priority || '').toLowerCase();
    if (p.includes('high')) return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300';
    if (p.includes('med')) return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300';
    return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ─── HEADER & METRICS BAR ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#064e3b] via-[#047857] to-[#0f766e] p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center space-x-2 text-emerald-200 text-xs font-mono uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
            <span>Desire Energy Solutions • Operational Tender Tracker</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Tender Bidding & Lifecycle Tracker
          </h1>
          <p className="text-emerald-100/90 text-sm mt-1 max-w-2xl">
            Live synchronization with Desire Energy&apos;s Master Tracker. Tracking 2,954 tenders across 27 Indian States, Active Workflows, Partner Consortia & Order Bookings.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto shrink-0 flex-wrap gap-y-2">
          <button
            onClick={() => setShowGovtScannerModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold flex items-center space-x-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
          >
            <Globe2 className="w-4 h-4 text-emerald-950 animate-pulse" />
            <span>Scan Govt Portals (≥ ₹10 Cr)</span>
          </button>
          <button
            onClick={() => handleExportCSV(filteredOverallTenders, 'Desire_Tender_Tracker_Export')}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('eligibility')}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center space-x-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Evaluation</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── TOP KPI SUMMARY TILES ──────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="glass-card bg-white dark:bg-[#0b1426] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase">Master Tenders</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {allOverallTenders.length.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">₹4,17,258 Cr Total Value</div>
        </div>

        <div className="glass-card bg-white dark:bg-[#0b1426] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 uppercase">Live & Opening</div>
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
            {((trackerSummaryRaw as any).status_breakdown?.['Live'] || 166) + ((trackerSummaryRaw as any).status_breakdown?.['Opening in Progress'] || 266)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Currently bidding</div>
        </div>

        <div className="glass-card bg-white dark:bg-[#0b1426] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-mono text-amber-600 dark:text-amber-400 uppercase">Financial Stages</div>
          <div className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-1">
            {((trackerSummaryRaw as any).status_breakdown?.['Financial Bid Opening'] || 523) + ((trackerSummaryRaw as any).status_breakdown?.['Financial Evaluation'] || 126)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">L1 Decision stage</div>
        </div>

        <div className="glass-card bg-white dark:bg-[#0b1426] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-mono text-purple-600 dark:text-purple-400 uppercase">Awarded (AOC)</div>
          <div className="text-xl font-bold text-purple-700 dark:text-purple-400 mt-1">
            {(trackerSummaryRaw as any).status_breakdown?.['Awarded (AOC)'] || 212}
          </div>
          <div className="text-[10px] text-purple-600/80 mt-0.5">Contracts finalized</div>
        </div>

        <div className="glass-card bg-white dark:bg-[#0b1426] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400 uppercase">Active Tasks</div>
          <div className="text-xl font-bold text-blue-700 dark:text-blue-400 mt-1">
            {(progressTrackerRaw as any[]).length}
          </div>
          <div className="text-[10px] text-blue-600/80 mt-0.5">Progress Pipeline</div>
        </div>

        <div className="glass-card bg-white dark:bg-[#0b1426] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 uppercase">Order Bookings</div>
          <div className="text-xl font-bold text-cyan-700 dark:text-cyan-400 mt-1">
            {(orderBookingRaw as any[]).length} Projects
          </div>
          <div className="text-[10px] text-cyan-600/80 mt-0.5">AFCONS / SWSM / PHED</div>
        </div>
      </div>

      {/* ─── EXCEL SHEET NAVIGATION TABS ─────────────────────────────── */}
      <div className="bg-white dark:bg-[#0b1426] p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center overflow-x-auto space-x-1">
        <button
          onClick={() => setActiveSubView('overall')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeSubView === 'overall'
              ? 'bg-[#064e3b] text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Master Tenders Directory</span>
          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${activeSubView === 'overall' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
            {(overallTendersRaw as any[]).length.toLocaleString()}
          </span>
        </button>

        <button
          onClick={() => setActiveSubView('progress')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeSubView === 'progress'
              ? 'bg-[#064e3b] text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4 text-amber-400" />
          <span>Live Progress Tracker</span>
          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${activeSubView === 'progress' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
            {(progressTrackerRaw as any[]).length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubView('bonb')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeSubView === 'bonb'
              ? 'bg-[#064e3b] text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-purple-400" />
          <span>Bid / No-Bid & Partners</span>
          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${activeSubView === 'bonb' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
            {(bidOrNoBidRaw as any[]).length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubView('om')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeSubView === 'om'
              ? 'bg-[#064e3b] text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4 text-cyan-400" />
          <span>O&M Tenders & Contracts</span>
          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${activeSubView === 'om' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
            {(omTendersRaw as any[]).length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubView('order')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeSubView === 'order'
              ? 'bg-[#064e3b] text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4 text-emerald-400" />
          <span>Order Booking Sheet</span>
          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${activeSubView === 'order' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
            {(orderBookingRaw as any[]).length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubView('kanban')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeSubView === 'kanban'
              ? 'bg-[#064e3b] text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-indigo-400" />
          <span>Kanban Pipeline</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SUB-VIEW 1: OVERALL TENDERS (MASTER DIRECTORY)                  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeSubView === 'overall' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="glass-card bg-white dark:bg-[#0b1426] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Search Box */}
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Tender ID, Name, Location, Department or Bidder..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* State Filter */}
              <div>
                <select
                  value={selectedState}
                  onChange={(e) => {
                    setSelectedState(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="ALL">All States ({overallTendersRaw.length})</option>
                  {stateOptions.map(([st, count]: any) => (
                    <option key={st} value={st}>{st} ({count})</option>
                  ))}
                </select>
              </div>

              {/* Sector Filter */}
              <div>
                <select
                  value={selectedSector}
                  onChange={(e) => {
                    setSelectedSector(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="ALL">All Sectors ({overallTendersRaw.length})</option>
                  {sectorOptions.map(([sec, count]: any) => (
                    <option key={sec} value={sec}>{sec} ({count})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-slate-500 font-medium">Status:</span>
                <div className="flex flex-wrap gap-1.5">
                  {['ALL', 'Live', 'Financial Bid Opening', 'Technical Evaluation', 'Awarded (AOC)', 'Opening in Progress', 'Cancelled', 'Archived'].map((st) => (
                    <button
                      key={st}
                      onClick={() => { setSelectedStatus(st); setCurrentPage(1); }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        selectedStatus === st
                          ? 'bg-[#064e3b] text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-3 text-slate-500 text-xs">
                <span>Showing <b>{filteredOverallTenders.length.toLocaleString()}</b> matching tenders</span>
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="value_desc">Value: High to Low</option>
                  <option value="value_asc">Value: Low to High</option>
                  <option value="due_date">Due Date</option>
                  <option value="id">Tender ID</option>
                </select>
              </div>
            </div>
          </div>

          {/* Master Table */}
          <div className="glass-card bg-white dark:bg-[#0b1426] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3 w-40">Tender ID</th>
                    <th className="p-3 min-w-[280px]">Tender Description & Location</th>
                    <th className="p-3 w-28">State</th>
                    <th className="p-3 w-28 text-right">Value (₹ Cr)</th>
                    <th className="p-3 w-32">Status</th>
                    <th className="p-3 w-28">Due Date</th>
                    <th className="p-3 w-24 text-center">Bidders</th>
                    <th className="p-3 w-32 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedOverallTenders.map((t: any, i) => (
                    <tr 
                      key={t.id} 
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="p-3 text-center text-slate-400 font-mono text-[11px]">
                        {(currentPage - 1) * pageSize + i + 1}
                      </td>

                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                        <div className="truncate max-w-[150px]" title={t.tender_id}>
                          {t.tender_id || '—'}
                        </div>
                        <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400 truncate" title={t.department}>
                          {t.department || '—'}
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100 line-clamp-2" title={t.title}>
                          {t.title}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {t.sector}
                          </span>
                          {t.location && (
                            <span className="text-[11px] text-slate-500 flex items-center space-x-0.5">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span className="truncate max-w-[160px]">{t.location}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {t.state}
                        </span>
                      </td>

                      <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {t.value_cr > 0 ? (
                          <>₹{t.value_cr.toFixed(2)} Cr</>
                        ) : t.amount_inr > 0 ? (
                          <>₹{(t.amount_inr / 10000000).toFixed(2)} Cr</>
                        ) : (
                          <span className="text-slate-400 font-normal">N/A</span>
                        )}
                      </td>

                      <td className="p-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(t.status)}`}>
                          {t.status}
                        </span>
                      </td>

                      <td className="p-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                        {t.due_date || '—'}
                      </td>

                      <td className="p-3 text-center">
                        {t.bidders && t.bidders.length > 0 ? (
                          <button
                            onClick={() => setInspectingTender(t)}
                            className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[11px] cursor-pointer"
                            title="View competing bidders"
                          >
                            <Users className="w-3 h-3 mr-1 text-slate-500" />
                            <span>{t.bidders.length}</span>
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {t.document_link ? (
                            <a
                              href={t.document_link}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                              title="Open Document / SharePoint"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ) : null}

                          <button
                            onClick={() => {
                              if (onSelectTenderForAnalysis) {
                                onSelectTenderForAnalysis(t);
                              } else if (onNavigateTab) {
                                onNavigateTab('eligibility');
                              }
                            }}
                            className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] flex items-center space-x-1 cursor-pointer"
                            title="Analyze Tender Eligibility with AI"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>AI Audit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {paginatedOverallTenders.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500">
                        No tenders found matching your search and filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-slate-500">
                Showing <b>{Math.min((currentPage - 1) * pageSize + 1, filteredOverallTenders.length)}</b> to{' '}
                <b>{Math.min(currentPage * pageSize, filteredOverallTenders.length)}</b> of{' '}
                <b>{filteredOverallTenders.length.toLocaleString()}</b> tenders
              </div>

              <div className="flex items-center space-x-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-slate-700 dark:text-slate-300 font-medium px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SUB-VIEW 2: LIVE PROGRESS TRACKER (29 ACTIVE WORKFLOW ITEMS)    */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeSubView === 'progress' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white dark:bg-[#0b1426] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Activity className="w-5 h-5 text-amber-500" />
                <span>Active Tender Bidding Progress Tracker</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Detailed action items, task dependencies, deadlines, and designated owners for high-priority pipeline tenders.
              </p>
            </div>
            <button
              onClick={() => handleExportCSV(progressTrackerRaw as any[], 'Desire_Progress_Tracker')}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {(progressTrackerRaw as any[]).map((item, idx) => (
              <div 
                key={item.id || idx}
                className="glass-card bg-white dark:bg-[#0b1426] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-emerald-500/40 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center space-x-3">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-xs border border-emerald-200 dark:border-emerald-800">
                      {item.tender_id || `Item #${item.sr_no}`}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {item.location_dept}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {item.priority && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPriorityBadge(item.priority)}`}>
                        {item.priority} Priority
                      </span>
                    )}
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {item.value_str || (item.value_cr > 0 ? `₹${item.value_cr} Cr` : '')}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {item.title}
                  </h3>
                  {item.category && (
                    <span className="inline-block mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Category: {item.category} • {item.entry_type || 'Tender'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">Activity / Task:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {item.activity_task || 'Costing / JV Alignment in progress'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">Owner / Lead:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center space-x-1">
                      <UserCheck className="w-3 h-3 text-emerald-500 mr-1" />
                      {item.owner || 'Tender Team'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">Submission Deadline:</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400 flex items-center space-x-1">
                      <Calendar className="w-3 h-3 mr-1" />
                      {item.deadline || 'Active'}
                    </span>
                  </div>
                </div>

                {(item.dependency || item.remarks) && (
                  <div className="text-xs text-slate-600 dark:text-slate-300 bg-amber-50/60 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-900/40">
                    {item.dependency && (
                      <div className="font-semibold text-amber-800 dark:text-amber-300">
                        Dependency: {item.dependency}
                      </div>
                    )}
                    {item.remarks && (
                      <div className="mt-0.5 text-slate-600 dark:text-slate-300">
                        Remarks: {item.remarks}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SUB-VIEW 3: BID OR NO BID & PARTNER MATRIX                      */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeSubView === 'bonb' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white dark:bg-[#0b1426] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-purple-500" />
                <span>Bid or No-Bid Decisions & Tender Results</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluation of standalone bidding vs Consortium/JV partnerships (DESPL + Divija Construction) with financial year tracking.
              </p>
            </div>
            <button
              onClick={() => handleExportCSV(bidOrNoBidRaw as any[], 'Desire_Bid_Or_No_Bid')}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>

          <div className="glass-card bg-white dark:bg-[#0b1426] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3 min-w-[200px]">Tender & Authority Scheme</th>
                    <th className="p-3 w-36">Tender ID</th>
                    <th className="p-3 w-28 text-right">Value (₹ Cr)</th>
                    <th className="p-3 w-32">Partnership</th>
                    <th className="p-3 w-28">Submission</th>
                    <th className="p-3 w-24">FY Year</th>
                    <th className="p-3 w-36">Current Status</th>
                    <th className="p-3 w-28">Updates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(bidOrNoBidRaw as any[]).map((item, i) => (
                    <tr key={item.id || i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                      <td className="p-3 text-center text-slate-400 font-mono text-[11px]">{i + 1}</td>
                      <td className="p-3 font-medium text-slate-900 dark:text-slate-100">
                        {item.state_desc}
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {item.tender_id}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {item.value_cr > 0 ? `₹${item.value_cr} Cr` : '—'}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.partners?.includes('DIVIJA')
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                        }`}>
                          {item.partners || 'DESPL'}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-500">
                        {item.submission_date || '—'}
                      </td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-300">
                        {item.fy_year || '—'}
                      </td>
                      <td className="p-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-700 dark:text-slate-200">
                        {item.updates || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SUB-VIEW 4: O&M CONTRACTS & TENDERS                             */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeSubView === 'om' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white dark:bg-[#0b1426] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Clock className="w-5 h-5 text-cyan-500" />
                <span>Operation & Maintenance (O&M) Contracts Directory</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Long-term 60 Months / 10-Year O&M tenders for water supply schemes, pumping machinery, head works, and treatment plants.
              </p>
            </div>
            <button
              onClick={() => handleExportCSV(omTendersRaw as any[], 'Desire_OM_Tenders')}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>

          <div className="glass-card bg-white dark:bg-[#0b1426] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3 w-32">Tender ID</th>
                    <th className="p-3 min-w-[280px]">O&M Scheme & Description</th>
                    <th className="p-3 w-28">O&M Period</th>
                    <th className="p-3 w-28">Location / State</th>
                    <th className="p-3 w-28 text-right">Value (₹ Cr)</th>
                    <th className="p-3 w-32">Department</th>
                    <th className="p-3 w-28">Status</th>
                    <th className="p-3 w-20 text-center">Docs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(omTendersRaw as any[]).map((item, i) => (
                    <tr key={item.id || i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                      <td className="p-3 text-center text-slate-400 font-mono text-[11px]">{i + 1}</td>
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                        {item.tender_id}
                      </td>
                      <td className="p-3 font-medium text-slate-900 dark:text-slate-100 line-clamp-2" title={item.title}>
                        {item.title}
                      </td>
                      <td className="p-3 font-semibold text-cyan-600 dark:text-cyan-400">
                        {item.om_period || '60 Months'}
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        {item.location ? `${item.location}, ${item.state}` : item.state}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {item.value_cr > 0 ? `₹${item.value_cr.toFixed(2)} Cr` : '—'}
                      </td>
                      <td className="p-3 text-slate-500 truncate max-w-[150px]" title={item.department}>
                        {item.department}
                      </td>
                      <td className="p-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {item.document_link ? (
                          <a
                            href={item.document_link}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 inline-block"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SUB-VIEW 5: ORDER BOOKING SHEET                                */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeSubView === 'order' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white dark:bg-[#0b1426] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Briefcase className="w-5 h-5 text-emerald-500" />
                <span>Order Booking Sheet & Financial Revenue Realization</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Client contracts, completed work vs remaining order booking across FY 2023-24, FY 2024-25, and FY 2025-26.
              </p>
            </div>
            <button
              onClick={() => handleExportCSV(orderBookingRaw as any[], 'Desire_Order_Booking')}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>

          <div className="glass-card bg-white dark:bg-[#0b1426] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3 min-w-[200px]">Client / Partner Entity</th>
                    <th className="p-3 min-w-[220px]">Name of Work & Scope</th>
                    <th className="p-3 w-28">Type</th>
                    <th className="p-3 w-24">State / Dept</th>
                    <th className="p-3 w-28 text-right">Work Done (₹ Cr)</th>
                    <th className="p-3 w-28 text-right">Order Booking</th>
                    <th className="p-3 w-20 text-center">FY 23-24</th>
                    <th className="p-3 w-20 text-center">FY 24-25</th>
                    <th className="p-3 w-20 text-center">FY 25-26</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(orderBookingRaw as any[]).map((item, i) => (
                    <tr key={item.id || i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                      <td className="p-3 text-center text-slate-400 font-mono text-[11px]">{i + 1}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {item.client || '—'}
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{item.name_of_work}</div>
                        {item.scope_of_work && (
                          <div className="text-[11px] text-slate-500">{item.scope_of_work}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                          {item.type || 'Automation'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300 font-medium">
                        {item.state} • {item.department}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {item.work_done_cr > 0 ? `₹${item.work_done_cr.toFixed(2)} Cr` : '—'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {item.order_booking_cr > 0 ? `₹${item.order_booking_cr.toFixed(2)} Cr` : '—'}
                      </td>
                      <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-400">{item.fy_23_24 || '—'}</td>
                      <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-400">{item.fy_24_25 || '—'}</td>
                      <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-400">{item.fy_25_26 || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SUB-VIEW 6: KANBAN WORKFLOW PIPELINE                            */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeSubView === 'kanban' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {WORKFLOW_STAGES.slice(0, 6).map((stage) => {
              const Icon = stage.icon;
              const stageTenders = trackerTenders.filter(t => t.stage === stage.id);
              const stageTotalCr = stageTenders.reduce((acc, curr) => acc + curr.estimated_cost_cr, 0);

              return (
                <div key={stage.id} className="bg-slate-50 dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col min-h-[380px]">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-3">
                    <div className="flex items-center space-x-2">
                      <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {stage.label}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {stageTenders.length}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 mb-3 font-mono">
                    Total Value: ₹{stageTotalCr.toFixed(2)} Cr
                  </div>

                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[480px]">
                    {stageTenders.map((t) => (
                      <div 
                        key={t.id}
                        className="bg-white dark:bg-[#1e293b] p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                            {t.nit_number}
                          </span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{t.estimated_cost_cr} Cr
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2">
                          {t.title}
                        </h4>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <span>{t.state}</span>
                          <span className="font-mono">Due: {t.due_date}</span>
                        </div>
                      </div>
                    ))}

                    {stageTenders.length === 0 && (
                      <div className="h-32 flex items-center justify-center text-slate-400 text-xs border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                        No tenders in this stage
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── MODAL: COMPETING BIDDERS INSPECTION ────────────────────── */}
      {inspectingTender && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0b1426] w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-emerald-600 dark:text-emerald-400 font-bold">
                  Competing Bidders Intelligence
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Tender: {inspectingTender.tender_id}
                </h3>
              </div>
              <button
                onClick={() => setInspectingTender(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                {inspectingTender.title}
              </div>
              <div className="text-[11px] text-slate-500">
                Department: {inspectingTender.department} • Value: ₹{inspectingTender.value_cr} Cr
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-mono uppercase text-slate-400">
                Registered Competing Bidders ({inspectingTender.bidders?.length || 0}):
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1.5 p-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                {inspectingTender.bidders?.map((bidder: string, idx: number) => (
                  <div 
                    key={idx}
                    className="p-2 bg-white dark:bg-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 font-medium flex items-center space-x-2"
                  >
                    <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <span>{bidder}</span>
                  </div>
                ))}
              </div>
            </div>

            {inspectingTender.l1_price_info && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-xs text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <b>L1 Price & Bidder Variations:</b>
                <div className="mt-0.5">{inspectingTender.l1_price_info}</div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setInspectingTender(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ─── MODAL: GOVERNMENT PORTALS LIVE SCANNER ─────────────────── */}
      {showGovtScannerModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#0b1426] w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-8">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-[#064e3b] via-[#047857] to-[#0f766e] text-white flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 text-xs font-mono text-emerald-200 uppercase font-semibold">
                  <Globe2 className="w-4 h-4 animate-spin-slow" />
                  <span>State Government GePNIC Portal Ingestion Engine</span>
                </div>
                <h3 className="text-xl font-bold mt-1">
                  Live Government Tender Scanner
                </h3>
                <p className="text-xs text-emerald-100/80 mt-1 max-w-xl">
                  Automated query against state e-Procurement portals. Extracts tender details, parses values, and enforces your strict rule: <b>Tender Value &ge; ₹10 Crores</b>.
                </p>
              </div>
              <button
                onClick={() => setShowGovtScannerModal(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Step 1: Select State Portals */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                    <span>1. Target Government Portals ({scannerStates.length} Selected)</span>
                  </label>
                  <div className="space-x-2">
                    <button
                      onClick={() => setScannerStates(AVAILABLE_GOVT_PORTALS.map(p => p.name))}
                      className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-400">•</span>
                    <button
                      onClick={() => setScannerStates(['Rajasthan', 'Haryana', 'Uttar Pradesh'])}
                      className="text-[11px] font-semibold text-slate-500 hover:underline cursor-pointer"
                    >
                      Reset (Top 3)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {AVAILABLE_GOVT_PORTALS.map(portal => {
                    const isSelected = scannerStates.includes(portal.name);
                    return (
                      <button
                        key={portal.name}
                        onClick={() => toggleScannerState(portal.name)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">{portal.name}</span>
                          {isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </div>
                        <span className="text-[9px] font-mono text-slate-400 truncate mt-1">
                          {portal.url.replace('https://', '').split('/')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Keywords Configuration */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    2. Operational Search Keywords ({scannerKeywords.length} Active)
                  </label>
                  <span className="text-[11px] text-slate-500">
                    From your <i>Tender Keywords.xlsx</i> protocol
                  </span>
                </div>

                {/* Preset Category Buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(KEYWORD_GROUP_PRESETS).map(([groupName, kws]) => (
                    <button
                      key={groupName}
                      onClick={() => addPresetKeywords(kws)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300 transition-all cursor-pointer flex items-center space-x-1"
                    >
                      <Plus className="w-3 h-3 text-emerald-600" />
                      <span>{groupName} ({kws.length})</span>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      const all = Object.values(KEYWORD_GROUP_PRESETS).flat();
                      setScannerKeywords(Array.from(new Set(all)));
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 transition-all cursor-pointer"
                  >
                    Load All 50 Keywords
                  </button>
                </div>

                {/* Active Keywords Tags */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap gap-1.5 min-h-[50px] max-h-36 overflow-y-auto">
                  {scannerKeywords.map(kw => (
                    <span
                      key={kw}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-medium"
                    >
                      <span>{kw}</span>
                      <button
                        onClick={() => toggleScannerKeyword(kw)}
                        className="text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Custom Keyword Input */}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={customKeywordInput}
                    onChange={(e) => setCustomKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customKeywordInput.trim()) {
                        e.preventDefault();
                        if (!scannerKeywords.includes(customKeywordInput.trim())) {
                          setScannerKeywords([...scannerKeywords, customKeywordInput.trim()]);
                        }
                        setCustomKeywordInput('');
                      }
                    }}
                    placeholder="Type custom keyword and press Enter (e.g., CETP, Micro Irrigation, AMRUT)..."
                    className="flex-1 px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => {
                      if (customKeywordInput.trim() && !scannerKeywords.includes(customKeywordInput.trim())) {
                        setScannerKeywords([...scannerKeywords, customKeywordInput.trim()]);
                        setCustomKeywordInput('');
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Step 3: Value Threshold Filter */}
              <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                    Minimum Tender Value Rule
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400">
                    Tenders with estimated value below this amount will be automatically discarded.
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">&ge; ₹</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="1000"
                    value={minThresholdCr}
                    onChange={(e) => setMinThresholdCr(parseFloat(e.target.value) || 10.0)}
                    className="w-20 px-2 py-1.5 rounded-lg text-sm font-bold text-center bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Crores</span>
                </div>
              </div>

              {/* Live Status and Execution Bar */}
              {scanStatusMessage && (
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                  {isScanningGovtPortals ? (
                    <RefreshCw className="w-4 h-4 text-emerald-500 animate-spin shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                  <span>{scanStatusMessage}</span>
                </div>
              )}

              {scanError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{scanError}</span>
                </div>
              )}

              {/* Discovered Tenders Results Table */}
              {discoveredScanResults.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">
                      Discovered High-Value Tenders (&ge; ₹{minThresholdCr} Cr) ({discoveredScanResults.length})
                    </span>
                    <span className="text-[11px] text-slate-400">Merged into Tracker</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                    {discoveredScanResults.map((item, idx) => (
                      <div key={idx} className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-850">
                        <div className="space-y-1 max-w-xl">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                              {item.tender_id}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              {item.state}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {item.sector}
                            </span>
                          </div>
                          <div className="text-xs text-slate-700 dark:text-slate-300 line-clamp-1">
                            {item.title}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Due: {item.due_date || 'N/A'} • Dept: {item.department}
                          </div>
                        </div>

                        <div className="text-right space-y-1 shrink-0 ml-4">
                          <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{item.value_cr} Cr
                          </div>
                          {onSelectTenderForAnalysis && (
                            <button
                              onClick={() => {
                                setShowGovtScannerModal(false);
                                onSelectTenderForAnalysis(item);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[10px] font-bold cursor-pointer"
                            >
                              AI Audit
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Portals: {scannerStates.length} • Keywords: {scannerKeywords.length} • Rule: &ge; ₹{minThresholdCr} Cr
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowGovtScannerModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={handleRunLivePortalScan}
                  disabled={isScanningGovtPortals}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isScanningGovtPortals ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Scanning Live Portals...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Launch Live Portal Scan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
