// Costing engine: fills Purchase Rate (J), Execution Rate (K) and Total Amount (L)
// of a standard BOQ from the rate DB, keeping the workbook layout untouched.
// Fully deterministic - no LLM involved, every filled line is traceable to a DB record.
import ExcelJS from 'exceljs';
import { boqSheet, cellValue, COL, FIRST_DATA_ROW, parseSheet, type BoqRow } from './boq';
import { fullText, looseKey, normUnit, numberSig, similarity, strictKey } from './normalize';
import type { RateDb, RateRecord } from './rateDb';

export type MatchStatus =
  | 'MATCHED'      // strict key (context + description + unit) - trusted
  | 'REVIEW_LOOSE' // description + unit only (context differs) - needs a look
  | 'REVIEW_FUZZY' // similar wording, same unit - needs a look
  | 'NOT_PRICED'   // matched, but the bid left this line blank (kept blank)
  | 'UNMATCHED';   // nothing usable in the DB - left blank

export interface LineResult {
  row: number;
  sl: string | null;
  description: string;
  qty: number | null;
  unit: string | null;
  status: MatchStatus;
  matchedSl: string | null;
  score: number;
  purchaseRate: number | null;
  executionRate: number | null;
  amount: number;
}
export interface CostingResult {
  lines: LineResult[];
  totalAmount: number;
  counts: Record<MatchStatus, number>;
  totalLines: number;
}

export interface CostOptions {
  fuzzyThreshold?: number;     // min similarity for REVIEW_FUZZY (default 0.8)
  overwriteExisting?: boolean; // replace J/K already present in the uploaded file (default true)
  addReportSheet?: boolean;    // append a "Costing Report" sheet (default true)
}

interface Indexes {
  byId: Map<string, RateRecord>;
  byStrict: Map<string, RateRecord[]>;
  byLoose: Map<string, RateRecord[]>;
}
function index(db: RateDb): Indexes {
  const byId = new Map(), byStrict = new Map<string, RateRecord[]>(), byLoose = new Map<string, RateRecord[]>();
  for (const r of db.records) {
    byId.set(r.id, r);
    (byStrict.get(r.strict_key) ?? byStrict.set(r.strict_key, []).get(r.strict_key)!).push(r);
    (byLoose.get(r.loose_key) ?? byLoose.set(r.loose_key, []).get(r.loose_key)!).push(r);
  }
  return { byId, byStrict, byLoose };
}

function findRate(row: BoqRow, occ: number, ix: Indexes, db: RateDb, thr: number): { rec: RateRecord | null; status: MatchStatus; score: number } {
  const sk = strictKey(row);
  const exact = ix.byId.get(`${sk}-${occ}`) ?? ix.byStrict.get(sk)?.at(-1);
  if (exact) return { rec: exact, status: 'MATCHED', score: 1 };

  const loose = ix.byLoose.get(looseKey(row));
  if (loose?.length) {
    const rates = new Set(loose.map((r) => `${r.purchase_rate}|${r.execution_rate}`));
    if (rates.size === 1) return { rec: loose[0], status: 'REVIEW_LOOSE', score: 0.95 };
  }
  const unit = normUnit(row.unit), text = fullText(row), sig = numberSig(text);
  let best: RateRecord | null = null, bestScore = 0;
  for (const rec of db.records) {
    if (rec.unit_norm !== unit) continue;
    const recText = [...rec.headers, rec.description].join(' | ');
    if (numberSig(recText) !== sig) continue; // sizes / capacities / grades must be identical
    const s = similarity(text, recText);
    if (s > bestScore) { best = rec; bestScore = s; }
  }
  if (best && bestScore >= thr) return { rec: best, status: 'REVIEW_FUZZY', score: bestScore };
  return { rec: null, status: 'UNMATCHED', score: bestScore };
}

