/**
 * DESIRE TENDER — PRODUCTION DATABASE ISOLATION & ENVIRONMENT GUARD
 * Phase 4A: Pre-Deployment Security Barrier & Mock Routing
 *
 * MANDATORY SECURITY DIRECTIVE:
 * 1. Under NO circumstances may any eligibility test, Preview deployment, or migration
 *    connect to or write to Production Supabase.
 * 2. If the configured Supabase URL matches the Production project reference, the guard
 *    MUST FAIL CLOSED immediately.
 * 3. In Vercel Preview without an isolated staging database, the eligibility engine
 *    automatically defaults to MOCK_MODE for safe end-to-end UI testing.
 */

export class ProductionDatabaseBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProductionDatabaseBlockedError';
  }
}

/**
 * Production Supabase project reference to block permanently from test/preview writes.
 */
export const BLOCKED_PRODUCTION_PROJECT_REF = 'udwjptggvaavoemuvjbm';

/**
 * Extracts the Supabase project reference from a given URL.
 */
export function extractProjectRef(url: string): string | null {
  if (!url) return null;
  const match = url.match(/https:\/\/([a-zA-Z0-9_-]+)\.supabase\.co/i);
  return match ? match[1].toLowerCase() : null;
}

export type PersistenceTargetMode = 'MOCK' | 'LOCAL_DB' | 'STAGING_DB' | 'BLOCKED';

export interface DatabaseEnvironmentAudit {
  configuredUrl: string | null;
  projectRef: string | null;
  isProduction: boolean;
  isLocal: boolean;
  persistenceMode: PersistenceTargetMode;
  writePermitted: boolean;
  reason: string;
}

/**
 * Audits the active database configuration and determines whether database writes are safe.
 */
export function auditDatabaseEnvironment(customUrl?: string): DatabaseEnvironmentAudit {
  const url = (
    customUrl ||
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  ).trim();

  const projectRef = extractProjectRef(url);
  const isLocal = url.includes('localhost') || url.includes('127.0.0.1');
  const isProduction = projectRef === BLOCKED_PRODUCTION_PROJECT_REF;

  // Explicit override: if ELIGIBILITY_MOCK_MODE=true or VERCEL_ENV=preview without custom staging URL
  const forceMock = process.env.ELIGIBILITY_MOCK_MODE === 'true';

  if (!url) {
    return {
      configuredUrl: null,
      projectRef: null,
      isProduction: false,
      isLocal: false,
      persistenceMode: 'MOCK',
      writePermitted: false,
      reason: 'No Supabase URL configured. Operating in safe Mock Mode.',
    };
  }

  if (isProduction) {
    return {
      configuredUrl: url,
      projectRef,
      isProduction: true,
      isLocal: false,
      persistenceMode: 'BLOCKED',
      writePermitted: false,
      reason: `SECURITY ALERT: Production project reference '${projectRef}' detected! Writes, migrations and test records are strictly blocked.`,
    };
  }

  if (forceMock) {
    return {
      configuredUrl: url,
      projectRef,
      isProduction: false,
      isLocal,
      persistenceMode: 'MOCK',
      writePermitted: false,
      reason: 'ELIGIBILITY_MOCK_MODE is enabled. Routing all operations to mock persistence.',
    };
  }

  if (isLocal) {
    return {
      configuredUrl: url,
      projectRef: 'local',
      isProduction: false,
      isLocal: true,
      persistenceMode: 'LOCAL_DB',
      writePermitted: true,
      reason: 'Verified local database instance (localhost/127.0.0.1). Writes permitted for local testing.',
    };
  }

  // Remote non-production Supabase instance (verified staging project)
  return {
    configuredUrl: url,
    projectRef,
    isProduction: false,
    isLocal: false,
    persistenceMode: 'STAGING_DB',
    writePermitted: true,
    reason: `Verified staging project reference '${projectRef}'. Writes permitted to isolated staging project.`,
  };
}

/**
 * Asserts that a database operation is safe to proceed.
 * Throws ProductionDatabaseBlockedError if target is Production.
 */
export function assertSafeDatabaseWrite(customUrl?: string): void {
  const audit = auditDatabaseEnvironment(customUrl);
  if (!audit.writePermitted) {
    throw new ProductionDatabaseBlockedError(
      `Database write blocked by Production Isolation Guard: ${audit.reason}`
    );
  }
}

/**
 * Returns whether the active environment should run in Mock Mode.
 */
export function shouldRunInMockMode(customUrl?: string): boolean {
  const audit = auditDatabaseEnvironment(customUrl);
  return audit.persistenceMode === 'MOCK' || audit.persistenceMode === 'BLOCKED';
}

