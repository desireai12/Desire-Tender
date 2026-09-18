'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Workflow, 
  Search, 
  RefreshCw, 
  ExternalLink, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  User, 
  Filter, 
  X,
  ArrowRight,
  ArrowLeft,
  ChevronDown, 
  Info, 
  Building2, 
  MapPin, 
  Check,
  Lock,
  Unlock,
  Save,
  Trash2,
  Mail,
  FileText,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import { BidFlowItem, BidFlowStatus, BidFlowFinalStatus, UserProfile } from '@/lib/types';

interface BidFlowBoardProps {
  currentUser?: UserProfile | null;
  onSelectBidForDetail?: (bid: BidFlowItem) => void;
}

const STAGES: { id: BidFlowStatus; label: string; dotColor: string; badgeBg: string; badgeText: string; desc: string }[] = [
  {
    id: 'Live',
    label: 'Live',
    dotColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60',
    badgeText: 'text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    desc: 'Newly captured & active tenders preparing pre-bid/bid'
  },
  {
    id: 'Technical Bid Opening',
    label: 'Technical Bid Opening',
    dotColor: 'bg-blue-500',
    badgeBg: 'bg-blue-100 dark:bg-blue-950/60',
    badgeText: 'text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    desc: 'Bids undergoing technical qualification'
  },
  {
    id: 'Financial Bid Opening',
    label: 'Financial Bid Opening',
    dotColor: 'bg-amber-500',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/60',
    badgeText: 'text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    desc: 'Commercial stage — opening financial bids for L1'
  },
  {
    id: 'Opening in progress',
    label: 'Opening in progress',
    dotColor: 'bg-purple-500',
    badgeBg: 'bg-purple-100 dark:bg-purple-950/60',
    badgeText: 'text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    desc: 'Evaluation committee processing bids'
  },
  {
    id: 'Cancelled',
    label: 'Cancelled',
    dotColor: 'bg-rose-500',
    badgeBg: 'bg-rose-100 dark:bg-rose-950/60',
    badgeText: 'text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    desc: 'Tenders scrapped or annulled'
  }
];

export const FINAL_STATUS_OPTIONS: { id: BidFlowFinalStatus; label: string; desc: string }[] = [
  { id: 'L1', label: 'L1 (Lowest Bidder)', desc: 'Lowest qualified commercial bidder' },
  { id: 'L2', label: 'L2 (Second Lowest)', desc: 'Second lowest bidder position' },
  { id: 'L3', label: 'L3', desc: 'Third bidder position' },
  { id: 'L4', label: 'L4', desc: 'Fourth bidder position' },
  { id: 'L5', label: 'L5', desc: 'Fifth bidder position' },
  { id: 'L6', label: 'L6', desc: 'Sixth bidder position' },
  { id: 'L7', label: 'L7', desc: 'Seventh bidder position' },
  { id: 'L8', label: 'L8', desc: 'Eighth bidder position' },
  { id: 'L9', label: 'L9', desc: 'Ninth bidder position' },
  { id: 'L10', label: 'L10', desc: 'Tenth bidder position' },
  { id: 'Matching to L1', label: 'Matching to L1', desc: 'Exercising MSE / Make-in-India price match' },
  { id: 'DESPL', label: 'DESPL', desc: 'Awarded directly to Desire Energy Solutions Pvt Ltd' },
  { id: 'Rejected-Technical', label: 'Rejected-Technical', desc: 'Disqualified at technical qualification scrutiny' },
  { id: 'Technical rejected due to BG', label: 'Technical rejected due to BG', desc: 'Disqualified due to EMD or Bank Guarantee defect' }
];

export const KNOWN_RESPONSIBLE_PERSONS = [
  { name: 'Rishi Sharma', email: 'rishi@desireenergy.com', role: 'Head Bidding' },
  { name: 'Ankit Purohit', email: 'ankit.purohit@desireenergy.com', role: 'Head Tender' },
  { name: 'Dharmesh Khandelwal', email: 'tenders@desireenergy.com', role: 'Director' },
  { name: 'Gaurav Khandelwal', email: 'gaurav@desireenergy.com', role: 'Managing Director' },
  { name: 'Estimation Lead', email: 'estimation@desireenergy.com', role: 'Costing Team' }
];

