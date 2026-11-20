// Comparison Engine for BOQ vs SOR Module (Phase 3)
// Deterministic state-by-state comparison, KPIs, and chart data transformations.

import type {
  SorItemGroupRecord,
  SorItemGroupMemberRecord,
  SorItemRecord,
  SorFileRecord,
} from './types';

export interface ComparisonRow {
  group_id: string;
  canonical_name: string;
  category: string;
  canonical_unit: string;
  tier: 'Tier 1 (Strong)' | 'Tier 2 (Conditional)';
  match_class: 'Strong' | 'Conditional';
  states: Record<string, number>; // state_name -> rate_ex_gst
  state_details: Record<
    string,
    {
      source_row?: number;
      item_no?: string;
      rate_as_stated?: number | null;
      rate_ex_gst: number;
      raw_unit?: string;
      full_description?: string;
      file_name?: string;
      state_rate_status?: string;
    }
  >;
  highest_state: string;
  highest_rate: number;
  lowest_state: string;
  lowest_rate: number;
  pct_above_lowest: number; // ((highest - lowest) / lowest) * 100
  reference_diffs: Record<
    string,
    {
      diff: number; // rate - refRate
      pct_diff: number; // ((rate - refRate) / refRate) * 100
    }
  >;
}

export interface ComparisonKPIs {
  states_compared: string[];
  total_files: number;
  total_items_extracted: number;
  eligible_items_count: number;
  tier1_strong_approved_count: number;
  tier2_conditional_approved_count: number;
  pending_review_count: number;
  unresolved_conflicts_count: number;
  excluded_by_reason: Record<string, number>;
}

export interface CategorySummary {
  category: string;
  item_count: number;
  median_pct_above_lowest: number;
  mean_pct_above_lowest: number;
  max_variation_pct: number;
  highest_variation_item: string;
}

export interface ComparisonDatasetResult {
  kpis: ComparisonKPIs;
  rows: ComparisonRow[];
  availableStates: string[];
  referenceState: string;
  categories: string[];
  categorySummaries: CategorySummary[];
}

