// Sheet Scorer: Evaluates and scores every worksheet in an Excel workbook.
// Auto-detects the genuine BOQ/SOR data sheet and rejects pivots or empty shells.
import ExcelJS from 'exceljs';
import type { SheetScoreResult } from './types';

function getCellValue(cell: ExcelJS.Cell): unknown {
  const v = cell.value as any;
  if (v && typeof v === 'object') {
    if ('result' in v) return v.result;
    if ('richText' in v) return v.richText.map((t: any) => t.text).join('');
    if ('text' in v) return v.text;
  }
  return v;
}

function cellStr(cell: ExcelJS.Cell): string {
  const v = getCellValue(cell);
  return v == null ? '' : String(v).trim().toLowerCase();
}

const HEADER_KEYWORDS = [
  'item of work',
  'item description',
  'description',
  'particulars',
  'rate',
  'quantity',
  'unit',
  'units',
  'amount',
  'type of work',
  'sub-type of work',
  'sor rate',
];

const PIVOT_OR_SUMMARY_NAMES = [/pivot/i, /summary/i, /abstract/i, /overview/i, /sheet2/i];

export function scoreWorksheet(ws: ExcelJS.Worksheet): SheetScoreResult {
  const sheetName = ws.name;
  const rowCount = ws.rowCount;

  if (rowCount < 3) {
    return {
      sheetName,
      rowCount,
      score: 0,
      isRecommended: false,
      reason: 'Too few rows (< 3)',
      hasPricedItems: false,
    };
  }

  let headerScore = 0;
  let bestHeaderRow = -1;
  let bestHeaderMatches = 0;

  // Scan top 6 rows for header keywords
  const scanLimit = Math.min(6, rowCount);
  for (let r = 1; r <= scanLimit; r++) {
    const row = ws.getRow(r);
    let rowMatches = 0;
    for (let c = 1; c <= 20; c++) {
      const val = cellStr(row.getCell(c));
      if (!val) continue;
      for (const kw of HEADER_KEYWORDS) {
        if (val === kw || val.includes(kw)) {
          rowMatches++;
          break;
        }
      }
    }

    if (rowMatches > bestHeaderMatches) {
      bestHeaderMatches = rowMatches;
      bestHeaderRow = r;
    }
  }

  headerScore = bestHeaderMatches * 15;

  // Count rows with numeric rates / quantities in data rows
  let pricedRowsCount = 0;
  let numericRateCols = 0;
  if (bestHeaderRow > 0) {
    const dataScanLimit = Math.min(bestHeaderRow + 50, rowCount);
    for (let r = bestHeaderRow + 1; r <= dataScanLimit; r++) {
      const row = ws.getRow(r);
      let hasNumeric = false;
      for (let c = 1; c <= 15; c++) {
        const val = getCellValue(row.getCell(c));
        if (typeof val === 'number' && Number.isFinite(val) && val > 0) {
          hasNumeric = true;
          break;
        }
      }
      if (hasNumeric) pricedRowsCount++;
    }
  }

  const hasPricedItems = pricedRowsCount >= 3;
  let dataScore = Math.min(pricedRowsCount * 3, 40);

  // Negative weights for pivot or known summary tab names
  let penalty = 0;
  if (PIVOT_OR_SUMMARY_NAMES.some((rx) => rx.test(sheetName))) {
    penalty += 35;
  }

  // Shell detection: if header says rate but data rows have NO numbers (like BOQ1 bidder shell)
  if (!hasPricedItems) {
    penalty += 50;
  }

  const finalScore = Math.max(0, headerScore + dataScore - penalty);

  let reason = '';
  if (bestHeaderMatches >= 4 && hasPricedItems) {
    reason = `Strong BOQ data sheet (${bestHeaderMatches} header columns matched, ${pricedRowsCount}+ priced rows found)`;
  } else if (!hasPricedItems) {
    reason = `No priced items found (likely an empty template shell or bidder input form)`;
  } else if (penalty > 0) {
    reason = `Summary/pivot sheet penalty applied`;
  } else {
    reason = `Header matches: ${bestHeaderMatches}, row count: ${rowCount}`;
  }

  return {
    sheetName,
    rowCount,
    score: finalScore,
    isRecommended: false, // set by rankSheets
    reason,
    hasPricedItems,
    detectedHeaderRow: bestHeaderRow > 0 ? bestHeaderRow : undefined,
  };
}

export function rankSheets(wb: ExcelJS.Workbook): SheetScoreResult[] {
  const results: SheetScoreResult[] = [];
  for (const ws of wb.worksheets) {
    results.push(scoreWorksheet(ws));
  }

  results.sort((a, b) => b.score - a.score);
  if (results.length > 0 && results[0].score > 20) {
    results[0].isRecommended = true;
  }

  return results;
}