export const isFinalStatusAllowed = (status: BidFlowStatus): boolean => {
  return status === 'Financial Bid Opening' || status === 'Opening in progress' || status === 'Cancelled';
};

export const formatForDateTimeInput = (isoOrStr?: string | null): string => {
  if (!isoOrStr) return '';
  try {
    const d = new Date(isoOrStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return '';
  }
};

let moduleDraggedBidId: string | null = null;

export const BidFlowBoard: React.FC<BidFlowBoardProps> = ({ currentUser, onSelectBidForDetail }) => {
  const [bids, setBids] = useState<BidFlowItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>('ALL');
  const [draggedBidId, setDraggedBidId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<BidFlowStatus | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Step 2: Detail Panel State
  const [selectedBidForEdit, setSelectedBidForEdit] = useState<BidFlowItem | null>(null);
  const [editForm, setEditForm] = useState<{
    status: BidFlowStatus;
    final_status: BidFlowFinalStatus | null | '';
    pre_bid_meeting_date: string;
    bid_submission_deadline: string;
    responsible_person_name: string;
    responsible_person_email: string;
    cc_emails: string[];
    notes: string;
  }>({
    status: 'Live',
    final_status: null,
    pre_bid_meeting_date: '',
    bid_submission_deadline: '',
    responsible_person_name: '',
    responsible_person_email: '',
    cc_emails: [],
    notes: ''
  });
  const [newCcEmail, setNewCcEmail] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchBids = async () => {
    try {
      setErrorMessage('');
      const res = await fetch('/api/v1/bid-flow');
      if (!res.ok) {
        throw new Error(`Failed to load bid flows: HTTP ${res.status}`);
      }
      const json = await res.json();
      setBids(json.data || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error fetching Bid Flow data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBids();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchBids();
  };

  // Days remaining calculation
  const getDaysRemainingInfo = (item: BidFlowItem) => {
    const dates: { date: Date; label: string }[] = [];
    if (item.pre_bid_meeting_date) {
      const d = new Date(item.pre_bid_meeting_date);
      if (!isNaN(d.getTime())) dates.push({ date: d, label: 'Pre-bid' });
    }
    if (item.bid_submission_deadline) {
      const d = new Date(item.bid_submission_deadline);
      if (!isNaN(d.getTime())) dates.push({ date: d, label: 'Deadline' });
    }

    if (dates.length === 0 && item.deadline) {
      const d = new Date(item.deadline);
      if (!isNaN(d.getTime())) {
        dates.push({ date: d, label: 'Due' });
      }
    }

    if (dates.length === 0) return null;

    dates.sort((a, b) => a.date.getTime() - b.date.getTime());
    const nearest = dates[0];
    const now = new Date();
    const diffMs = nearest.date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return {
      days: diffDays,
      label: nearest.label,
      dateFormatted: nearest.date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
    };
  };

  // State options
  const uniqueStates = useMemo(() => {
    const set = new Set<string>();
    bids.forEach(b => { if (b.state) set.add(b.state); });
    return Array.from(set).sort();
  }, [bids]);

  // Filtered bids
  const filteredBids = useMemo(() => {
    return bids.filter(item => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mTitle = (item.tender_title || '').toLowerCase().includes(q);
        const mId = (item.tender_id || '').toLowerCase().includes(q);
        const mAuth = (item.authority || '').toLowerCase().includes(q);
        const mPerson = (item.responsible_person_name || '').toLowerCase().includes(q);
        if (!mTitle && !mId && !mAuth && !mPerson) return false;
      }
      if (selectedStateFilter !== 'ALL' && item.state !== selectedStateFilter) {
        return false;
      }
      return true;
    });
  }, [bids, searchQuery, selectedStateFilter]);

  // Group bids by stage
  const bidsByStage = useMemo(() => {
    const map: Record<BidFlowStatus, BidFlowItem[]> = {
      'Live': [],
      'Technical Bid Opening': [],
      'Financial Bid Opening': [],
      'Opening in progress': [],
      'Cancelled': []
    };
    filteredBids.forEach(item => {
      if (map[item.status]) {
        map[item.status].push(item);
      } else {
        map['Live'].push(item);
      }
    });
    return map;
  }, [filteredBids]);

  // KPI Calculations
  const kpiStats = useMemo(() => {
    const totalCount = bids.length;
    const totalValueCr = bids.reduce((acc, b) => acc + (b.estimated_value_cr || 0), 0);
    const liveCount = bids.filter(b => b.status === 'Live').length;
    const technicalCount = bids.filter(b => b.status === 'Technical Bid Opening').length;
    const financialCount = bids.filter(b => b.status === 'Financial Bid Opening').length;
    const openingCount = bids.filter(b => b.status === 'Opening in progress').length;
    return { totalCount, totalValueCr, liveCount, technicalCount, financialCount, openingCount };
  }, [bids]);

  // Update status function (shared by Drag & Drop and Quick Move)
  const updateBidStatus = async (bidId: string, newStatus: BidFlowStatus) => {
    const bid = bids.find(b => b.id === bidId);
    if (!bid || bid.status === newStatus) return;

    // Optimistically update local state immediately
    setBids(prev => prev.map(b => b.id === bidId ? { ...b, status: newStatus } : b));
    if (selectedBidForEdit && selectedBidForEdit.id === bidId) {
      setSelectedBidForEdit(prev => prev ? { ...prev, status: newStatus } : null);
      setEditForm(prev => ({ ...prev, status: newStatus }));
    }
    setToastMessage(`Moved ${bid.tender_id} to "${newStatus}"`);
    setTimeout(() => setToastMessage(null), 3500);

    try {
      const res = await fetch(`/api/v1/bid-flow/${bidId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) {
        throw new Error('Database update failed');
      }
    } catch (err: any) {
      setToastMessage(`Failed to update stage: ${err.message}`);
      fetchBids();
    }
  };

  // Step 2: Open Card Detail Panel
  const openCardDetailPanel = (bid: BidFlowItem) => {
    setSelectedBidForEdit(bid);
    setEditForm({
      status: bid.status,
      final_status: bid.final_status || null,
      pre_bid_meeting_date: formatForDateTimeInput(bid.pre_bid_meeting_date),
      bid_submission_deadline: formatForDateTimeInput(bid.bid_submission_deadline || bid.deadline),
      responsible_person_name: bid.responsible_person_name || '',
      responsible_person_email: bid.responsible_person_email || '',
      cc_emails: Array.isArray(bid.cc_emails) ? [...bid.cc_emails] : [],
      notes: bid.notes || ''
    });
    setNewCcEmail('');
    if (onSelectBidForDetail) onSelectBidForDetail(bid);
  };

  // Step 2: Save Card Details
  const handleSaveBidDetails = async () => {
    if (!selectedBidForEdit) return;
    setIsSaving(true);
    try {
      const allowedFinal = isFinalStatusAllowed(editForm.status);
      const payload: Partial<BidFlowItem> = {
        status: editForm.status,
        final_status: allowedFinal ? ((editForm.final_status as BidFlowFinalStatus) || null) : null,
        pre_bid_meeting_date: editForm.pre_bid_meeting_date ? new Date(editForm.pre_bid_meeting_date).toISOString() : null,
        bid_submission_deadline: editForm.bid_submission_deadline ? new Date(editForm.bid_submission_deadline).toISOString() : null,
        responsible_person_name: editForm.responsible_person_name || 'Unassigned',
        responsible_person_email: editForm.responsible_person_email || null,
        cc_emails: editForm.cc_emails || [],
        notes: editForm.notes || null,
      };

      const res = await fetch(`/api/v1/bid-flow/${selectedBidForEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        throw new Error(`Failed to save details: HTTP ${res.status}`);
      }

      // Update state locally
      setBids(prev => prev.map(b => b.id === selectedBidForEdit.id ? { ...b, ...payload } : b));
      setSelectedBidForEdit(prev => prev ? { ...prev, ...payload } : null);
      setToastMessage(`Saved details for ${selectedBidForEdit.tender_id}`);
      setTimeout(() => setToastMessage(null), 3500);
      setSelectedBidForEdit(null);
    } catch (err: any) {
      setToastMessage(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Step 2: Delete / Remove from Bid Flow
  const handleDeleteBid = async () => {
    if (!selectedBidForEdit) return;
    if (!window.confirm(`Are you sure you want to remove tender "${selectedBidForEdit.tender_id}" from Bid Flow?`)) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/v1/bid-flow/${selectedBidForEdit.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        throw new Error('Failed to delete tender from Bid Flow');
      }
      setBids(prev => prev.filter(b => b.id !== selectedBidForEdit.id));
      setToastMessage(`Removed ${selectedBidForEdit.tender_id} from Bid Flow`);
      setTimeout(() => setToastMessage(null), 3500);
      setSelectedBidForEdit(null);
    } catch (err: any) {
      setToastMessage(`Delete failed: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Add CC email
  const handleAddCcEmail = () => {
    const trimmed = newCcEmail.trim().toLowerCase();
    if (!trimmed) return;
    if (!trimmed.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }
    if (editForm.cc_emails.includes(trimmed)) {
      setNewCcEmail('');
      return;
    }
    setEditForm(prev => ({
      ...prev,
      cc_emails: [...prev.cc_emails, trimmed]
    }));
    setNewCcEmail('');
  };

  // Remove CC email
  const handleRemoveCcEmail = (idx: number) => {
    setEditForm(prev => ({
      ...prev,
      cc_emails: prev.cc_emails.filter((_, i) => i !== idx)
    }));
  };

  // HTML5 Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, bidId: string) => {
    moduleDraggedBidId = bidId;
    e.dataTransfer.setData('text/plain', bidId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedBidId(bidId);
  };

  const handleDragEnd = () => {
    moduleDraggedBidId = null;
    setDraggedBidId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, stage: BidFlowStatus) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== stage) {
      setDragOverColumn(stage);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetStage: BidFlowStatus) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverColumn(null);
    const bidId = e.dataTransfer.getData('text/plain') || moduleDraggedBidId || draggedBidId;
    moduleDraggedBidId = null;
    setDraggedBidId(null);
    if (bidId) {
      updateBidStatus(bidId, targetStage);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ─── HEADER BANNER (MATCHING OPERATIONAL TRACKER THEME) ─────── */}
      <div className="bg-gradient-to-r from-[#064e3b] via-[#047857] to-[#0f766e] text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-emerald-800/40">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-emerald-200 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
            <Workflow className="w-4 h-4 text-emerald-300" />
            <span>Desire Energy Solutions • Bidding Pipeline Workflow</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Bid Flow Pipeline
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 font-normal max-w-2xl leading-relaxed">
            Live stage-by-stage Kanban tracking for tenders added from Government Portal Scraper. Drag cards between columns or use the stage switcher to update stages, monitor submission deadlines, and coordinate team notifications.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/25 text-white text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Board</span>
          </button>
        </div>
      </div>

      {/* ─── KPI SUMMARY TILES (MATCHING DASHBOARD STYLING) ───────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-[#0b1426] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400">Total in Flow</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {kpiStats.totalCount}
          </div>
          <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
            ₹{kpiStats.totalValueCr.toFixed(2)} Cr Pipeline
          </div>
        </div>

        <div className="bg-white dark:bg-[#0b1426] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-mono uppercase font-bold text-emerald-700 dark:text-emerald-400">Live Bids</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {kpiStats.liveCount}
          </div>
          <div className="text-[10px] font-medium text-slate-500 mt-0.5">Preparing submission</div>
        </div>

        <div className="bg-white dark:bg-[#0b1426] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-mono uppercase font-bold text-blue-700 dark:text-blue-400">Technical Opening</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {kpiStats.technicalCount}
          </div>
          <div className="text-[10px] font-medium text-slate-500 mt-0.5">Compliance review</div>
        </div>

        <div className="bg-white dark:bg-[#0b1426] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-mono uppercase font-bold text-amber-700 dark:text-amber-400">Financial Opening</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {kpiStats.financialCount}
          </div>
          <div className="text-[10px] font-medium text-slate-500 mt-0.5">L1 Decision phase</div>
        </div>

        <div className="bg-white dark:bg-[#0b1426] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-mono uppercase font-bold text-purple-700 dark:text-purple-400">In Progress</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {kpiStats.openingCount}
          </div>
          <div className="text-[10px] font-medium text-slate-500 mt-0.5">Evaluating tenders</div>
        </div>

        <div className="bg-white dark:bg-[#0b1426] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-mono uppercase font-bold text-slate-600 dark:text-slate-400">States Covered</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {uniqueStates.length}
          </div>
          <div className="text-[10px] font-medium text-slate-500 mt-0.5">Active jurisdictions</div>
        </div>
      </div>

      {/* ─── CONTROLS & FILTER BAR ────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0b1426] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search tender ID, title, authority, assignee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-8 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500"
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

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <Filter className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">State:</span>
          <select
            value={selectedStateFilter}
            onChange={(e) => setSelectedStateFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="ALL">All States ({bids.length})</option>
            {uniqueStates.map(st => (
              <option key={st} value={st}>
                {st} ({bids.filter(b => b.state === st).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ─── KANBAN BOARD COLUMNS ─────────────────────────────────── */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-[#0b1426] rounded-2xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Loading Bid Flow Pipeline...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {STAGES.map(stage => {
            const stageBids = bidsByStage[stage.id] || [];
            const isColumnOver = dragOverColumn === stage.id;
            const stageValueCr = stageBids.reduce((acc, b) => acc + (b.estimated_value_cr || 0), 0);

            return (
              <div
                key={stage.id}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragEnter={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
                className={`flex flex-col min-h-[520px] rounded-2xl p-3.5 transition-all duration-150 border-2 ${
                  isColumnOver
                    ? 'bg-emerald-100/60 dark:bg-emerald-950/60 border-emerald-600 shadow-lg scale-[1.01]'
                    : 'bg-slate-100/90 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${stage.dotColor}`} />
                      <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        {stage.label}
                      </h3>
                    </div>
                    <div className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400">
                      ₹{stageValueCr.toFixed(1)} Cr
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 shadow-sm">
                    {stageBids.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[680px] pr-0.5">
                  {stageBids.map(bid => {
                    const daysInfo = getDaysRemainingInfo(bid);
                    const isUrgent = daysInfo && daysInfo.days < 3;
                    const isUpcoming = daysInfo && daysInfo.days >= 3 && daysInfo.days < 7;

                    return (
                      <div
                        key={bid.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, bid.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => openCardDetailPanel(bid)}
                        className={`p-3.5 rounded-xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-emerald-500 dark:hover:border-emerald-500 transition-all cursor-grab active:cursor-grabbing space-y-2 group select-none ${
                          draggedBidId === bid.id ? 'opacity-40 ring-2 ring-emerald-500' : ''
                        }`}
                      >
                        {/* Card Top: Tender ID & State */}
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono font-bold text-slate-900 dark:text-white truncate max-w-[130px]" title={bid.tender_id}>
                            {bid.tender_id}
                          </span>
                          <span className="px-2 py-0.5 rounded font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[10px]">
                            {bid.state || 'India'}
                          </span>
                        </div>

                        {/* Title: High Contrast Black/White */}
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-tight group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                          {bid.tender_title}
                        </h4>

                        {/* Authority */}
                        {bid.authority && (
                          <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate" title={bid.authority}>
                            {bid.authority}
                          </div>
                        )}

                        {/* Value & Final Status */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                          <span className="font-mono font-black text-emerald-800 dark:text-emerald-400 text-sm">
                            {bid.estimated_value_cr > 0 ? `₹${bid.estimated_value_cr.toFixed(2)} Cr` : '—'}
                          </span>

                          {bid.final_status && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              {bid.final_status}
                            </span>
                          )}
                        </div>

                        {/* Assignee & Days Remaining */}
                        <div className="flex items-center justify-between text-[11px] pt-0.5">
                          <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            <span className="font-semibold truncate max-w-[90px]" title={bid.responsible_person_name || 'Unassigned'}>
                              {bid.responsible_person_name || 'Unassigned'}
                            </span>
                          </div>

                          {/* Days remaining badge */}
                          {daysInfo ? (
                            <span
                              className={`px-2 py-0.5 rounded-md font-black text-[10px] flex items-center space-x-1 ${
                                isUrgent
                                  ? 'bg-rose-100 text-rose-900 border border-rose-300 animate-pulse'
                                  : isUpcoming
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              }`}
                              title={`${daysInfo.label} on ${daysInfo.dateFormatted}`}
                            >
                              <Clock className="w-2.5 h-2.5" />
                              <span>{daysInfo.days <= 0 ? 'Due' : `${daysInfo.days}d`}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-slate-400">No deadline</span>
                          )}
                        </div>

                        {/* Quick Stage Move Dropdown (Clickable fallback for drag & drop) */}
                        <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-[10px]" onClick={(e) => e.stopPropagation()}>
                          <span className="text-slate-500 font-semibold">Move:</span>
                          <select
                            value={bid.status}
                            onChange={(e) => updateBidStatus(bid.id, e.target.value as BidFlowStatus)}
                            className="px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold cursor-pointer text-[10px]"
                          >
                            {STAGES.map(s => (
                              <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}

                  {stageBids.length === 0 && (
                    <div className="h-32 flex flex-col items-center justify-center text-slate-400 text-xs border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-3 text-center">
                      <span className="text-xs font-bold text-slate-500">No bids in {stage.label}</span>
                      <span className="text-[10px] text-slate-400 mt-1">Drag cards or use dropdown</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── STEP 2: CARD DETAIL PANEL (FULL EDITABLE MODAL) ─────────────── */}
      {selectedBidForEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#0b1426] w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-7 space-y-6 animate-in zoom-in-95 duration-150">
            
            {/* Header with Title & Badges */}
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                    Bid Flow Detail Panel
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-mono">
                    {selectedBidForEdit.state || 'India'}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-mono">
                  {selectedBidForEdit.tender_id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBidForEdit(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tender Summary Banner */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                {selectedBidForEdit.tender_title}
              </h4>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-slate-200/70 dark:border-slate-800">
                <div className="text-slate-600 dark:text-slate-400 truncate max-w-md">
                  Authority: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedBidForEdit.authority || 'N/A'}</span>
                </div>
                <div className="text-base font-mono font-black text-emerald-700 dark:text-emerald-400">
                  {selectedBidForEdit.estimated_value_cr > 0 ? `₹${selectedBidForEdit.estimated_value_cr.toFixed(2)} Cr` : '—'}
                </div>
              </div>
              {selectedBidForEdit.document_url && (
                <div className="pt-1">
                  <a
                    href={selectedBidForEdit.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    <span>Open Tender Document / Official Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* 1. Pipeline Stage Switcher */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                <Workflow className="w-4 h-4 text-emerald-600" />
                <span>Pipeline Stage Transition</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {STAGES.map(s => {
                  const isCurrent = editForm.status === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setEditForm(prev => ({
                          ...prev,
                          status: s.id,
                          final_status: isFinalStatusAllowed(s.id) ? prev.final_status : null
                        }));
                      }}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold text-center transition-all cursor-pointer border flex flex-col items-center justify-center space-y-1 ${
                        isCurrent
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-md scale-[1.02]'
                          : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${s.dotColor}`} />
                      <span className="leading-tight text-[11px]">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Critical Dates & Deadlines */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Bidding Schedule & Deadlines</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Pre-Bid Meeting Date */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Pre-Bid Meeting Date:</span>
                    {editForm.pre_bid_meeting_date && (
                      <button
                        type="button"
                        onClick={() => setEditForm(prev => ({ ...prev, pre_bid_meeting_date: '' }))}
                        className="text-[10px] text-rose-600 hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="datetime-local"
                    value={editForm.pre_bid_meeting_date}
                    onChange={(e) => setEditForm(prev => ({ ...prev, pre_bid_meeting_date: e.target.value }))}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 leading-tight block">
                    Clarification meeting with client authority
                  </span>
                </div>

                {/* Bid Submission Deadline */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Bid Submission Deadline:</span>
                    {editForm.bid_submission_deadline && (
                      <button
                        type="button"
                        onClick={() => setEditForm(prev => ({ ...prev, bid_submission_deadline: '' }))}
                        className="text-[10px] text-rose-600 hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="datetime-local"
                    value={editForm.bid_submission_deadline}
                    onChange={(e) => setEditForm(prev => ({ ...prev, bid_submission_deadline: e.target.value }))}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 leading-tight block">
                    Final e-Proc portal upload cutoff
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Team Assignment & Notifications */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Assignment & Notifications</span>
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Responsible Person Name */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Responsible Person Name:
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. Rishi Sharma"
                    value={editForm.responsible_person_name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, responsible_person_name: e.target.value }))}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {/* Quick Team Chips */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {KNOWN_RESPONSIBLE_PERSONS.map(p => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setEditForm(prev => ({
                          ...prev,
                          responsible_person_name: p.name,
                          responsible_person_email: p.email
                        }))}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Responsible Person Email */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Responsible Person Email:
                  </span>
                  <input
                    type="email"
                    placeholder="e.g. rishi@desireenergy.com"
                    value={editForm.responsible_person_email}
                    onChange={(e) => setEditForm(prev => ({ ...prev, responsible_person_email: e.target.value }))}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400">
                    Recipient for deadline and stage transition notifications
                  </span>
                </div>
              </div>

              {/* CC Notification Emails */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>CC Notification Distribution List</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {editForm.cc_emails.length} recipient{editForm.cc_emails.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="email"
                    placeholder="Enter email and click Add (e.g. tenders@desireenergy.com)"
                    value={newCcEmail}
                    onChange={(e) => setNewCcEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCcEmail();
                      }
                    }}
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCcEmail}
                    className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-emerald-600 hover:text-white dark:bg-slate-800 dark:hover:bg-emerald-600 text-slate-800 dark:text-slate-200 text-xs font-bold cursor-pointer transition-all shrink-0"
                  >
                    + Add
                  </button>
                </div>

                {editForm.cc_emails && editForm.cc_emails.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {editForm.cc_emails.map((email, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800"
                      >
                        <span>{email}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCcEmail(idx)}
                          className="hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 italic block">
                    No CC emails configured. Default notifications will only go to responsible person.
                  </span>
                )}
              </div>
            </div>

            {/* 4. CONDITIONAL FINAL COMMERCIAL STATUS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                  {isFinalStatusAllowed(editForm.status) ? (
                    <Unlock className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Lock className="w-4 h-4 text-amber-600" />
                  )}
                  <span>Final Commercial Status (L1 Decision)</span>
                </label>
                {isFinalStatusAllowed(editForm.status) ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    Editable
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    Locked (Stage: {editForm.status})
                  </span>
                )}
              </div>

              {isFinalStatusAllowed(editForm.status) ? (
                <div className="space-y-1.5 p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800">
                  <select
                    value={editForm.final_status || ''}
                    onChange={(e) => setEditForm(prev => ({
                      ...prev,
                      final_status: (e.target.value as BidFlowFinalStatus) || null
                    }))}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border-2 border-emerald-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="">-- Select Final Commercial Outcome --</option>
                    {FINAL_STATUS_OPTIONS.map(opt => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label} — {opt.desc}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-emerald-800 dark:text-emerald-300 block">
                    Commercial qualification outcome active for &quot;{editForm.status}&quot; stage.
                  </span>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-2">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-900 dark:text-amber-200">
                      <b>Final Status is locked.</b> Per bidding lifecycle rules, final outcome (L1–L10, DESPL, Technical Rejection) can only be decided once the tender advances to <b>Financial Bid Opening</b>, <b>Opening in progress</b>, or <b>Cancelled</b>.
                    </div>
                  </div>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setEditForm(prev => ({ ...prev, status: 'Financial Bid Opening' }))}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold inline-flex items-center space-x-1.5 cursor-pointer transition-all shadow-sm"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Advance to &quot;Financial Bid Opening&quot; to Unlock</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 5. Bidding Notes & Strategy */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Bidding Strategy, Pre-Bid Queries & Notes</span>
              </label>
              <textarea
                rows={3}
                placeholder="Add observations, JV partner alignment requirements, pre-bid clarification queries, or risk assessment remarks..."
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Actions Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleDeleteBid}
                disabled={isDeleting || isSaving}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Removing...' : 'Remove from Bid Flow'}</span>
              </button>

              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedBidForEdit(null)}
                  disabled={isSaving || isDeleting}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBidDetails}
                  disabled={isSaving || isDeleting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-emerald-700/20 cursor-pointer transition-all"
                >
                  {isSaving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-in flex items-center space-x-3 px-4 py-3 bg-slate-900 text-white rounded-2xl shadow-2xl border border-emerald-500/40 text-xs font-semibold backdrop-blur-md">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <span>{toastMessage}</span>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white ml-2 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
