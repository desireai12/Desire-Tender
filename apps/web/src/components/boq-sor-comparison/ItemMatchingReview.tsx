'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Edit3,
  Layers,
  History,
  Info,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  Building,
} from 'lucide-react';
import type {
  MatchClass,
  ReviewStatus,
  SorItemGroupMemberRecord,
  SorItemGroupRecord,
  SorMatchAuditRecord,
} from '@/lib/boq-sor-comparison/types';

interface ItemMatchingReviewProps {
  onRefreshSummary?: () => void;
}

export const ItemMatchingReview: React.FC<ItemMatchingReviewProps> = ({ onRefreshSummary }) => {
  const [groups, setGroups] = useState<SorItemGroupRecord[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [auditLogs, setAuditLogs] = useState<SorMatchAuditRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConflictsOnly, setShowConflictsOnly] = useState(false);

  // Server-Side Paginated Slicing (Phase 4.3.2)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Modals
  const [promoteModal, setPromoteModal] = useState<{
    group: SorItemGroupRecord;
    member: SorItemGroupMemberRecord;
  } | null>(null);
  const [promoteNote, setPromoteNote] = useState('');

  const [conflictModal, setConflictModal] = useState<{
    group: SorItemGroupRecord;
    member: SorItemGroupMemberRecord;
  } | null>(null);
  const [selectedConflictRate, setSelectedConflictRate] = useState<number | null>(null);

  // Step B Advanced Modals: Edit Attributes & Merge Groups
  const [editAttrsModal, setEditAttrsModal] = useState<{
    group: SorItemGroupRecord;
    attributes: Record<string, any>;
    notes: string;
  } | null>(null);

  const [mergeModal, setMergeModal] = useState<{
    sourceGroup: SorItemGroupRecord;
    targetGroupId: string;
    notes: string;
  } | null>(null);

  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false);

  // Fetch paginated groups from server with optional abort signal
  const fetchGroups = async (targetPage = currentPage, signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(targetPage));
      params.set('pageSize', String(pageSize));
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (selectedClass !== 'all') params.set('match_class', selectedClass);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (showConflictsOnly) params.set('conflicts_only', 'true');

      const res = await fetch(`/api/v1/sor-comparison/groups?${params.toString()}`, { signal });
      if (res.ok) {
        const data = await res.json();
        if (data.pagination) {
          // Server-side paginated response
          setGroups(data.data || []);
          setTotalCount(data.pagination.total);
          setTotalPages(Math.max(1, data.pagination.totalPages));
        } else if (Array.isArray(data.groups)) {
          // In-memory fallback
          let filtered = data.groups;
          if (selectedCategory !== 'all') {
            filtered = filtered.filter((g: any) => g.category?.toLowerCase() === selectedCategory.toLowerCase());
          }
          if (selectedClass !== 'all') {
            filtered = filtered.filter((g: any) =>
              g.members?.some((m: any) => m.match_class?.toLowerCase() === selectedClass.toLowerCase()),
            );
          }
          if (showConflictsOnly) {
            filtered = filtered.filter((g: any) =>
              g.members?.some((m: any) => m.state_rate_status === 'state_rate_conflict'),
            );
          }
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(
              (g: any) =>
                g.canonical_name?.toLowerCase().includes(q) ||
                g.members?.some((m: any) => m.item?.full_description?.toLowerCase().includes(q)),
            );
          }
          setTotalCount(filtered.length);
          setTotalPages(Math.max(1, Math.ceil(filtered.length / pageSize)));
          const start = (targetPage - 1) * pageSize;
          setGroups(filtered.slice(start, start + pageSize));
        }
      } else {
        throw new Error('Failed to load canonical item groups');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Error fetching groups');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/v1/sor-comparison/dashboard-metrics');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.categoryDistribution)) {
          setAvailableCategories(data.categoryDistribution.map((c: any) => c.category));
        }
      }
    } catch (e) {
      console.warn('Failed to load categories list:', e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/v1/sor-comparison/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load audit logs', err);
    }
  };

  // Reset pagination to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedClass, searchQuery, showConflictsOnly, pageSize]);

  // Fetch on page or filter changes with AbortController deduplication
  useEffect(() => {
    const controller = new AbortController();
    fetchGroups(currentPage, controller.signal);
    return () => {
      controller.abort();
    };
  }, [currentPage, pageSize, selectedCategory, selectedClass, searchQuery, showConflictsOnly]);

  useEffect(() => {
    fetchCategories();
    fetchAuditLogs();
  }, []);

  // Action: Approve / Reject
  const handleDecision = async (
    groupId: string,
    memberId: string,
    action: 'approved' | 'rejected' | 'promoted_strong' | 'marked_conditional',
    notes?: string,
  ) => {
    try {
      const res = await fetch('/api/v1/sor-comparison/groups/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: groupId,
          member_id: memberId,
          action,
          notes,
          actor: 'reviewer',
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to submit review decision');
      }

      await fetchGroups();
      await fetchAuditLogs();
      if (onRefreshSummary) onRefreshSummary();
    } catch (err: any) {
      alert(err.message || 'Error updating decision');
    }
  };

  // Action: Resolve State Rate Conflict
  const handleResolveConflict = async () => {
    if (!conflictModal || selectedConflictRate == null) return;
    try {
      const res = await fetch('/api/v1/sor-comparison/groups/resolve-conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: conflictModal.group.id,
          member_id: conflictModal.member.id,
          selected_rate_ex_gst: selectedConflictRate,
          actor: 'reviewer',
          notes: `Selected ₹${selectedConflictRate} as the governing state rate`,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to resolve state rate conflict');
      }

      setConflictModal(null);
      await fetchGroups();
      await fetchAuditLogs();
    } catch (err: any) {
      alert(err.message || 'Error resolving conflict');
    }
  };

  // Action: Split Member to its own canonical group
  const handleSplitMember = async (groupId: string, memberId: string) => {
    if (!confirm('Split this item from the group into its own canonical item group?')) return;
    try {
      const res = await fetch('/api/v1/sor-comparison/groups/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: groupId,
          member_id: memberId,
          actor: 'reviewer',
          notes: 'Split by reviewer into independent benchmark group',
        }),
      });

      if (!res.ok) throw new Error('Failed to split member');
      await fetchGroups();
      await fetchAuditLogs();
    } catch (err: any) {
      alert(err.message || 'Error splitting member');
    }
  };

  // Action: Merge Groups
  const handleMergeGroups = async () => {
    if (!mergeModal || !mergeModal.targetGroupId) return;
    try {
      const res = await fetch('/api/v1/sor-comparison/groups/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_group_id: mergeModal.sourceGroup.id,
          target_group_id: mergeModal.targetGroupId,
          actor: 'reviewer',
          notes: mergeModal.notes || 'Merged groups by reviewer',
        }),
      });

      if (!res.ok) throw new Error('Failed to merge groups');
      setMergeModal(null);
      await fetchGroups();
      await fetchAuditLogs();
    } catch (err: any) {
      alert(err.message || 'Error merging groups');
    }
  };

  // Action: Save Attribute Override
  const handleSaveAttributes = async () => {
    if (!editAttrsModal) return;
    try {
      const res = await fetch('/api/v1/sor-comparison/groups/override-attributes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: editAttrsModal.group.id,
          attributes: editAttrsModal.attributes,
          actor: 'reviewer',
          notes: editAttrsModal.notes || 'Reviewer updated civil specifications and attributes',
        }),
      });

      if (!res.ok) throw new Error('Failed to update attributes');
      setEditAttrsModal(null);
      await fetchGroups();
      await fetchAuditLogs();
    } catch (err: any) {
      alert(err.message || 'Error saving attributes');
    }
  };

  // Action: Confirm Promote to Strong
  const handleConfirmPromote = async () => {
    if (!promoteModal || !promoteNote.trim()) {
      alert('A justification note is mandatory when promoting a Conditional match to Strong.');
      return;
    }
    await handleDecision(promoteModal.group.id, promoteModal.member.id || '', 'promoted_strong', promoteNote.trim());
    setPromoteModal(null);
    setPromoteNote('');
  };

  const categories = useMemo(() => {
    if (availableCategories.length > 0) return availableCategories;
    const set = new Set<string>();
    groups.forEach((g) => set.add(g.category));
    return Array.from(set);
  }, [availableCategories, groups]);

  return (
    <div className="space-y-6">
      {/* Top Controls & Statistics Banner */}
      <div className="bg-white dark:bg-[#0b1426] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Canonical Item Matching &amp; Review</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Multi-state comparable groups. Review match classifications, resolve state-level rate conflicts, and approve benchmarks.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAuditDrawerOpen(!auditDrawerOpen)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <History className="w-4 h-4 text-slate-500" />
              <span>Audit Log ({auditLogs.length})</span>
            </button>
            <button
              onClick={() => { fetchGroups(currentPage); fetchAuditLogs(); }}
              disabled={isLoading}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer"
            >
              {isLoading ? 'Refreshing...' : 'Refresh Groups'}
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Search Box */}
          <div className="relative min-w-[240px] flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by work item, spec, or state..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400 font-medium">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Match Class Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400 font-medium">Class:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
            >
              <option value="all">All Classes</option>
              <option value="strong">Strong Match</option>
              <option value="conditional">Conditional Match</option>
            </select>
          </div>

          {/* Conflict Filter Toggle */}
          <button
            onClick={() => setShowConflictsOnly(!showConflictsOnly)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
              showConflictsOnly
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>State Conflicts Only</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Item Groups Cards with Server-Side Pagination */}
      {groups.length === 0 ? (
        <div className="bg-white dark:bg-[#0b1426] border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-xs text-slate-400 space-y-2">
          <Info className="w-6 h-6 mx-auto text-slate-300" />
          <p>No matching canonical item groups found for the selected criteria.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pagination Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-400">
            <div>
              Showing <span className="font-semibold text-slate-900 dark:text-white">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {Math.min(currentPage * pageSize, totalCount)}
              </span>{' '}
              of <span className="font-semibold text-slate-900 dark:text-white">{totalCount}</span> canonical groups
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5">
                <span>Page size:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  Prev
                </button>
                <span className="px-2 py-1 font-semibold text-slate-900 dark:text-white">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {groups.map((group) => {
            const hasConflict = group.members?.some((m) => m.state_rate_status === 'state_rate_conflict');
            const statesCount = new Set(group.members?.map((m) => m.state_name)).size;

            return (
              <div
                key={group.id}
                className="bg-white dark:bg-[#0b1426] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:border-indigo-200 dark:hover:border-indigo-900/60 transition-all"
              >
                {/* Group Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {group.category}
                      </span>
                      {(() => {
                        const isGroupStrong = (group.members?.length || 0) > 1 && group.members!.every((m) => m.match_class === 'Strong');
                        const isGroupConditional = group.members?.some((m) => m.match_class === 'Conditional');
                        const groupClass = statesCount > 1
                          ? (isGroupStrong ? 'Strong Match' : isGroupConditional ? 'Conditional Match' : 'Comparable')
                          : 'Single State';
                        return (
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isGroupStrong
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                : isGroupConditional
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {groupClass}
                          </span>
                        );
                      })()}
                      <span className="text-xs font-mono font-semibold text-slate-400">
                        Unit: {group.canonical_unit}
                      </span>
                      {hasConflict && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-700 flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>State Rate Conflict</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {group.canonical_name}
                    </h3>
                  </div>

                  {/* Attributes Pills & Group Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                    {group.attributes.concreteGrade && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                        Grade: {group.attributes.concreteGrade}
                      </span>
                    )}
                    {group.attributes.pipeDiameter && (
                      <span className="px-2 py-0.5 rounded-md bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-900">
                        Dia: {group.attributes.pipeDiameter}mm
                      </span>
                    )}
                    {group.attributes.pipeClass && (
                      <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-900">
                        Class: {group.attributes.pipeClass}
                      </span>
                    )}
                    {group.attributes.depthMin != null && group.attributes.depthMax != null && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900">
                        Depth: {group.attributes.depthMin}-{group.attributes.depthMax}m
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {statesCount} {statesCount === 1 ? 'State' : 'States'}
                    </span>

                    {/* Step B Action: Edit Attributes Button */}
                    <button
                      onClick={() => setEditAttrsModal({ group, attributes: { ...group.attributes }, notes: '' })}
                      className="px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center space-x-1 cursor-pointer"
                      title="Edit canonical attributes"
                    >
                      <Edit3 className="w-3 h-3 text-indigo-500" />
                      <span>Edit Attrs</span>
                    </button>

                    {/* Step B Action: Merge Group Button */}
                    <button
                      onClick={() => setMergeModal({ sourceGroup: group, targetGroupId: '', notes: '' })}
                      className="px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center space-x-1 cursor-pointer"
                      title="Merge into another canonical group"
                    >
                      <Layers className="w-3 h-3 text-emerald-500" />
                      <span>Merge</span>
                    </button>
                  </div>
                </div>

                {/* State Benchmark Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.members?.map((member, memberIdx) => {
                    const isAnchor = memberIdx === 0;
                    const isGroupStrong = (group.members?.length || 0) > 1 && group.members!.every((m) => m.match_class === 'Strong');
                    const isStrong = member.match_class === 'Strong';
                    const isConditional = member.match_class === 'Conditional';
                    const isPromoted = member.review_status === 'promoted_strong';
                    const isApproved = member.review_status === 'approved';
                    const isRejected = member.review_status === 'rejected';
                    const isConflict = member.state_rate_status === 'state_rate_conflict';

                    return (
                      <div
                        key={member.id}
                        className={`rounded-xl p-4 border transition-all space-y-3 ${
                          isRejected
                            ? 'bg-rose-50/20 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/40 opacity-60'
                            : isConflict
                            ? 'bg-amber-50/20 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800/60'
                            : isStrong
                            ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800/50'
                            : 'bg-slate-50/40 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {/* Member State Header */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                            <Building className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{member.state_name}</span>
                          </span>

                          <div className="flex items-center space-x-1.5">
                            {isAnchor ? (
                              isGroupStrong ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                                  Strong (100%)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  Anchor Exemplar
                                </span>
                              )
                            ) : (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isStrong
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                                }`}
                              >
                                {member.match_class} ({member.confidence}%)
                              </span>
                            )}
                            {isPromoted && (
                              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                                Promoted
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stated Rate / Conflict View */}
                        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80">
                          {isConflict ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 font-bold text-xs">
                                <span>Rate Conflict:</span>
                                <span>Multiple Rates</span>
                              </div>
                              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                                Rates found: ₹{member.distinct_state_rates?.map((r) => r.toFixed(2)).join(', ₹')}
                              </div>
                              <button
                                onClick={() => {
                                  setConflictModal({ group, member });
                                  setSelectedConflictRate(member.distinct_state_rates?.[0] ?? null);
                                }}
                                className="w-full mt-1.5 py-1 px-2 rounded-md bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold transition-all shadow-sm"
                              >
                                Select Applicable Rate
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-baseline justify-between">
                                <span className="text-[11px] text-slate-500">Governing Rate (ex-GST):</span>
                                <span className="text-base font-extrabold font-mono text-slate-900 dark:text-white">
                                  ₹{member.selected_rate_ex_gst != null ? member.selected_rate_ex_gst.toFixed(2) : '—'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                <span>
                                  Stated: ₹{member.item?.rate_as_stated != null ? member.item.rate_as_stated.toFixed(2) : member.selected_rate_ex_gst != null ? member.selected_rate_ex_gst.toFixed(2) : '—'}{' '}
                                  ({member.item?.gst_basis === 'incl_gst' ? 'incl GST' : 'ex-GST'})
                                </span>
                                <span>Unit: {member.item?.unit_norm || member.item?.unit || group.canonical_unit}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Source Rows & Traceability */}
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 space-y-1">
                          <p className="font-semibold text-slate-700 dark:text-slate-300">
                            Source rows ({member.source_rows?.length || 1}): {member.source_rows?.map((r) => `Row ${r}`).join(', ')}
                          </p>
                          {member.item?.item_no && (
                            <p>Item No: {member.item.item_no}</p>
                          )}
                          {member.description_variants && member.description_variants.length > 1 && (
                            <div className="mt-1 pt-1 border-t border-slate-200 dark:border-slate-800 text-[10px] space-y-1">
                              <span className="font-sans font-medium text-slate-600 dark:text-slate-400">Description Variants ({member.description_variants.length}):</span>
                              {member.description_variants.map((v, vIdx) => (
                                <p key={vIdx} className="font-sans text-slate-500 dark:text-slate-400 pl-2 border-l-2 border-slate-300 dark:border-slate-700 italic">
                                  "{v}"
                                </p>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Reasoning & Differences */}
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-white/60 dark:bg-slate-950/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800/60 space-y-1">
                          <p className="font-medium">{member.reasoning}</p>
                          {member.warnings && member.warnings.length > 0 && (
                            <ul className="text-amber-700 dark:text-amber-400 text-[10px] space-y-0.5">
                              {member.warnings.map((w, idx) => (
                                <li key={idx}>⚠️ {w}</li>
                              ))}
                            </ul>
                          )}
                          {member.reviewer_notes && (
                            <p className="text-indigo-700 dark:text-indigo-400 text-[10px] font-medium pt-1 border-t border-slate-200 dark:border-slate-800">
                              Note: {member.reviewer_notes}
                            </p>
                          )}
                        </div>

                        {/* Review Status & Action Buttons */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
                          <div>
                            {isApproved && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold inline-flex items-center space-x-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approved</span>
                              </span>
                            )}
                            {isRejected && (
                              <span className="text-rose-600 dark:text-rose-400 font-bold inline-flex items-center space-x-1">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Rejected</span>
                              </span>
                            )}
                            {member.review_status === 'pending' && (
                              <span className="text-slate-400 font-medium">Pending Review</span>
                            )}
                          </div>

                          <div className="flex items-center space-x-1.5">
                            {/* Promote to Strong button if Conditional */}
                            {isConditional && (
                              <button
                                onClick={() => {
                                  setPromoteModal({ group, member });
                                  setPromoteNote('');
                                }}
                                title="Promote to approved Strong (requires justification note)"
                                className="p-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Mark Conditional */}
                            {!isConditional && (
                              <button
                                onClick={() => handleDecision(group.id, member.id || '', 'marked_conditional', 'Marked as Conditional by reviewer')}
                                title="Mark as Conditional"
                                className="p-1.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-colors"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Approve */}
                            <button
                              onClick={() => handleDecision(group.id, member.id || '', 'approved')}
                              title="Approve match"
                              className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Reject */}
                            <button
                              onClick={() => handleDecision(group.id, member.id || '', 'rejected')}
                              title="Reject match"
                              className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>

                            {/* Split Member out */}
                            <button
                              onClick={() => handleSplitMember(group.id, member.id || '')}
                              title="Split into independent canonical group"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Pagination Bottom Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-400">
            <div>
              Showing <span className="font-semibold text-slate-900 dark:text-white">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {Math.min(currentPage * pageSize, totalCount)}
              </span>{' '}
              of <span className="font-semibold text-slate-900 dark:text-white">{totalCount}</span> canonical groups
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                Previous
              </button>
              <span className="px-2 py-1 font-semibold text-slate-900 dark:text-white">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Promote Conditional to Strong */}
      {promoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0b1426] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>Promote Conditional Match to Strong</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Item: {promoteModal.group.canonical_name} ({promoteModal.member.state_name})
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-slate-700 dark:text-slate-300">
                <p className="font-semibold text-indigo-900 dark:text-indigo-300 mb-1">Current Differences:</p>
                <p className="font-mono text-[11px]">{promoteModal.member.reasoning}</p>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Mandatory Engineering Justification Note *
                </label>
                <textarea
                  rows={3}
                  value={promoteNote}
                  onChange={(e) => setPromoteNote(e.target.value)}
                  placeholder="Explain why the stated difference is functionally immaterial or commercially equivalent in this project context..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  This note will be permanently logged in the audit trail (<code>sor_match_audit</code>) for review.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setPromoteModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPromote}
                disabled={!promoteNote.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm disabled:opacity-50"
              >
                Promote &amp; Save to Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Resolve State Rate Conflict */}
      {conflictModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0b1426] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span>Resolve State Rate Conflict</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                State: <strong>{conflictModal.member.state_name}</strong> • Multiple workbooks contain differing rates. Averaging is strictly disabled.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-400">
                Please select which rate applies as the governing state benchmark:
              </p>

              <div className="space-y-2">
                {conflictModal.member.distinct_state_rates?.map((rate) => (
                  <label
                    key={rate}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedConflictRate === rate
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <input
                        type="radio"
                        name="conflict_rate"
                        checked={selectedConflictRate === rate}
                        onChange={() => setSelectedConflictRate(rate)}
                        className="text-indigo-600"
                      />
                      <span className="font-mono font-bold text-sm">₹{rate.toLocaleString('en-IN')}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">per {conflictModal.group.canonical_unit}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setConflictModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveConflict}
                disabled={selectedConflictRate == null}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm"
              >
                Confirm Rate Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Attributes */}
      {editAttrsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0b1426] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Edit3 className="w-5 h-5 text-indigo-600" />
                  <span>Override Canonical Attributes</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Group: <strong>{editAttrsModal.group.canonical_name}</strong>
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Concrete Grade (e.g. M10, M15, M20, M25)
                </label>
                <input
                  type="text"
                  value={editAttrsModal.attributes.concreteGrade || ''}
                  onChange={(e) =>
                    setEditAttrsModal({
                      ...editAttrsModal,
                      attributes: { ...editAttrsModal.attributes, concreteGrade: e.target.value || null },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Tooling / Method (e.g. CC cutter &amp; pneumatic breaker)
                </label>
                <input
                  type="text"
                  value={editAttrsModal.attributes.toolingOrMethod || ''}
                  onChange={(e) =>
                    setEditAttrsModal({
                      ...editAttrsModal,
                      attributes: { ...editAttrsModal.attributes, toolingOrMethod: e.target.value || null },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Reviewer Justification Note *
                </label>
                <textarea
                  rows={2}
                  value={editAttrsModal.notes}
                  onChange={(e) => setEditAttrsModal({ ...editAttrsModal, notes: e.target.value })}
                  placeholder="Explain reason for attribute override..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setEditAttrsModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAttributes}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm"
              >
                Save Attributes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Merge Groups */}
      {mergeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0b1426] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <span>Merge Canonical Item Groups</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Merging source group: <strong>{mergeModal.sourceGroup.canonical_name}</strong>
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Select Target Canonical Group to merge into *
                </label>
                <select
                  value={mergeModal.targetGroupId}
                  onChange={(e) => setMergeModal({ ...mergeModal, targetGroupId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium"
                >
                  <option value="">-- Select Target Group --</option>
                  {groups
                    .filter((g) => g.id !== mergeModal.sourceGroup.id && g.status === 'active')
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.canonical_name} ({g.category} - {g.canonical_unit})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Merge Reason / Notes
                </label>
                <textarea
                  rows={2}
                  value={mergeModal.notes}
                  onChange={(e) => setMergeModal({ ...mergeModal, notes: e.target.value })}
                  placeholder="Explain why these items belong in the same canonical group..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setMergeModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleMergeGroups}
                disabled={!mergeModal.targetGroupId}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm disabled:opacity-50"
              >
                Confirm Merge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer: Audit Log */}
      {auditDrawerOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-[#0b1426] border-l border-slate-200 dark:border-slate-800 p-6 shadow-2xl overflow-y-auto space-y-4 animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <History className="w-5 h-5 text-indigo-600" />
              <span>Matching Audit Trail</span>
            </h3>
            <button
              onClick={() => setAuditDrawerOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-semibold"
            >
              Close
            </button>
          </div>

          {auditLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No audit records logged yet.
            </div>
          ) : (
            <div className="space-y-3 font-mono text-xs">
              {auditLogs.slice().reverse().map((log, idx) => (
                <div
                  key={log.id || idx}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-indigo-700 dark:text-indigo-400 uppercase">
                      {log.action}
                    </span>
                    <span className="text-slate-400">{log.created_at?.slice(11, 19)}</span>
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300">
                    Actor: <strong>{log.actor}</strong>
                  </p>
                  {log.notes && (
                    <p className="text-[11px] text-slate-500 italic bg-white dark:bg-slate-950 p-2 rounded border border-slate-100 dark:border-slate-800">
                      &ldquo;{log.notes}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

