const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log("Launching Chromium...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await context.newPage();

  console.log("Navigating to https://desire-tender.vercel.app/ ...");
  await page.goto('https://desire-tender.vercel.app/', { waitUntil: 'networkidle' });

  console.log("Waiting for app to load...");
  await page.waitForTimeout(3000);

  // Look for sidebar tab "AI Tender Wizard" or "Tender Audit" or "Eligibility Checker"
  console.log("Searching for Eligibility/Wizard nav button...");
  const buttons = await page.$$('button, a');
  let clicked = false;
  for (const btn of buttons) {
    const text = await btn.textContent();
    if (text && (text.includes('Eligibility') || text.includes('Audit Report') || text.includes('Tender Wizard') || text.includes('Tender Audit'))) {
      console.log(`Clicking nav element: "${text.trim()}"`);
      await btn.click();
      clicked = true;
      break;
    }
  }

  if (!clicked) {
    console.log("Nav button not found by text, searching sidebar items...");
    const items = await page.$$('[role="button"], li, div');
    for (const item of items) {
      const text = await item.textContent();
      if (text && text.includes('Tender Qualification')) {
        await item.click();
        break;
      }
    }
  }

  await page.waitForTimeout(4000);

  const outputPath = 'C:\\Users\\SHIWANGI SHARMA\\.gemini\\antigravity-ide\\brain\\f822f1a7-8284-4a02-a906-232151aa50c2\\tender_qualification_report_verified.png';
  await page.screenshot({ path: outputPath, fullPage: true });
  console.log(`Screenshot successfully saved to: ${outputPath}`);

  await browser.close();
})();
