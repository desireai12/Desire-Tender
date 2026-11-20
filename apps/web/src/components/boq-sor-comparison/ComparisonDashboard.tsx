'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  ArrowLeft,
  Download,
  Filter,
  Search,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  Info,
  RotateCcw,
  ExternalLink,
  ShieldAlert,
  Image as ImageIcon,
  Settings,
  ArrowRight,
} from 'lucide-react';
import type { SorItemGroupRecord, SorFileRecord, DashboardMetricSummary } from '@/lib/boq-sor-comparison/types';
import { buildComparisonDataset, type ComparisonRow, type ComparisonDatasetResult } from '@/lib/boq-sor-comparison/comparisonEngine';
import { generateVerifiedInsights, type InsightItem } from '@/lib/boq-sor-comparison/insightsEngine';

interface ComparisonDashboardProps {
  groups?: SorItemGroupRecord[];
  files?: SorFileRecord[];
  onBackToMatching?: () => void;
  onRefresh?: () => void;
}

const STATE_COLORS: Record<string, string> = {
  Rajasthan: '#3B82F6', // Blue
  'Madhya Pradesh': '#10B981', // Green
  Gujarat: '#F59E0B', // Amber
  Maharashtra: '#8B5CF6', // Purple
  Haryana: '#EC4899', // Pink
  Punjab: '#06B6D4', // Cyan
  Default: '#64748B', // Slate
};

