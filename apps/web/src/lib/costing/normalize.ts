// Text/unit normalisation + fingerprints used to match BOQ lines to the rate DB.
import { createHash } from 'node:crypto';
import type { BoqRow } from './boq';

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
  each: 'nos', no: 'nos', nos: 'nos', 'no.': 'nos', set: 'set', lot: 'lot',
  rmt: 'rm', 'rmt.': 'rm', rm: 'rm', mtr: 'rm', 'mtr.': 'rm', meter: 'rm', metre: 'rm', 'r. mtr': 'rm',
  cum: 'cum', sqm: 'sqm', sqmt: 'sqm', kg: 'kg', litre: 'litre', 'per litre': 'litre',
  'p.point': 'point', 'p. point': 'point', klh: 'klh', kvar: 'kvar', hectare: 'ha',
};
export function normUnit(u: string | null): string {
  if (!u) return '';
  const k = u.toLowerCase().replace(/\s+/g, ' ').trim();
  return UNIT_MAP[k] ?? k;
}

const h = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 16);

/** Strict key: whole header chain + own description + unit. */
export function strictKey(r: Pick<BoqRow, 'desc' | 'headers' | 'unit'>): string {
  return h([...r.headers.map(normText), normText(r.desc), normUnit(r.unit)].join('||'));
}
/** Loose key: own description + unit + scope-free; used only when strict fails. */
export function looseKey(r: Pick<BoqRow, 'desc' | 'unit'>): string {
  return h([normText(r.desc), normUnit(r.unit)].join('||'));
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
/** All numbers in a text, sorted. Two lines that differ in a size/capacity/grade must never fuzzy-match. */
export const numberSig = (s: string): string =>
  (normText(s).match(/\d+(?:\.\d+)?/g) ?? []).sort().join(',');
export const fullText =(r: Pick<BoqRow, 'desc' | 'headers'>) => [...r.headers, r.desc].join(' | ');
