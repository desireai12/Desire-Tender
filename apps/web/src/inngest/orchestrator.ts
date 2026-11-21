import { inngest } from './client';
import { supabase } from '@/lib/supabase';

const BATCH_SIZE = 15; // Standard sequential batch size approved in Phase 1.2
const BATCH_OVERLAP = 2; // 2-page overlap preserving cross-boundary tables and clauses
const STEP_SIZE = BATCH_SIZE - BATCH_OVERLAP; // 13-page advance per batch

/**
 * Parent Job Orchestrator
 *
 * Responsibilities:
 *  1. Verifies parent job in public.extraction_jobs.
 *  2. Pre-populates all document_pages records with default disposition 'PENDING'.
 *  3. Generates sequential batch records in public.extraction_batches ensuring end_page <= total_pages.
 *  4. Fans out durable batch events to extractionBatchWorker using ONLY identifiers and page ranges.
 *  5. Never passes file buffers or raw PDF text in event payloads.
 */
export const extractionOrchestrator = inngest.createFunction(
  {
    id: 'tender-extraction-orchestrator',
    name: 'Tender Document Extraction Orchestrator',
    concurrency: {
      limit: 10,
    },
  },
  { event: 'tender/extraction.orchestrate' },
  async ({ event, step }) => {
    const { jobId, tenderId, totalPages, documentUrl } = event.data;

    if (!jobId || !tenderId || !totalPages || totalPages < 1) {
      throw new Error(`[ORCHESTRATOR_ERROR] Invalid orchestrate payload: jobId=${jobId}, totalPages=${totalPages}`);
    }

    // Step 1: Initialize document pages with disposition 'PENDING'
    await step.run('init-document-pages', async () => {
      if (!supabase) throw new Error('[ORCHESTRATOR_ERROR] Supabase client is not configured');

      // Check if job exists
      const { data: job, error: jobErr } = await supabase
        .from('extraction_jobs')
        .select('id, status, total_pages')
        .eq('id', jobId)
        .maybeSingle();

      if (jobErr || !job) {
        throw new Error(`[ORCHESTRATOR_ERROR] Job ${jobId} not found: ${jobErr?.message || 'Unknown'}`);
      }

      // Generate page rows for the entire document
      const pageRows = [];
      for (let p = 1; p <= totalPages; p++) {
        pageRows.push({
          job_id: jobId,
          page_number: p,
          disposition: 'PENDING',
          is_material: true,
          has_tables: false,
          has_qualification_criteria: false,
          token_count: 0,
        });
      }

      // Upsert pages in chunks of 200 to keep payload within PostgreSQL param limits
      const CHUNK_SIZE = 200;
      for (let i = 0; i < pageRows.length; i += CHUNK_SIZE) {
        const chunk = pageRows.slice(i, i + CHUNK_SIZE);
        const { error: pagesErr } = await supabase
          .from('document_pages')
          .upsert(chunk, { onConflict: 'job_id,page_number', ignoreDuplicates: true });

        if (pagesErr) {
          throw new Error(`[ORCHESTRATOR_ERROR] Failed to populate document_pages chunk ${i}: ${pagesErr.message}`);
        }
      }

      // Update job status to INITIALIZING
      await supabase
        .from('extraction_jobs')
        .update({
          status: 'INITIALIZING',
          started_at: new Date().toISOString(),
          source_file_url: documentUrl || null,
        })
        .eq('id', jobId);

      return { pagesCreated: totalPages };
    });

    // Step 2: Compute batch ranges and persist in extraction_batches
    const batches = await step.run('create-batches', async () => {
      if (!supabase) throw new Error('[ORCHESTRATOR_ERROR] Supabase client not configured');

      const batchRecords: Array<{
        job_id: string;
        batch_index: number;
        start_page: number;
        end_page: number;
        status: string;
        attempt_count: number;
        max_attempts: number;
      }> = [];

      let batchIndex = 1;
      for (let start = 1; start <= totalPages; start += STEP_SIZE) {
        const end = Math.min(start + BATCH_SIZE - 1, totalPages);
        batchRecords.push({
          job_id: jobId,
          batch_index: batchIndex++,
          start_page: start,
          end_page: end,
          status: 'QUEUED',
          attempt_count: 0,
          max_attempts: 3,
        });
        if (end >= totalPages) break;
      }

      const { data: insertedBatches, error: batchErr } = await supabase
        .from('extraction_batches')
        .upsert(batchRecords, { onConflict: 'job_id,batch_index' })
        .select('id, batch_index, start_page, end_page');

      if (batchErr || !insertedBatches) {
        throw new Error(`[ORCHESTRATOR_ERROR] Failed to insert extraction_batches: ${batchErr?.message}`);
      }

      // Update job total_batches count and move to EXTRACTING
      await supabase
        .from('extraction_jobs')
        .update({
          total_batches: insertedBatches.length,
          status: 'EXTRACTING',
        })
        .eq('id', jobId);

      return insertedBatches;
    });

    // Step 3: Fan out batch worker events (ZERO large buffers in event payloads!)
    await step.run('dispatch-batch-events', async () => {
      const eventsToSend = batches.map(b => ({
        name: 'tender/extraction.batch-process' as const,
        data: {
          jobId,
          tenderId,
          batchId: b.id,
          batchIndex: b.batch_index,
          startPage: b.start_page,
          endPage: b.end_page,
        },
      }));

      await inngest.send(eventsToSend);
      return { eventsDispatched: eventsToSend.length };
    });

    return {
      status: 'ORCHESTRATION_DISPATCHED',
      jobId,
      tenderId,
      totalPages,
      totalBatches: batches.length,
    };
  }
);
