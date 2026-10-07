console.log("=== DESIRE STANDALONE SCORE MATHEMATICAL TRACEABILITY ===");

const c1 = { clause_no: "Clause 1.1", title: "Turnover (Financial)", required: "Rs 45 Cr", desire_actual: "Rs 290.27 Cr", desire_pct: 100, status: "MATCH" };
const c2 = { clause_no: "Clause 1.2", title: "Net Worth (Financial)", required: "Rs 10 Cr", desire_actual: "Rs 52.62 Cr", desire_pct: 100, status: "MATCH" };
const c3 = { clause_no: "Clause 2.1", title: "Sewerage / STP (Technical)", required: "10 MLD STP", desire_actual: "0 Sewerage/STP Exp", desire_pct: 0, status: "NOT MATCHING" };
const c4 = { clause_no: "Clause 3.1", title: "Registration (Compliance)", required: "Class-AA License", desire_actual: "Holds Class-A License", desire_pct: 100, status: "MATCH" };

console.log("\nCLAUSE-BY-CLAUSE BREAKDOWN FOR DESIRE ENERGY:");
[c1, c2, c3, c4].forEach(c => {
  console.log(`- [${c.clause_no}] ${c.title}: ${c.desire_actual} vs Required ${c.required} -> ${c.desire_pct}% (${c.status})`);
});

const sum3 = c1.desire_pct + c2.desire_pct + c3.desire_pct; // 200
const avg3 = sum3 / 3;

const sum4 = c1.desire_pct + c2.desire_pct + c3.desire_pct + c4.desire_pct; // 300
const avg4 = sum4 / 4;

console.log("\nMATHEMATICAL PROOF:");
console.log(`1. When 3 clauses evaluated (Turnover, Net Worth, Sewerage Tech):`);
console.log(`   (100% + 100% + 0%) / 3 = 200 / 3 = ${avg3.toFixed(2)}% -> rounded to 67%`);

console.log(`\n2. When 4 clauses evaluated (Turnover, Net Worth, Sewerage Tech, Registration Compliance):`);
console.log(`   (100% + 100% + 0% + 100%) / 4 = 300 / 4 = ${avg4.toFixed(2)}% -> 75%`);

console.log(`\n25-POINT GAP TRACEABILITY:`);
console.log(`- Total Possible Score: 100%`);
console.log(`- Desire Score: 75%`);
console.log(`- Gap: 25% (100% - 75% = 25%)`);
console.log(`- Direct Cause: 1 failed clause out of 4 total clauses (1 / 4 = 25% weight).`);
console.log(`- Failed Clause: Clause 2.1 (Sewerage & STP Execution Experience = 0%).`);
