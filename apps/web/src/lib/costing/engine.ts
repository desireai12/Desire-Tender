// Costing engine: fills Purchase Rate (J), Execution Rate (K) and Total Amount (L)
// of a standard BOQ from the rate DB, keeping the workbook layout untouched.
// Fully deterministic - no LLM involved in rate setting, every filled rate is traceable to a DB record.
import ExcelJS from 'exceljs';
import { boqSheet, cellValue, COL, FIRST_DATA_ROW, parseSheet, type BoqRow } from './boq';
import { COSTING_CONFIG } from './costingConfig';
import {
  buildEffectiveDesc,
  convertNumberWords,
  extractSpecWords,
  fullText,
  isBareItem,
  looseKey,
  normText,
  normUnit,
  orderedNumberSig,
  significantWords,
  similarity,
  strictKey,
} from './normalize';
import {
  extractRuleFingerprint,
  reconcileFingerprints,
  type CostingItemFingerprint,
  type OperationType,
} from './itemFingerprint';
import {
  extractAiFingerprint,
  judgeCandidateEquivalence,
  type JudgeCandidate,
} from './aiAssist';
import { resolveCanonicalScope, type ScopeResolution } from './scopeAliases';
import type { RateDb, RateRecord } from './rateDb';

export type MatchStatus =
  | 'MATCHED'      // strict key (scope + context + description + unit) - trusted
  | 'REVIEW_LOOSE' // same scope + description + unit (context differs) - needs a look
  | 'REVIEW_FUZZY' // same scope + similar wording, same unit & number signature - needs a look
  | 'NOT_PRICED'   // matched, but the bid left this line blank (kept blank)
  | 'UNMATCHED';   // nothing usable in the DB - left blank

export type MatchBasis = 'strict' | 'loose' | 'text' | 'fingerprint' | 'ai-judge' | 'none';

export interface CorrectionEntry {
  boq_text_hash: string;
  db_rate_id: string;
  decision: 'approve' | 'reject';
  note?: string;
}

export interface LineResult {
  row: number;
  sl: string | null;
  scope: string | null;
  scopeSource: 'column' | 'header' | 'inferred' | 'unknown';
  scopeConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  itemType: string;
  matchBasis: MatchBasis;
  signatureCompared: string;
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
  amount: number | null; // null if unpriced
  notes: string;
  fingerprint?: CostingItemFingerprint | null;
}

export interface CostingResult {
  lines: LineResult[];
  totalAmount: number;
  matchedAmount: number;
  reviewAmount: number;
  counts: Record<MatchStatus, number>;
  scopeSourceCounts: Record<string, number>;
  totalLines: number;
}

