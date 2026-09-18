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
  Check
} from 'lucide-react';
import { BidFlowItem, BidFlowStatus, UserProfile } from '@/lib/types';

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
  const [inspectingBid, setInspectingBid] = useState<BidFlowItem | null>(null);

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
    if (inspectingBid && inspectingBid.id === bidId) {
      setInspectingBid(prev => prev ? { ...prev, status: newStatus } : null);
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
                        onClick={() => {
                          setInspectingBid(bid);
                          if (onSelectBidForDetail) onSelectBidForDetail(bid);
                        }}
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

      {/* ─── CARD INSPECT MODAL (CLICKABLE FEEDBACK) ──────────────── */}
      {inspectingBid && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0b1426] w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-emerald-700 dark:text-emerald-400">
                  Bid Flow Inspection
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Tender: {inspectingBid.tender_id}
                </h3>
              </div>
              <button
                onClick={() => setInspectingBid(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed">
                  {inspectingBid.tender_title}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Department: <b>{inspectingBid.authority || 'N/A'}</b> • State: <b>{inspectingBid.state || 'N/A'}</b>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] font-mono uppercase">Estimated Value</span>
                  <div className="text-base font-mono font-black text-emerald-700 dark:text-emerald-400">
                    {inspectingBid.estimated_value_cr > 0 ? `₹${inspectingBid.estimated_value_cr.toFixed(2)} Cr` : '—'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] font-mono uppercase">Current Stage</span>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {inspectingBid.status}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] font-mono uppercase">Responsible Person</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {inspectingBid.responsible_person_name || 'Unassigned'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] font-mono uppercase">Deadline</span>
                  <div className="font-mono text-slate-800 dark:text-slate-200">
                    {inspectingBid.deadline || 'None set'}
                  </div>
                </div>
              </div>

              {/* Quick Stage Move Inside Modal */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Change Pipeline Stage:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {STAGES.map(s => (
                    <button
                      key={s.id}
                      onClick={() => updateBidStatus(inspectingBid.id, s.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold text-left transition-all cursor-pointer border ${
                        inspectingBid.status === s.id
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {inspectingBid.document_url && (
                <div className="pt-2">
                  <a
                    href={inspectingBid.document_url}
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

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setInspectingBid(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                Close
              </button>
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
