// Parsing of the standard tender BOQ sheet (cols A..L) into structured rows.
// Layout (1-based columns): A Sl.No | B Description | C Scope | D Qty | E Unit |
// F Est. rate (incl GST) | G Total | H Rate ex-GST | I Total ex-GST |
// J Purchase rate | K Execution rate | L Total amount = D*(J+K)
// Never read columns M onward as rates, and never write to them.
import ExcelJS from 'exceljs';

export const COL = { SL: 1, DESC: 2, SCOPE: 3, QTY: 4, UNIT: 5, EST: 6, TOT: 7, PUR: 10, EXE: 11, AMT: 12 } as const;
export const FIRST_DATA_ROW = 3; // row 1 = header, row 2 = column numbers or junk row

export interface BoqRow {
  row: number;
  sl: string | null;
  desc: string;
  scope: string | null;
  qty: number | null;
  unit: string | null;
  estRate: number | null;
  purchaseRate: number | null;
  executionRate: number | null;
  purchaseBasis: string | null; // original formula text, audit only
  executionBasis: string | null;
  isItem: boolean;              // has a numeric quantity => priced line
  headers: string[];            // header chain (context) for this row
  parentItemText: string | null; // closest preceding row with no quantity
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Resolve a cell to its plain value (formula result for formula cells). */
export function cellValue(c: ExcelJS.Cell): unknown {
  const v = c.value as any;
  if (v && typeof v === 'object') {
    if ('result' in v) return v.result;
    if ('richText' in v) return v.richText.map((t: any) => t.text).join('');
    if ('text' in v) return v.text;
  }
  return v;
}

const formulaOf = (c: ExcelJS.Cell): string | null => {
  const v = c.value as any;
  return v && typeof v === 'object' && 'formula' in v ? `=${v.formula}` : null;
};

const str = (v: unknown): string => (v == null ? '' : String(v).replace(/\s+/g, ' ').trim());

const LONG_HEADER = 80; // a header this long is a main item head, shorter ones are sub-heads

/**
 * Detects the Scope/Type column index by scanning row 1 and row 2 headers.
 * Looks for: "scope of work", "sub-type of work", "sub type of work", "type of work", "scope".
 * Falls back to column 3 (C).
 */
export function findScopeColumn(ws: ExcelJS.Worksheet): number {
  const scopeHeaders = ['scope of work', 'sub-type of work', 'sub type of work', 'type of work', 'scope'];
  for (let r = 1; r <= 2; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= 10; c++) {
      const val = str(cellValue(row.getCell(c))).toLowerCase();
      if (scopeHeaders.some((h) => val === h || val.includes(h))) {
        return c;
      }
    }
  }
  return 3; // fallback to column C
}

export function parseSheet(ws: ExcelJS.Worksheet): BoqRow[] {
  const rows: BoqRow[] = [];
  const scopeCol = findScopeColumn(ws);
  let root = ''; // long head
  let subs: string[] = [];
  let nearestParentText: string | null = null;
  let lastWasPriced = true;

  for (let r = FIRST_DATA_ROW; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const desc = str(cellValue(row.getCell(COL.DESC)));
    const qty = num(cellValue(row.getCell(COL.QTY)));
    const slRaw = cellValue(row.getCell(COL.SL));
    if (!desc && qty == null) continue;
    if (/^total$/i.test(str(cellValue(row.getCell(6))))) break; // totals row

    const isItem = qty != null;
    const prevPriced = lastWasPriced;
    if (!isItem) {
      if (desc.length >= LONG_HEADER) { root = desc; subs = []; }
      else if (lastWasPriced) { subs = [desc]; }
      else { subs.push(desc); }
      lastWasPriced = false;
      if (desc.length > 0) {
        nearestParentText = desc;
      }
    }

    // Read scope per row without inheritance (E&M and Civil alternate)
    const rowScope = str(cellValue(row.getCell(scopeCol))) || null;

    const pur = row.getCell(COL.PUR), exe = row.getCell(COL.EXE);
    // a long priced line directly after another priced line is a standalone item
    const standalone = isItem && desc.length >= LONG_HEADER && prevPriced;
    const headers = standalone ? [] : [root, ...subs].filter(Boolean);

    rows.push({
      row: r,
      sl: slRaw == null ? null : str(slRaw),
      desc,
      scope: rowScope,
      qty,
      unit: str(cellValue(row.getCell(COL.UNIT))) || null,
      estRate: num(cellValue(row.getCell(COL.EST))),
      purchaseRate: num(cellValue(pur)),
      executionRate: num(cellValue(exe)),
      purchaseBasis: formulaOf(pur),
      executionBasis: formulaOf(exe),
      isItem,
      headers: isItem ? headers : [],
      parentItemText: nearestParentText,
    });

    if (isItem) {
      lastWasPriced = true;
      if (desc.length >= LONG_HEADER) { root = ''; subs = []; }
    }
  }
  return rows;
}

export async function loadWorkbook(path: string): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  return wb;
}

export function boqSheet(wb: ExcelJS.Workbook): ExcelJS.Worksheet {
  const ws = wb.getWorksheet('BOQ') ?? wb.worksheets[0];
  if (!ws) throw new Error('Workbook has no sheet');
  return ws;
}
