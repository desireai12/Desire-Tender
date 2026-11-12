// Costing engine: fills Purchase Rate (J), Execution Rate (K) and Total Amount (L)
// of a standard BOQ from the rate DB, keeping the workbook layout untouched.
// Fully deterministic - no LLM involved, every filled line is traceable to a DB record.
import ExcelJS from 'exceljs';
import { boqSheet, cellValue, COL, FIRST_DATA_ROW, parseSheet, type BoqRow } from './boq';
import {
  buildEffectiveDesc,
  fullText,
  isBareItem,
  looseKey,
  normText,
  normUnit,
  orderedNumberSig,
  resolveCanonicalScope,
  similarity,
  strictKey,
} from './normalize';
import type { RateDb, RateRecord } from './rateDb';

export type MatchStatus =
  | 'MATCHED'      // strict key (scope + context + description + unit) - trusted
  | 'REVIEW_LOOSE' // same scope + description + unit (context differs) - needs a look
  | 'REVIEW_FUZZY' // same scope + similar wording, same unit & number signature - needs a look
  | 'NOT_PRICED'   // matched, but the bid left this line blank (kept blank)
  | 'UNMATCHED';   // nothing usable in the DB - left blank

export interface LineResult {
  row: number;
  sl: string | null;
  scope: string | null;
  description: string;
  qty: number | null;
  unit: string | null;
  status: MatchStatus;
  matchedSl: string | null;
  matchedDesc: string | null;
  matchedScope: string | null;
  score: number;
  purchaseRate: number | null;
  executionRate: number | null;
  amount: number;
  notes: string;
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
    const scopeKey = r.scope_key ?? resolveCanonicalScope(r.scope, r.description, r.headers).scopeKey;
    const effDesc = r.effective_desc || r.description;

    const sk = strictKey({
      desc: r.description,
      effectiveDesc: effDesc,
      headers: r.headers,
      unit: r.unit,
      scope: r.scope,
      scopeKey,
    });
    const lk = looseKey({
      desc: r.description,
      effectiveDesc: effDesc,
      headers: r.headers,
      unit: r.unit,
      scope: r.scope,
      scopeKey,
    });

    byId.set(r.id, r);
    byId.set(`${sk}-${r.occurrence}`, r);
    (byStrict.get(sk) ?? byStrict.set(sk, []).get(sk)!).push(r);
    (byLoose.get(lk) ?? byLoose.set(lk, []).get(lk)!).push(r);
  }
  return { byId, byStrict, byLoose };
}

