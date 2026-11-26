/**
 * DESIRE TENDER — BILLING SAFEGUARDS & ZERO-COST POLICY ENFORCEMENT
 * Phase 4A: Developer API Free-Tier Verification & Gate
 *
 * Enforces strict zero additional spending policy:
 * 1. VERIFIED_FREE permits requests ONLY when Developer API project tier is confirmed free.
 * 2. PAID blocks all requests.
 * 3. UNKNOWN blocks requests until verification is performed.
 * 4. BLOCKED blocks requests.
 * 5. Model fallbacks are restricted to verified free-tier models (never fallback to paid models).
 * 6. Estimated commercial cost and actual payable cost are accounted separately.
 * 7. Actual payable cost is NEVER blindly assumed to be zero without verified status.
 * 8. Google AI Pro subscription is NEVER treated as proof of free Developer API quota.
 */

import type { BillingVerificationStatus } from './dbTypes';

export class BillingPolicyViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BillingPolicyViolationError';
  }
}

export interface DeveloperApiProjectInfo {
  apiKeyPresent: boolean;
  developerApiProjectTier: 'FREE' | 'PAID' | 'PAYG' | 'UNKNOWN';
  hasGoogleAiProSubscription: boolean; // Note: Pro subscription != Developer API free quota
  modelName: string;
}

export interface CostAccountingResult {
  inputTokens: number;
  outputTokens: number;
  commercialRateInputPerM: number;
  commercialRateOutputPerM: number;
  estimatedCostUsd: number;
  actualChargeUsd: number;
  billingStatus: BillingVerificationStatus;
}

/**
 * Verified list of models permissible under Developer API Free Tier for our project.
 */
export const PERMISSIBLE_FREE_MODELS = new Set([
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-3.5-flash-lite',
]);

/**
 * Verifies free-tier eligibility based on explicit Developer API project attributes.
 *
 * CRITICAL POLICY: Google AI Pro subscription grants consumer web access and does NOT
 * confer free quota on the Gemini Developer API (AI Studio / Cloud). The Developer API
 * project tier itself must be checked.
 */
export function verifyDeveloperApiFreeTier(project: DeveloperApiProjectInfo): BillingVerificationStatus {
  if (!project.apiKeyPresent) {
    return 'BLOCKED';
  }

  // Reject paid developer projects
  if (project.developerApiProjectTier === 'PAID' || project.developerApiProjectTier === 'PAYG') {
    return 'PAID';
  }

  // Reject unverified developer tiers
  if (project.developerApiProjectTier === 'UNKNOWN') {
    return 'UNKNOWN';
  }

  // Verify the model itself is covered under free-tier quota
  if (!PERMISSIBLE_FREE_MODELS.has(project.modelName)) {
    return 'BLOCKED';
  }

  // Only if developer project tier is explicitly 'FREE' and model is allowed
  if (project.developerApiProjectTier === 'FREE') {
    return 'VERIFIED_FREE';
  }

  return 'BLOCKED';
}

/**
 * Gate function that decides whether an API request is permitted to execute.
 */
export function enforceBillingGate(status: BillingVerificationStatus): { permitted: boolean; reason?: string } {
  switch (status) {
    case 'VERIFIED_FREE':
      return { permitted: true };
    case 'PAID':
      return {
        permitted: false,
        reason: 'Execution BLOCKED: Model requires paid Developer API quota. Strict zero-cost policy forbids paid API calls.',
      };
    case 'UNKNOWN':
      return {
        permitted: false,
        reason: 'Execution BLOCKED: Billing status is UNKNOWN. Free-tier eligibility must be verified before making calls.',
      };
    case 'BLOCKED':
      return {
        permitted: false,
        reason: 'Execution BLOCKED: API call is blocked by billing safeguard policy.',
      };
    default:
      return {
        permitted: false,
        reason: `Execution BLOCKED: Unrecognized billing status '${status}'.`,
      };
  }
}

/**
 * Validates that any candidate model fallback does not violate free-tier restrictions.
 */
export function validateModelFallbackSafety(primaryModel: string, fallbackModel: string): void {
  if (!PERMISSIBLE_FREE_MODELS.has(primaryModel)) {
    throw new BillingPolicyViolationError(
      `Primary model '${primaryModel}' is not on the verified free-tier model list.`
    );
  }
  if (!PERMISSIBLE_FREE_MODELS.has(fallbackModel)) {
    throw new BillingPolicyViolationError(
      `Fallback model '${fallbackModel}' is not on the verified free-tier model list. Fallback cannot risk paid usage.`
    );
  }
}

/**
 * Calculates benchmarked commercial cost vs actual payable charge.
 *
 * NEVER hardcodes actual payable cost to zero without VERIFIED_FREE status.
 */
export function calculateCostAccounting(
  inputTokens: number,
  outputTokens: number,
  billingStatus: BillingVerificationStatus,
  rates: { inputPerM: number; outputPerM: number } = { inputPerM: 0.075, outputPerM: 0.30 }
): CostAccountingResult {
  const estimatedCostUsd =
    (inputTokens / 1_000_000) * rates.inputPerM +
    (outputTokens / 1_000_000) * rates.outputPerM;

  let actualChargeUsd: number;

  if (billingStatus === 'VERIFIED_FREE') {
    // When free-tier is verified, developer API charge is zero
    actualChargeUsd = 0.000000;
  } else if (billingStatus === 'PAID') {
    // If paid, actual charge equals commercial cost (which would be billed)
    actualChargeUsd = estimatedCostUsd;
  } else {
    // UNKNOWN or BLOCKED: throw or indicate indeterminate actual cost
    throw new BillingPolicyViolationError(
      `Cannot determine actual payable cost for unverified billing status: '${billingStatus}'.`
    );
  }

  return {
    inputTokens,
    outputTokens,
    commercialRateInputPerM: rates.inputPerM,
    commercialRateOutputPerM: rates.outputPerM,
    estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)),
    actualChargeUsd: Number(actualChargeUsd.toFixed(6)),
    billingStatus,
  };
}