// Export Chart Helper functions (SVG and PNG)
function exportChartAsSvg(containerId: string, filename: string) {
  if (typeof document === 'undefined') return;
  const container = document.getElementById(containerId);
  if (!container) return;
  const svg = container.querySelector('svg');
  if (!svg) return;
  const svgData = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportChartAsPng(containerId: string, filename: string) {
  if (typeof document === 'undefined') return;
  const container = document.getElementById(containerId);
  if (!container) return;
  const svg = container.querySelector('svg');
  if (!svg) return;
  const svgData = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement('canvas');
  const svgRect = svg.getBoundingClientRect();
  canvas.width = (svgRect.width || 800) * 2;
  canvas.height = (svgRect.height || 400) * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(2, 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const img = new Image();
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  img.onload = () => {
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    const pngUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `${filename}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  img.src = url;
}

export function ComparisonDashboard({
  groups: propGroups,
  files: propFiles,
  onBackToMatching,
  onRefresh,
}: ComparisonDashboardProps) {
  const [internalGroups, setInternalGroups] = useState<SorItemGroupRecord[]>(propGroups || []);
  const [internalFiles, setInternalFiles] = useState<SorFileRecord[]>(propFiles || []);
  const [serverMetrics, setServerMetrics] = useState<DashboardMetricSummary | null>(null);
  const [serverDataset, setServerDataset] = useState<ComparisonDatasetResult | null>(null);
  const [serverInsights, setServerInsights] = useState<InsightItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(!propGroups?.length);

  const [includeConditional, setIncludeConditional] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRow, setSelectedRow] = useState<ComparisonRow | null>(null);
  const [referenceState, setReferenceState] = useState<string>('');
  const [chart2TargetState, setChart2TargetState] = useState<string>('ALL');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [showPurgeModal, setShowPurgeModal] = useState<boolean>(false);
  const [purgeConfirmationText, setPurgeConfirmationText] = useState<string>('');

  // Matrix Table Pagination (Phase 4.3)
  const [matrixPage, setMatrixPage] = useState<number>(1);
  const [matrixPageSize, setMatrixPageSize] = useState<number>(25);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const [mRes, dRes] = await Promise.all([
        fetch('/api/v1/sor-comparison/dashboard-metrics'),
        fetch(`/api/v1/sor-comparison/dashboard?include_conditional=${includeConditional}${referenceState ? `&reference_state=${encodeURIComponent(referenceState)}` : ''}`),
      ]);
      if (mRes.ok) {
        const mData: DashboardMetricSummary = await mRes.json();
        setServerMetrics(mData);
      }
      if (dRes.ok) {
        const dData = await dRes.json();
        setServerDataset(dData);
        if (dData.insights) setServerInsights(dData.insights);
      }
    } catch (e) {
      console.error('Error fetching server dashboard data:', e);
    } finally {
      setIsLoadingData(false);
    }
  };

  React.useEffect(() => {
    if (!propGroups || propGroups.length === 0) {
      loadData();
    } else {
      setInternalGroups(propGroups);
    }
  }, [propGroups, includeConditional, referenceState]);

  React.useEffect(() => {
    if (propFiles && propFiles.length > 0) {
      setInternalFiles(propFiles);
    }
  }, [propFiles]);

  // 1. Resolve comparison dataset: prefer server-computed dataset when available, fallback to client-computed
  const dataset = useMemo(() => {
    if (serverDataset && (!propGroups || propGroups.length === 0)) {
      return serverDataset;
    }
    return buildComparisonDataset(internalGroups, internalFiles, {
      includeConditional,
      referenceState: referenceState || undefined,
    });
  }, [serverDataset, internalGroups, internalFiles, includeConditional, referenceState, propGroups]);

  const activeRefState = dataset.referenceState;

  // 2. Resolve AI insights: prefer server insights when available, fallback to client-computed
  const insights = useMemo(() => {
    if (serverInsights.length > 0 && (!propGroups || propGroups.length === 0)) {
      return serverInsights;
    }
    return generateVerifiedInsights(dataset.rows, dataset.categorySummaries);
  }, [serverInsights, dataset.rows, dataset.categorySummaries, propGroups]);

  // 3. Filter rows by category and search
  const filteredRows = useMemo(() => {
    return dataset.rows.filter((r) => {
      const matchCat = selectedCategory === 'ALL' || r.category === selectedCategory;
      const matchSearch =
        !searchQuery ||
        r.canonical_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        Object.values(r.state_details).some(
          (d) =>
            d.item_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.full_description?.toLowerCase().includes(searchQuery.toLowerCase()),
        );
      return matchCat && matchSearch;
    });
  }, [dataset.rows, selectedCategory, searchQuery]);

  // Reset matrix page when filter or page size changes
  React.useEffect(() => {
    setMatrixPage(1);
  }, [selectedCategory, searchQuery, matrixPageSize]);

  const matrixTotalPages = Math.max(1, Math.ceil(filteredRows.length / matrixPageSize));
  const paginatedMatrixRows = useMemo(() => {
    const start = (matrixPage - 1) * matrixPageSize;
    return filteredRows.slice(start, start + matrixPageSize);
  }, [filteredRows, matrixPage, matrixPageSize]);

  // 4. Chart 1 Data: Grouped Bars per item (top 7 filtered rows)
  const groupedBarData = useMemo(() => {
    return filteredRows.slice(0, 7).map((r) => {
      const itemNo = r.state_details[activeRefState]?.item_no || Object.values(r.state_details)[0]?.item_no;
      const cleanTitle = r.canonical_name.length > 20 ? `${r.canonical_name.slice(0, 18)}...` : r.canonical_name;
      const labelName = itemNo ? `[${itemNo}] ${cleanTitle}` : cleanTitle;

      const item: Record<string, string | number | ComparisonRow> = {
        name: labelName,
        fullName: r.canonical_name,
        unit: r.canonical_unit,
        rawRow: r,
      };
      for (const s of dataset.availableStates) {
        item[s] = r.states[s] ?? 0;
      }
      return item;
    });
  }, [filteredRows, dataset.availableStates, activeRefState]);

  // 5. Chart 2 Data: Multi-State % Variance vs Reference State
  const comparisonStates = useMemo(() => {
    return dataset.availableStates.filter((s) => s !== activeRefState);
  }, [dataset.availableStates, activeRefState]);

  const diffBarData = useMemo(() => {
    if (comparisonStates.length === 0) return [];

    return filteredRows.slice(0, 8).map((r) => {
      const itemNo = r.state_details[activeRefState]?.item_no || Object.values(r.state_details)[0]?.item_no;
      const cleanTitle = r.canonical_name.length > 20 ? `${r.canonical_name.slice(0, 18)}...` : r.canonical_name;
      const labelName = itemNo ? `[${itemNo}] ${cleanTitle}` : cleanTitle;

      const refRate = r.states[activeRefState];
      const hasValidRefRate = refRate != null && refRate > 0;

      const itemObj: Record<string, any> = {
        name: labelName,
        fullName: r.canonical_name,
        unit: r.canonical_unit,
        refRate: hasValidRefRate ? refRate : null,
        refState: activeRefState,
        rawRow: r,
      };

      for (const compState of comparisonStates) {
        const stateRate = r.states[compState];
        // Safely handle missing rates or unresolved conflict rates without treating as zero
        if (stateRate != null && stateRate > 0 && hasValidRefRate) {
          const diffVal = Number((stateRate - refRate).toFixed(2));
          const pctDiff = Number((((stateRate - refRate) / refRate) * 100).toFixed(2));
          itemObj[compState] = pctDiff;
          itemObj[`${compState}_diff`] = diffVal;
          itemObj[`${compState}_rate`] = stateRate;
        } else {
          itemObj[compState] = undefined; // Do not plot false 0% bar
          itemObj[`${compState}_diff`] = undefined;
          itemObj[`${compState}_rate`] = stateRate ?? null;
        }
      }

      // If a specific target state is selected, also populate generic pct_diff and diff_val for direct cell styling
      if (chart2TargetState !== 'ALL' && comparisonStates.includes(chart2TargetState)) {
        itemObj.pct_diff = itemObj[chart2TargetState];
        itemObj.diff_val = itemObj[`${chart2TargetState}_diff`];
        itemObj.targetState = chart2TargetState;
      }

      return itemObj;
    });
  }, [filteredRows, comparisonStates, activeRefState, chart2TargetState]);

  // 6. Chart 3 Data: Category-wise Median % Spread
  const categoryChartData = useMemo(() => {
    return dataset.categorySummaries.map((cs) => ({
      category: cs.category,
      median_spread: cs.median_pct_above_lowest,
      mean_spread: cs.mean_pct_above_lowest,
      item_count: cs.item_count,
    }));
  }, [dataset.categorySummaries]);

  // 7. Chart 4 Data: Highest vs Lowest Spread per Item
  const highestLowestData = useMemo(() => {
    return filteredRows.slice(0, 8).map((r) => ({
      name: r.canonical_name.length > 25 ? `${r.canonical_name.slice(0, 23)}...` : r.canonical_name,
      fullName: r.canonical_name,
      highest_rate: r.highest_rate,
      lowest_rate: r.lowest_rate,
      pct_spread: r.pct_above_lowest,
      highest_state: r.highest_state,
      lowest_state: r.lowest_state,
      rawRow: r,
    }));
  }, [filteredRows]);

  // 8. Handle Excel Export
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(
        `/api/v1/sor-comparison/export/excel?reference_state=${encodeURIComponent(activeRefState)}`,
      );
      if (!res.ok) throw new Error('Excel export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `State_SOR_Comparison_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Error downloading Excel report: ' + (err as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  // 9. Handle Admin Purge
  const handlePurge = async (testOnly = false) => {
    setIsPurging(true);
    try {
      const res = await fetch('/api/v1/sor-comparison/admin/purge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testOnly, includeApprovedMappings: !testOnly }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Purge failed');
      setShowPurgeModal(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error during purge: ' + (err as Error).message);
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── TOP ACTION BAR ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            {onBackToMatching && (
              <button
                onClick={onBackToMatching}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                title="Back to Item Matching"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                BOQ & SOR Comparative Dashboard
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                  Phase 3 Live
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Normalized cross-state benchmark rate comparison, Recharts visualizations & AI insights
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            id="btn-export-excel"
            onClick={handleExportExcel}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {isExporting ? 'Generating Excel...' : 'Export Excel (.xlsx)'}
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Print Report
          </button>

          <button
            onClick={() => setShowPurgeModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
            title="Admin data settings"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            Admin Settings
          </button>
        </div>
      </div>

      {/* ─── KPI CARDS ROW (9 METRICS) ───────────────────────────────────── */}
      <div id="kpi-cards-section" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3">
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">States</div>
          <div className="text-lg font-bold text-slate-900 mt-1">
            {serverMetrics ? serverMetrics.totalStates : dataset.kpis.states_compared.length}
          </div>
          <div className="text-[10px] text-blue-600 truncate mt-0.5 font-medium">
            {(serverMetrics ? serverMetrics.statesList.join(', ') : dataset.kpis.states_compared.join(', ')) || 'None'}
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Files</div>
          <div className="text-lg font-bold text-slate-900 mt-1">
            {serverMetrics ? serverMetrics.totalFiles : dataset.kpis.total_files}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Uploaded workbooks</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Extracted</div>
          <div className="text-lg font-bold text-slate-900 mt-1">
            {serverMetrics ? serverMetrics.totalItems : dataset.kpis.total_items_extracted}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Physical sheet rows</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Eligible Items</div>
          <div className="text-lg font-bold text-slate-900 mt-1">{dataset.kpis.eligible_items_count}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Priced non-addon</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-emerald-200 bg-emerald-50/30 shadow-sm">
          <div className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider">Tier 1 Strong</div>
          <div className="text-lg font-bold text-emerald-800 mt-1">
            {serverMetrics ? serverMetrics.tier1Count : dataset.kpis.tier1_strong_approved_count}
          </div>
          <div className="text-[10px] text-emerald-600 mt-0.5">100% attribute parity</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-amber-200 bg-amber-50/30 shadow-sm">
          <div className="text-[11px] font-medium text-amber-700 uppercase tracking-wider">Tier 2 Cond.</div>
          <div className="text-lg font-bold text-amber-800 mt-1">
            {serverMetrics ? serverMetrics.tier2Count : dataset.kpis.tier2_conditional_approved_count}
          </div>
          <div className="text-[10px] text-amber-600 mt-0.5">Approved scope diff</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Pending Review</div>
          <div className="text-lg font-bold text-slate-700 mt-1">
            {serverMetrics ? serverMetrics.pendingReviewCount : dataset.kpis.pending_review_count}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Awaiting decision</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Excluded</div>
          <div className="text-lg font-bold text-slate-900 mt-1">
            {Object.values(dataset.kpis.excluded_by_reason).reduce((a, b) => a + b, 0)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Add-ons/Junk/Total</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Conflicts</div>
          <div className="text-lg font-bold text-slate-900 mt-1">
            {(serverMetrics ? serverMetrics.conflictCount : dataset.kpis.unresolved_conflicts_count) === 0 ? (
              <span className="text-emerald-600 flex items-center gap-1">0 <CheckCircle2 className="w-3.5 h-3.5" /></span>
            ) : (
              <span className="text-rose-600 font-bold">{serverMetrics ? serverMetrics.conflictCount : dataset.kpis.unresolved_conflicts_count}</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Differing state rates</div>
        </div>
      </div>

      {/* ─── CONTROLS BAR: TIER 2 TOGGLE, REFERENCE STATE, CATEGORY, SEARCH ─ */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Tier 2 Toggle */}
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeConditional}
              onChange={(e) => setIncludeConditional(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
            />
            <span className="text-xs font-semibold text-slate-800">
              Include approved Conditional matches (Tier 2)
            </span>
          </label>

          {/* Reference State Selector */}
          <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
            <span className="text-xs font-medium text-slate-500">Benchmark Ref State:</span>
            <select
              value={activeRefState}
              onChange={(e) => setReferenceState(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {dataset.availableStates.map((s) => (
                <option key={s} value={s}>
                  {s} (Base 100%)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Pills & Search */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                selectedCategory === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({dataset.rows.length})
            </button>
            {dataset.categories.map((cat) => {
              const count = dataset.rows.filter((r) => r.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                    selectedCategory === cat
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search items, specs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-48"
            />
          </div>
        </div>
      </div>

      {/* ─── CHARTS SECTION (6 CHARTS FULLY IMPLEMENTED) ──────────────────── */}
      {dataset.rows.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs space-y-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No approved matches yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Multi-state comparative analysis, rate spread charts, and verified insights require at least one user-approved canonical match.
          </p>
          <div className="pt-2">
            <button
              onClick={onBackToMatching}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer"
            >
              <span>Review items in Item Matching</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Grouped Rates by State */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">1. Inter-State Rate Benchmark (Grouped Bars)</h2>
              <p className="text-xs text-slate-500">Grouped comparison per item across available state schedules</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => exportChartAsSvg('chart-grouped-bars', 'Inter_State_Grouped_Bars')}
                className="text-[10px] px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
                title="Export as SVG"
              >
                SVG
              </button>
              <button
                onClick={() => exportChartAsPng('chart-grouped-bars', 'Inter_State_Grouped_Bars')}
                className="text-[10px] px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                title="Export as PNG"
              >
                PNG
              </button>
            </div>
          </div>

          <div id="chart-grouped-bars" className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groupedBarData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v.toLocaleString('en-IN')}`} />
                <Tooltip
                  formatter={(value: any, name: any) => [`₹${Number(value).toLocaleString('en-IN')}`, name]}
                  labelFormatter={(label) => `Item: ${label}`}
                  contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                {dataset.availableStates.map((state) => (
                  <Bar
                    key={state}
                    dataKey={state}
                    name={state}
                    fill={STATE_COLORS[state] || STATE_COLORS.Default}
                    radius={[4, 4, 0, 0]}
                    onClick={(data) => {
                      if (data?.rawRow) setSelectedRow(data.rawRow);
                    }}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: % Difference vs Reference State */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  2. % Variance vs {activeRefState && activeRefState !== 'Select a reference state' ? activeRefState : 'Reference State'}
                </h2>
                {comparisonStates.length > 1 && (
                  <select
                    value={chart2TargetState}
                    onChange={(e) => setChart2TargetState(e.target.value)}
                    className="text-[11px] px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="ALL">All States ({comparisonStates.length})</option>
                    {comparisonStates.map((s) => (
                      <option key={s} value={s}>
                        {s} vs {activeRefState}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Formula: ((Comparison State Rate - {activeRefState} Rate) / {activeRefState} Rate) × 100
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => exportChartAsSvg('chart-reference-diff', 'Reference_State_Variance')}
                className="text-[10px] px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
                title="Export as SVG"
              >
                SVG
              </button>
              <button
                onClick={() => exportChartAsPng('chart-reference-diff', 'Reference_State_Variance')}
                className="text-[10px] px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                title="Export as PNG"
              >
                PNG
              </button>
            </div>
          </div>

          <div id="chart-reference-diff" className="h-72 w-full">
            {comparisonStates.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs text-center p-6">
                At least two confirmed states are required to compute rate variance against {activeRefState}.
              </div>
            ) : chart2TargetState === 'ALL' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={diffBarData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}%`} />
                  <Tooltip
                    formatter={(value: any, name: any, item: any) => {
                      if (value == null || value === undefined) {
                        return ['Rate unavailable / conflict', name];
                      }
                      const state = String(name).replace(` vs ${activeRefState}`, '');
                      const diffVal = item.payload?.[`${state}_diff`];
                      const diffStr = diffVal != null ? ` (₹${diffVal > 0 ? '+' : ''}${diffVal})` : '';
                      return [`${value > 0 ? '+' : ''}${value}%${diffStr}`, name];
                    }}
                    labelFormatter={(label) => `Item: ${label}`}
                    contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                  {comparisonStates.map((state) => (
                    <Bar
                      key={state}
                      dataKey={state}
                      name={`${state} vs ${activeRefState}`}
                      fill={STATE_COLORS[state] || STATE_COLORS.Default}
                      radius={[4, 4, 0, 0]}
                      onClick={(data) => {
                        if (data?.rawRow) setSelectedRow(data.rawRow);
                      }}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={diffBarData}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 40, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip
                    formatter={(value: any, name: any, item: any) => {
                      if (value == null) return ['Rate unavailable', `${chart2TargetState} vs ${activeRefState}`];
                      const diffVal = item.payload?.diff_val;
                      const diffStr = diffVal != null ? ` (₹${diffVal > 0 ? '+' : ''}${diffVal})` : '';
                      return [`${value > 0 ? '+' : ''}${value}%${diffStr}`, `${chart2TargetState} vs ${activeRefState}`];
                    }}
                    contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar
                    dataKey={chart2TargetState}
                    name={`${chart2TargetState} vs ${activeRefState}`}
                    radius={[0, 4, 4, 0]}
                    onClick={(data) => {
                      if (data?.rawRow) setSelectedRow(data.rawRow);
                    }}
                  >
                    {diffBarData.map((entry, index) => {
                      const val = entry[chart2TargetState];
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={val == null ? '#94A3B8' : val >= 0 ? '#EF4444' : '#10B981'}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 3: Category-wise Median Spread */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">3. Category Median % Spread (Disparity Index)</h2>
              <p className="text-xs text-slate-500">Median of item-level inter-state % variation per civil discipline</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => exportChartAsSvg('chart-category-medians', 'Category_Median_Spread')}
                className="text-[10px] px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
                title="Export as SVG"
              >
                SVG
              </button>
              <button
                onClick={() => exportChartAsPng('chart-category-medians', 'Category_Median_Spread')}
                className="text-[10px] px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                title="Export as PNG"
              >
                PNG
              </button>
            </div>
          </div>

          <div id="chart-category-medians" className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  formatter={(value: any, name: any) => [`${value}%`, 'Median Spread']}
                  contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="median_spread" fill="#6366F1" radius={[4, 4, 0, 0]} name="Median Spread (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Highest vs Lowest Spread per Item */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">4. Highest vs Lowest Rate Spread (%)</h2>
              <p className="text-xs text-slate-500">Spread formula: ((Highest Rate - Lowest Rate) / Lowest Rate) × 100</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => exportChartAsSvg('chart-highest-lowest', 'Highest_Vs_Lowest_Spread')}
                className="text-[10px] px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
                title="Export as SVG"
              >
                SVG
              </button>
              <button
                onClick={() => exportChartAsPng('chart-highest-lowest', 'Highest_Vs_Lowest_Spread')}
                className="text-[10px] px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                title="Export as PNG"
              >
                PNG
              </button>
            </div>
          </div>

          <div id="chart-highest-lowest" className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={highestLowestData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `+${v}%`} />
                <Tooltip
                  formatter={(value: any, name: any, item: any) => [
                    `+${value}% (Highest: ₹${item.payload.highest_rate} [${item.payload.highest_state}], Lowest: ₹${item.payload.lowest_rate} [${item.payload.lowest_state}])`,
                    'Spread Above Lowest',
                  ]}
                  contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar
                  dataKey="pct_spread"
                  fill="#F59E0B"
                  radius={[4, 4, 0, 0]}
                  name="% Above Lowest"
                  onClick={(data) => {
                    if (data?.rawRow) setSelectedRow(data.rawRow);
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ─── CHART 5: HEATMAP MATRIX (ITEMS x STATES) ────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">5. Inter-State Rate Heatmap Matrix</h2>
            <p className="text-xs text-slate-500">
              Color intensity indicates rate relative to cross-state item mean (Green = Lower cost, Red = Higher cost)
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {filteredRows.length} Items × {dataset.availableStates.length} States
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-2.5 px-3">Canonical Work Item</th>
                <th className="py-2.5 px-2">Category</th>
                <th className="py-2.5 px-2">Unit</th>
                {dataset.availableStates.map((s) => (
                  <th key={s} className="py-2.5 px-3 text-right">
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.slice(0, 15).map((row) => {
                const rates = Object.values(row.states).filter((v) => v > 0);
                const avg = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;

                return (
                  <tr
                    key={row.group_id}
                    onClick={() => setSelectedRow(row)}
                    className="hover:bg-blue-50/50 cursor-pointer transition"
                  >
                    <td className="py-2 px-3 font-medium text-slate-800 max-w-xs truncate" title={row.canonical_name}>
                      {row.canonical_name}
                    </td>
                    <td className="py-2 px-2 text-slate-500">{row.category}</td>
                    <td className="py-2 px-2 font-mono text-slate-500">{row.canonical_unit}</td>
                    {dataset.availableStates.map((s) => {
                      const rate = row.states[s];
                      if (rate == null) {
                        return <td key={s} className="py-2 px-3 text-right text-slate-300">—</td>;
                      }
                      const dev = avg > 0 ? ((rate - avg) / avg) * 100 : 0;
                      let bgClass = 'bg-slate-50 text-slate-800';
                      if (dev > 15) bgClass = 'bg-rose-100 text-rose-900 font-bold';
                      else if (dev > 5) bgClass = 'bg-amber-100 text-amber-900';
                      else if (dev < -15) bgClass = 'bg-emerald-100 text-emerald-900 font-bold';
                      else if (dev < -5) bgClass = 'bg-emerald-50 text-emerald-800';

                      return (
                        <td key={s} className={`py-2 px-3 text-right font-mono ${bgClass}`}>
                          ₹{rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── STATE COMPARISON TABLE ──────────────────────────────────────── */}
      <div id="state-comparison-table-section" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              State Rate Schedule Comparison Matrix ({filteredRows.length} items)
            </h2>
            <p className="text-xs text-slate-500">
              Showing {(matrixPage - 1) * matrixPageSize + 1} to {Math.min(matrixPage * matrixPageSize, filteredRows.length)} of {filteredRows.length} items (Page {matrixPage} of {matrixTotalPages})
            </p>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500">Rows:</span>
              <select
                value={matrixPageSize}
                onChange={(e) => setMatrixPageSize(Number(e.target.value))}
                className="px-2 py-1 rounded border border-slate-200 bg-slate-50 font-medium text-slate-700"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setMatrixPage((p) => Math.max(1, p - 1))}
                disabled={matrixPage <= 1}
                className="px-2.5 py-1 rounded border border-slate-200 bg-slate-50 disabled:opacity-40 hover:bg-slate-100 font-medium text-slate-700 transition"
              >
                Prev
              </button>
              <span className="px-2 py-1 font-semibold text-slate-800">
                {matrixPage} / {matrixTotalPages}
              </span>
              <button
                onClick={() => setMatrixPage((p) => Math.min(matrixTotalPages, p + 1))}
                disabled={matrixPage >= matrixTotalPages}
                className="px-2.5 py-1 rounded border border-slate-200 bg-slate-50 disabled:opacity-40 hover:bg-slate-100 font-medium text-slate-700 transition"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Canonical Work Item</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-2">Unit</th>
                <th className="py-3 px-3">Tier</th>
                {dataset.availableStates.map((state) => (
                  <th key={state} className="py-3 px-3 text-right">
                    {state} (₹)
                  </th>
                ))}
                <th className="py-3 px-3 text-right">Highest State</th>
                <th className="py-3 px-3 text-right">Lowest State</th>
                <th className="py-3 px-3 text-right">% Above Lowest</th>
                <th className="py-3 px-3 text-center">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedMatrixRows.map((row) => {
                const isSelected = selectedRow?.group_id === row.group_id;
                return (
                  <tr
                    key={row.group_id}
                    onClick={() => setSelectedRow(row)}
                    className={`cursor-pointer transition hover:bg-blue-50/40 ${
                      isSelected ? 'bg-blue-50/80' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-medium text-slate-900 max-w-xs">
                      <div className="truncate" title={row.canonical_name}>
                        {row.canonical_name}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                        {row.category}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-slate-600 font-mono">{row.canonical_unit}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          row.tier === 'Tier 1 (Strong)'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {row.tier}
                      </span>
                    </td>
                    {dataset.availableStates.map((state) => {
                      const rate = row.states[state];
                      return (
                        <td key={state} className="py-3 px-3 text-right font-mono font-medium text-slate-800">
                          {rate != null ? `₹${rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                      );
                    })}
                    <td className="py-3 px-3 text-right text-slate-700">
                      <span className="font-semibold text-slate-900">
                        ₹{row.highest_rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>{' '}
                      <span className="text-[10px] text-slate-500">({row.highest_state})</span>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">
                      <span className="font-semibold text-slate-900">
                        ₹{row.lowest_rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>{' '}
                      <span className="text-[10px] text-slate-500">({row.lowest_state})</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-bold text-[11px] ${
                          row.pct_above_lowest > 40
                            ? 'bg-rose-100 text-rose-800'
                            : row.pct_above_lowest > 15
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        +{row.pct_above_lowest}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button className="text-blue-600 hover:text-blue-800 p-1">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    No comparison rows found matching current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Matrix Pagination Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
          <div>
            Showing {(matrixPage - 1) * matrixPageSize + 1} to {Math.min(matrixPage * matrixPageSize, filteredRows.length)} of {filteredRows.length} items
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setMatrixPage((p) => Math.max(1, p - 1))}
              disabled={matrixPage <= 1}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-100 font-medium text-slate-700 transition"
            >
              Previous
            </button>
            <span className="px-2 py-1 font-semibold text-slate-800">
              Page {matrixPage} of {matrixTotalPages}
            </span>
            <button
              onClick={() => setMatrixPage((p) => Math.min(matrixTotalPages, p + 1))}
              disabled={matrixPage >= matrixTotalPages}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-100 font-medium text-slate-700 transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ─── AI INSIGHTS SECTION (STRICT NUMBER VALIDATION & LABELS) ─────── */}
      <div id="ai-insights-section" className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">AI Civil Engineering Insights & Disparity Analytics</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">
            Strict Number Validation
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((ins) => (
            <div
              key={ins.id}
              className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-200 transition space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">{ins.title}</h3>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    ins.badge === 'Observed difference'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {ins.badge}
                </span>
              </div>

              <div className="text-xs text-indigo-900 font-medium bg-indigo-50/60 px-2.5 py-1 rounded">
                {ins.metric_summary}
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">{ins.narrative}</p>

              <div className="flex items-center gap-3 pt-1 border-t border-slate-200/60 text-[11px]">
                {ins.verified_numbers.map((vn, i) => (
                  <div key={i} className="text-slate-500">
                    <span className="text-slate-400">{vn.label}:</span>{' '}
                    <span className="font-semibold text-slate-700 font-mono">{vn.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      </>
      )}

      {/* ─── DETAIL MODAL / DRAWER FOR SELECTED ROW (CHART 6) ─────────────── */}
      {selectedRow && (
        <div id="item-detail-panel" className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  {selectedRow.category} • {selectedRow.tier}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedRow.canonical_name}</h3>
                <p className="text-xs text-slate-500">Normalized Unit: {selectedRow.canonical_unit}</p>
              </div>
              <button
                onClick={() => setSelectedRow(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Comparison Metrics */}
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400">Highest State:</span>
                <div className="font-bold text-slate-900 text-sm mt-0.5">
                  {selectedRow.highest_state} (₹{selectedRow.highest_rate})
                </div>
              </div>
              <div>
                <span className="text-slate-400">Lowest State:</span>
                <div className="font-bold text-slate-900 text-sm mt-0.5">
                  {selectedRow.lowest_state} (₹{selectedRow.lowest_rate})
                </div>
              </div>
              <div>
                <span className="text-slate-400">Inter-State Variance:</span>
                <div className="font-bold text-rose-600 text-sm mt-0.5">
                  +{selectedRow.pct_above_lowest}%
                </div>
              </div>
            </div>

            {/* State by State Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                State Specifications & Stored Cell Values
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(selectedRow.state_details).map(([state, d]) => (
                  <div key={state} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="font-bold text-slate-900 text-sm">{state}</span>
                      <span className="font-mono font-bold text-blue-700 text-sm">
                        ₹{d.rate_ex_gst.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ex-GST
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 space-y-1">
                      {d.item_no && <div>Item No: <span className="font-mono text-slate-800">{d.item_no}</span></div>}
                      {d.source_row && <div>Sheet Row: <span className="font-mono text-slate-800">Row {d.source_row}</span></div>}
                      {d.rate_as_stated != null && (
                        <div>
                          Rate As Stated: <span className="font-mono text-slate-800">₹{d.rate_as_stated}</span>
                        </div>
                      )}
                      <div>Unit: <span className="font-mono text-slate-800">{d.raw_unit || selectedRow.canonical_unit}</span></div>
                    </div>
                    <div className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded border border-slate-200/80 leading-relaxed">
                      {d.full_description || 'No full description'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRow(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADMIN PURGE CONFIRMATION MODAL ────────────────────────────── */}
      {showPurgeModal && (
        <div id="purge-modal-dialog" className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Admin Data Management</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Select purge scope. Test data purge only removes records with <code>is_test = true</code>. A full purge resets all live database tables and requires typing <strong>PURGE</strong>.
            </p>
            <div className="space-y-3 pt-2">
              <button
                onClick={() => handlePurge(true)}
                disabled={isPurging}
                className="w-full py-2.5 text-xs font-bold rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition px-4 flex items-center justify-between"
              >
                <span>Purge Test Data Only (Keep Real Files)</span>
                <span className="text-[10px] bg-amber-200 px-2 py-0.5 rounded font-mono">is_test = true</span>
              </button>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                <label className="text-[11px] font-semibold text-rose-800 block">
                  Full Purge (Reset All Live DB Data): Type &quot;PURGE&quot; to confirm
                </label>
                <input
                  type="text"
                  value={purgeConfirmationText}
                  onChange={(e) => setPurgeConfirmationText(e.target.value)}
                  placeholder="Type PURGE to enable"
                  className="w-full text-xs px-3 py-2 border border-rose-300 rounded-lg bg-white font-mono focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                />
                <button
                  onClick={() => handlePurge(false)}
                  disabled={isPurging || purgeConfirmationText.trim() !== 'PURGE'}
                  className="w-full py-2 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isPurging ? 'Purging Live DB...' : 'Execute Full Live Purge'}
                </button>
              </div>

              <button
                onClick={() => {
                  setShowPurgeModal(false);
                  setPurgeConfirmationText('');
                }}
                className="w-full py-2 text-xs font-medium text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
