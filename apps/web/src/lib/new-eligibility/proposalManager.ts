/**
 * DESIRE TENDER — PROPOSAL VERSION IMMUTABILITY & LIFECYCLE MANAGER
 * Phase 4A: Application-Layer Proposal Version Enforcement
 *
 * Enforces the strict proposal version lifecycle:
 * 1. DRAFT can be edited.
 * 2. DRAFT can transition to READY_FOR_EVALUATION.
 * 3. READY_FOR_EVALUATION cannot be edited in place.
 * 4. SUBMITTED cannot be edited in place.
 * 5. ARCHIVED cannot be edited in place.
 * 6. Finalized proposal records cannot be deleted.
 * 7. A new version can be created without changing the old version.
 * 8. Existing evaluation results continue referencing their original proposal version.
 */

import type {
  TenderProposalSubmission,
  ProposalSubmissionStatus,
  TenderEvaluationResultRecord,
} from './dbTypes';

export class ProposalMutationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProposalMutationError';
  }
}

/**
 * Checks if a proposal submission is eligible for in-place modifications.
 */
export function canEditProposal(proposal: TenderProposalSubmission): boolean {
  return proposal.status === 'DRAFT' && proposal.is_immutable === false;
}

/**
 * Validates and performs a status transition for a proposal submission.
 */
export function transitionProposalStatus(
  proposal: TenderProposalSubmission,
  targetStatus: ProposalSubmissionStatus
): TenderProposalSubmission {
  if (!canEditProposal(proposal)) {
    throw new ProposalMutationError(
      `Cannot modify finalized proposal submission (version: ${proposal.submission_version}, status: '${proposal.status}'). ` +
      `Historical proposal submission records are permanently immutable.`
    );
  }

  const finalizedStatuses: ProposalSubmissionStatus[] = [
    'READY_FOR_EVALUATION',
    'SUBMITTED',
    'ARCHIVED',
  ];

  const now = new Date().toISOString();
  const isFinalizing = finalizedStatuses.includes(targetStatus);

  return {
    ...proposal,
    status: targetStatus,
    is_immutable: isFinalizing ? true : proposal.is_immutable,
    finalized_at: isFinalizing ? (proposal.finalized_at || now) : proposal.finalized_at,
    updated_at: now,
  };
}

/**
 * Updates a proposal submission in-place if in DRAFT state.
 */
export function updateDraftProposal(
  proposal: TenderProposalSubmission,
  updates: Partial<Omit<TenderProposalSubmission, 'id' | 'tender_id' | 'dataset_id' | 'submission_version' | 'created_at'>>
): TenderProposalSubmission {
  if (!canEditProposal(proposal)) {
    throw new ProposalMutationError(
      `Cannot update finalized proposal submission (version: ${proposal.submission_version}, status: '${proposal.status}'). ` +
      `Create a new proposal version instead.`
    );
  }

  return {
    ...proposal,
    ...updates,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Validates whether a proposal record can be deleted.
 */
export function validateProposalDeletion(proposal: TenderProposalSubmission): void {
  if (!canEditProposal(proposal)) {
    throw new ProposalMutationError(
      `Cannot delete finalized proposal submission (version: ${proposal.submission_version}, status: '${proposal.status}'). ` +
      `Historical proposal records are permanently immutable.`
    );
  }
}

/**
 * Creates a new incremented version of a proposal submission without altering the previous version.
 */
export function createNewProposalVersion(
  currentProposal: TenderProposalSubmission,
  newProposalId: string,
  updates: Partial<Omit<TenderProposalSubmission, 'id' | 'tender_id' | 'dataset_id' | 'submission_version' | 'created_at'>>
): { oldVersion: TenderProposalSubmission; newVersion: TenderProposalSubmission } {
  const now = new Date().toISOString();

  // The old version remains exactly as-is
  const oldVersion: TenderProposalSubmission = { ...currentProposal };

  // The new version is a fresh DRAFT with an incremented version number
  const newVersion: TenderProposalSubmission = {
    id: newProposalId,
    tender_id: currentProposal.tender_id,
    dataset_id: currentProposal.dataset_id,
    submission_version: currentProposal.submission_version + 1,
    status: 'DRAFT',
    proposal_title: updates.proposal_title || `${currentProposal.proposal_title} (v${currentProposal.submission_version + 1})`,
    submitted_by: updates.submitted_by !== undefined ? updates.submitted_by : currentProposal.submitted_by,
    is_immutable: false,
    finalized_at: null,
    named_personnel_roster: updates.named_personnel_roster
      ? { ...updates.named_personnel_roster }
      : { ...currentProposal.named_personnel_roster },
    tender_instruments_dossier: updates.tender_instruments_dossier
      ? { ...updates.tender_instruments_dossier }
      : { ...currentProposal.tender_instruments_dossier },
    created_at: now,
    updated_at: now,
  };

  return { oldVersion, newVersion };
}

/**
 * Verifies that an evaluation result record is permanently bound to its original proposal submission version.
 */
export function verifyEvaluationProposalBinding(
  evalResult: TenderEvaluationResultRecord,
  proposal: TenderProposalSubmission
): boolean {
  if (!evalResult.proposal_submission_id) {
    return false;
  }
  return evalResult.proposal_submission_id === proposal.id;
}

