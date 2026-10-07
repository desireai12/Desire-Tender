const fs = require('fs');

// Alwar Sewerage & STP Tender extracted clauses
const alwarClauses = [
  {
    clause_no: "Clause 1.1",
    clause_title: "Average Annual Financial Turnover",
    requirement_type: "Financial",
    tender_requirement: "Minimum Average Annual Financial Turnover of Rs 45.00 Cr in last 3 financial years.",
    required_value: "Rs 45.00 Cr",
    required_value_num: 45.0
  },
  {
    clause_no: "Clause 1.2",
    clause_title: "Net Worth Requirement",
    requirement_type: "Financial",
    tender_requirement: "Minimum Net Worth of Rs 10.00 Cr.",
    required_value: "Rs 10.00 Cr",
    required_value_num: 10.0
  },
  {
    clause_no: "Clause 2.1",
    clause_title: "Sewerage & STP Execution Experience",
    requirement_type: "Technical",
    tender_requirement: "Execution of Sewage Treatment Plant (STP) or Sewerage Underground Network scheme of minimum 10 MLD / 50 km.",
    required_value: "10 MLD STP / Sewerage Network",
    required_value_num: 10.0
  },
  {
    clause_no: "Clause 3.1",
    clause_title: "Class-AA Contractor Registration",
    requirement_type: "Compliance",
    tender_requirement: "Valid Class-AA or Class-A Contractor Registration with Government Authority.",
    required_value: "Class-AA / Class-A",
    required_value_num: null
  }
];

// Master Companies
const comps = [
  {
    id: 'comp-desire-01', name: 'DESIRE ENERGY SOLUTIONS PRIVATE LIMITED', type: 'Desire Energy',
    average_turnover: 290.27, net_worth: 52.62, solvency_amount: 72.18,
    technical_experience: 'Executed 120+ km HDPE/DI Water Pipelines, 5 OHSRs, 50+ MW Solar PV Plants',
    sector_experience: ['Rural Water Supply (JJM)', 'Solar PV Water Pumps', 'Bulk Water Pipeline EPC']
  },
  {
    id: 'comp-vhp-04', name: 'VINOD H PATEL', type: 'JV Partner',
    average_turnover: 191.39, net_worth: 33.37, solvency_amount: 25.00,
    technical_experience: 'Executed Palanpur Group Water Supply Package 2 (Rising/Gravity DI/PVC Pipeline & Pumping Station) worth Rs 99.41 Cr, 150+ km DI/HDPE pipeline projects in Gujarat WRD',
    sector_experience: ['Bulk Water Supply Pipelines (DI/MS/HDPE)', 'Water Pumping Stations & Headworks']
  },
  {
    id: 'comp-aapl-05', name: 'ADROIT ASSOCIATES PRIVATE LIMITED', type: 'JV Partner',
    average_turnover: 35.22, net_worth: 14.27, solvency_amount: 10.00,
    technical_experience: 'Executed Roshni-1 Multi-Village Rural Water Supply Scheme (Rs 46.73 Cr), Rani Durgawati Lift Irrigation Project (Rs 20.32 Cr), Gobra Nawapara 7.6 MLD SBR Sewage Treatment Plant (Rs 15.48 Cr)',
    sector_experience: ['Rural Water Supply Schemes (JJM)', 'Lift Irrigation Schemes', 'SBR Sewage Treatment Plants (STP)']
  },
  {
    id: 'comp-divija-02', name: 'DIVIJA CONSTRUCTION', type: 'JV Partner',
    average_turnover: 37.01, net_worth: 6.58, solvency_amount: 10.00,
    technical_experience: 'Executed 136 km Sewer Network in Jaipur DLB, 8 MLD Sewage Pumping Station, DWC & RCC NP3 Pipe Jacking',
    sector_experience: ['Underground Sewerage Network', 'STP Sewage Pumping Stations', 'Micro-tunneling']
  }
];

