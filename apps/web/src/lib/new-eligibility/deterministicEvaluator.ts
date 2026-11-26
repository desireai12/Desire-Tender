/**
 * DESIRE TENDER — DETERMINISTIC ELIGIBILITY EVALUATION ENGINE
 * Stage 3B: High-level Evaluation Engine & Adapter Orchestrator
 *
 * Responsibilities:
 *  1. Coordinates deterministic evaluation against registered TenderRuleAdapters.
 *  2. Maintains registry of tender adapters (defaulting to Radhanpur for RADHANPUR_TENDER_ID).
 *  3. Computes dual evaluation results:
 *      - Corporate Qualification: Evaluates company credentials against corporate gates.
 *      - Proposal Readiness: Evaluates proposal-specific submission dossier readiness.
 *  4. Produces OverallTenderVerdict without conflating corporate qualification with tender readiness.
 *  5. Provides programmatic access to structured reports and evaluation data.
 */

import type { CompanyMasterProfile } from './companyMaster';
import {
  TenderRuleAdapter,
  DualEvaluationReport,
  ProposalSubmissionRecord,
} from './tenderRuleAdapter';
import { RadhanpurRuleAdapter, RADHANPUR_TENDER_ID } from './adapters/radhanpurAdapter';

export class DeterministicEvaluator {
  private adapters = new Map<string, TenderRuleAdapter>();

  constructor() {
    // Register standard adapters
    this.registerAdapter(new RadhanpurRuleAdapter());
  }

  /**
   * Registers a tender rule adapter with the engine.
   */
  registerAdapter(adapter: TenderRuleAdapter): void {
    this.adapters.set(adapter.tenderId, adapter);
  }

  /**
   * Retrieves an adapter by tender ID.
   */
  getAdapter(tenderId: string): TenderRuleAdapter | undefined {
    return this.adapters.get(tenderId);
  }

  /**
   * Evaluates a company profile against a specific tender.
   */
  evaluateTender(
    tenderId: string,
    company: CompanyMasterProfile,
    submission?: Partial<ProposalSubmissionRecord>
  ): DualEvaluationReport {
    let adapter = this.getAdapter(tenderId);

    // If tenderId is not found, fallback to Radhanpur adapter if tender ID or title matches
    if (!adapter) {
      if (tenderId.includes('RADHANPUR') || tenderId.includes('radhanpur')) {
        adapter = this.adapters.get(RADHANPUR_TENDER_ID);
      }
    }

    if (!adapter) {
      throw new Error(
        `[DeterministicEvaluator] No TenderRuleAdapter registered for tender ID: '${tenderId}'. ` +
        `Available adapters: ${Array.from(this.adapters.keys()).join(', ')}`
      );
    }

    return adapter.evaluate(company, submission);
  }

  /**
   * Convenience helper to evaluate a company against the Radhanpur RWSS tender.
   */
  evaluateRadhanpur(
    company: CompanyMasterProfile,
    submission?: Partial<ProposalSubmissionRecord>
  ): DualEvaluationReport {
    return this.evaluateTender(RADHANPUR_TENDER_ID, company, submission);
  }
}

// Export singleton instance
export const deterministicEvaluator = new DeterministicEvaluator();

/**
 * Functional entrypoint to evaluate a company profile against Radhanpur RWSS.
 */
export function evaluateCompanyForRadhanpur(
  company: CompanyMasterProfile,
  submission?: Partial<ProposalSubmissionRecord>
): DualEvaluationReport {
  return deterministicEvaluator.evaluateRadhanpur(company, submission);
}

