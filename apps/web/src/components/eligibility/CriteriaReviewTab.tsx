'use client';

import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Search, 
  Filter, 
  FileText, 
  Sparkles, 
  Clock, 
  AlertTriangle,
  HelpCircle,
  Check,
  RotateCcw,
  BookOpen,
  Tag
} from 'lucide-react';
import { MockCriterion } from '@/lib/new-eligibility/mockData';

interface CriteriaReviewTabProps {
  criteria: MockCriterion[];
  onUpdateCriterion: (updated: MockCriterion) => void;
}

export const CriteriaReviewTab: React.FC<CriteriaReviewTabProps> = ({
  criteria,
  onUpdateCriterion
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedMateriality, setSelectedMateriality] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Edit Modal State
  const [editingCriterion, setEditingCriterion] = useState<MockCriterion | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editUnit, setEditUnit] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');

  // Rejection Modal State
  const [rejectingCriterion, setRejectingCriterion] = useState<MockCriterion | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  // Dynamic category counts
  const financialCount = criteria.filter(c => c.audited_category.includes('FINANCIAL')).length;
  const technicalCount = criteria.filter(c => c.audited_category.includes('TECHNICAL_ELIGIBILITY')).length;
  const otherCount = criteria.filter(c => c.audited_category.includes('OTHER_ELIGIBILITY')).length;
  const contractCount = criteria.filter(
    c => c.audited_category.includes('CONTRACT') || c.audited_category.includes('CHECKLIST') || c.audited_category.includes('SPECS')
  ).length;

  // Filtering
  const filteredCriteria = criteria.filter(c => {
    const matchesSearch = 
      c.criterion_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.clause_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.verbatim_quote.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.parameter_key.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = 
      selectedCategory === 'ALL' ||
      (selectedCategory === 'FINANCIAL' && c.audited_category.includes('FINANCIAL')) ||
      (selectedCategory === 'TECHNICAL' && c.audited_category.includes('TECHNICAL_ELIGIBILITY')) ||
      (selectedCategory === 'OTHER' && c.audited_category.includes('OTHER_ELIGIBILITY')) ||
      (selectedCategory === 'CONTRACT' && (c.audited_category.includes('CONTRACT') || c.audited_category.includes('CHECKLIST') || c.audited_category.includes('SPECS')));

    const matchesMateriality = 
      selectedMateriality === 'ALL' ||
      (selectedMateriality === 'MANDATORY' && (c.materiality === 'MANDATORY' || c.materiality === 'MANDATORY_ALTERNATIVE' || c.materiality === 'DISQUALIFYING')) ||
      (selectedMateriality === 'INFORMATIONAL' && (c.materiality === 'CONTRACTUAL' || c.materiality === 'INFORMATIONAL' || c.materiality === 'STATUTORY' || c.materiality === 'EVALUATION_FORMULA' || c.materiality === 'TECHNICAL_STANDARD'));

    const currentStatus = c.review_status || 'VERIFIED';
    const matchesStatus = selectedStatus === 'ALL' || currentStatus === selectedStatus;

    return matchesSearch && matchesCategory && matchesMateriality && matchesStatus;
  });

  // Action: Approve
  const handleApprove = (item: MockCriterion) => {
    onUpdateCriterion({
      ...item,
      review_status: 'APPROVED'
    });
  };

  // Action: Open Edit Modal
  const openEditModal = (item: MockCriterion) => {
    setEditingCriterion(item);
    setEditValue(item.extracted_numeric_value !== null ? String(item.extracted_numeric_value) : (item.edited_value || ''));
    setEditUnit(item.extracted_unit || '');
    setEditReason(item.correction_reason || 'Verified against tender document text.');
  };

  // Action: Save Edit
  const handleSaveEdit = () => {
    if (!editingCriterion) return;
    const numVal = isNaN(Number(editValue)) ? null : Number(editValue);
    onUpdateCriterion({
      ...editingCriterion,
      extracted_numeric_value: numVal,
      extracted_unit: editUnit || null,
      edited_value: editValue,
      correction_reason: editReason,
      review_status: 'EDITED'
    });
    setEditingCriterion(null);
  };

  // Action: Open Reject Modal
  const openRejectModal = (item: MockCriterion) => {
    setRejectingCriterion(item);
    setRejectReason('');
  };

  // Action: Confirm Rejection
  const handleConfirmReject = () => {
    if (!rejectingCriterion) return;
    onUpdateCriterion({
      ...rejectingCriterion,
      review_status: 'REJECTED',
      correction_reason: rejectReason || 'Rejected by reviewer: clause inapplicable or superseded.'
    });
    setRejectingCriterion(null);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            APPROVED
          </span>
        );
      case 'EDITED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
            <Edit3 className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            EDITED
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 dark:bg-red-950/70 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700">
            <XCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
            REJECTED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            <Clock className="w-3 h-3 text-slate-500" />
            VERIFIED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID, clause number, quote text, parameter..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Quick Counter */}
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            Showing <strong className="text-slate-800 dark:text-slate-200">{filteredCriteria.length}</strong> of {criteria.length} Criteria
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium select-none">Category:</span>
            <div className="flex flex-wrap items-center gap-1">
              {[
                { id: 'ALL', label: `All (${criteria.length})` },
                { id: 'FINANCIAL', label: `Financial (${financialCount})` },
                { id: 'TECHNICAL', label: `Technical (${technicalCount})` },
                { id: 'OTHER', label: `Others (${otherCount})` },
                { id: 'CONTRACT', label: `Checklist / Terms / Scope (${contractCount})` }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  type="button"
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Materiality Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium select-none">Materiality:</span>
            <div className="flex items-center gap-1">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'MANDATORY', label: 'Mandatory' },
                { id: 'INFORMATIONAL', label: 'Contract / Info' }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMateriality(m.id)}
                  type="button"
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    selectedMateriality === m.id
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Review Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium select-none">Status:</span>
            <div className="flex items-center gap-1">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'VERIFIED', label: 'Verified' },
                { id: 'APPROVED', label: 'Approved' },
                { id: 'EDITED', label: 'Edited' },
                { id: 'REJECTED', label: 'Rejected' }
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStatus(s.id)}
                  type="button"
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    selectedStatus === s.id
                      ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Criteria Cards Grid */}
      <div className="space-y-4">
        {filteredCriteria.map(item => (
          <div
            key={item.criterion_id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            {/* Header Line */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                  {item.criterion_id}
                </span>

                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {item.clause_number}
                </span>

                <span className="text-xs text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">
                  Page {item.source_page}
                </span>

                <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                  item.materiality === 'MANDATORY' || item.materiality === 'MANDATORY_ALTERNATIVE' || item.materiality === 'DISQUALIFYING'
                    ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {item.materiality}
                </span>

                <span className="text-[11px] text-slate-500 font-medium">
                  {item.audited_category}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {getStatusBadge(item.review_status)}
              </div>
            </div>

            {/* Title & Parameter */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                {item.title}
              </h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                Key: <strong className="text-slate-600 dark:text-slate-400">{item.parameter_key}</strong>
              </p>
            </div>

            {/* Verbatim Quote Box */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3.5 border-l-4 border-emerald-500 dark:border-emerald-400">
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                Verbatim Tender Quote (Page {item.source_page})
              </p>
              <blockquote className="text-xs text-slate-700 dark:text-slate-300 italic leading-relaxed">
                "{item.verbatim_quote}"
              </blockquote>
            </div>

            {/* Extracted Values & Actions Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-3">
                <div className="text-xs">
                  <span className="text-slate-400">Extracted Value: </span>
                  <strong className="text-slate-900 dark:text-white font-mono text-sm">
                    {item.extracted_numeric_value !== null ? item.extracted_numeric_value : (item.edited_value || 'Qualitative Requirement')}
                    {item.extracted_unit ? ` ${item.extracted_unit}` : ''}
                  </strong>
                </div>

                {item.review_status === 'EDITED' && item.correction_reason && (
                  <span className="text-[11px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                    Reason: {item.correction_reason}
                  </span>
                )}
              </div>

              {/* Review Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleApprove(item)}
                  type="button"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                    item.review_status === 'APPROVED'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{item.review_status === 'APPROVED' ? 'Approved' : 'Approve'}</span>
                </button>

                <button
                  onClick={() => openEditModal(item)}
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Edit Value</span>
                </button>

                <button
                  onClick={() => openRejectModal(item)}
                  type="button"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm ${
                    item.review_status === 'REJECTED'
                      ? 'bg-red-700 text-white'
                      : 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{item.review_status === 'REJECTED' ? 'Rejected' : 'Reject'}</span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredCriteria.length === 0 && (
          <div className="p-12 text-center text-slate-500 text-xs bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            No criteria match your active filter criteria. Try resetting filters or search terms.
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingCriterion && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-purple-600" />
                Edit Criterion: {editingCriterion.criterion_id}
              </h3>
              <button 
                onClick={() => setEditingCriterion(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Clause Reference</label>
                <input
                  type="text"
                  disabled
                  value={`${editingCriterion.clause_number} (Page ${editingCriterion.source_page})`}
                  className="w-full p-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Numeric Value</label>
                <input
                  type="text"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  placeholder="e.g. 4.00, 7, 10"
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Unit</label>
                <input
                  type="text"
                  value={editUnit}
                  onChange={e => setEditUnit(e.target.value)}
                  placeholder="e.g. Cr, years, %, months"
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Correction Reason & Source Reference</label>
                <textarea
                  rows={3}
                  value={editReason}
                  onChange={e => setEditReason(e.target.value)}
                  placeholder="Explain why this value is adjusted based on verbatim tender evidence..."
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-2">
                Mock Mode: Changes are held in browser memory for this session only and are not saved to any database.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setEditingCriterion(null)}
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition-colors shadow-sm"
              >
                Apply Mock Correction (Session Only)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingCriterion && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-red-600 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Reject Criterion: {rejectingCriterion.criterion_id}
              </h3>
              <button 
                onClick={() => setRejectingCriterion(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-400">
                Are you sure you want to reject this criterion from prequalification evaluation?
              </p>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Rejection Reason</label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Explain why this clause does not apply or is invalid..."
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500"
                />
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-2">
                Mock Mode: Changes are held in browser memory for this session only and are not saved to any database.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setRejectingCriterion(null)}
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-colors shadow-sm"
              >
                Mark Rejected (Session Only)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
