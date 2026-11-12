// Canonical scope registry and alias normalizer.
// Maps variations across tenders to canonical scope keys.

export const CANONICAL_SCOPES = [
  'di pipeline',
  'hdpe pipeline',
  'ms pipeline',
  'pumps',
  'valve',
  'valve chambers',
  'ms specials',
  'civil',
  'plc',
  'e&m',
  'ohsr',
  'cwr',
  'fhtc',
  'wtp',
  'o&m',
  'pump house',
  'boundary wall',
  'road dismantling',
  'road restoration',
  'pipeline excavation',
  'scada',
  'cable',
  'panel',
  'starter',
  'dismantling joint',
  'bellows',
  'electromagnetic flow meter',
  'bulk flow meter',
  'level transmitter',
  'pressure transmitter',
  'glsr',
  'valve pillar',
  'rtu',
  'solar panel',
] as const;

export type CanonicalScope = (typeof CANONICAL_SCOPES)[number];

export const SCOPE_ALIASES: Record<string, CanonicalScope> = {
  // Pipelines
  'di pipe': 'di pipeline',
  'di pipes': 'di pipeline',
  'di pipeline': 'di pipeline',
  'hdpe pipe': 'hdpe pipeline',
  'hdpe pipes': 'hdpe pipeline',
  'hdpe pipeline': 'hdpe pipeline',
  'ms pipe': 'ms pipeline',
  'ms pipes': 'ms pipeline',
  'ms pipeline': 'ms pipeline',
  'hdd-hdpe pipeline': 'hdpe pipeline',
  'hdd-ms/rcc': 'ms pipeline',

  // Valves & Fittings
  'valve': 'valve',
  'valves': 'valve',
  'valve chamber': 'valve chambers',
  'valve chambers': 'valve chambers',
  'valve pillar': 'valve pillar',
  'dismantling joint': 'dismantling joint',
  'dismantling joints': 'dismantling joint',
  'bellows': 'bellows',
  'bellow': 'bellows',

  // Civil & Storage
  'civil': 'civil',
  'civil construction': 'civil',
  'civil works': 'civil',
  'civil work': 'civil',
  'boundary wall': 'boundary wall',
  'ohsr': 'ohsr',
  'cwr': 'cwr',
  'glsr': 'glsr',
  'wtp': 'wtp',
  'fhtc': 'fhtc',
  'ms specials': 'ms specials',
  'ms special': 'ms specials',
  'road dismantling': 'road dismantling',
  'road restoration': 'road restoration',
  'pipeline excavation': 'pipeline excavation',

  // E&M & Equipment
  'e&m': 'e&m',
  'e & m': 'e&m',
  'e and m': 'e&m',
  'electrical & mechanical': 'e&m',
  'electrical and mechanical': 'e&m',
  'pump': 'pumps',
  'pumps': 'pumps',
  'pumping': 'pumps',
  'pump house': 'pump house',
  'pumphouse': 'pump house',
  'plc': 'plc',
  'plc panel': 'plc',
  'scada': 'scada',
  'rtu': 'rtu',
  'cable': 'cable',
  'cables': 'cable',
  'panel': 'panel',
  'panels': 'panel',
  'starter': 'starter',
  'starters': 'starter',
  'electromagnetic flow meter': 'electromagnetic flow meter',
  'efm': 'electromagnetic flow meter',
  'bulk flow meter': 'bulk flow meter',
  'bfm': 'bulk flow meter',
  'level transmitter': 'level transmitter',
  'pressure transmitter': 'pressure transmitter',
  'solar panel': 'solar panel',
  'solar panels': 'solar panel',
  'o&m': 'o&m',
  'o & m': 'o&m',
  'o and m': 'o&m',
  'operation and maintenance': 'o&m',
  'operations and maintenance': 'o&m',
  'operations & maintenance': 'o&m',
};

/** Normalizes scope string by trimming, lowercasing, and collapsing whitespace / symbols */
export function normalizeScope(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .replace(/[–—_]/g, '-')
    .replace(/&/g, ' and ')
    .replace(/\//g, ' ')
    .replace(/[^a-z0-9 -]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface ScopeResolution {
  scopeKey: string;
  isKnown: boolean;
  rawScope: string;
  source: 'column' | 'description' | 'header' | 'unknown';
}

/**
 * Resolves canonical scope key.
 * 1. Checks scope column value against alias map.
 * 2. If unknown/missing, checks item description and parent headers to detect scope.
 */
export function resolveCanonicalScope(
  scopeText: string | null | undefined,
  descText?: string,
  headers?: string[],
): ScopeResolution {
  const raw = scopeText?.trim() || '';
  const norm = normalizeScope(scopeText);

  // 1. Direct match on scope column
  if (norm) {
    if (SCOPE_ALIASES[norm]) {
      return { scopeKey: SCOPE_ALIASES[norm], isKnown: true, rawScope: raw, source: 'column' };
    }
    // Substring match on alias keys (longest first)
    const sortedAliases = Object.keys(SCOPE_ALIASES).sort((a, b) => b.length - a.length);
    for (const alias of sortedAliases) {
      if (norm === alias || norm.startsWith(alias + ' ') || norm.endsWith(' ' + alias) || norm.includes(' ' + alias + ' ')) {
        return { scopeKey: SCOPE_ALIASES[alias], isKnown: true, rawScope: raw, source: 'column' };
      }
    }
  }

  // 2. Check Item Description if column scope is unknown or missing
  if (descText) {
    const normDesc = normalizeScope(descText);
    const sortedAliases = Object.keys(SCOPE_ALIASES).sort((a, b) => b.length - a.length);
    for (const alias of sortedAliases) {
      if (alias.length < 3) continue; // avoid tiny words like 'm', 'no'
      const pattern = new RegExp(`(^|\\s)${alias.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}(\\s|$)`, 'i');
      if (pattern.test(normDesc)) {
        return { scopeKey: SCOPE_ALIASES[alias], isKnown: true, rawScope: raw, source: 'description' };
      }
    }
  }

  // 3. Check Parent Headers if still unknown
  if (headers?.length) {
    for (const h of headers) {
      const normH = normalizeScope(h);
      if (SCOPE_ALIASES[normH]) {
        return { scopeKey: SCOPE_ALIASES[normH], isKnown: true, rawScope: raw, source: 'header' };
      }
      for (const [alias, canonical] of Object.entries(SCOPE_ALIASES)) {
        if (alias.length < 4) continue;
        if (normH.includes(alias)) {
          return { scopeKey: canonical, isKnown: true, rawScope: raw, source: 'header' };
        }
      }
    }
  }

  return { scopeKey: norm, isKnown: false, rawScope: raw, source: 'unknown' };
}