export interface CostOptions {
  fuzzyThreshold?: number;     // min similarity for REVIEW_FUZZY (default from config)
  overwriteExisting?: boolean; // replace J/K already present in uploaded file (default true)
  addReportSheet?: boolean;    // append a "Costing Report" sheet (default true)
  corrections?: CorrectionEntry[];
  apiKey?: string;             // Gemini API key for AI assistant/judge
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

/** Check operation compatibility (H4) */
function areOperationsCompatible(op1: OperationType, op2: OperationType): boolean {
  if (op1 === op2) return true;
  if (op1 === 'other' || op2 === 'other') return true;

  // Supply only never matches supply_and_install or laying
  if (op1 === 'supply' && (op2 === 'laying' || op2 === 'supply_and_install')) return false;
  if (op2 === 'supply' && (op1 === 'laying' || op1 === 'supply_and_install')) return false;

  // Laying only never matches supply or supply_and_install
  if (op1 === 'laying' && (op2 === 'supply' || op2 === 'supply_and_install')) return false;
  if (op2 === 'laying' && (op1 === 'supply' || op1 === 'supply_and_install')) return false;

  // Civil work never matches pipeline laying or equipment supply
  if (op1 === 'civil_work' && (op2 === 'supply' || op2 === 'laying')) return false;
  if (op2 === 'civil_work' && (op1 === 'supply' || op1 === 'laying')) return false;

  return true;
}

/** Check spec words compatibility (H2) */
function checkSpecWordsMismatch(sw1: Set<string>, sw2: Set<string>): string | null {
  for (const w of sw1) {
    // If w is material (e.g. wooden vs steel, pvc vs pp)
    if (['wooden', 'steel', 'pvc', 'pp', 'di', 'ci', 'ms', 'hdpe'].includes(w)) {
      for (const w2 of sw2) {
        if (['wooden', 'steel', 'pvc', 'pp', 'di', 'ci', 'ms', 'hdpe'].includes(w2) && w !== w2) {
          return `${w} vs ${w2}`;
        }
      }
    }
    // If w is grade/class (e.g. k-7 vs k-9, m10 vs m15)
    if (/^(k-|pn-|pe-|m-|fe-)/.test(w)) {
      const prefix = w.split('-')[0];
      for (const w2 of sw2) {
        if (w2.startsWith(prefix + '-') && w !== w2) {
          return `${w} vs ${w2}`;
        }
      }
    }
  }
  return null;
}

/** H8 No-evidence rule: token overlap of significant words >= 60% */
function hasSignificantEvidence(boqWords: Set<string>, dbItemText: string): boolean {
  if (boqWords.size === 0) return true;
  const dbWords = significantWords(dbItemText);
  let overlap = 0;
  boqWords.forEach((w) => {
    if (dbWords.has(w)) overlap++;
  });
  return (overlap / boqWords.size) >= COSTING_CONFIG.noEvidenceOverlapMin;
}

async function findRate(
  row: BoqRow,
  occ: number,
  ix: Indexes,
  db: RateDb,
  opts: CostOptions,
): Promise<{
  rec: RateRecord | null;
  status: MatchStatus;
  score: number;
  matchBasis: MatchBasis;
  notes: string;
  scopeRes: ScopeResolution;
  fingerprint: CostingItemFingerprint;
}> {
  const rowScopeRes = resolveCanonicalScope(row.scope, row.desc, row.headers);
  const rowScopeKey = rowScopeRes.scopeKey;
  const isBare = isBareItem(row.desc);
  const effDesc = buildEffectiveDesc(row.desc, row.parentItemText);
  const unit = normUnit(row.unit);
  const rowSig = orderedNumberSig(effDesc);

  // Extract rule-based fingerprint
  const ruleFp = extractRuleFingerprint({
    description: effDesc,
    parentChain: row.headers,
    unit: row.unit,
    scope: row.scope,
  });

  // Optional AI extractor
  let aiFp: Partial<CostingItemFingerprint> | null = null;
  if (COSTING_CONFIG.costingAiEnabled) {
    aiFp = await extractAiFingerprint({
      description: effDesc,
      parentChain: row.headers,
      unit: row.unit,
      scope: row.scope,
    }, opts.apiKey);
  }

  const finalFp = reconcileFingerprints(ruleFp, aiFp);
  const boqSpecWords = extractSpecWords(effDesc);
  const boqSigWords = significantWords(effDesc);

  // Corrections lookup helper
  const checkCorrection = (dbId: string): 'approve' | 'reject' | null => {
    if (!opts.corrections?.length) return null;
    const match = opts.corrections.find((c) => c.db_rate_id === dbId);
    return match ? match.decision : null;
  };

  // 0. Special check for O&M percentage lines:
  // Apply percentage logic ONLY when description contains explicit "%" (e.g. Ajmer: O&M @ 5% of project cost).
  // Banswara has 10 yearly O&M lines in Job units with no "%". Leave them UNMATCHED. Do not guess a value.
  if (rowScopeKey === 'o&m' && !row.desc.includes('%')) {
    return {
      rec: null,
      status: 'UNMATCHED',
      score: 0,
      matchBasis: 'none',
      notes: 'Yearly O&M in Job units without percentage - unpriced',
      scopeRes: rowScopeRes,
      fingerprint: finalFp,
    };
  }

  // 1. Strict Match: Scope of Work + Header Context + Description + Unit + Ordered Signature
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
    const corr = checkCorrection(exact.id);
    if (corr === 'reject') {
      return {
        rec: null,
        status: 'UNMATCHED',
        score: 0,
        matchBasis: 'none',
        notes: 'Rejected by human correction',
        scopeRes: rowScopeRes,
        fingerprint: finalFp,
      };
    }

    // Verify ordered number signature
    const exactSig = orderedNumberSig(exact.effective_desc || exact.description);
    if (!rowSig || !exactSig || rowSig === exactSig) {
      const status: MatchStatus = isBare && row.desc !== effDesc ? 'REVIEW_LOOSE' : 'MATCHED';
      let notes = !rowScopeRes.isKnown
        ? 'Scope unverified'
        : isBare && row.desc !== effDesc
        ? 'Matched with parent header context'
        : '';
      if (rowScopeRes.disagreesWithColumn) {
        notes = notes ? `${notes}; Scope column disagrees with description` : 'Scope column disagrees with description';
      }
      return {
        rec: exact,
        status: rowScopeRes.disagreesWithColumn ? 'REVIEW_LOOSE' : status,
        score: 1,
        matchBasis: 'strict',
        notes,
        scopeRes: rowScopeRes,
        fingerprint: finalFp,
      };
    }
  }