function findRate(
  row: BoqRow,
  occ: number,
  ix: Indexes,
  db: RateDb,
  thr: number,
): { rec: RateRecord | null; status: MatchStatus; score: number; notes: string } {
  const rowScopeRes = resolveCanonicalScope(row.scope, row.desc, row.headers);
  const rowScopeKey = rowScopeRes.scopeKey;
  const isBare = isBareItem(row.desc);
  const effDesc = buildEffectiveDesc(row.desc, row.parentItemText);
  const unit = normUnit(row.unit);
  const rowSig = orderedNumberSig(effDesc);

  // 0. Special check for O&M percentage lines:
  // Apply percentage logic ONLY when description contains explicit "%" (e.g. Ajmer: O&M @ 5% of project cost).
  // Banswara has 10 yearly O&M lines in Job units with no "%". Leave them UNMATCHED. Do not guess a value.
  if (rowScopeKey === 'o&m' && !row.desc.includes('%')) {
    return {
      rec: null,
      status: 'UNMATCHED',
      score: 0,
      notes: 'Yearly O&M in Job units without percentage - unpriced',
    };
  }

  // 1. Strict Match: Scope of Work + Header Context + Description + Unit
  const sk = strictKey({
    desc: row.desc,
    effectiveDesc: effDesc,
    headers: row.headers,
    unit: row.unit,
    scope: row.scope,
    scopeKey: rowScopeKey,
  });
  const exact = ix.byId.get(`${sk}-${occ}`) ?? ix.byStrict.get(sk)?.at(-1);
  if (exact) {
    const status: MatchStatus = isBare && row.desc !== effDesc ? 'REVIEW_LOOSE' : 'MATCHED';
    const notes = !rowScopeRes.isKnown
      ? 'Scope unverified'
      : isBare && row.desc !== effDesc
      ? 'Matched with parent header context'
      : '';
    return { rec: exact, status, score: 1, notes };
  }

  // 2. Scope Loose Match: Same Scope of Work + Description + Unit (within same scope)
  const lk = looseKey({
    desc: row.desc,
    effectiveDesc: effDesc,
    headers: row.headers,
    unit: row.unit,
    scope: row.scope,
    scopeKey: rowScopeKey,
  });
  const loose = ix.byLoose.get(lk);
  if (loose?.length) {
    // Verify ordered number signature
    const validLoose = loose.filter((r) => {
      const rSig = orderedNumberSig(r.effective_desc || r.description);
      return !rowSig || !rSig || rowSig === rSig;
    });

    if (validLoose.length) {
      const rates = new Set(validLoose.map((r) => `${r.purchase_rate}|${r.execution_rate}`));
      if (rates.size === 1) {
        const status: MatchStatus = isBare ? 'REVIEW_FUZZY' : 'REVIEW_LOOSE';
        const notes = !rowScopeRes.isKnown ? 'Scope unverified' : 'Headers differ, rates uniform';
        return { rec: validLoose[0], status, score: 0.95, notes };
      }
    }
  }

  // 3. Scope Fuzzy Match: Same Scope + High Similarity (>= 80%) + Exact Ordered Number Signature
  const text = fullText({ desc: effDesc, headers: row.headers, scopeKey: rowScopeKey });
  let best: RateRecord | null = null;
  let bestScore = 0;
  let scopeMismatchCandidate: RateRecord | null = null;

  for (const rec of db.records) {
    const recScopeKey = rec.scope_key ?? resolveCanonicalScope(rec.scope, rec.description, rec.headers).scopeKey;

    // Check unit first
    if (rec.unit_norm !== unit) continue;

    // Ordered number signature check (MUST BE IDENTICAL IN ORDER)
    const recEffDesc = rec.effective_desc || rec.description;
    const recSig = orderedNumberSig(recEffDesc);
    if (rowSig && recSig && rowSig !== recSig) {
      continue; // Sizes, discharge, head numbers do not match in sequence!
    }

    // Hard Scope Guard:
    // If both scopes are known and different, record is strictly disqualified
    if (rowScopeRes.isKnown && recScopeKey && rowScopeKey !== recScopeKey) {
      // Check if this would have matched description to report note
      const recText = [recScopeKey, ...rec.headers, rec.description].filter(Boolean).join(' | ');
      const sim = similarity(text, recText);
      if (sim >= 0.8 && !scopeMismatchCandidate) {
        scopeMismatchCandidate = rec;
      }
      continue;
    }

    const recText = [recScopeKey, ...rec.headers, rec.description].filter(Boolean).join(' | ');
    const s = similarity(text, recText);
    if (s > bestScore) {
      best = rec;
      bestScore = s;
    }
  }

  if (best && bestScore >= thr) {
    const notes = !rowScopeRes.isKnown ? 'Scope unverified' : 'Fuzzy matched on description & signature';
    return { rec: best, status: 'REVIEW_FUZZY', score: bestScore, notes };
  }

  if (scopeMismatchCandidate) {
    const mismatchScope = scopeMismatchCandidate.scope_key || scopeMismatchCandidate.scope || 'unknown';
    return {
      rec: null,
      status: 'UNMATCHED',
      score: bestScore,
      notes: `Scope mismatch: BOQ=${rowScopeKey || 'unknown'}, DB=${mismatchScope}`,
    };
  }

  return { rec: null, status: 'UNMATCHED', score: bestScore, notes: 'Not found in rate database' };
}

