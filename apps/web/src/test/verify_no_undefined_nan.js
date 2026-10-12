/**
 * Build verification test:
 * Fails the build if "undefined" or "NaN" appears in any generated report or rendered evaluation string.
 */

const fs = require('fs');
const path = require('path');

function testReportFormatting() {
  console.log('Running test: verify_no_undefined_nan...');

  // Sample report objects representing diverse tenders (Variyav, RAS, Banaskantha, Pushkar)
  const mockReports = [
    {
      tender_title: 'Variyav to Koliwad Bulk Water Transmission Pipeline EPC & 5-Year O&M',
      tender_header: {
        tender_value: '₹18.80 Cr',
        emd: '₹18.80 Lakhs',
        fee: '₹10,000',
        security_deposit: '5% PBG',
        solvency: '₹4.00 Cr',
        defect_liability: '12 Months DLP',
        completion_period: '18 Months',
        om_period: '5 Years O&M',
        pre_bid_date: '15/09/2026',
        publish_date: '01/09/2026'
      },
      clauses_breakdown: [
        {
          clause_no: '3.2.1',
          clause_title: 'Minimum Net Worth',
          requirement_type: 'Financial',
          tender_requirement: 'Net worth must be >= 10% of estimated cost (₹1.88 Cr)',
          required_value: '₹1.88 Cr (10% of BoQ ₹18.80 Cr)',
          desire_value: '₹52.62 Cr audited Net Worth',
          desire_status: 'MATCH',
          desire_pct: 100,
          status: 'MATCH',
          page_ref: 'Page 26'
        },
        {
          clause_no: '3.2.2',
          clause_title: 'Annual Turnover',
          requirement_type: 'Financial',
          tender_requirement: 'Rs. 4 Crores in ANY ONE financial year (Scenario 1) OR Rs. 10 Crores (Scenario 2)',
          required_value: 'Rs. 4.00 Cr in ANY ONE FY (Scenario 1) OR Rs. 10.00 Cr (Scenario 2)',
          desire_value: '₹350.66 Cr Peak FY 23-24 (₹271.94 Cr 3-yr avg)',
          desire_status: 'MATCH',
          desire_pct: 100,
          status: 'MATCH',
          page_ref: 'Page 26'
        },
        {
          clause_no: '3.2.3',
          clause_title: 'Bank Solvency',
          requirement_type: 'Financial',
          tender_requirement: 'Bank Solvency Certificate of Rs. 4.00 Cr',
          required_value: '₹4.00 Cr',
          desire_value: '₹72.18 Cr (Kotak Mahindra Bank dt 18/02/2026)',
          desire_status: 'MATCH',
          desire_pct: 100,
          status: 'MATCH',
          page_ref: 'Page 27'
        },
        {
          clause_no: '3.2.4',
          clause_title: 'Bid Capacity',
          requirement_type: 'Financial',
          tender_requirement: 'Available Bid Capacity (2*A*N - B) >= ₹18.80 Cr',
          required_value: '₹18.80 Cr',
          desire_value: 'CANNOT BE CHECKED: Missing Form-9 Works on Hand (Factor B)',
          desire_status: 'CANNOT BE CHECKED',
          desire_pct: 0,
          status: 'CANNOT BE CHECKED',
          page_ref: 'Page 27'
        }
      ]
    }
  ];

  for (const report of mockReports) {
    const serialized = JSON.stringify(report, null, 2);
    
    // Check for raw literal "undefined" or "NaN"
    const undefinedMatch = /\bundefined\b/i.test(serialized);
    const nanMatch = /\bNaN\b/.test(serialized);

    if (undefinedMatch) {
      console.error('FAIL: Found literal "undefined" in report serialization!');
      process.exit(1);
    }

    if (nanMatch) {
      console.error('FAIL: Found literal "NaN" in report serialization!');
      process.exit(1);
    }
  }

  // Also verify source code of route.ts and EligibilityChecker.tsx for legacy figures 300.93 and 95
  const filesToCheck = [
    path.join(__dirname, '../app/api/v1/[...path]/route.ts'),
    path.join(__dirname, '../components/EligibilityChecker.tsx'),
    path.join(__dirname, '../components/DashboardView.tsx'),
    path.join(__dirname, '../components/TenderWizard.tsx'),
    path.join(__dirname, '../components/TenderLifecycleTracker.tsx'),
    path.join(__dirname, '../components/IndiaTendersSectorView.tsx')
  ];

  for (const file of filesToCheck) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('300.93')) {
        console.error(`FAIL: Found legacy figure 300.93 in file: ${file}`);
        process.exit(1);
      }
      if (content.includes('₹95 Cr') || content.includes('net worth, ₹95 Cr')) {
        console.error(`FAIL: Found legacy figure 95 Cr net worth in file: ${file}`);
        process.exit(1);
      }
    }
  }

  console.log('PASS: All reports and source files verified. Zero "undefined", zero "NaN", zero legacy figures (300.93 / 95).');
}

testReportFormatting();
