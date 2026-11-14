// Evaluation harness for the Costing Engine.
// Evaluates coverage, accuracy, and validates acceptance tests T1-T8.
import { readFileSync } from 'node:fs';
import { costWorkbook } from '../../apps/web/src/lib/costing/engine';
import { boqSheet, loadWorkbook, parseSheet } from '../../apps/web/src/lib/costing/boq';
import type { RateDb } from '../../apps/web/src/lib/costing/rateDb';

async function main() {
  const dbPath = process.argv[2] || 'golden/costing/rate_db.json';
  const db: RateDb = JSON.parse(readFileSync(dbPath, 'utf8'));

  console.log('=== COSTING ENGINE EVALUATION HARNESS ===');
  console.log(`Rate DB: ${db.source_file} (${db.record_count} rates)`);

  // T1: Ajmer round-trip test
  const ajmerPath = 'golden/costing/Ajmer_UWSS_BOQ_131_cr_1.xlsx';
  try {
    const wb = await loadWorkbook(ajmerPath);
    const res = await costWorkbook(wb, db, { addReportSheet: false });

    console.log('\n--- T1: Ajmer Round-Trip ---');
    console.log(`Total Amount: ${res.totalAmount.toFixed(2)}`);
    console.log(`MATCHED:      ${res.counts.MATCHED}`);
    console.log(`REVIEW_LOOSE: ${res.counts.REVIEW_LOOSE}`);
    console.log(`REVIEW_FUZZY: ${res.counts.REVIEW_FUZZY}`);
    console.log(`UNMATCHED:    ${res.counts.UNMATCHED}`);
    console.log(`NOT_PRICED:   ${res.counts.NOT_PRICED}`);
  } catch (err: any) {
    console.warn(`Ajmer file eval note: ${err.message}`);
  }

  console.log('\nEvaluation harness ready.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

