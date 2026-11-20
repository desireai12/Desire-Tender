// Item Extractor: Parses BOQ sheets into hierarchical items and auditable skipped rows.
import ExcelJS from 'exceljs';
import { parseHeaderRow, type ColumnMapping } from './headerDetector';
import type { GstBasis, SkippedRowRecord, SorItemRecord } from './types';

function getCellValue(cell: ExcelJS.Cell): unknown {
  const v = cell.value as any;
  if (v && typeof v === 'object') {
    if ('result' in v) return v.result;
    if ('richText' in v) return v.richText.map((t: any) => t.text).join('');
    if ('text' in v) return v.text;
  }
  return v;
}

export function cellNum(cell?: ExcelJS.Cell): number | null {
  if (!cell) return null;
  const v = getCellValue(cell);
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    // Strip commas and any embedded whitespace / newlines (e.g. "44041.05 3" -> 44041.053)
    const clean = v.replace(/,/g, '').replace(/\s+/g, '').trim();
    const parsed = parseFloat(clean);
    if (!isNaN(parsed) && Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function cellStr(cell?: ExcelJS.Cell): string {
  if (!cell) return '';
  const v = getCellValue(cell);
  return v == null ? '' : String(v).replace(/\s+/g, ' ').trim();
}

export function normUnit(u: string | null | undefined): string | null {
  if (!u) return null;
  const k = u.toLowerCase().replace(/\s+/g, ' ').trim();
  if (/^(meter|metre|mtr|rmt|rm|meter\.|metre\.|r\.?\s*mtr)\b/.test(k)) return 'rm';
  if (/^(each|each\.|nos|nos\.|no|no\.)\b/.test(k)) return 'nos';
  if (/^(cum|cu\.?\s*m|cu\.?\s*meter|cubic\s*meter)\b/.test(k)) return 'cum';
  if (/^(sqm|sq\.?\s*m|sqmt|square\s*meter)\b/.test(k)) return 'sqm';
  if (/^(kg|kg\.|kilogram)\b/.test(k)) return 'kg';
  if (/^(quintal|qtl)\b/.test(k)) return 'quintal';
  if (/^(mt|metric\s*ton|tonne)\b/.test(k)) return 'mt';
  if (/^(set|sets)\b/.test(k)) return 'set';
  if (/^(job|jobs)\b/.test(k)) return 'job';
  if (/^(litre|ltr|litres)\b/.test(k)) return 'litre';
  if (/^(ha|hectare)\b/.test(k)) return 'ha';
  if (/^(mld)\b/.test(k)) return 'mld';
  if (/^(kld)\b/.test(k)) return 'kld';
  return k;
}

export function isAddonText(text: string): boolean {
  if (!text) return false;
  const t = text.trim();
  return (
    /^(add\s*extra|extra\s*(for|over|filling))\b/i.test(t) ||
    /\b(extra\s*for\s*(increasing\s*)?depth|extra\s*filling\s*work)\b/i.test(t) ||
    /\binstead\s*of\b/i.test(t) ||
    /\bsrc\b.*instead\s*of/i.test(t)
  );
}

export function isPercentagePrice(rawQtyStr: string, desc: string): boolean {
  if (rawQtyStr && /%/.test(rawQtyStr)) return true;
  if (!desc) return false;
  return /\b\d+(\.\d+)?%\s*(extra\s*of\s*the\s*rate|of\s*total\s*(civil\s*work|cost|amount)|of\s*(the\s*)?(rate|civil\s*work))\b/i.test(
    desc,
  );
}

export interface ExtractionResult {
  items: SorItemRecord[];
  skippedRows: SkippedRowRecord[];
  totalRowsProcessed: number;
}

function isJunkColumnNumberingRow(row: ExcelJS.Row): boolean {
  const colA = cellStr(row.getCell(1));
  const colB = cellStr(row.getCell(2));
  const colC = cellStr(row.getCell(3));
  const colD = cellStr(row.getCell(4));

  // Common pattern in CPWD / PWD schedules: "1 | 3 | 7 | 4 | 5 | 8 | 9 | 10"
  if (colA === '1' && colB === '3' && colC === '7' && colD === '4') {
    return true;
  }

  // Generic check: description is numeric-only small integer (e.g. "3") with multiple small integer cells
  if (/^\d+$/.test(colB) && parseInt(colB, 10) <= 15) {
    let smallIntCount = 0;
    for (let c = 1; c <= 15; c++) {
      const v = cellStr(row.getCell(c));
      if (/^\d+$/.test(v) && parseInt(v, 10) <= 25) {
        smallIntCount++;
      }
    }
    if (smallIntCount >= 4) {
      return true;
    }
  }

  return false;
}

export function extractItemsFromSheet(
  ws: ExcelJS.Worksheet,
  initialMapping: ColumnMapping,
  options: {
    file_id: string;
    state_name: string;
    gst_basis: GstBasis;
  },
): ExtractionResult {
  const items: SorItemRecord[] = [];
  const skippedRows: SkippedRowRecord[] = [];

  let currentMapping: ColumnMapping | null = null;
  let currentParentL1 = '';
  let currentParentL2 = '';
  let lastStatedRateOnParent: number | null = null;
  let currentParentIsAddon = false;
  let lastUnpricedDesc = '';

  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);

    // 1. Check if this row is a header row (supports multi-block headers)
    const detectedHeader = parseHeaderRow(row, r);
    if (detectedHeader) {
      currentMapping = detectedHeader;
      skippedRows.push({
        file_id: options.file_id,
        sheet_name: ws.name,
        source_row: r,
        raw_data: { row: r, header: true },
        skip_reason: 'column_header',
      });
      currentParentL1 = '';
      currentParentL2 = '';
      lastStatedRateOnParent = null;
      currentParentIsAddon = false;
      lastUnpricedDesc = '';
      continue;
    }

    // If we haven't encountered any header yet, use initialMapping if r >= initialMapping.headerRow
    if (!currentMapping) {
      if (initialMapping && r >= initialMapping.headerRow) {
        currentMapping = initialMapping;
      } else {
        skippedRows.push({
          file_id: options.file_id,
          sheet_name: ws.name,
          source_row: r,
          raw_data: { row: r },
          skip_reason: 'header_or_metadata',
        });
        continue;
      }
    }

    // 2. Check for junk column numbering rows (e.g. "1 | 3 | 7 | 4 | 5 | 8 | 9 | 10")
    if (isJunkColumnNumberingRow(row)) {
      skippedRows.push({
        file_id: options.file_id,
        sheet_name: ws.name,
        source_row: r,
        raw_data: { row: r, desc: cellStr(row.getCell(currentMapping.descCol)) },
        skip_reason: 'junk_column_numbering_row',
      });
      continue;
    }

    const desc = cellStr(row.getCell(currentMapping.descCol));
    const rawQtyStr = cellStr(currentMapping.qtyCol ? row.getCell(currentMapping.qtyCol) : undefined);
    const qty = cellNum(currentMapping.qtyCol ? row.getCell(currentMapping.qtyCol) : undefined);
    const unitRaw = cellStr(currentMapping.unitCol ? row.getCell(currentMapping.unitCol) : undefined);
    const rateEx = cellNum(currentMapping.rateExGstCol ? row.getCell(currentMapping.rateExGstCol) : undefined);
    let rateIncl = cellNum(currentMapping.rateInclGstCol ? row.getCell(currentMapping.rateInclGstCol) : undefined);
    const rateStated = cellNum(currentMapping.rateAsStatedCol ? row.getCell(currentMapping.rateAsStatedCol) : undefined);
    const amount = cellNum(currentMapping.amountCol ? row.getCell(currentMapping.amountCol) : undefined);
    const itemNo = cellStr(currentMapping.itemNoCol ? row.getCell(currentMapping.itemNoCol) : undefined);
    const typeOfWork = cellStr(currentMapping.typeOfWorkCol ? row.getCell(currentMapping.typeOfWorkCol) : undefined);

    const rowObj: Record<string, unknown> = {
      row: r,
      itemNo,
      desc,
      qty,
      rawQtyStr,
      unit: unitRaw,
      rateEx,
      rateIncl,
      rateStated,
      amount,
      typeOfWork,
    };

    // 3. Skip completely empty rows
    if (!desc && !rawQtyStr && rateStated == null && rateEx == null && amount == null) {
      skippedRows.push({
        file_id: options.file_id,
        sheet_name: ws.name,
        source_row: r,
        raw_data: rowObj,
        skip_reason: 'empty_row',
      });
      continue;
    }

    // 4. Skip Genuine Subtotal and Grand Total rows (e.g. "Grand Total", "Total in Figures", "Sub Total", or "Total" without a unit rate)
    let rowHasTotalMarker = false;
    for (let c = 1; c <= 10; c++) {
      const cellVal = cellStr(row.getCell(c));
      if (/^(sub\s*total|grand\s*total|grant\s*total|total\s*in\s*figures)\b/i.test(cellVal)) {
        rowHasTotalMarker = true;
        break;
      }
    }

    const hasValidUnitRate = (rateEx != null && rateEx > 0) || (rateStated != null && rateStated > 0);
    const isExplicitSummaryTotal = rowHasTotalMarker || /^(sub\s*total|grand\s*total|grant\s*total|total\s*in\s*figures)\b/i.test(desc) || (/^total$/i.test(itemNo) && !hasValidUnitRate);
    const isWordTotalWithoutRate = desc.trim().toLowerCase() === 'total' && !hasValidUnitRate;
    const isTotalCostWithoutRate = /^total\s*cost\b/i.test(desc) && !hasValidUnitRate;

    if (isExplicitSummaryTotal || isWordTotalWithoutRate || isTotalCostWithoutRate) {
      skippedRows.push({
        file_id: options.file_id,
        sheet_name: ws.name,
        source_row: r,
        raw_data: rowObj,
        skip_reason: 'subtotal_or_grand_total_row',
      });
      continue;
    }

    // 4b. Heading check for zero-rate rows (e.g. MP row 615 "Type 11KV", rate 0, amount 0)
    if (
      (rateStated === 0 || rateEx === 0) &&
      (qty == null || qty === 0) &&
      (amount == null || amount === 0)
    ) {
      skippedRows.push({
        file_id: options.file_id,
        sheet_name: ws.name,
        source_row: r,
        raw_data: rowObj,
        skip_reason: 'parent_header_row_no_rates',
      });
      continue;
    }

    // 5. Check if row is unpriced parent/section header
    const hasDirectRate = rateStated != null || rateEx != null;
    const hasQtyAndAmt = qty != null && qty > 0 && amount != null && amount > 0;
    const hasQtyOnly = rawQtyStr !== '' && !hasDirectRate && amount == null;
    const hasAmtOnly = amount != null && !hasDirectRate && rawQtyStr === '';

    // If row has no quantity and no amount, check if it's a parent header (even if it has a rate, like MP row 363)
    if (!hasDirectRate && !hasQtyAndAmt && !hasQtyOnly && !hasAmtOnly) {
      if (desc.length > 0) {
        lastUnpricedDesc = desc;
        if (desc.length >= 40 || (itemNo && /^\d+$/.test(itemNo))) {
          currentParentL1 = desc;
          currentParentL2 = '';
        } else if (!currentParentL1) {
          currentParentL1 = desc;
        } else {
          currentParentL2 = desc;
        }
      }
      if (isAddonText(desc)) {
        currentParentIsAddon = true;
      } else if (itemNo && /^\d+$/.test(itemNo)) {
        currentParentIsAddon = false;
      }
      lastStatedRateOnParent = rateStated ?? rateEx ?? null;
      skippedRows.push({
        file_id: options.file_id,
        sheet_name: ws.name,
        source_row: r,
        raw_data: rowObj,
        skip_reason: 'parent_header_row_no_rates',
      });
      continue;
    }

    // If row has a stated rate but NO quantity and NO amount, it is a parent sub-heading stating a rate (e.g. MP row 363)
    if (hasDirectRate && qty == null && amount == null) {
      lastStatedRateOnParent = rateStated ?? rateEx ?? null;
      if (desc.length > 0) {
        currentParentL2 = desc;
        lastUnpricedDesc = desc;
      }
      if (isAddonText(desc)) {
        currentParentIsAddon = true;
      } else if (itemNo && /^\d+$/.test(itemNo)) {
        currentParentIsAddon = false;
      }
      skippedRows.push({
        file_id: options.file_id,
        sheet_name: ws.name,
        source_row: r,
        raw_data: rowObj,
        skip_reason: 'parent_header_row_no_rates',
      });
      continue;
    }

    // 6. Handle rate derivation and flags
    let rateDerived = false;
    let resolvedRateStated: number | null = rateStated ?? rateEx ?? null;
    let resolvedRateExGst: number | null = null;
    let flagNotes: string | null = null;

    if (hasDirectRate) {
      if (rateEx != null) {
        resolvedRateExGst = rateEx;
        if (!rateIncl) {
          rateIncl = rateStated ?? Math.round(rateEx * 1.18 * 100) / 100;
        }
      } else if (resolvedRateStated != null) {
        if (options.gst_basis === 'incl_gst') {
          resolvedRateExGst = Math.round((resolvedRateStated / 1.18) * 100) / 100;
          rateIncl = resolvedRateStated;
        } else {
          resolvedRateExGst = resolvedRateStated;
          rateIncl = Math.round(resolvedRateStated * 1.18 * 100) / 100;
        }
      }
    } else if (lastStatedRateOnParent != null && (hasQtyAndAmt || qty != null)) {
      // User requirement 4: use stated rate from parent row (e.g. MP row 364 taking 362 from row 363)
      resolvedRateExGst = lastStatedRateOnParent;
      resolvedRateStated = lastStatedRateOnParent;
      rateDerived = false;
      flagNotes = 'rate_taken_from_parent_row';
    } else if (hasQtyAndAmt) {
      rateDerived = true;
      resolvedRateExGst = Math.round((amount! / qty!) * 100) / 100;
      resolvedRateStated = null;
      flagNotes = 'rate_derived_from_amount_and_qty';
    } else if (hasQtyOnly) {
      // Row with qty but no rate or amount (e.g. MP rows 208-215)
      flagNotes = 'qty_without_rate_or_amount';
    } else if (hasAmtOnly) {
      // Row with amount but no rate or qty (e.g. MP rows 424, 426)
      flagNotes = 'amount_without_rate_or_qty';
    }

    if (resolvedRateExGst === 0 || resolvedRateStated === 0) {
      flagNotes = flagNotes ? `${flagNotes}, zero_rate` : 'zero_rate';
    }

    if (qty != null && resolvedRateExGst != null && amount != null && amount > 0) {
      const expected = qty * resolvedRateExGst;
      const ratio = Math.abs(expected - amount) / amount;
      if (ratio > 0.05) {
        flagNotes = flagNotes ? `${flagNotes}, amount_qty_rate_mismatch` : 'amount_qty_rate_mismatch';
      }
    }

    // If this item has an integer itemNo (e.g. "7", "8", "9"), it is an independent top-level item and must not leak parent headings
    if (itemNo && /^\d+$/.test(itemNo.trim())) {
      currentParentL1 = '';
      currentParentL2 = '';
      currentParentIsAddon = false;
      lastStatedRateOnParent = null;
    }

    const effectiveDesc = desc;

    // 7. Build full hierarchical description
    let fullDesc = effectiveDesc;
    if (
      currentParentL1 &&
      currentParentL2 &&
      !effectiveDesc.toLowerCase().includes(currentParentL1.slice(0, 30).toLowerCase())
    ) {
      fullDesc = `${currentParentL1} - ${currentParentL2} - ${effectiveDesc}`;
    } else if (currentParentL1 && !effectiveDesc.toLowerCase().includes(currentParentL1.slice(0, 30).toLowerCase())) {
      fullDesc = `${currentParentL1} - ${effectiveDesc}`;
    }

    // 8. Add-on, percentage-based, and lump-sum detection
    const isAddon = currentParentIsAddon || isAddonText(desc) || isAddonText(effectiveDesc);
    const isPercentage = isPercentagePrice(rawQtyStr, desc) || isPercentagePrice(rawQtyStr, effectiveDesc);

    // Lump-sum rule (strict per user prompt):
    // Lump-sum = unit is job/LS/lump sum, or whole-plant packages (STP priced per MLD/KLD plant).
    // Per-unit rates with units no./nos./set/each/each manhole/per manhole are normal unit rates and NOT lump-sum!
    const uRawTrimmed = unitRaw ? unitRaw.trim() : '';
    const hasUnit = uRawTrimmed.length > 0;
    const finalUnit = hasUnit ? uRawTrimmed : null;
    const uNorm = hasUnit ? normUnit(uRawTrimmed) : null;

    if (!hasUnit) {
      flagNotes = flagNotes ? `${flagNotes}, unit_missing` : 'unit_missing';
    }

    const isWholePlantPackage =
      /\b(stp|wtp|sewage\s*treatment|water\s*treatment)\b/i.test(effectiveDesc) &&
      (/\b(mld|kld)\b/i.test(effectiveDesc + ' ' + uRawTrimmed) || /^(mld|kld|per\s*mld|per\s*kld|each)$/i.test(uRawTrimmed));
    const isJobOrLS = /^(job|ls|lump\s*sum|per\s*mld|per\s*kld)\b/i.test(uRawTrimmed) || uNorm === 'job' || /per\s*(mld|kld)/i.test(uRawTrimmed);
    const isLumpSum = isWholePlantPackage || isJobOrLS;

    items.push({
      file_id: options.file_id,
      state_name: options.state_name,
      item_no: itemNo || null,
      raw_description: effectiveDesc,
      parent_description: currentParentL1
        ? currentParentL2
          ? `${currentParentL1} - ${currentParentL2}`
          : currentParentL1
        : null,
      section_heading: currentParentL1 || null,
      full_description: fullDesc.trim(),
      unit: finalUnit,
      unit_norm: uNorm,
      quantity: qty,
      rate_as_stated: resolvedRateStated,
      rate_ex_gst: resolvedRateExGst,
      rate_incl_gst: rateIncl,
      gst_basis: options.gst_basis,
      amount,
      category: typeOfWork || null,
      is_addon: isAddon,
      is_percentage_based: isPercentage,
      is_lump_sum: isLumpSum,
      rate_derived: rateDerived,
      flag_notes: flagNotes,
      sheet_name: ws.name,
      source_row: r,
    });
  }

  return {
    items,
    skippedRows,
    totalRowsProcessed: ws.rowCount,
  };
}
