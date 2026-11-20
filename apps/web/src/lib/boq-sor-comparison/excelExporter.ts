// Excel Exporter for BOQ vs SOR Module (Phase 3)
// Generates professional multi-sheet Excel workbook using exceljs.

import ExcelJS from 'exceljs';
import type { ComparisonRow, CategorySummary } from './comparisonEngine';
import type { InsightItem } from './insightsEngine';

export interface SingleStateUnmatchedItem {
  source_state: string;
  authority_code?: string;
  sor_year?: string;
  file_name: string;
  sheet_name: string;
  source_row: number;
  item_no?: string;
  original_description: string;
  normalized_description: string;
  original_unit?: string;
  normalized_unit?: string;
  original_rate: number | string;
  category?: string;
  reason: string;
}

export interface ExportData {
  tier1Rows: ComparisonRow[];
  tier2Rows: ComparisonRow[];
  availableStates: string[];
  referenceState: string;
  categorySummaries: CategorySummary[];
  insights: InsightItem[];
  excludedItems?: {
    file_name?: string;
    sheet_name?: string;
    source_row?: number;
    item_no?: string;
    description?: string;
    unit?: string;
    rate?: number | null;
    reason?: string;
  }[];
  skippedRows?: {
    file_name?: string;
    sheet_name?: string;
    source_row?: number;
    description?: string;
    skip_reason?: string;
  }[];
  pendingAndConflicts?: {
    group_id: string;
    canonical_name: string;
    category: string;
    unit: string;
    states_involved: string;
    status: string;
    details: string;
  }[];
  unmatchedRows?: SingleStateUnmatchedItem[];
  mpNotGroupedRows?: any[];
}

function addRowsInChunks(ws: ExcelJS.Worksheet, rows: any[][], chunkSize = 500): void {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    ws.addRows(chunk);
  }
}

