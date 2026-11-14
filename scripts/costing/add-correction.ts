// Usage: tsx scripts/costing/add-correction.ts <boq_text_hash> <db_rate_id> <approve|reject> [note]
// Records human-in-the-loop decisions into costing_corrections.
import { fullSha1, normText } from '../../apps/web/src/lib/costing/normalize';

interface CorrectionRecord {
  id: string;
  boq_text_hash: string;
  db_rate_id: string;
  decision: 'approve' | 'reject';
  note?: string;
  created_at: string;
}

async function main() {
  const [hashOrText, dbRateId, decision, note = ''] = process.argv.slice(2);
  if (!hashOrText || !dbRateId || !decision) {
    console.error('Usage: tsx scripts/costing/add-correction.ts <boq_text_hash|raw_text> <db_rate_id> <approve|reject> [note]');
    process.exit(1);
  }

  if (decision !== 'approve' && decision !== 'reject') {
    console.error('Decision must be "approve" or "reject"');
    process.exit(1);
  }

  const hash = hashOrText.length === 40 || hashOrText.length === 16 ? hashOrText : fullSha1(normText(hashOrText));

  console.log(`Recorded correction:`);
  console.log(`  BOQ Text Hash: ${hash}`);
  console.log(`  DB Rate ID:    ${dbRateId}`);
  console.log(`  Decision:      ${decision.toUpperCase()}`);
  console.log(`  Note:          ${note}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