export async function costWorkbook(
  wb: ExcelJS.Workbook,
  db: RateDb,
  opts: CostOptions = {},
): Promise<CostingResult> {
  const { fuzzyThreshold = 0.8, overwriteExisting = true, addReportSheet = true } = opts;
  const ws = boqSheet(wb);
  const rows = parseSheet(ws).filter((r) => r.isItem);
  const ix = index(db);
  const occ = new Map<string, number>();
  const lines: LineResult[] = [];
  const pending: { line: LineResult; rec: RateRecord; row: BoqRow }[] = [];

  for (const row of rows) {
    const rowScopeRes = resolveCanonicalScope(row.scope, row.desc, row.headers);
    const effDesc = buildEffectiveDesc(row.desc, row.parentItemText);
    const sk = strictKey({
      desc: row.desc,
      effectiveDesc: effDesc,
      headers: row.headers,
      unit: row.unit,
      scope: row.scope,
      scopeKey: rowScopeRes.scopeKey,
    });

    const n = (occ.get(sk) ?? 0) + 1;
    occ.set(sk, n);

    const { rec, status, score, notes } = findRate(row, n, ix, db, fuzzyThreshold);

    const line: LineResult = {
      row: row.row,
      sl: row.sl,
      scope: row.scope,
      description: row.desc,
      qty: row.qty,
      unit: row.unit,
      status: rec && !rec.priced ? 'NOT_PRICED' : status,
      matchedSl: rec?.source_sl ?? null,
      matchedDesc: rec?.description ?? null,
      matchedScope: rec?.scope_of_work ?? rec?.scope ?? null,
      score,
      purchaseRate: null,
      executionRate: null,
      amount: 0,
      notes,
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
    cJ.value = J;
    cK.value = K;
    line.purchaseRate = J;
    line.executionRate = K;
    line.amount = (row.qty ?? 0) * ((J ?? 0) + (K ?? 0));
  }

  // 2) amount formulas for every item row (same formula the template uses)
  const L = (r: number) => ws.getCell(r, COL.AMT);
  for (const line of lines) {
    if (pending.find((p) => p.line === line)?.rec.rule.kind === 'PCT_OF_TOTAL') continue;
    L(line.row).value = { formula: `D${line.row}*(J${line.row}+K${line.row})`, result: line.amount };
  }

  // 3) percentage-of-total lines (e.g. O&M @ 5% of project cost) - computed last
  for (const { line, rec, row } of pending) {
    if (rec.rule.kind !== 'PCT_OF_TOTAL') continue;
    const base = lines.filter((l) => l !== line).reduce((s, l) => s + l.amount, 0);
    const k = base * rec.rule.pct;
    ws.getCell(row.row, COL.EXE).value = {
      formula: `SUM(L${FIRST_DATA_ROW}:L${row.row - 1})*${rec.rule.pct * 100}%`,
      result: k,
    };
    L(row.row).value = { formula: `K${row.row}`, result: k * (row.qty ?? 1) };
    line.executionRate = k;
    line.amount = k * (row.qty ?? 1);
  }

  // 4) Cell Highlighting: UNMATCHED -> light red, REVIEW_* -> light amber
  const RED_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFC7CE' }, // light red
  };
  const AMBER_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFEB9C' }, // light amber
  };

  for (const line of lines) {
    const cJ = ws.getCell(line.row, COL.PUR);
    const cK = ws.getCell(line.row, COL.EXE);
    if (line.status === 'UNMATCHED') {
      cJ.fill = RED_FILL;
      cK.fill = RED_FILL;
    } else if (line.status === 'REVIEW_LOOSE' || line.status === 'REVIEW_FUZZY') {
      cJ.fill = AMBER_FILL;
      cK.fill = AMBER_FILL;
    }
  }

  const totalAmount = lines.reduce((s, l) => s + l.amount, 0);

  // refresh cached result of the sheet's grand-total cell (formula stays untouched)
  for (let r = ws.rowCount; r >= FIRST_DATA_ROW; r--) {
    if (String(cellValue(ws.getCell(r, 6))).trim().toLowerCase() === 'total') {
      const c = ws.getCell(r, COL.AMT), v = c.value as any;
      if (v && typeof v === 'object' && 'formula' in v) {
        c.value = { formula: v.formula, result: totalAmount };
      }
      break;
    }
  }
  wb.calcProperties.fullCalcOnLoad = true;

  const counts: Record<MatchStatus, number> = {
    MATCHED: 0,
    REVIEW_LOOSE: 0,
    REVIEW_FUZZY: 0,
    NOT_PRICED: 0,
    UNMATCHED: 0,
  };
  for (const l of lines) counts[l.status]++;

  const result: CostingResult = { lines, totalAmount, counts, totalLines: lines.length };
  if (addReportSheet) writeReport(wb, result, db);
  return result;
}

