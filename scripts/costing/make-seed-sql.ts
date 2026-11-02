// Usage: tsx scripts/costing/make-seed-sql.ts golden/costing/rate_db.json supabase/migrations/20261102_costing_rates_seed.sql
// Produces an INSERT script for the owner to run in the Supabase SQL editor.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { RateDb } from '../../apps/web/src/lib/costing/rateDb';

async function main() {
  const [inp = 'golden/costing/rate_db.json', out = 'supabase/migrations/20261102_costing_rates_seed.sql'] = process.argv.slice(2);
  const db: RateDb = JSON.parse(readFileSync(inp, 'utf8'));
  const q = (s: string | null) => (s == null ? 'null' : `'${s.replace(/'/g, "''")}'`);
  const n = (x: number | null) => (x == null ? 'null' : String(x));
  const lines: string[] = [
    `-- Seed: ${db.record_count} rates from ${db.source_file} (sha256 ${db.source_sha256})`,
    'begin;',
    `insert into public.costing_rate_sets (id, name, source_file, source_sha256, record_count, is_active)`,
    `values ('00000000-0000-0000-0000-0000000c0001', ${q(db.source_file)}, ${q(db.source_file)}, ${q(db.source_sha256)}, ${db.record_count}, true);`,
    `insert into public.costing_rates (set_id, id, strict_key, loose_key, occurrence, source_sl, source_row, scope, headers, description, unit, unit_norm, tender_est_rate, purchase_rate, execution_rate, purchase_basis, execution_basis, rule_kind, rule_pct, priced) values`,
  ];
  lines.push(
    db.records
      .map((r) =>
        `('00000000-0000-0000-0000-0000000c0001', ${q(r.id)}, ${q(r.strict_key)}, ${q(r.loose_key)}, ${r.occurrence}, ${q(r.source_sl)}, ${r.source_row}, ${q(r.scope)}, ${q(JSON.stringify(r.headers))}::jsonb, ${q(r.description)}, ${q(r.unit)}, ${q(r.unit_norm)}, ${n(r.tender_est_rate)}, ${n(r.purchase_rate)}, ${n(r.execution_rate)}, ${q(r.purchase_basis)}, ${q(r.execution_basis)}, ${q(r.rule.kind)}, ${r.rule.kind === 'PCT_OF_TOTAL' ? r.rule.pct : 'null'}, ${r.priced})`,
      )
      .join(',\n') + ';',
  );
  lines.push('commit;');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, lines.join('\n') + '\n');
  console.log(`wrote ${out} (${db.records.length} rows)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
