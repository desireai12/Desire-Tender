// Usage: tsx scripts/costing/build-rate-db.ts <costed-boq.xlsx> [out.json]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { buildRateDb, sha256 } from '../../apps/web/src/lib/costing/rateDb';

async function main() {
  const [src, out = 'golden/costing/rate_db.json'] = process.argv.slice(2);
  if (!src) { console.error('usage: build-rate-db <costed-boq.xlsx> [out.json]'); process.exit(1); }
  const db = await buildRateDb(src, sha256(readFileSync(src)));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(db, null, 1));
  const dup = db.records.filter((r) => r.occurrence > 1).length;
  console.log(`rate records: ${db.record_count}`);
  console.log(`priced: ${db.records.filter((r) => r.priced).length}, unpriced: ${db.records.filter((r) => !r.priced).length}`);
  console.log(`rule-based: ${db.records.filter((r) => r.rule.kind !== 'FIXED').length}`);
  console.log(`repeat keys (disambiguated by order): ${dup}`);
  console.log(`written ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