function writeReport(wb: ExcelJS.Workbook, res: CostingResult, db: RateDb) {
  wb.getWorksheet('Costing Report') && wb.removeWorksheet(wb.getWorksheet('Costing Report')!.id);
  const ws = wb.addWorksheet('Costing Report');

  // Top Summary Block
  ws.addRow(['Costing report (rate DB: ' + db.source_file + ', ' + db.record_count + ' rates)']).font = { bold: true };
  const pricedCount = res.totalLines - res.counts.UNMATCHED - res.counts.NOT_PRICED;
  const pct = res.totalLines > 0 ? ((pricedCount / res.totalLines) * 100).toFixed(1) : '0';
  ws.addRow(['Items priced', `${pricedCount}/${res.totalLines} (${pct}%)`]);

  const totalLabel = res.counts.UNMATCHED > 0 ? 'Total of PRICED items only - INCOMPLETE' : 'Total bid amount';
  ws.addRow([totalLabel, res.totalAmount]);

  for (const [k, v] of Object.entries(res.counts)) {
    ws.addRow([k, v]);
  }
  ws.addRow([]);

  // Main Itemized Table
  const head = ws.addRow([
    'Row',
    'Sl.No',
    'Scope',
    'Description',
    'Status',
    'Matched DB Sl.No',
    'Matched DB description',
    'Matched DB scope',
    'Score',
    'Qty',
    'Unit',
    'Purchase',
    'Execution',
    'Amount',
    'Notes',
  ]);
  head.font = { bold: true };

  for (const l of res.lines) {
    const amtCell = l.status === 'UNMATCHED' ? '' : l.amount;
    ws.addRow([
      l.row,
      l.sl,
      l.scope || '',
      l.description.slice(0, 120),
      l.status,
      l.matchedSl || '',
      l.matchedDesc ? l.matchedDesc.slice(0, 100) : '',
      l.matchedScope || '',
      +l.score.toFixed(2),
      l.qty,
      l.unit,
      l.purchaseRate,
      l.executionRate,
      amtCell,
      l.notes || '',
    ]);
  }

  // Column widths
  ws.getColumn(1).width = 8;
  ws.getColumn(2).width = 10;
  ws.getColumn(3).width = 16;
  ws.getColumn(4).width = 50;
  ws.getColumn(5).width = 14;
  ws.getColumn(6).width = 16;
  ws.getColumn(7).width = 40;
  ws.getColumn(8).width = 16;
  ws.getColumn(9).width = 8;
  ws.getColumn(10).width = 10;
  ws.getColumn(11).width = 10;
  ws.getColumn(12).width = 12;
  ws.getColumn(13).width = 12;
  ws.getColumn(14).width = 14;
  ws.getColumn(15).width = 30;

  // Top 10 Contributors Section
  ws.addRow([]);
  const topHeader = ws.addRow(['Top 10 Contributors (by Amount)']);
  topHeader.font = { bold: true, size: 12 };
  const subHead = ws.addRow(['Row', 'Scope', 'Description', 'Amount', '% of Total']);
  subHead.font = { bold: true };

  const sortedLines = [...res.lines]
    .filter((l) => l.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  for (const sl of sortedLines) {
    const share = res.totalAmount > 0 ? ((sl.amount / res.totalAmount) * 100).toFixed(1) + '%' : '0%';
    ws.addRow([sl.row, sl.scope || '', sl.description.slice(0, 80), sl.amount, share]);
  }
}

export async function costFile(inPath: string, outPath: string, db: RateDb, opts?: CostOptions) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(inPath);
  const res = await costWorkbook(wb, db, opts);
  await wb.xlsx.writeFile(outPath);
  return res;
}
