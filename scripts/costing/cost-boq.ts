// Usage: tsx scripts/costing/cost-boq.ts <new-boq.xlsx> <out.xlsx> [golden/costing/rate_db.json]
import { readFileSync } from 'node:fs';
import { costFile } from '../../apps/web/src/lib/costing/engine';
import type { RateDb } from '../../apps/web/src/lib/costing/rateDb';

async function main() {
  const [inp, out, dbPath = 'golden/costing/rate_db.json'] = process.argv.slice(2);
  if (!inp || !out) { console.error('usage: cost-boq <new-boq.xlsx> <out.xlsx> [rate_db.json]'); process.exit(1); }
  const db: RateDb = JSON.parse(readFileSync(dbPath, 'utf8'));
  const r = await costFile(inp, out, db);
  console.log(r.counts);
  console.log('Total bid amount:', r.totalAmount.toFixed(2));
  console.log('Written', out);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