  // 2. Scope Loose Match: Same Scope + Identical Normalized Description + Same Unit + Identical Signature
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
    const validLoose = loose.filter((r) => {
      if (checkCorrection(r.id) === 'reject') return false;

      // H1 Ordered Signature
      const rSig = orderedNumberSig(r.effective_desc || r.description);
      if (rowSig && rSig && rowSig !== rSig) return false;

      // H2 Spec words
      const rSpec = extractSpecWords(r.effective_desc || r.description);
      if (checkSpecWordsMismatch(boqSpecWords, rSpec)) return false;

      // H4 Operations
      const rFp = r.fingerprint || extractRuleFingerprint({ description: r.effective_desc || r.description, parentChain: r.headers, unit: r.unit, scope: r.scope });
      if (!areOperationsCompatible(finalFp.operation, rFp.operation)) return false;

      return true;
    });

    if (validLoose.length) {
      // Check Parent Spec Differs rule (Part C, Match ladder 2)
      // If parents differ in a material spec word (e.g. "PVC/MS saddle" vs "PP/MS saddle", "wooden" vs "steel")
      const candidate = validLoose[0];
      const boqParentContext = [row.parentItemText, ...(row.headers || [])].filter(Boolean).join(' ');
      const dbParentContext = [candidate.headers.join(' ')].join(' ');
      const boqParentSpec = extractSpecWords(boqParentContext);
      const dbParentSpec = extractSpecWords(dbParentContext);
      const parentMismatch = checkSpecWordsMismatch(boqParentSpec, dbParentSpec);

      if (parentMismatch) {
        return {
          rec: null,
          status: 'UNMATCHED',
          score: 0,
          matchBasis: 'none',
          notes: `Parent spec differs: ${parentMismatch}`,
          scopeRes: rowScopeRes,
          fingerprint: finalFp,
        };
      }

      const rates = new Set(validLoose.map((r) => `${r.purchase_rate}|${r.execution_rate}`));
      if (rates.size === 1) {
        const notes = !rowScopeRes.isKnown ? 'Scope unverified' : 'Headers differ, rates uniform';
        return {
          rec: candidate,
          status: 'REVIEW_LOOSE',
          score: 0.95,
          matchBasis: 'loose',
          notes,
          scopeRes: rowScopeRes,
          fingerprint: finalFp,
        };
      }
    }
  }

  // 3. Scope Fuzzy Match / Hard Guards H1-H8 & AI Judge
  const text = fullText({ desc: effDesc, headers: row.headers, scopeKey: rowScopeKey });
  let best: RateRecord | null = null;
  let bestScore = 0;
  let scopeMismatchCandidate: RateRecord | null = null;
  const passedCandidates: { rec: RateRecord; score: number }[] = [];

  for (const rec of db.records) {
    if (checkCorrection(rec.id) === 'reject') continue;

    const recScopeKey = rec.scope_key ?? resolveCanonicalScope(rec.scope, rec.description, rec.headers).scopeKey;
    const recEffDesc = rec.effective_desc || rec.description;

    // H3. Unit check (must be equal after normalization)
    if (rec.unit_norm !== unit) continue;

    // H1. Ordered Number Signature (MUST BE IDENTICAL IN ORDER)
    const recSig = orderedNumberSig(recEffDesc);
    if (rowSig && recSig && rowSig !== recSig) {
      continue; // Sizes, discharge, head numbers do not match in sequence!
    }

    // H2. Spec words check (materials, grades, classes must match)
    const recSpecWords = extractSpecWords(recEffDesc);
    const specDiff = checkSpecWordsMismatch(boqSpecWords, recSpecWords);
    if (specDiff) {
      continue;
    }

    // H4. Operation compatibility
    const recFp = rec.fingerprint || extractRuleFingerprint({ description: recEffDesc, parentChain: rec.headers, unit: rec.unit, scope: rec.scope });
    if (!areOperationsCompatible(finalFp.operation, recFp.operation)) {
      continue;
    }

    // H5. Hard Scope Guard:
    if (rowScopeRes.isKnown && recScopeKey && rowScopeKey !== recScopeKey) {
      const sim = similarity(effDesc, recEffDesc);
      if (sim >= 0.8 && !scopeMismatchCandidate) {
        scopeMismatchCandidate = rec;
      }
      continue;
    }

    // H8. No-evidence rule: at least 60% of significant words of item must appear in DB item/parents
    const fullDbText = [recScopeKey, ...rec.headers, recEffDesc].join(' ');
    if (!hasSignificantEvidence(boqSigWords, fullDbText)) {
      continue;
    }

    // H6. Leaf and parent scored separately! Never blend them.
    // Leaf similarity >= 0.90 AND parent similarity >= 0.70
    const leafSim = similarity(effDesc, recEffDesc);
    if (leafSim < COSTING_CONFIG.leafSimilarityMin) {
      continue; // Leaf similarity < 0.90 fails H6 guard!
    }

    // H7. Parent variants: compare BOQ nearest parent against DB nearest parent AND grandparent
    const boqNearestParent = row.parentItemText || (row.headers.length ? row.headers[row.headers.length - 1] : '');
    const dbNearestParent = rec.headers.length ? rec.headers[rec.headers.length - 1] : '';
    const dbGrandParent = rec.headers.length > 1 ? rec.headers[rec.headers.length - 2] : '';

    let parentSim = 1.0;
    if (boqNearestParent && (dbNearestParent || dbGrandParent)) {
      const p1Sim = dbNearestParent ? similarity(boqNearestParent, dbNearestParent) : 0;
      const p2Sim = dbGrandParent ? similarity(boqNearestParent, dbGrandParent) : 0;
      parentSim = Math.max(p1Sim, p2Sim);
      if (parentSim < COSTING_CONFIG.parentSimilarityMin) {
        continue; // Parent similarity < 0.70 fails H6/H7 guard!
      }
    }

    passedCandidates.push({ rec, score: leafSim });
    if (leafSim > bestScore) {
      best = rec;
      bestScore = leafSim;
    }
  }

  // 4. Evaluate candidates passing guards
  if (best && bestScore >= COSTING_CONFIG.fuzzyCandidateMin) {
    const notes = !rowScopeRes.isKnown ? 'Scope unverified' : 'Fuzzy matched on description & signature';
    return {
      rec: best,
      status: 'REVIEW_FUZZY',
      score: bestScore,
      matchBasis: 'text',
      notes,
      scopeRes: rowScopeRes,
      fingerprint: finalFp,
    };
  }

  // 5. Optional AI Judge for ambiguous candidates passing guards
  if (COSTING_CONFIG.costingAiEnabled && passedCandidates.length > 0 && opts.apiKey) {
    const judgeCandidates: JudgeCandidate[] = passedCandidates.slice(0, COSTING_CONFIG.maxJudgeCandidates).map((c) => ({
      id: c.rec.id,
      scope: c.rec.scope_key || c.rec.scope,
      headers: c.rec.headers,
      description: c.rec.effective_desc || c.rec.description,
      unit: c.rec.unit,
    }));

    const judgeVerdict = await judgeCandidateEquivalence(
      {
        desc: effDesc,
        parentChain: row.headers,
        unit: row.unit,
        fingerprint: finalFp,
      },
      judgeCandidates,
      opts.apiKey,
    );

    if (judgeVerdict && judgeVerdict.verdict === 'CONFIRM' && judgeVerdict.best_match_id) {
      const confirmedRec = passedCandidates.find((c) => c.rec.id === judgeVerdict.best_match_id)?.rec;
      if (confirmedRec) {
        return {
          rec: confirmedRec,
          status: 'REVIEW_FUZZY',
          score: 0.88,
          matchBasis: 'ai-judge',
          notes: `AI Judge confirmed: ${judgeVerdict.reason}`,
          scopeRes: rowScopeRes,
          fingerprint: finalFp,
        };
      }
    }
  }

  if (scopeMismatchCandidate) {
    const mismatchScope = scopeMismatchCandidate.scope_key || scopeMismatchCandidate.scope || 'unknown';
    return {
      rec: null,
      status: 'UNMATCHED',
      score: bestScore,
      matchBasis: 'none',
      notes: `Scope mismatch: BOQ=${rowScopeKey || 'unknown'}, DB=${mismatchScope}`,
      scopeRes: rowScopeRes,
      fingerprint: finalFp,
    };
  }

  return {
    rec: null,
    status: 'UNMATCHED',
    score: bestScore,
    matchBasis: 'none',
    notes: 'Not found in rate database',
    scopeRes: rowScopeRes,
    fingerprint: finalFp,
  };
}

