import crypto from 'crypto';
import { inngest } from './client';
import { supabase } from '@/lib/supabase';
import { localGeminiLimiter } from '@/lib/new-eligibility/rateLimiter';

const DEFAULT_EXTRACTION_MODEL = 'gemini-2.5-flash';

/**
 * Sequential Batch Extraction Worker (Remediated)
 *
 * Architecture & Reliability:
 *  1. Atomic batch lease claim via database stored procedure `claim_extraction_batch` (FOR UPDATE row locking).
 *  2. Prevents duplicate event processing: locked batches are skipped cleanly without duplicating work.
 *  3. Atomic attempt allocation: attempt numbers are incremented transactionally inside PostgreSQL.
 *  4. Worker crash recovery: leases expire automatically after p_lease_duration_seconds.
 *  5. Atomic job progress accounting via `complete_extraction_batch`: zero client-side lost-update race.
 *  6. Process-local rate limiter & backoff integration.
 */
export const extractionBatchWorker = inngest.createFunction(
  {
    id: 'tender-extraction-batch-worker',
    name: 'Tender Batch Extraction Worker',
    retries: 3,
    concurrency: {
      limit: 5, // Local worker instance concurrency bound
    },
  },
  { event: 'tender/extraction.batch-process' },
  async ({ event, step }) => {
    const { jobId, tenderId, batchId, batchIndex, startPage, endPage, modelOverride } = event.data;
    const modelToUse = modelOverride || DEFAULT_EXTRACTION_MODEL;
    const startTime = Date.now();
    const workerToken = crypto.randomUUID();

    if (!supabase) {
      throw new Error('[BATCH_WORKER_ERROR] Supabase client is not configured');
    }

    // ─── STEP 1: ATOMIC DATABASE LEASE CLAIM & ATTEMPT ALLOCATION ────────────
    const claimResult = await step.run('claim-batch-lease', async () => {
      const { data, error } = await supabase!.rpc('claim_extraction_batch', {
        p_job_id: jobId,
        p_batch_id: batchId,
        p_worker_token: workerToken,
        p_lease_duration_seconds: 300, // 5-minute lease
      });

      if (error) {
        throw new Error(`[BATCH_WORKER_ERROR] Failed to claim batch lease: ${error.message}`);
      }

      const row = Array.isArray(data) ? data[0] : data;
      return {
        claimed: Boolean(row?.claimed),
        status: String(row?.status || 'UNKNOWN'),
        attemptNumber: Number(row?.attempt_number || 0),
        attemptId: (row?.attempt_id as string) || null,
        errorReason: (row?.error_reason as string) || null,
      };
    });

    // Handle non-claimed cases (idempotency, concurrency locks, terminal failure)
    if (!claimResult.claimed) {
      if (claimResult.status === 'COMPLETED') {
        return {
          status: 'SKIPPED',
          reason: 'BATCH_ALREADY_COMPLETED',
          batchId,
          jobId,
        };
      }
      if (claimResult.status === 'LOCKED') {
        return {
          status: 'SKIPPED',
          reason: 'BATCH_LOCKED_BY_ACTIVE_LEASE',
          batchId,
          jobId,
          details: claimResult.errorReason,
        };
      }
      if (claimResult.status === 'MAX_ATTEMPTS_EXCEEDED') {
        return {
          status: 'TERMINAL_FAILED',
          reason: 'MAX_ATTEMPTS_EXHAUSTED',
          batchId,
          jobId,
        };
      }
      return {
        status: 'SKIPPED',
        reason: claimResult.errorReason || 'UNABLE_TO_CLAIM_BATCH',
        batchId,
        jobId,
      };
    }

    const { attemptNumber, attemptId } = claimResult;
    if (!attemptId) {
      throw new Error(`[BATCH_WORKER_ERROR] Claimed batch ${batchId} but attempt_id is missing`);
    }

    // ─── STEP 2: EXECUTE WORKLOAD THROUGH PROCESS-LOCAL CONCURRENCY GUARD ────
    try {
      const result = await step.run('process-batch-pages', async () => {
        return await localGeminiLimiter.executeWithRateLimit(async () => {
          // Phase 2 Infrastructure Skeleton:
          // In Phase 2, live Vision extraction is NOT activated. This step verifies durable execution,
          // lease ownership, attempt accounting, and atomic database state transitions.
          const pageCount = endPage - startPage + 1;
          const simulatedInputTokens = pageCount * 1200;
          const simulatedOutputTokens = 350;
          const simulatedCostUsd = Number(((simulatedInputTokens * 0.15 + simulatedOutputTokens * 0.6) / 1_000_000).toFixed(6));

          return {
            pageCount,
            inputTokens: simulatedInputTokens,
            outputTokens: simulatedOutputTokens,
            costUsd: simulatedCostUsd,
          };
        }, (endPage - startPage + 1) * 1200);
      });

      // ─── STEP 3: ATOMIC DATABASE BATCH COMPLETION & JOB PROGRESS INCREMENT ──
      await step.run('complete-batch-and-increment-job', async () => {
        const latencyMs = Date.now() - startTime;

        const { error: completeErr } = await supabase!.rpc('complete_extraction_batch', {
          p_job_id: jobId,
          p_batch_id: batchId,
          p_attempt_id: attemptId,
          p_worker_token: workerToken,
          p_model_used: modelToUse,
          p_input_tokens: result.inputTokens,
          p_output_tokens: result.outputTokens,
          p_thinking_tokens: 0,
          p_cached_tokens: 0,
          p_cost_usd: result.costUsd,
          p_latency_ms: latencyMs,
        });

        if (completeErr) {
          throw new Error(`[BATCH_WORKER_ERROR] complete_extraction_batch RPC failed: ${completeErr.message}`);
        }
      });

      return {
        status: 'SUCCEEDED',
        batchId,
        jobId,
        attemptNumber,
        modelUsed: modelToUse,
        pageCount: result.pageCount,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsd: result.costUsd,
      };
    } catch (err: any) {
      // ─── STEP 4: RECORD ATTEMPT FAILURE & RELEASE LEASE FOR RETRY ──────────
      await step.run('record-batch-failure', async () => {
        const latencyMs = Date.now() - startTime;
        await supabase!.rpc('fail_extraction_batch', {
          p_job_id: jobId,
          p_batch_id: batchId,
          p_attempt_id: attemptId,
          p_worker_token: workerToken,
          p_status: 'FAILED',
          p_error_type: err?.name || 'ExecutionError',
          p_error_details: err?.message || 'Unknown batch worker execution failure',
          p_latency_ms: latencyMs,
        });
      });

      throw err; // Re-throw to allow Inngest durable retries up to configured limit
    }
  }
);