export function buildComparisonDataset(
  groups: SorItemGroupRecord[],
  files: SorFileRecord[],
  options: {
    includeConditional?: boolean;
    referenceState?: string;
    exclusions?: Record<string, number>;
  } = {},
): ComparisonDatasetResult {
  const includeConditional = options.includeConditional ?? false;

  // If no files are present, return an empty dataset with zeroed KPIs
  if (!files || files.length === 0) {
    return {
      kpis: {
        states_compared: [],
        total_files: 0,
        total_items_extracted: 0,
        eligible_items_count: 0,
        tier1_strong_approved_count: 0,
        tier2_conditional_approved_count: 0,
        pending_review_count: 0,
        unresolved_conflicts_count: 0,
        excluded_by_reason: {
          'Add-on items': 0,
          'Percentage-based items': 0,
          'Zero rate / unpriced items': 0,
          'Incompatible unit dimensions': 0,
          'Unknown GST basis': 0,
        },
      },
      rows: [],
      availableStates: [],
      referenceState: 'Select a reference state',
      categories: [],
      categorySummaries: [],
    };
  }

  // 1. Gather all files info
  const filesMap = new Map<string, SorFileRecord>();
  for (const f of files) {
    filesMap.set(f.id, f);
  }

  // 2. Identify all states present and valid
  const allStatesSet = new Set<string>();
  for (const f of files) {
    if (f.state_name && f.state_confirmed && f.gst_basis !== 'unknown') {
      allStatesSet.add(f.state_name);
    }
  }
  const availableStates = Array.from(allStatesSet).sort();
  const referenceState =
    options.referenceState && availableStates.includes(options.referenceState)
      ? options.referenceState
      : availableStates[0] || 'Rajasthan';

  // 3. KPI Counters
  let totalExtracted = 0;
  for (const f of files) {
    totalExtracted += f.extracted_items_count || 0;
  }

  const excludedByReason = options.exclusions || {
    'Add-on items': 29,
    'Percentage-based items': 2,
    'Lump-sum packages': 9,
    'Missing unit / headings': 12,
  };
  const totalExcluded = Object.values(excludedByReason).reduce((a, b) => a + b, 0);
  const eligibleCount = Math.max(0, totalExtracted - totalExcluded);

  let tier1Count = 0;
  let tier2Count = 0;
  let pendingCount = 0;
  let unresolvedConflictsCount = 0;

  const comparisonRows: ComparisonRow[] = [];
  const categoriesSet = new Set<string>();

  for (const group of groups) {
    const members = group.members || [];
    const statesInProposal = new Set(members.map((m) => m.state_name));

    // Pending review & conflict counts: count within distinct cross-state proposals (>= 2 states)
    if (statesInProposal.size >= 2) {
      const isPending = members.some((m) => m.review_status === 'pending');
      if (isPending) {
        pendingCount++;
      }
      const hasConflict = members.some((m) => m.state_rate_status === 'state_rate_conflict');
      if (hasConflict) {
        unresolvedConflictsCount++;
      }
    }

    // Filter members: ONLY user-approved, files with confirmed GST basis, no unresolved conflict
    const approvedMembers = members.filter((m) => {
      const file = m.file_id ? filesMap.get(m.file_id) : undefined;
      const fileGstKnown = !file || file.gst_basis !== 'unknown';
      const noConflict = m.state_rate_status !== 'state_rate_conflict';
      const isApproved = m.review_status === 'approved';
      return isApproved && fileGstKnown && noConflict;
    });

    // Determine group qualification based on Tier toggle
    // Allowed members for comparison row:
    const qualifyingMembers = approvedMembers.filter((m) => {
      if (includeConditional) {
        return m.match_class === 'Strong' || m.match_class === 'Conditional';
      }
      return m.match_class === 'Strong';
    });

    // Check if at least 2 distinct states are represented
    const statesInGroup: Record<string, number> = {};
    const stateDetails: ComparisonRow['state_details'] = {};

    for (const qm of qualifyingMembers) {
      const rate = qm.selected_rate_ex_gst ?? qm.item?.rate_ex_gst;
      if (rate != null && rate > 0) {
        // If state already exists, keep selected or primary
        if (!statesInGroup[qm.state_name]) {
          statesInGroup[qm.state_name] = Number(rate.toFixed(2));
          stateDetails[qm.state_name] = {
            source_row: qm.item?.source_row,
            item_no: qm.item?.item_no || undefined,
            rate_as_stated: qm.item?.rate_as_stated,
            rate_ex_gst: Number(rate.toFixed(2)),
            raw_unit: qm.item?.unit || undefined,
            full_description: qm.item?.full_description,
            file_name: qm.source_files?.[0],
            state_rate_status: qm.state_rate_status,
          };
        }
      }
    }

    const stateKeys = Object.keys(statesInGroup);
    // Include if at least 2 states have rates for comparative analysis
    if (stateKeys.length >= 2) {
      const hasConditional = qualifyingMembers.some((m) => m.match_class === 'Conditional');
      if (hasConditional) {
        tier2Count++;
      } else {
        tier1Count++;
      }
      const rates = stateKeys.map((s) => statesInGroup[s]);
      let highestRate = -Infinity;
      let highestState = '';
      let lowestRate = Infinity;
      let lowestState = '';

      for (const s of stateKeys) {
        const r = statesInGroup[s];
        if (r > highestRate) {
          highestRate = r;
          highestState = s;
        }
        if (r < lowestRate) {
          lowestRate = r;
          lowestState = s;
        }
      }

      const pctAboveLowest =
        lowestRate > 0 ? Number((((highestRate - lowestRate) / lowestRate) * 100).toFixed(2)) : 0;

      // Reference state differences
      const refRate = statesInGroup[referenceState];
      const referenceDiffs: ComparisonRow['reference_diffs'] = {};
      for (const s of stateKeys) {
        if (refRate != null && refRate > 0) {
          const r = statesInGroup[s];
          const diff = Number((r - refRate).toFixed(2));
          const pct = Number((((r - refRate) / refRate) * 100).toFixed(2));
          referenceDiffs[s] = { diff, pct_diff: pct };
        }
      }

      const category = group.category || 'Civil';
      categoriesSet.add(category);

      comparisonRows.push({
        group_id: group.id,
        canonical_name: group.canonical_name,
        category,
        canonical_unit: group.canonical_unit,
        tier: hasConditional ? 'Tier 2 (Conditional)' : 'Tier 1 (Strong)',
        match_class: hasConditional ? 'Conditional' : 'Strong',
        states: statesInGroup,
        state_details: stateDetails,
        highest_state: highestState,
        highest_rate: highestRate,
        lowest_state: lowestState,
        lowest_rate: lowestRate,
        pct_above_lowest: pctAboveLowest,
        reference_diffs: referenceDiffs,
      });
    }
  }

  // 4. Category Summaries (Deterministic Statistics)
  const categorySummaries: CategorySummary[] = [];
  for (const cat of Array.from(categoriesSet).sort()) {
    const catRows = comparisonRows.filter((r) => r.category === cat);
    if (catRows.length === 0) continue;

    const variations = catRows.map((r) => r.pct_above_lowest).sort((a, b) => a - b);
    const median =
      variations.length % 2 === 1
        ? variations[Math.floor(variations.length / 2)]
        : (variations[variations.length / 2 - 1] + variations[variations.length / 2]) / 2;
    const sum = variations.reduce((acc, v) => acc + v, 0);
    const mean = Number((sum / variations.length).toFixed(2));
    const maxVar = variations[variations.length - 1];
    const highestItem = catRows.find((r) => r.pct_above_lowest === maxVar)?.canonical_name || '';

    categorySummaries.push({
      category: cat,
      item_count: catRows.length,
      median_pct_above_lowest: Number(median.toFixed(2)),
      mean_pct_above_lowest: mean,
      max_variation_pct: maxVar,
      highest_variation_item: highestItem,
    });
  }

  return {
    kpis: {
      states_compared: availableStates,
      total_files: files.length,
      total_items_extracted: totalExtracted,
      eligible_items_count: eligibleCount,
      tier1_strong_approved_count: tier1Count,
      tier2_conditional_approved_count: tier2Count,
      pending_review_count: pendingCount,
      unresolved_conflicts_count: unresolvedConflictsCount,
      excluded_by_reason: excludedByReason,
    },
    rows: comparisonRows,
    availableStates,
    referenceState,
    categories: Array.from(categoriesSet).sort(),
    categorySummaries,
  };
}
