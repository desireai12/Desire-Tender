// Test 2: a "new" BOQ that differs from the bid BOQ: renumbered Sl.No, other case/spacing,
// unit spelling changes, new quantities, one unknown item, one slightly reworded item.
import ExcelJS from 'exceljs';
import { readFileSync } from 'node:fs';
import { boqSheet, cellValue, COL } from '../../../apps/web/src/lib/costing/boq';
import { costFile } from '../../../apps/web/src/lib/costing/engine';
import type { RateDb } from '../../../apps/web/src/lib/costing/rateDb';

async function main() {
  const [SRC, DB, TMP] = process.argv.slice(2);
  const db: RateDb = JSON.parse(readFileSync(DB, 'utf8'));
  const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(SRC);
  const ws = boqSheet(wb);
  for (let r = 3; r <= ws.rowCount; r++) {
    for (const c of [COL.PUR, COL.EXE]) ws.getCell(r, c).value = null;
    if (String(cellValue(ws.getCell(r, 6))).toLowerCase() !== 'total') ws.getCell(r, COL.AMT).value = null;
    for (let c = 13; c <= 33; c++) ws.getCell(r, c).value = null;
  }
  const get = (r: number, c: number) => String(cellValue(ws.getCell(r, c)) ?? '');
  ws.getCell(7, COL.SL).value = 'A-1';                              // renumbered
  ws.getCell(7, COL.DESC).value = '  100  MM ';                     // spacing/case
  ws.getCell(7, COL.UNIT).value = 'RMT';                            // unit spelling (Rmt. -> RMT)
  ws.getCell(8, COL.QTY).value = 1000;                              // quantity change
  ws.getCell(57, COL.DESC).value = get(57, COL.DESC).replace('mm dia', 'mm diameter'); // wording
  ws.getCell(10, COL.DESC).value = '250 mm (revised spec) ';        // reworded sub item -> fuzzy/unmatched
  ws.getCell(600, COL.DESC).value = 'Brand new item never bid before'; // unknown
  await wb.xlsx.writeFile(`${TMP}/perturbed.xlsx`);
  const res = await costFile(`${TMP}/perturbed.xlsx`, `${TMP}/perturbed_costed.xlsx`, db);
  console.log(res.counts);
  for (const l of res.lines.filter((x) => x.status !== 'MATCHED' && x.status !== 'NOT_PRICED'))
    console.log(l.status, 'row', l.row, `"${l.description.slice(0, 40)}"`, '->', l.matchedSl, 'score', l.score.toFixed(2));
  const r8 = res.lines.find((l) => l.row === 8)!, r7 = res.lines.find((l) => l.row === 7)!;
  console.log('row7', r7.status, r7.purchaseRate, r7.executionRate, '| row8 qty 1000 amount', r8.amount.toFixed(2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