export async function costWorkbook(
  wb: ExcelJS.Workbook, db: RateDb, opts: CostOptions = {},
): Promise<CostingResult> {
  const { fuzzyThreshold = 0.8, overwriteExisting = true, addReportSheet = true } = opts;
  const ws = boqSheet(wb);
  const rows = parseSheet(ws).filter((r) => r.isItem);
  const ix = index(db);
  const occ = new Map<string, number>();
  const lines: LineResult[] = [];
  const pending: { line: LineResult; rec: RateRecord; row: BoqRow }[] = [];

  for (const row of rows) {
    const sk = strictKey(row);
    const n = (occ.get(sk) ?? 0) + 1; occ.set(sk, n);
    const { rec, status, score } = findRate(row, n, ix, db, fuzzyThreshold);
    const line: LineResult = {
      row: row.row, sl: row.sl, description: row.desc, qty: row.qty, unit: row.unit,
      status: rec && !rec.priced ? 'NOT_PRICED' : status,
      matchedSl: rec?.source_sl ?? null, score,
      purchaseRate: null, executionRate: null, amount: 0,
    };
    lines.push(line);
    if (rec) pending.push({ line, rec, row });
  }

  // 1) fixed-rate lines
  for (const { line, rec, row } of pending) {
    if (rec.rule.kind !== 'FIXED' || !rec.priced) continue;
    const cJ = ws.getCell(row.row, COL.PUR), cK = ws.getCell(row.row, COL.EXE);
    const J = !overwriteExisting && row.purchaseRate != null ? row.purchaseRate : rec.purchase_rate;
    const K = !overwriteExisting && row.executionRate != null ? row.executionRate : rec.execution_rate;
    cJ.value = J; cK.value = K;
    line.purchaseRate = J; line.executionRate = K;
    line.amount = (row.qty ?? 0) * ((J ?? 0) + (K ?? 0));
  }
  // 2) amount formulas for every item row (same formula the template uses)
  const L = (r: number) => ws.getCell(r, COL.AMT);
  for (const line of lines) {
    if (pending.find((p) => p.line === line)?.rec.rule.kind === 'PCT_OF_TOTAL') continue;
    L(line.row).value = { formula: `D${line.row}*(J${line.row}+K${line.row})`, result: line.amount };
  }
  // 3) percentage-of-total lines (e.g. O&M @ 5 % of project cost) - computed last
  for (const { line, rec, row } of pending) {
    if (rec.rule.kind !== 'PCT_OF_TOTAL') continue;
    const base = lines.filter((l) => l !== line).reduce((s, l) => s + l.amount, 0);
    const k = base * rec.rule.pct;
    ws.getCell(row.row, COL.EXE).value = {
      formula: `SUM(L${FIRST_DATA_ROW}:L${row.row - 1})*${rec.rule.pct * 100}%`, result: k,
    };
    L(row.row).value = { formula: `K${row.row}`, result: k * (row.qty ?? 1) };
    line.executionRate = k; line.amount = k * (row.qty ?? 1);
  }
  const totalAmount = lines.reduce((s, l) => s + l.amount, 0);
  // refresh cached result of the sheet's grand-total cell (formula stays untouched)
  for (let r = ws.rowCount; r >= FIRST_DATA_ROW; r--) {
    if (String(cellValue(ws.getCell(r, 6))).trim().toLowerCase() === 'total') {
      const c = ws.getCell(r, COL.AMT), v = c.value as any;
      if (v && typeof v === 'object' && 'formula' in v) c.value = { formula: v.formula, result: totalAmount };
      break;
    }
  }
  wb.calcProperties.fullCalcOnLoad = true;

  const counts: Record<MatchStatus, number> = { MATCHED: 0, REVIEW_LOOSE: 0, REVIEW_FUZZY: 0, NOT_PRICED: 0, UNMATCHED: 0 };
  for (const l of lines) counts[l.status]++;
  const result: CostingResult = { lines, totalAmount, counts, totalLines: lines.length };
  if (addReportSheet) writeReport(wb, result, db);
  return result;
}

function writeReport(wb: ExcelJS.Workbook, res: CostingResult, db: RateDb) {
  wb.getWorksheet('Costing Report') && wb.removeWorksheet(wb.getWorksheet('Costing Report')!.id);
  const ws = wb.addWorksheet('Costing Report');
  ws.addRow(['Costing report (rate DB: ' + db.source_file + ', ' + db.record_count + ' rates)']).font = { bold: true };
  ws.addRow(['Total bid amount', res.totalAmount]);
  for (const [k, v] of Object.entries(res.counts)) ws.addRow([k, v]);
  ws.addRow([]);
  const head = ws.addRow(['Row', 'Sl.No', 'Description', 'Status', 'Matched DB Sl.No', 'Score', 'Qty', 'Unit', 'Purchase', 'Execution', 'Amount']);
  head.font = { bold: true };
  for (const l of res.lines) {
    ws.addRow([l.row, l.sl, l.description.slice(0, 120), l.status, l.matchedSl, +l.score.toFixed(2), l.qty, l.unit, l.purchaseRate, l.executionRate, l.amount]);
  }
  ws.getColumn(3).width = 70;
  [1, 2, 4, 5, 6, 7, 8, 9, 10, 11].forEach((c) => (ws.getColumn(c).width = 14));
}

export async function costFile(inPath: string, outPath: string, db: RateDb, opts?: CostOptions) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(inPath);
  const res = await costWorkbook(wb, db, opts);
  await wb.xlsx.writeFile(outPath);
  return res;
}