export async function costWorkbook(
  wb: ExcelJS.Workbook,
  db: RateDb,
  opts: CostOptions = {},
): Promise<CostingResult> {
  const { overwriteExisting = true, addReportSheet = true } = opts;
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

    const { rec, status, score, matchBasis, notes, fingerprint } = await findRate(row, n, ix, db, opts);

    const line: LineResult = {
      row: row.row,
      sl: row.sl,
      scope: rowScopeRes.scopeKey || row.scope,
      scopeSource: rowScopeRes.source,
      scopeConfidence: rowScopeRes.confidence,
      itemType: fingerprint?.item_type || 'general_item',
      matchBasis,
      signatureCompared: orderedNumberSig(effDesc),
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
      amount: null,
      notes,
      fingerprint,
    };
    lines.push(line);
    if (rec) pending.push({ line, rec, row });
  }

  // 1) Fixed-rate lines
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

  // 2) Part D2: Blank, Not Zero Formula in Column L
  // For priced rows: =D{r}*(J{r}+K{r})
  // For unpriced rows: =IF(AND(J{r}="",K{r}=""),"",D{r}*(J{r}+K{r}))
  const L = (r: number) => ws.getCell(r, COL.AMT);
  for (const line of lines) {
    if (pending.find((p) => p.line === line)?.rec.rule.kind === 'PCT_OF_TOTAL') continue;
    if (line.status === 'UNMATCHED' || line.status === 'NOT_PRICED') {
      ws.getCell(line.row, COL.PUR).value = null;
      ws.getCell(line.row, COL.EXE).value = null;
      L(line.row).value = {
        formula: `IF(AND(J${line.row}="",K${line.row}=""),"",D${line.row}*(J${line.row}+K${line.row}))`,
        result: undefined,
      };
      line.amount = null;
    } else {
      L(line.row).value = {
        formula: `D${line.row}*(J${line.row}+K${line.row})`,
        result: line.amount ?? 0,
      };
    }
  }

  // 3) Percentage-of-total lines (e.g. O&M @ 5% of project cost)
  for (const { line, rec, row } of pending) {
    if (rec.rule.kind !== 'PCT_OF_TOTAL') continue;
    const base = lines
      .filter((l) => l !== line && l.amount != null)
      .reduce((s, l) => s + (l.amount ?? 0), 0);
    const k = base * rec.rule.pct;
    ws.getCell(row.row, COL.EXE).value = {
      formula: `SUM(L${FIRST_DATA_ROW}:L${row.row - 1})*${rec.rule.pct * 100}%`,
      result: k,
    };
    L(row.row).value = { formula: `K${row.row}`, result: k * (row.qty ?? 1) };
    line.executionRate = k;
    line.amount = k * (row.qty ?? 1);
  }

  // 4) Cell Highlighting: UNMATCHED -> light red, REVIEW_* -> light amber, MATCHED -> no fill
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
    } else if (line.status === 'MATCHED') {
      cJ.fill = { type: 'pattern', pattern: 'none' };
      cK.fill = { type: 'pattern', pattern: 'none' };
    }
  }

  const totalAmount = lines.reduce((s, l) => s + (l.amount ?? 0), 0);
  const matchedAmount = lines
    .filter((l) => l.status === 'MATCHED')
    .reduce((s, l) => s + (l.amount ?? 0), 0);
  const reviewAmount = lines
    .filter((l) => l.status === 'REVIEW_LOOSE' || l.status === 'REVIEW_FUZZY')
    .reduce((s, l) => s + (l.amount ?? 0), 0);

  // Grand total calculation
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
  const scopeSourceCounts: Record<string, number> = {
    column: 0,
    header: 0,
    inferred: 0,
    unknown: 0,
  };

  for (const l of lines) {
    counts[l.status]++;
    scopeSourceCounts[l.scopeSource] = (scopeSourceCounts[l.scopeSource] || 0) + 1;
  }

  const result: CostingResult = {
    lines,
    totalAmount,
    matchedAmount,
    reviewAmount,
    counts,
    scopeSourceCounts,
    totalLines: lines.length,
  };

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
  ws.addRow(['Amount from MATCHED rows', res.matchedAmount]);
  ws.addRow(['Amount from REVIEW rows', res.reviewAmount]);
  ws.addRow([]);

  ws.addRow(['Status Breakdown']).font = { bold: true };
  for (const [k, v] of Object.entries(res.counts)) {
    ws.addRow([k, v]);
  }
  ws.addRow([]);

  ws.addRow(['Scope Source Breakdown']).font = { bold: true };
  for (const [k, v] of Object.entries(res.scopeSourceCounts)) {
    ws.addRow([k, v]);
  }
  ws.addRow([]);

  // Main Itemized Table
  const head = ws.addRow([
    'Row',
    'Sl.No',
    'Scope used',
    'Scope source',
    'Scope confidence',
    'Item type',
    'Match basis',
    'Signature compared',
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
    const amtCell = l.amount == null ? '' : l.amount;
    ws.addRow([
      l.row,
      l.sl,
      l.scope || '',
      l.scopeSource,
      l.scopeConfidence,
      l.itemType,
      l.matchBasis,
      l.signatureCompared,
      l.description.slice(0, 120),
      l.status,
      l.matchedSl || '',
      l.matchedDesc ? l.matchedDesc.slice(0, 100) : '',
      l.matchedScope || '',
      +l.score.toFixed(2),
      l.qty,
      l.unit,
      l.purchaseRate == null ? '' : l.purchaseRate,
      l.executionRate == null ? '' : l.executionRate,
      amtCell,
      l.notes || '',
    ]);
  }

  // Column widths
  ws.getColumn(1).width = 8;
  ws.getColumn(2).width = 10;
  ws.getColumn(3).width = 16;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 16;
  ws.getColumn(6).width = 24;
  ws.getColumn(7).width = 14;
  ws.getColumn(8).width = 22;
  ws.getColumn(9).width = 50;
  ws.getColumn(10).width = 14;
  ws.getColumn(11).width = 16;
  ws.getColumn(12).width = 40;
  ws.getColumn(13).width = 16;
  ws.getColumn(14).width = 8;
  ws.getColumn(15).width = 10;
  ws.getColumn(16).width = 10;
  ws.getColumn(17).width = 12;
  ws.getColumn(18).width = 12;
  ws.getColumn(19).width = 14;
  ws.getColumn(20).width = 32;

  // Top 10 Contributors Section
  ws.addRow([]);
  const topHeader = ws.addRow(['Top 10 Contributors (by Amount)']);
  topHeader.font = { bold: true, size: 12 };
  const subHead = ws.addRow(['Row', 'Scope', 'Description', 'Amount', '% of Total']);
  subHead.font = { bold: true };

  const sortedLines = [...res.lines]
    .filter((l) => l.amount != null && l.amount > 0)
    .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
    .slice(0, 10);

  for (const sl of sortedLines) {
    const amt = sl.amount ?? 0;
    const share = res.totalAmount > 0 ? ((amt / res.totalAmount) * 100).toFixed(1) + '%' : '0%';
    ws.addRow([sl.row, sl.scope || '', sl.description.slice(0, 80), amt, share]);
  }

  // Needs Confirmation Section (unknown or low-confidence scope or AI/rule conflicts)
  ws.addRow([]);
  const needsHeader = ws.addRow(['Needs Confirmation (Unknown/Low-Confidence Scope or Conflicts)']);
  needsHeader.font = { bold: true, size: 12 };
  const needsSub = ws.addRow(['Row', 'Scope', 'Source', 'Confidence', 'Description', 'Notes']);
  needsSub.font = { bold: true };

  const needsConfirmationLines = res.lines.filter(
    (l) => l.scopeSource === 'unknown' || l.scopeConfidence === 'LOW' || (l.notes && l.notes.includes('conflict')),
  );

  for (const nl of needsConfirmationLines) {
    ws.addRow([nl.row, nl.scope || '', nl.scopeSource, nl.scopeConfidence, nl.description.slice(0, 80), nl.notes]);
  }
}

export async function costFile(inPath: string, outPath: string, db: RateDb, opts?: CostOptions) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(inPath);
  const res = await costWorkbook(wb, db, opts);
  await wb.xlsx.writeFile(outPath);
  return res;
}
