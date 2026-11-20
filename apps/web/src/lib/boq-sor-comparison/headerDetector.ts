// Header and Column Detector: Detects header row and column mapping with mathematical validation.
import ExcelJS from 'exceljs';

export interface ColumnMapping {
  headerRow: number;
  itemNoCol?: number;
  descCol: number;
  qtyCol?: number;
  unitCol?: number;
  rateExGstCol?: number;
  rateInclGstCol?: number;
  rateAsStatedCol?: number;
  amountCol?: number;
  typeOfWorkCol?: number;
}

function getCellValue(cell: ExcelJS.Cell): unknown {
  const v = cell.value as any;
  if (v && typeof v === 'object') {
    if ('result' in v) return v.result;
    if ('richText' in v) return v.richText.map((t: any) => t.text).join('');
    if ('text' in v) return v.text;
  }
  return v;
}

function cellNum(cell?: ExcelJS.Cell): number | null {
  if (!cell) return null;
  const v = getCellValue(cell);
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const clean = v.replace(/,/g, '').trim();
    const p = parseFloat(clean);
    if (!isNaN(p) && Number.isFinite(p)) return p;
  }
  return null;
}

function str(cell: ExcelJS.Cell): string {
  const v = getCellValue(cell);
  return v == null ? '' : String(v).trim().toLowerCase();
}

export function parseHeaderRow(row: ExcelJS.Row, rNum: number): ColumnMapping | null {
  let itemNoCol: number | undefined;
  let descCol: number | undefined;
  let qtyCol: number | undefined;
  let unitCol: number | undefined;
  let rateExGstCol: number | undefined;
  let rateInclGstCol: number | undefined;
  let rateGeneralCol: number | undefined;
  let amountCol: number | undefined;
  let typeOfWorkCol: number | undefined;

  for (let c = 1; c <= 25; c++) {
    const val = str(row.getCell(c));
    if (!val) continue;
    const valCompact = val.replace(/\s+/g, '');

    if (
      valCompact === 's.no.' ||
      valCompact === 's.no' ||
      valCompact === 'sl.no.' ||
      valCompact === 'sl.no' ||
      valCompact === 'sn' ||
      valCompact === 'sln' ||
      /(^|\b)(sl\.?\s*no?|s\.?\s*no?|item\s*no?|sr\.?\s*no?|sl\.?\s*n|s\.?\s*n)\b/i.test(val)
    ) {
      itemNoCol = c;
    } else if (
      /(item\s*of\s*work|item\s*description|description\s*of\s*work|description|^item$)\b/i.test(val) ||
      valCompact === 'particulars' ||
      val.includes('particulars')
    ) {
      descCol = c;
    } else if (/(quantity|qty|qyt|net\s*quantity)\b/i.test(val)) {
      qtyCol = c;
    } else if (/(^|\b)(unit|units|uom)\b/i.test(val)) {
      unitCol = c;
    } else if (/(ex\s*gst|ex-gst|excluding\s*gst|without\s*gst)/i.test(val) && /(rate|rs)/i.test(val)) {
      rateExGstCol = c;
    } else if (/(incl\s*gst|incl-gst|including\s*gst|with\s*gst)/i.test(val) && /(rate|rs)/i.test(val)) {
      rateInclGstCol = c;
    } else if (/(rate\s*\(in\s*rs\)|rate\s*in\s*rs|rate\s*\(rs\)|sor\s*rate|unit\s*rate|total\s*rate|^rate$)/i.test(val)) {
      rateGeneralCol = c;
    } else if (/(total\s*\(ex\s*gst\)|amount|total\s*amount|total\s*amt|^total$|amounts)/i.test(val)) {
      if (!amountCol) amountCol = c;
    } else if (/(type\s*of\s*work|sub-type\s*of\s*work|sub\s*type\s*of\s*work|scope\s*of\s*work|category)\b/i.test(val)) {
      typeOfWorkCol = c;
    }
  }

  // Must have at least a description column and at least two structural columns (qty, unit, rate, amount)
  const structuralScore = (qtyCol ? 1 : 0) + (unitCol ? 1 : 0) + (rateExGstCol || rateGeneralCol ? 1 : 0) + (amountCol ? 1 : 0);
  if (descCol && structuralScore >= 2) {
    const resolvedExGst = rateExGstCol || rateGeneralCol;
    const resolvedStated = rateGeneralCol || rateExGstCol;

    return {
      headerRow: rNum,
      itemNoCol,
      descCol,
      qtyCol,
      unitCol,
      rateExGstCol: resolvedExGst,
      rateInclGstCol,
      rateAsStatedCol: resolvedStated,
      amountCol,
      typeOfWorkCol,
    };
  }

  return null;
}

export function detectColumns(ws: ExcelJS.Worksheet, headerRowHint?: number): ColumnMapping | null {
  const startRow = headerRowHint || 1;
  const maxScanRow = Math.min(startRow + 6, ws.rowCount);

  for (let r = startRow; r <= maxScanRow; r++) {
    const row = ws.getRow(r);
    const mapping = parseHeaderRow(row, r);
    if (mapping) {
      return mapping;
    }
  }

  return null;
}
