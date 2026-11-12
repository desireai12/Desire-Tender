// Text/unit/scope normalisation + fingerprints used to match BOQ lines to the rate DB.
import { createHash } from 'node:crypto';
import type { BoqRow } from './boq';
import { normalizeScope, resolveCanonicalScope } from './scopeAliases';

export { normalizeScope, resolveCanonicalScope };

export function normText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/(\d)\s*(mm|kw|hp|kva|kvar|sqmm|sq\.?\s*mm|mld|klh)\b/g, '$1$2')
    .replace(/\bdia(meter)?\.?\b/g, 'dia')
    .replace(/[^a-z0-9.%+\-/ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const UNIT_MAP: Record<string, string> = {
  // canonical: nos
  each: 'nos', 'each.': 'nos', no: 'nos', 'no.': 'nos', nos: 'nos', 'nos.': 'nos',
  // canonical: rm
  rmt: 'rm', 'rmt.': 'rm', rm: 'rm', 'rm.': 'rm', mtr: 'rm', 'mtr.': 'rm',
  meter: 'rm', 'meter.': 'rm', metre: 'rm', 'metre.': 'rm', 'r. mtr': 'rm', 'r.mtr': 'rm',
  // canonical: cum
  cum: 'cum', 'cu.m': 'cum', 'cu. m': 'cum', 'cu.m.': 'cum',
  // other units
  sqm: 'sqm', sqmt: 'sqm', 'sq.m': 'sqm', 'sq.mt': 'sqm',
  kg: 'kg', 'kg.': 'kg',
  litre: 'litre', 'per litre': 'litre', ltr: 'litre',
  'p.point': 'point', 'p. point': 'point', point: 'point',
  klh: 'klh', kvar: 'kvar', hectare: 'ha', ha: 'ha',
  set: 'set', sets: 'set', lot: 'lot', job: 'job', jobs: 'job',
};

export function normUnit(u: string | null | undefined): string {
  if (!u) return '';
  const k = u.toLowerCase().replace(/\s+/g, ' ').trim();
  return UNIT_MAP[k] ?? k;
}

const h = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 16);

/**
 * ORDERED NUMBER SIGNATURE:
 * Extracts numbers in their exact order of appearance, joined with the unit/word that follows each number.
 * Ensures "Discharge 20 to 30 LPS and head 61 to 70 M" !== "Discharge 61 to 70 LPS and head 20 to 30 M".
 */
export function orderedNumberSig(s: string): string {
  if (!s) return '';
  const norm = s
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/[^a-z0-9.%+\-/ ]+/g, ' ')
    .replace(/\s+/g, ' ');

  // Match sequences of numbers with optional prefix (e.g. m10) and optional range (e.g. 20 to 30 lps)
  const regex = /(?:([a-z]+)\s*)?(\d+(?:\.\d+)?)(?:\s*(?:to|-)\s*(\d+(?:\.\d+)?))?(?:\s*([a-z%]+))?/g;
  const parts: string[] = [];
  let m: RegExpExecArray | null;

  while ((m = regex.exec(norm)) !== null) {
    const prefix = (m[1] || '').trim();
    const n1 = m[2];
    const n2 = m[3];
    let u = (m[4] || '').trim();

    // normalize units in signature
    if (/^(lps|l\/s)/.test(u)) u = 'lps';
    else if (/^(mm|millimeter|mmdia)/.test(u)) u = 'mm';
    else if (/^(m|meter|metre|mtr)$/.test(u)) u = 'm';
    else if (/^(kw|kilowatt)/.test(u)) u = 'kw';
    else if (/^(hp|horsepower)/.test(u)) u = 'hp';
    else if (/^(cum|cu\.?m)/.test(u)) u = 'cum';
    else if (/^(sqm|sqmt)/.test(u)) u = 'sqm';
    else if (/^(kg|kilogram)/.test(u)) u = 'kg';
    else if (/^klh/.test(u)) u = 'klh';
    else if (/^mld/.test(u)) u = 'mld';
    else if (u === '%') u = 'pct';
    else if (/^kvar/.test(u)) u = 'kvar';
    else if (/^kva/.test(u)) u = 'kva';

    // handle M10, M15 concrete grades
    if (prefix === 'm' && !u) {
      u = 'm';
    }

    if (n2) {
      parts.push(`${n1}${u}`, `${n2}${u}`);
    } else {
      parts.push(`${n1}${u}`);
    }
  }

  return parts.join('_');
}

/** Backward compatibility signature check */
export const numberSig = orderedNumberSig;

/** Checks if an item description is short and generic (needs parent item context) */
export function isBareItem(desc: string): boolean {
  const d = desc.trim().toLowerCase();
  if (d.length <= 35) return true;
  if (/^\d+(\.\d+)?\s*(mm|m|kw|hp|dia|kva|klh|mld)\b/.test(d) && !d.includes('providing') && !d.includes('supply') && !d.includes('lay')) {
    return true;
  }
  if (/^(cost of|net quantity|balance quantity)\b/.test(d)) return true;
  return false;
}

/** Builds effective description: nearest parent item text + bare item text */
export function buildEffectiveDesc(desc: string, parentText?: string | null): string {
  const cleanDesc = desc.trim();
  if (!parentText) return cleanDesc;
  if (isBareItem(cleanDesc)) {
    return `${parentText.trim()} ${cleanDesc}`.trim();
  }
  return cleanDesc;
}

/** Strict key: scope_key + whole header chain + effective_desc + unit. */
export function strictKey(r: {
  desc: string;
  effectiveDesc?: string;
  headers: string[];
  unit: string | null;
  scope?: string | null;
  scopeKey?: string | null;
}): string {
  const scopeKey = r.scopeKey ?? resolveCanonicalScope(r.scope, r.desc, r.headers).scopeKey;
  const desc = r.effectiveDesc || r.desc;
  return h([scopeKey, ...r.headers.map(normText), normText(desc), normUnit(r.unit)].join('||'));
}

/** Loose key: scope_key + effective_desc + unit. */
export function looseKey(r: {
  desc: string;
  effectiveDesc?: string;
  headers?: string[];
  unit: string | null;
  scope?: string | null;
  scopeKey?: string | null;
}): string {
  const scopeKey = r.scopeKey ?? resolveCanonicalScope(r.scope, r.desc, r.headers).scopeKey;
  const desc = r.effectiveDesc || r.desc;
  return h([scopeKey, normText(desc), normUnit(r.unit)].join('||'));
}

const tokens = (s: string) => new Set(normText(s).split(' ').filter((t) => t.length > 1));

/** Jaccard similarity on word tokens (0..1). */
export function similarity(a: string, b: string): number {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return 0;
  let i = 0;
  A.forEach((t) => { if (B.has(t)) i++; });
  return i / (A.size + B.size - i);
}

export const fullText = (r: { desc: string; headers: string[]; scope?: string | null; scopeKey?: string | null }) => {
  const scopeKey = r.scopeKey ?? resolveCanonicalScope(r.scope, r.desc, r.headers).scopeKey;
  return [scopeKey, ...r.headers, r.desc].filter(Boolean).join(' | ');
};
