// State Consolidator: Groups files of the same state into ONE group.
// Consolidates identical items within a state, listing all source rows.
// Flags differing rates within a state without blind averaging.
import type { ConsolidatedStateItem, SorItemRecord } from './types';

function cleanText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[–—_]/g, '-')
    .replace(/[^a-z0-9.%+\-/ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function consolidateStateItems(
  items: (SorItemRecord & { filename?: string })[],
): Record<string, ConsolidatedStateItem[]> {
  const stateMap: Record<string, Map<string, ConsolidatedStateItem>> = {};

  for (const item of items) {
    // Exclude items with missing units, zero rate, or unpriced from cross-state comparison
    if (
      !item.unit ||
      item.flag_notes?.includes('unit_missing') ||
      item.flag_notes?.includes('zero_rate') ||
      item.rate_ex_gst == null ||
      item.rate_ex_gst <= 0
    ) {
      continue;
    }

    const state = item.state_name;
    if (!stateMap[state]) {
      stateMap[state] = new Map();
    }

    const itemKey = `${cleanText(item.full_description)}||${item.unit_norm}`;
    const existing = stateMap[state].get(itemKey);

    const sourceEntry = {
      file_id: item.file_id,
      filename: item.filename || 'unknown',
      sheet_name: item.sheet_name,
      source_row: item.source_row,
      rate_ex_gst: item.rate_ex_gst,
      rate_as_stated: item.rate_as_stated,
    };

    if (!existing) {
      stateMap[state].set(itemKey, {
        state_name: state,
        full_description: item.full_description,
        unit_norm: item.unit_norm || item.unit || 'unit',
        category: item.category,
        is_addon: item.is_addon,
        is_percentage_based: item.is_percentage_based,
        is_lump_sum: item.is_lump_sum,
        rate_ex_gst: item.rate_ex_gst,
        rate_as_stated: item.rate_as_stated,
        rates_differ: false,
        state_rate_conflict: false,
        distinct_rates: item.rate_ex_gst != null ? [item.rate_ex_gst] : [],
        sources: [sourceEntry],
      });
    } else {
      existing.sources.push(sourceEntry);

      if (item.rate_ex_gst != null) {
        if (!existing.distinct_rates.includes(item.rate_ex_gst)) {
          existing.distinct_rates.push(item.rate_ex_gst);
        }
      }

      // If multiple distinct rates exist, flag as differing / state_rate_conflict
      if (existing.distinct_rates.length > 1) {
        existing.rates_differ = true;
        existing.state_rate_conflict = true;
        existing.rate_ex_gst = null; // Never average! Must be selected by user
      }
    }
  }

  const result: Record<string, ConsolidatedStateItem[]> = {};
  for (const [st, map] of Object.entries(stateMap)) {
    result[st] = Array.from(map.values());
  }

  return result;
}

