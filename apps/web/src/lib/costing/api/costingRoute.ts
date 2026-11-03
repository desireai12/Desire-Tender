// Drop-in handler for the Next.js gateway (apps/web/src/app/api/v1/[...path]/route.ts):
//   POST /api/v1/costing/run   multipart form-data, field "file" = the new BOQ (.xlsx)
//   -> returns the costed .xlsx, with the counts in response headers.
// Server-side only. Uses the service-role key to read the ACTIVE rate set; never exposed to the browser.
// NOTE: written against the standard Request/Response API; adapt the auth check to your session helper.
import ExcelJS from 'exceljs';
import { costWorkbook } from '../engine';
import type { RateDb, RateRecord } from '../rateDb';

async function loadActiveRateDb(supabaseUrl: string, serviceKey: string): Promise<RateDb> {
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const setsRes = await fetch(`${supabaseUrl}/rest/v1/costing_rate_sets?is_active=eq.true&select=*`, { headers });
  if (!setsRes.ok) throw new Error(`Supabase costing_rate_sets query failed (HTTP ${setsRes.status}): ${await supabaseErrorText(setsRes)}`);
  const sets = await setsRes.json();
  if (!Array.isArray(sets) || sets.length !== 1) throw new Error(`Exactly one active costing rate set is required (found ${Array.isArray(sets) ? sets.length : 'none'})`);
  const set = sets[0];
  const records: RateRecord[] = [];
  for (let from = 0; ; from += 1000) { // page through PostgREST's 1000-row limit
    const res = await fetch(
      `${supabaseUrl}/rest/v1/costing_rates?set_id=eq.${set.id}&select=*&order=source_row.asc`,
      { headers: { ...headers, Range: `${from}-${from + 999}` } },
    );
    if (!res.ok) throw new Error(`Supabase costing_rates query failed (HTTP ${res.status}): ${await supabaseErrorText(res)}`);
    const page: any[] = await res.json();
    for (const r of page) {
      records.push({ ...r, rule: r.rule_kind === 'PCT_OF_TOTAL' ? { kind: 'PCT_OF_TOTAL', pct: Number(r.rule_pct) } : { kind: 'FIXED' },
        purchase_rate: r.purchase_rate == null ? null : Number(r.purchase_rate),
        execution_rate: r.execution_rate == null ? null : Number(r.execution_rate),
        tender_est_rate: r.tender_est_rate == null ? null : Number(r.tender_est_rate) });
    }
    if (page.length < 1000) break;
  }
  if (records.length !== set.record_count) throw new Error(`Rate set incomplete: ${records.length} of ${set.record_count}`);
  return { schema: 'boq-rate-db/1', source_file: set.source_file, source_sha256: set.source_sha256, built_at: set.created_at, record_count: records.length, records };
}

// Short, human-readable reason from a failed PostgREST response (its JSON has message/hint, never the key).
async function supabaseErrorText(res: Response): Promise<string> {
  try {
    const body = await res.text();
    try {
      const j = JSON.parse(body);
      return String(j.message || j.error || j.hint || body).slice(0, 300);
    } catch {
      return body.slice(0, 300);
    }
  } catch {
    return res.statusText || 'no response body';
  }
}

// Never let a secret reach the client: strip the service key and anything JWT-shaped from the message.
function safeErrorMessage(err: unknown, secrets: string[]): string {
  let msg = err instanceof Error ? err.message : String(err);
  for (const s of secrets) if (s) msg = msg.split(s).join('[redacted]');
  msg = msg.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted]');
  msg = msg.replace(/\bsb_(secret|publishable)_[A-Za-z0-9_-]+/g, '[redacted]');
  return msg || 'Costing failed with an unknown error.';
}

export async function handleCostingRun(req: Request, env: { SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string }): Promise<Response> {
  // Same env names the rest of the app uses (see apps/web/src/lib/supabase.ts).
  const supabaseUrl = (env?.SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const serviceKey = (env?.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!supabaseUrl) {
    return Response.json({ error: 'SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) environment variable is missing.' }, { status: 500 });
  }
  if (!serviceKey) {
    return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY environment variable is missing.' }, { status: 500 });
  }

  try {
    return await runCosting(req, supabaseUrl, serviceKey);
  } catch (err) {
    console.error('[COSTING_RUN_ERROR]', safeErrorMessage(err, [serviceKey]));
    return Response.json({ error: safeErrorMessage(err, [serviceKey]) }, { status: 500 });
  }
}

async function runCosting(req: Request, supabaseUrl: string, serviceKey: string): Promise<Response> {
  // Session authentication is handled at the gateway level in route.ts
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File) || !/\.xlsx$/i.test(file.name)) return Response.json({ error: 'Upload an .xlsx BOQ in field "file"' }, { status: 400 });
  const db = await loadActiveRateDb(supabaseUrl, serviceKey);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const res = await costWorkbook(wb, db);
  const out = await wb.xlsx.writeBuffer();
  return new Response(out as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${file.name.replace(/\.xlsx$/i, '')}_costed.xlsx"`,
      'X-Costing-Counts': JSON.stringify(res.counts),
      'X-Costing-Total': res.totalAmount.toFixed(2),
      'X-Costing-Rate-Set': db.source_sha256.slice(0, 12),
      'Access-Control-Expose-Headers': 'X-Costing-Counts, X-Costing-Total, X-Costing-Rate-Set, Content-Disposition',
    },
  });
}
