// Text/unit/scope normalisation + fingerprints used to match BOQ lines to the rate DB.
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

const SCOPE_SYNONYMS: Record<string, string> = {
  'di pipe': 'di pipeline',
  'di pipes': 'di pipeline',
  'di pipeline': 'di pipeline',
  'hdpe pipe': 'hdpe pipeline',
  'hdpe pipes': 'hdpe pipeline',
  'hdpe pipeline': 'hdpe pipeline',
  'ms pipe': 'ms pipeline',
  'ms pipes': 'ms pipeline',
  'ms pipeline': 'ms pipeline',
  'valves': 'valve',
  'valve': 'valve',
  'valve chamber': 'valve chambers',
  'valve chambers': 'valve chambers',
  'civil work': 'civil',
  'civil works': 'civil',
  'civil': 'civil',
  'e & m': 'e&m',
  'e and m': 'e&m',
  'electrical & mechanical': 'e&m',
  'electrical and mechanical': 'e&m',
  'e&m': 'e&m',
  'o & m': 'o&m',
  'o and m': 'o&m',
  'operation and maintenance': 'o&m',
  'operations and maintenance': 'o&m',
  'operations & maintenance': 'o&m',
  'o&m': 'o&m',
  'pump': 'pumps',
  'pumps': 'pumps',
  'pump house': 'pump house',
  'pumphouse': 'pump house',
  'pipeline excavation': 'pipeline excavation',
  'road dismantling': 'road dismantling',
  'road restoration': 'road restoration',
  'boundary wall': 'boundary wall',
  'ohsr': 'ohsr',
  'cwr': 'cwr',
  'wtp': 'wtp',
  'fhtc': 'fhtc',
  'ms specials': 'ms specials',
  'plc': 'plc',
  'scada': 'scada',
  'hdd-hdpe pipeline': 'hdd-hdpe pipeline',
  'hdd-ms/rcc': 'hdd-ms/rcc',
};

export function normScope(s: string | null | undefined): string {
  if (!s) return '';
  const cleaned = s
    .toLowerCase()
    .replace(/[–—_]/g, '-')
    .replace(/[^a-z0-9&/ -]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return SCOPE_SYNONYMS[cleaned] ?? cleaned;
}

export function resolveScope(r: { scope?: string | null; headers?: string[] }): string {
  if (r.scope) {
    const s = normScope(r.scope);
    if (s) return s;
  }
  if (r.headers?.length) {
    for (const h of r.headers) {
      const s = normScope(h);
      if (SCOPE_SYNONYMS[s]) return SCOPE_SYNONYMS[s];
      const lower = h.toLowerCase();
      for (const [alias, target] of Object.entries(SCOPE_SYNONYMS)) {
        if (lower.includes(alias)) return target;
      }
    }
  }
  return '';
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

/** Strict key: Scope of Work + whole header chain + own description + unit. */
export function strictKey(r: Pick<BoqRow, 'desc' | 'headers' | 'unit'> & { scope?: string | null }): string {
  const scope = resolveScope(r);
  return h([scope, ...r.headers.map(normText), normText(r.desc), normUnit(r.unit)].join('||'));
}

/** Loose key: Scope of Work + own description + unit; matches within the SAME scope. */
export function looseKey(r: Pick<BoqRow, 'desc' | 'unit'> & { scope?: string | null; headers?: string[] }): string {
  const scope = resolveScope(r);
  return h([scope, normText(r.desc), normUnit(r.unit)].join('||'));
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

export const fullText = (r: Pick<BoqRow, 'desc' | 'headers'> & { scope?: string | null }) => {
  const scope = resolveScope(r);
  return [scope, ...r.headers, r.desc].filter(Boolean).join(' | ');
};
