import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { extractionOrchestrator } from '@/inngest/orchestrator';
import { extractionBatchWorker } from '@/inngest/batchWorker';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    extractionOrchestrator,
    extractionBatchWorker,
  ],
});
