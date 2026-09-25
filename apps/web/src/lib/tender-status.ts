export const CANONICAL_STATUSES = [
  'Live',
  'Technical Bid Opening',
  'Financial Bid Opening',
  'Opening in Progress',
  'Technical Evaluation',
  'Financial Evaluation',
  'AOC',
  'Retender',
  'Cancelled',
  'Archived'
] as const;

export type CanonicalStatus = typeof CANONICAL_STATUSES[number];

/**
 * Case-insensitive mapping from messy Excel/scraped status strings to one of the 10 canonical statuses.
 */
export function normalizeStatus(raw: string | null | undefined): CanonicalStatus {
  if (!raw) return 'Archived';
  const clean = raw.trim().toLowerCase();

  if (clean === 'live') return 'Live';
  if (clean.includes('technical') && clean.includes('opening')) return 'Technical Bid Opening';
  if (clean.includes('financial') && clean.includes('opening')) return 'Financial Bid Opening';
  if (clean.includes('opening in progress') || clean === 'in progress') return 'Opening in Progress';
  if (clean.includes('technical') && clean.includes('eval')) return 'Technical Evaluation';
  if (clean.includes('financial') && clean.includes('eval')) return 'Financial Evaluation';
  if (clean === 'aoc' || clean.includes('awarded')) return 'AOC';
  if (clean.includes('retender')) return 'Retender';
  if (clean.includes('cancel')) return 'Cancelled';
  if (clean.includes('archiv')) return 'Archived';

  return 'Archived';
}

/**
 * Returns Tailwind color tokens for badges and status indicators.
 */
export function getStatusBadgeStyle(status: string): {
  badge: string;
  dot: string;
} {
  const norm = normalizeStatus(status);
  switch (norm) {
    case 'Live':
      return {
        badge: 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
        dot: 'bg-emerald-500'
      };
    case 'Technical Bid Opening':
      return {
        badge: 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800',
        dot: 'bg-blue-500'
      };
    case 'Financial Bid Opening':
      return {
        badge: 'bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
        dot: 'bg-amber-500'
      };
    case 'Opening in Progress':
      return {
        badge: 'bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800',
        dot: 'bg-purple-500'
      };
    case 'Technical Evaluation':
      return {
        badge: 'bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800',
        dot: 'bg-cyan-500'
      };
    case 'Financial Evaluation':
      return {
        badge: 'bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800',
        dot: 'bg-teal-500'
      };
    case 'AOC':
      return {
        badge: 'bg-emerald-600 text-white border-emerald-700 dark:border-emerald-600',
        dot: 'bg-emerald-200'
      };
    case 'Retender':
      return {
        badge: 'bg-orange-50 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-800',
        dot: 'bg-orange-500'
      };
    case 'Cancelled':
      return {
        badge: 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800',
        dot: 'bg-rose-500'
      };
    case 'Archived':
    default:
      return {
        badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700',
        dot: 'bg-slate-400'
      };
  }
}
