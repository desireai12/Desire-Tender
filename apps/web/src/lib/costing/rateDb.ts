// Rate database: built from a fully costed BOQ, then used to cost new BOQs.
import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import { boqSheet, loadWorkbook, parseSheet, type BoqRow } from './boq';
import {
  buildEffectiveDesc,
  looseKey,
  normUnit,
  resolveCanonicalScope,
  strictKey,
} from './normalize';
import { extractRuleFingerprint, type CostingItemFingerprint } from './itemFingerprint';

export type RateRule =
  | { kind: 'FIXED' }
  | { kind: 'PCT_OF_TOTAL'; pct: number }; // e.g. O&M = 5% of the sum of all other line amounts

export interface RateRecord {
  id: string;                 // strict_key + occurrence
  strict_key: string;
  loose_key: string;
  occurrence: number;         // n-th line with the same strict_key in the source BOQ
  source_sl: string | null;
  source_row: number;
  scope: string | null;
  scope_of_work: string | null; // raw scope text from source BOQ
  scope_key: string | null;     // canonical scope key
  scope_source?: string;
  scope_confidence?: string;
  headers: string[];
  description: string;
  effective_desc: string;      // description with nearest parent item context for bare items
  unit: string | null;
  unit_norm: string;
  tender_est_rate: number | null;   // informational only (incl. GST)
  purchase_rate: number | null;     // J  (null = left blank in bid)
  execution_rate: number | null;    // K
  purchase_basis: string | null;    // original Excel formula, audit only
  execution_basis: string | null;
  rule: RateRule;
  priced: boolean;                  // false = bid left both J and K blank
  fingerprint?: CostingItemFingerprint | null;
}

export interface RateDb {
  schema: 'boq-rate-db/1';
  source_file: string;
  source_sha256: string;
  built_at: string;
  record_count: number;
  records: RateRecord[];
}

const PCT_RE = /^=SUM\(L\d+:L\d+\)\*\s*([\d.]+)%$/i;

export function detectRule(r: BoqRow): RateRule {
  const m = r.executionBasis?.replace(/\s+/g, '').match(PCT_RE);
  // Apply percentage logic ONLY when description or formula contains explicit "%"
  const hasPct = (r.desc && r.desc.includes('%')) || (r.executionBasis && r.executionBasis.includes('%'));
  if (m && hasPct) {
    return { kind: 'PCT_OF_TOTAL', pct: parseFloat(m[1]) / 100 };
  }
  return { kind: 'FIXED' };
}

export async function buildRateDb(xlsxPath: string, fileHash: string): Promise<RateDb> {
  const wb = await loadWorkbook(xlsxPath);
  const rows = parseSheet(boqSheet(wb)).filter((r) => r.isItem);
  const seen = new Map<string, number>();

  const records: RateRecord[] = rows.map((r) => {
    const scopeRes = resolveCanonicalScope(r.scope, r.desc, r.headers);
    const scopeKey = scopeRes.scopeKey || null;
    const effDesc = buildEffectiveDesc(r.desc, r.parentItemText);

    const sk = strictKey({
      desc: r.desc,
      effectiveDesc: effDesc,
      headers: r.headers,
      unit: r.unit,
      scope: r.scope,
      scopeKey,
    });
    const lk = looseKey({
      desc: r.desc,
      effectiveDesc: effDesc,
      headers: r.headers,
      unit: r.unit,
      scope: r.scope,
      scopeKey,
    });

    const occ = (seen.get(sk) ?? 0) + 1;
    seen.set(sk, occ);
    const rule = detectRule(r);

    const fingerprint = extractRuleFingerprint({
      description: effDesc,
      parentChain: r.headers,
      unit: r.unit,
      scope: r.scope,
    });

    return {
      id: `${sk}-${occ}`,
      strict_key: sk,
      loose_key: lk,
      occurrence: occ,
      source_sl: r.sl,
      source_row: r.row,
      scope: r.scope,
      scope_of_work: r.scope,
      scope_key: scopeKey,
      scope_source: scopeRes.source,
      scope_confidence: scopeRes.confidence,
      headers: r.headers,
      description: r.desc,
      effective_desc: effDesc,
      unit: r.unit,
      unit_norm: normUnit(r.unit),
      tender_est_rate: r.estRate,
      purchase_rate: rule.kind === 'PCT_OF_TOTAL' ? null : r.purchaseRate,
      execution_rate: rule.kind === 'PCT_OF_TOTAL' ? null : r.executionRate,
      purchase_basis: r.purchaseBasis,
      execution_basis: r.executionBasis,
      rule,
      priced: rule.kind === 'PCT_OF_TOTAL' || r.purchaseRate != null || r.executionRate != null,
      fingerprint,
    };
  });

  return {
    schema: 'boq-rate-db/1',
    source_file: basename(xlsxPath),
    source_sha256: fileHash,
    built_at: new Date().toISOString(),
    record_count: records.length,
    records,
  };
}

export const sha256 = (buf: Buffer) => createHash('sha256').update(buf).digest('hex');