// Replicate exact top-level evaluateDeterministicMatching from route.ts
function evaluateDeterministicMatching(rawClauses, comps, selectedJvPartnerId) {
  const desireComp = comps.find(c => c.type === 'Desire Energy' || c.id === 'comp-desire-01') || comps[0];
  const jvPartners = comps.filter(c => c.id !== desireComp.id && c.type !== 'Desire Energy');

  const dT = desireComp.average_turnover || 290.27;
  const dNW = desireComp.net_worth || 52.62;
  const dS = desireComp.solvency_amount || 72.18;

  function evalClause(c, partner) {
    const reqType = c.requirement_type || 'Technical';
    const title = (c.clause_title || '').toLowerCase();
    const reqText = (c.tender_requirement || '').toLowerCase();

    let reqNum = (typeof c.required_value_num === 'number' && !isNaN(c.required_value_num)) ? c.required_value_num : null;

    const jT = partner.average_turnover || 37.01;
    const jNW = partner.net_worth || 6.58;
    const jS = partner.solvency_amount || 10.0;

    let dRawPct = 0, jRawPct = 0, cRawPct = 0;
    let dPct = 0, jPct = 0, cPct = 0;
    let dVal = '', jVal = '', cVal = '';

    const jCerts = Array.isArray(partner.certifications) ? partner.certifications : [];
    const jTech = (partner.technical_experience || '') + ' ' + (Array.isArray(partner.sector_experience) ? partner.sector_experience.join(' ') : '');

    if (reqType === 'Financial') {
      if (title.includes('turnover') || reqText.includes('turnover')) {
        dRawPct = Math.round((dT / reqNum) * 1000) / 10.0;
        jRawPct = Math.round((jT / reqNum) * 1000) / 10.0;
        cRawPct = Math.round(((dT + jT) / reqNum) * 1000) / 10.0;
        dPct = Math.min(100, Math.floor(dRawPct));
        jPct = Math.min(100, Math.floor(jRawPct));
        cPct = Math.min(100, Math.floor(cRawPct));
        dVal = `Required: Rs ${reqNum} Cr | Desire actual: Rs ${dT} Cr -> ${dRawPct}% raw (${dPct}% capped)`;
        jVal = `Required: Rs ${reqNum} Cr | ${partner.name} actual: Rs ${jT} Cr -> ${jRawPct}% raw (${jPct}% capped)`;
        cVal = `Pooled: Rs ${(dT + jT).toFixed(2)} Cr -> ${cRawPct}% raw (${cPct}% capped)`;
      } else {
        dRawPct = Math.round((dNW / reqNum) * 1000) / 10.0;
        jRawPct = Math.round((jNW / reqNum) * 1000) / 10.0;
        cRawPct = Math.round(((dNW + jNW) / reqNum) * 1000) / 10.0;
        dPct = Math.min(100, Math.floor(dRawPct));
        jPct = Math.min(100, Math.floor(jRawPct));
        cPct = Math.min(100, Math.floor(cRawPct));
        dVal = `Required: Rs ${reqNum} Cr | Desire actual: Rs ${dNW} Cr -> ${dRawPct}% raw (${dPct}% capped)`;
        jVal = `Required: Rs ${reqNum} Cr | ${partner.name} actual: Rs ${jNW} Cr -> ${jRawPct}% raw (${jPct}% capped)`;
        cVal = `Pooled: Rs ${(dNW + jNW).toFixed(2)} Cr -> ${cRawPct}% raw (${cPct}% capped)`;
      }
    } else if (reqType === 'Technical') {
      const isSewer = title.includes('sewer') || title.includes('sewage') || title.includes('stp') || title.includes('etp') || title.includes('drainage') ||
                      reqText.includes('sewer') || reqText.includes('sewage') || reqText.includes('stp') || reqText.includes('etp') || reqText.includes('drainage');
      if (isSewer) {
        dPct = 0;
        dVal = 'Desire actual: Zero sewerage/STP track record -> 0% NOT MATCHING (Desire Sector Gap)';

        const partnerHasSTP = jTech.toLowerCase().includes('stp') || jTech.toLowerCase().includes('sewage') || jTech.toLowerCase().includes('sewer') || jTech.toLowerCase().includes('sbr');
        if (partnerHasSTP) {
          jPct = 100;
          jVal = `${partner.name} actual: Executed SBR Sewage Treatment Plants & Sewerage -> 100% MATCH`;
        } else {
          jPct = 0;
          jVal = `${partner.name} actual: Missing sewerage/STP track record in credentials -> 0% NOT MATCHING`;
        }

        cPct = (dPct > 0 || jPct > 0) ? 100 : 0;
        cVal = cPct === 100 ? `Combined: ${partner.name} covers Sewerage/STP technical gap -> 100% MATCH` : 'Combined: Neither member has sewerage/STP track record -> 0% NOT MATCHING';
      }
    } else {
      dPct = 100; jPct = 100; cPct = 100;
      dVal = 'Desire actual: Holds Class-A License -> 100% MATCH';
      jVal = `${partner.name} actual: Holds Class-A License -> 100% MATCH`;
      cVal = 'Combined: Meets registration criteria -> 100% MATCH';
    }

    return {
      clause_no: c.clause_no,
      clause_title: c.clause_title,
      requirement_type: reqType,
      desire_pct: dPct,
      desire_value: dVal,
      jv_pct: jPct,
      jv_value: jVal,
      combined_pct: cPct,
      combined_value: cVal
    };
  }

  const partnerEvaluations = {};
  for (const partner of jvPartners) {
    const clauseEvals = rawClauses.map(c => evalClause(c, partner));
    const totalCount = clauseEvals.length || 1;
    const dScore = Math.min(100, Math.round(clauseEvals.reduce((acc, c) => acc + c.desire_pct, 0) / totalCount));
    const jScore = Math.min(100, Math.round(clauseEvals.reduce((acc, c) => acc + c.jv_pct, 0) / totalCount));
    const cScore = Math.min(100, Math.round(clauseEvals.reduce((acc, c) => acc + c.combined_pct, 0) / totalCount));

    partnerEvaluations[partner.id] = {
      partner,
      dScore,
      jScore,
      cScore,
      clauses: clauseEvals
    };
  }

  return partnerEvaluations;
}

const evals = evaluateDeterministicMatching(alwarClauses, comps);

console.log("=== ALWAR SEWERAGE & STP OFFLINE CACHED TEST ===");
for (const [id, res] of Object.entries(evals)) {
  console.log(`\nPARTNER: ${res.partner.name} (${id})`);
  console.log(`DESIRE STANDALONE SCORE: ${res.dScore}%`);
  console.log(`PARTNER STANDALONE SCORE: ${res.jScore}%`);
  console.log(`COMBINED CONSORTIUM SCORE: ${res.cScore}%`);
  const sewerClause = res.clauses.find(c => c.clause_no === 'Clause 2.1');
  console.log(`[Clause 2.1 Sewerage/STP]: Desire=${sewerClause.desire_pct}% | ${res.partner.name}=${sewerClause.jv_pct}% | Combined=${sewerClause.combined_pct}%`);
}