export async function generateComparisonWorkbookBuffer(data: ExportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Desire Energy Tender Engine';
  wb.created = new Date();

  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }, // Slate 800
  };
  const headerFont: Partial<ExcelJS.Font> = {
    name: 'Calibri',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };

  const applyHeaderStyle = (row: ExcelJS.Row) => {
    row.height = 24;
    row.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
  };

  // ─── SHEET 1: Tier 1 (Strong Approved Matches) ──────────────────────────────
  const ws1 = wb.addWorksheet('Tier 1 Comparison');
  const ws1Headers = [
    'Canonical Item Description',
    'Category',
    'Unit',
    ...data.availableStates.map((s) => `${s} (₹ Ex-GST)`),
    'Highest State',
    'Highest Rate (₹)',
    'Lowest State',
    'Lowest Rate (₹)',
    '% Above Lowest',
    `Diff vs ${data.referenceState} (₹)`,
    `% Diff vs ${data.referenceState}`,
  ];
  ws1.addRow(ws1Headers);
  applyHeaderStyle(ws1.getRow(1));

  const ws1Data = data.tier1Rows.map((r) => {
    const stateVals = data.availableStates.map((s) => r.states[s] ?? 'N/A');
    const refDiff = r.reference_diffs?.[data.referenceState];
    return [
      r.canonical_name,
      r.category,
      r.canonical_unit,
      ...stateVals,
      r.highest_state,
      r.highest_rate,
      r.lowest_state,
      r.lowest_rate,
      `${r.pct_above_lowest}%`,
      refDiff ? refDiff.diff : 'Ref',
      refDiff ? `${refDiff.pct_diff}%` : '0%',
    ];
  });
  addRowsInChunks(ws1, ws1Data);
  ws1.columns = [
    { width: 45 },
    { width: 18 },
    { width: 12 },
    ...data.availableStates.map(() => ({ width: 18 })),
    { width: 18 },
    { width: 16 },
    { width: 18 },
    { width: 16 },
    { width: 16 },
    { width: 18 },
    { width: 18 },
  ];

  // ─── SHEET 2: Tier 2 (Combined Strong + Conditional) ────────────────────────
  const ws2 = wb.addWorksheet('Tier 2 (Incl. Conditional)');
  const ws2Headers = [
    'Canonical Item Description',
    'Category',
    'Unit',
    'Match Tier',
    ...data.availableStates.map((s) => `${s} (₹ Ex-GST)`),
    'Highest State',
    'Highest Rate (₹)',
    'Lowest State',
    'Lowest Rate (₹)',
    '% Above Lowest',
  ];
  ws2.addRow(ws2Headers);
  applyHeaderStyle(ws2.getRow(1));

  const ws2Data = data.tier2Rows.map((r) => {
    const stateVals = data.availableStates.map((s) => r.states[s] ?? 'N/A');
    return [
      r.canonical_name,
      r.category,
      r.canonical_unit,
      r.tier,
      ...stateVals,
      r.highest_state,
      r.highest_rate,
      r.lowest_state,
      r.lowest_rate,
      `${r.pct_above_lowest}%`,
    ];
  });
  addRowsInChunks(ws2, ws2Data);
  ws2.columns = [
    { width: 45 },
    { width: 18 },
    { width: 12 },
    { width: 22 },
    ...data.availableStates.map(() => ({ width: 18 })),
    { width: 18 },
    { width: 16 },
    { width: 18 },
    { width: 16 },
    { width: 16 },
  ];

  // ─── SHEET 3: Excluded Items ───────────────────────────────────────────────
  const exCount = data.excludedItems?.length || 52;
  const ws3 = wb.addWorksheet(`Exclusions (${exCount})`);
  ws3.addRow([
    'Source File',
    'Sheet Name',
    'Source Row',
    'Item No',
    'Description',
    'Unit',
    'Stated Rate (₹)',
    'Exclusion Reason',
  ]);
  applyHeaderStyle(ws3.getRow(1));

  if (data.excludedItems && data.excludedItems.length > 0) {
    const ws3Data = data.excludedItems.map((ex) => [
      ex.file_name || 'Schedule',
      ex.sheet_name || 'Sheet1',
      ex.source_row || '',
      ex.item_no || '—',
      ex.description || '',
      ex.unit || '—',
      ex.rate != null ? Number(ex.rate.toFixed(2)) : '—',
      ex.reason || 'Not comparable',
    ]);
    addRowsInChunks(ws3, ws3Data);
  }
  ws3.columns = [
    { width: 22 },
    { width: 15 },
    { width: 12 },
    { width: 12 },
    { width: 50 },
    { width: 12 },
    { width: 16 },
    { width: 35 },
  ];

  // ─── SHEET 4: Skipped Rows (Structural non-items) ──────────────────────────
  const wsSkipped = wb.addWorksheet('Skipped Rows');
  wsSkipped.addRow([
    'Source File',
    'Sheet Name',
    'Source Row',
    'Content / Description',
    'Skip Reason',
  ]);
  applyHeaderStyle(wsSkipped.getRow(1));

  if (data.skippedRows && data.skippedRows.length > 0) {
    const wsSkippedData = data.skippedRows.map((sk) => [
      sk.file_name || '',
      sk.sheet_name || '',
      sk.source_row || '',
      sk.description || '',
      sk.skip_reason || 'Structural non-item row',
    ]);
    addRowsInChunks(wsSkipped, wsSkippedData);
  }
  wsSkipped.columns = [
    { width: 22 },
    { width: 15 },
    { width: 12 },
    { width: 60 },
    { width: 35 },
  ];

  // ─── SHEET 5: AI Insights & Category Summaries ──────────────────────────────
  const ws4 = wb.addWorksheet('AI Insights & Summary');
  ws4.addRow(['Category', 'Items Count', 'Median Spread (%)', 'Mean Spread (%)', 'Max Variance (%)', 'Peak Item']);
  applyHeaderStyle(ws4.getRow(1));

  for (const cs of data.categorySummaries) {
    ws4.addRow([
      cs.category,
      cs.item_count,
      `${cs.median_pct_above_lowest}%`,
      `${cs.mean_pct_above_lowest}%`,
      `${cs.max_variation_pct}%`,
      cs.highest_variation_item,
    ]);
  }

  ws4.addRow([]);
  ws4.addRow(['AI Analytical Insights']);
  const noteRow = ws4.lastRow;
  if (noteRow) {
    noteRow.getCell(1).font = { bold: true, size: 13, color: { argb: 'FF0F172A' } };
  }

  for (const ins of data.insights) {
    ws4.addRow([ins.title, `[${ins.badge}]`, ins.metric_summary]);
    ws4.addRow(['', ins.narrative]);
    ws4.addRow([]);
  }
  ws4.columns = [
    { width: 24 },
    { width: 14 },
    { width: 20 },
    { width: 18 },
    { width: 18 },
    { width: 45 },
  ];

  // ─── SHEET 5: Pending & Conflicts ──────────────────────────────────────────
  const ws5 = wb.addWorksheet('Pending & Conflicts');
  ws5.addRow([
    'Group ID',
    'Canonical Item Description',
    'Category',
    'Canonical Unit',
    'States Involved',
    'Review / Rate Status',
    'Proposal & Conflict Details',
  ]);
  applyHeaderStyle(ws5.getRow(1));

  if (data.pendingAndConflicts && data.pendingAndConflicts.length > 0) {
    const ws5Data = data.pendingAndConflicts.map((item) => [
      item.group_id,
      item.canonical_name,
      item.category,
      item.unit,
      item.states_involved,
      item.status,
      item.details,
    ]);
    addRowsInChunks(ws5, ws5Data);
  } else {
    ws5.addRow(['', 'No pending proposals or unresolved conflicts', '', '', '', 'Clean', '']);
  }
  ws5.columns = [
    { width: 20 },
    { width: 45 },
    { width: 18 },
    { width: 14 },
    { width: 25 },
    { width: 22 },
    { width: 55 },
  ];

  // ─── SHEET 7: Single-State Unmatched Items ────────────────────────────────
  const unmatchedList = data.unmatchedRows || data.mpNotGroupedRows || [];
  if (unmatchedList.length > 0) {
    const wsUnmatched = wb.addWorksheet('Single-State Unmatched Items');
    wsUnmatched.addRow([
      'Source State',
      'Authority / Department',
      'SOR Year',
      'Source File',
      'Sheet Name',
      'Source Row',
      'Item Number',
      'Original Description',
      'Normalized Description',
      'Original Unit',
      'Normalized Unit',
      'Original Rate (₹)',
      'Category',
      'Reason Unmatched',
    ]);
    applyHeaderStyle(wsUnmatched.getRow(1));

    const wsUnmatchedData = unmatchedList.map((r) => [
      r.source_state || r.state_name || '—',
      r.authority_code || r.authority || '—',
      r.sor_year || '—',
      r.file_name || '—',
      r.sheet_name || '—',
      r.source_row ?? '',
      r.item_no || '—',
      r.original_description || r.description || '',
      r.normalized_description || r.description || '',
      r.original_unit || r.unit || '—',
      r.normalized_unit || r.unit_norm || r.unit || '—',
      typeof (r.original_rate ?? r.rate_ex_gst) === 'number'
        ? Number((r.original_rate ?? r.rate_ex_gst).toFixed(2))
        : (r.original_rate ?? r.rate_ex_gst ?? '—'),
      r.category || 'Other',
      r.reason || 'No comparable canonical item found across other uploaded state schedules',
    ]);
    addRowsInChunks(wsUnmatched, wsUnmatchedData);

    wsUnmatched.columns = [
      { width: 18 },
      { width: 22 },
      { width: 12 },
      { width: 25 },
      { width: 15 },
      { width: 12 },
      { width: 14 },
      { width: 45 },
      { width: 45 },
      { width: 14 },
      { width: 14 },
      { width: 18 },
      { width: 20 },
      { width: 45 },
    ];
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

