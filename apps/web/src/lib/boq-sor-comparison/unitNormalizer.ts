// Unit Normalizer: Resolves unit variants and checks dimensional compatibility.
import type { UnitDimension } from './types';

export interface UnitInfo {
  canonicalUnit: string;
  dimension: UnitDimension;
}

const UNIT_MAP: Record<string, UnitInfo> = {
  // Volume
  cum: { canonicalUnit: 'cum', dimension: 'volume' },
  'cum.': { canonicalUnit: 'cum', dimension: 'volume' },
  'cu.m': { canonicalUnit: 'cum', dimension: 'volume' },
  'cu m': { canonicalUnit: 'cum', dimension: 'volume' },
  'cubic meter': { canonicalUnit: 'cum', dimension: 'volume' },
  'cubic metre': { canonicalUnit: 'cum', dimension: 'volume' },
  'per cum': { canonicalUnit: 'cum', dimension: 'volume' },

  // Length
  metre: { canonicalUnit: 'metre', dimension: 'length' },
  meter: { canonicalUnit: 'metre', dimension: 'length' },
  'mete r': { canonicalUnit: 'metre', dimension: 'length' },
  'met er': { canonicalUnit: 'metre', dimension: 'length' },
  mtr: { canonicalUnit: 'metre', dimension: 'length' },
  rm: { canonicalUnit: 'metre', dimension: 'length' },
  rmt: { canonicalUnit: 'metre', dimension: 'length' },
  'meter.': { canonicalUnit: 'metre', dimension: 'length' },
  'metre.': { canonicalUnit: 'metre', dimension: 'length' },

  // Area
  sqm: { canonicalUnit: 'sqm', dimension: 'area' },
  'sq.m': { canonicalUnit: 'sqm', dimension: 'area' },
  'sq m': { canonicalUnit: 'sqm', dimension: 'area' },
  sqmt: { canonicalUnit: 'sqm', dimension: 'area' },
  'square meter': { canonicalUnit: 'sqm', dimension: 'area' },
  'square metre': { canonicalUnit: 'sqm', dimension: 'area' },
  'per 100 sqm': { canonicalUnit: 'sqm', dimension: 'area' },
  '100 sqm': { canonicalUnit: 'sqm', dimension: 'area' },

  // Count
  each: { canonicalUnit: 'each', dimension: 'count' },
  'each.': { canonicalUnit: 'each', dimension: 'count' },
  'each manhole': { canonicalUnit: 'each', dimension: 'count' },
  'per each': { canonicalUnit: 'each', dimension: 'count' },
  nos: { canonicalUnit: 'each', dimension: 'count' },
  'nos.': { canonicalUnit: 'each', dimension: 'count' },
  no: { canonicalUnit: 'each', dimension: 'count' },
  'no.': { canonicalUnit: 'each', dimension: 'count' },
  'per no': { canonicalUnit: 'each', dimension: 'count' },
  'per no.': { canonicalUnit: 'each', dimension: 'count' },
  set: { canonicalUnit: 'set', dimension: 'count' },
  sets: { canonicalUnit: 'set', dimension: 'count' },

  // Mass
  kg: { canonicalUnit: 'kg', dimension: 'mass' },
  'kg.': { canonicalUnit: 'kg', dimension: 'mass' },
  kilogram: { canonicalUnit: 'kg', dimension: 'mass' },
  quintal: { canonicalUnit: 'quintal', dimension: 'mass' },
  qtl: { canonicalUnit: 'quintal', dimension: 'mass' },
  mt: { canonicalUnit: 'mt', dimension: 'mass' },
  tonne: { canonicalUnit: 'mt', dimension: 'mass' },
  'metric ton': { canonicalUnit: 'mt', dimension: 'mass' },
};

export function getUnitInfo(unitStr: string | null | undefined): UnitInfo | null {
  if (!unitStr) return null;
  const clean = unitStr.toLowerCase().replace(/\s+/g, ' ').trim();
  if (UNIT_MAP[clean]) return UNIT_MAP[clean];
  const noDot = clean.replace(/\.+$/, '');
  if (UNIT_MAP[noDot]) return UNIT_MAP[noDot];
  const noSpace = clean.replace(/\s+/g, '');
  if (UNIT_MAP[noSpace]) return UNIT_MAP[noSpace];
  if (clean.startsWith('each ') || clean.startsWith('per each') || clean.startsWith('per no')) {
    return { canonicalUnit: 'each', dimension: 'count' };
  }
  return null;
}

export function areUnitsDimensionallyCompatible(
  u1: string | null | undefined,
  u2: string | null | undefined,
): { compatible: boolean; dimension: UnitDimension | null; reason?: string } {
  const info1 = getUnitInfo(u1);
  const info2 = getUnitInfo(u2);

  if (!info1 || !info2) {
    return {
      compatible: false,
      dimension: null,
      reason: `Unknown or unmapped unit (Unit1='${u1}', Unit2='${u2}')`,
    };
  }

  if (info1.dimension !== info2.dimension) {
    return {
      compatible: false,
      dimension: null,
      reason: `Dimension mismatch: '${info1.canonicalUnit}' (${info1.dimension}) vs '${info2.canonicalUnit}' (${info2.dimension})`,
    };
  }

  return {
    compatible: true,
    dimension: info1.dimension,
  };
}

