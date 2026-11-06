// Test 1: take the costed BOQ, blank J/K/L + working columns (= a fresh tender BOQ),
// run the engine, and require the SAME rates and the SAME grand total as the bid.
import ExcelJS from 'exceljs';
import { readFileSync } from 'node:fs';
import { boqSheet, cellValue, COL } from '../../../apps/web/src/lib/costing/boq';
import { costFile } from '../../../apps/web/src/lib/costing/engine';
import type { RateDb } from '../../../apps/web/src/lib/costing/rateDb';

async function main() {
  const SRC = process.argv[2], DB = process.argv[3], TMP = process.argv[4];
  const db: RateDb = JSON.parse(readFileSync(DB, 'utf8'));

  // 1. make a "blank" tender BOQ
  const blank = new ExcelJS.Workbook();
  await blank.xlsx.readFile(SRC);
  const bs = boqSheet(blank);
  for (let r = 3; r <= bs.rowCount; r++) {
    for (const c of [COL.PUR, COL.EXE]) bs.getCell(r, c).value = null;
    const l = bs.getCell(r, COL.AMT);
    if (String(cellValue(bs.getCell(r, 6))).toLowerCase() !== 'total') l.value = null;
    for (let c = 13; c <= 33; c++) bs.getCell(r, c).value = null;
  }
  await blank.xlsx.writeFile(`${TMP}/blank.xlsx`);

  // 2. cost it
  const res = await costFile(`${TMP}/blank.xlsx`, `${TMP}/costed.xlsx`, db);
  console.log('counts', res.counts, 'lines', res.totalLines, 'total', res.totalAmount.toFixed(2));

  // 3. compare against the original bid
  const orig = new ExcelJS.Workbook(); await orig.xlsx.readFile(SRC);
  const out = new ExcelJS.Workbook(); await out.xlsx.readFile(`${TMP}/costed.xlsx`);
  const o = boqSheet(orig), n = boqSheet(out);
  let bad = 0, checked = 0;
  const num = (v: unknown) => (typeof v === 'number' ? v : 0);
  for (const l of res.lines) {
    for (const c of [COL.PUR, COL.EXE, COL.AMT]) {
      const a = num(cellValue(o.getCell(l.row, c))), b = num(cellValue(n.getCell(l.row, c)));
      checked++;
      if (Math.abs(a - b) > 0.005) { bad++; console.log('DIFF row', l.row, 'col', c, a, b); }
    }
  }
  const origTotal = res.lines.reduce((s, l) => s + num(cellValue(o.getCell(l.row, COL.AMT))), 0);
  console.log('cells checked', checked, 'differences', bad);
  console.log('original total', origTotal.toFixed(2), 'engine total', res.totalAmount.toFixed(2));
  if (bad || Math.abs(origTotal - res.totalAmount) > 0.01 || res.counts.MATCHED + res.counts.NOT_PRICED !== res.totalLines) {
    console.error('ROUNDTRIP FAILED'); process.exit(1);
  }
  console.log('ROUNDTRIP PASSED');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
