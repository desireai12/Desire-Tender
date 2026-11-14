// Canonical scope registry and alias normalizer.
// Maps variations across tenders to canonical scope keys.

export const CANONICAL_SCOPES = [
  'di pipeline',
  'hdpe pipeline',
  'hdd-hdpe pipeline',
  'ms pipeline',
  'ms specials',
  'hdd-ms/rcc',
  'pumps',
  'pump house',
  'valve',
  'valve chambers',
  'civil',
  'ohsr',
  'cwr',
  'glsr',
  'fhtc',
  'wtp',
  'boundary wall',
  'pipeline excavation',
  'road dismantling',
  'road restoration',
  'plc',
  'scada',
  'rtu',
  'solar panel',
  'cable',
  'panel',
  'starter',
  'flow meter',
  'transmitter',
  'o&m',
  'e&m',
  'dismantling joint',
  'bellows',
  'valve pillar',
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
  'hdd-hdpe pipeline': 'hdd-hdpe pipeline',
  'hdd hdpe pipeline': 'hdd-hdpe pipeline',
  'ms pipe': 'ms pipeline',
  'ms pipes': 'ms pipeline',
  'ms pipeline': 'ms pipeline',
  'ms specials': 'ms specials',
  'ms special': 'ms specials',
  'hdd-ms/rcc': 'hdd-ms/rcc',
  'hdd ms rcc': 'hdd-ms/rcc',
  'pipeline excavation': 'pipeline excavation',
  'road dismantling': 'road dismantling',
  'road restoration': 'road restoration',

  // Valves & Chambers
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
  'solar panel': 'solar panel',
  'solar panels': 'solar panel',
  'cable': 'cable',
  'cables': 'cable',
  'panel': 'panel',
  'panels': 'panel',
  'starter': 'starter',
  'starters': 'starter',
  'flow meter': 'flow meter',
  'flow meters': 'flow meter',
  'electromagnetic flow meter': 'flow meter',
  'bulk flow meter': 'flow meter',
  'bfm': 'flow meter',
  'transmitter': 'transmitter',
  'level transmitter': 'transmitter',
  'pressure transmitter': 'transmitter',
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

export type ScopeSource = 'column' | 'header' | 'inferred' | 'unknown';
export type ScopeConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ScopeResolution {
  scopeKey: string;
  isKnown: boolean;
  rawScope: string;
  source: ScopeSource;
  confidence: ScopeConfidence;
  disagreesWithColumn?: boolean;
}

/**
 * Resolves work_type per item in strict order (B4):
 * 1) scope column value (normalized via scopeAliases) -> source 'column', confidence 'HIGH'
 * 2) parent/section heading that maps to a known scope -> source 'header', confidence 'MEDIUM'
 * 3) inferred from description + parent chain -> source 'inferred', confidence 'MEDIUM' or 'LOW'
 * 4) unknown -> source 'unknown', confidence 'LOW'
 *
 * If column scope and inferred scope disagree with HIGH confidence, trusts column
 * but sets disagreesWithColumn = true (capping match at REVIEW_LOOSE).
 */
export function resolveCanonicalScope(
  scopeText: string | null | undefined,
  descText?: string,
  headers?: string[],
): ScopeResolution {
  const raw = scopeText?.trim() || '';
  const norm = normalizeScope(scopeText);

  let columnMatch: CanonicalScope | null = null;
  if (norm) {
    if (SCOPE_ALIASES[norm]) {
      columnMatch = SCOPE_ALIASES[norm];
    } else {
      const sortedAliases = Object.keys(SCOPE_ALIASES).sort((a, b) => b.length - a.length);
      for (const alias of sortedAliases) {
        if (norm === alias || norm.startsWith(alias + ' ') || norm.endsWith(' ' + alias) || norm.includes(' ' + alias + ' ')) {
          columnMatch = SCOPE_ALIASES[alias];
          break;
        }
      }
    }
  }

  // 2. Check parent/section headings
  let headerMatch: CanonicalScope | null = null;
  if (headers?.length) {
    for (const h of headers) {
      const normH = normalizeScope(h);
      if (SCOPE_ALIASES[normH]) {
        headerMatch = SCOPE_ALIASES[normH];
        break;
      }
      for (const [alias, canonical] of Object.entries(SCOPE_ALIASES)) {
        if (alias.length < 4) continue;
        if (normH.includes(alias)) {
          headerMatch = canonical;
          break;
        }
      }
      if (headerMatch) break;
    }
  }

  // 3. Infer from description
  let descMatch: CanonicalScope | null = null;
  if (descText) {
    const normDesc = normalizeScope(descText);
    const sortedAliases = Object.keys(SCOPE_ALIASES).sort((a, b) => b.length - a.length);
    for (const alias of sortedAliases) {
      if (alias.length < 3) continue;
      const pattern = new RegExp(`(^|\\s)${alias.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}(\\s|$)`, 'i');
      if (pattern.test(normDesc)) {
        descMatch = SCOPE_ALIASES[alias];
        break;
      }
    }
  }

  // If column match is present
  if (columnMatch) {
    const inferred = descMatch || headerMatch;
    // Check disagreement: e.g. column says 'valve' but description clearly indicates 'di pipeline'
    const disagree = inferred && inferred !== columnMatch && (descMatch !== null);
    return {
      scopeKey: columnMatch,
      isKnown: true,
      rawScope: raw,
      source: 'column',
      confidence: 'HIGH',
      disagreesWithColumn: Boolean(disagree),
    };
  }

  // If no column match, use header
  if (headerMatch) {
    return {
      scopeKey: headerMatch,
      isKnown: true,
      rawScope: raw,
      source: 'header',
      confidence: 'MEDIUM',
    };
  }

  // If no header match, use inferred from description
  if (descMatch) {
    return {
      scopeKey: descMatch,
      isKnown: true,
      rawScope: raw,
      source: 'inferred',
      confidence: 'MEDIUM',
    };
  }

  return {
    scopeKey: norm,
    isKnown: false,
    rawScope: raw,
    source: 'unknown',
    confidence: 'LOW',
  };
}
