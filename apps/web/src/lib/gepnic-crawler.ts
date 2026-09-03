export interface GovtTenderResult {
  id: string;
  sr_no: string;
  tender_id: string;
  title: string;
  location: string;
  state: string;
  raw_state: string;
  amount_inr: number;
  value_cr: number;
  pre_bid_date: string;
  due_date: string;
  department: string;
  type_of_work: string;
  sector: string;
  status: string;
  raw_status: string;
  document_link: string;
  summary_sheet: string;
  bidders: string[];
  bidders_count: number;
  l1_price_info: string;
  remarks: string;
}

export const STATE_PORTALS: Record<string, string> = {
  'Rajasthan': 'https://eproc.rajasthan.gov.in/nicgep/app',
  'Haryana': 'https://etenders.hry.nic.in/nicgep/app',
  'Uttar Pradesh': 'https://etender.up.nic.in/nicgep/app',
  'Madhya Pradesh': 'https://mptenders.gov.in/nicgep/app',
  'Delhi': 'https://govtprocurement.delhi.gov.in/nicgep/app',
  'Maharashtra': 'https://mahatenders.gov.in/nicgep/app',
  'Punjab': 'https://eproc.punjab.gov.in/nicgep/app',
  'Odisha': 'https://tendersodisha.gov.in/nicgep/app',
  'Tamil Nadu': 'https://tntenders.gov.in/nicgep/app',
  'Central (All India)': 'https://etenders.gov.in/eprocure/app'
};

export const KEYWORD_CATEGORIES: Record<string, string[]> = {
  'Water Supply & JJM': [
    'Water Supply', 'Supply Scheme', 'RWSS', 'UWSS', 'WSS', 'Drinking Water',
    'JJM', 'Turnkey', 'Augmentation', 'Amrut', 'Tubewell', 'Intake Well', 'WTP'
  ],
  'STP & Wastewater': [
    'STP or treatment', 'FSTP', 'Sewerage', 'Sewer', 'Reuse', 'SBM',
    'Swachh bharat mission', 'waste', 'CETP OR ETP', 'ZLD', 'TTP', 'waste water mangement'
  ],
  'Solar & Renewable': [
    'SOLAR', 'Solar Energy Based', 'Solar Based', 'SPV', 'Dual Pumps',
    'Solar Pumps', 'Pumping System', 'Solar Based Micro Irrigation', 'REIL (CPPP)'
  ],
  'Irrigation & Canal': [
    'Irrigation', 'Lift Irrigation', 'Micro Irrigation', 'PDN, PIPE DISTRIBUTION NETWORK',
    'Canal', 'Barrage', 'Anicut'
  ],
  'SCADA & Automation': [
    'SCADA', 'Automation', 'PLC', 'Centralized Water Management', 'IOT Based'
  ],
  'ESCO & Energy Efficiency': [
    'ESCO', 'Energy Efficient', 'PPP Model', 'Pumps'
  ]
};

export function cleanCurrencyToCr(valStr?: string): number {
  if (!valStr) return 0.0;
  const s = String(valStr).replace(/,/g, '').replace(/₹/g, '').replace(/&#8377;/g, '').trim();
  const digitsOnly = s.replace(/[^\d.]+/g, '');
  const num = parseFloat(digitsOnly);
  if (isNaN(num) || num <= 0) return 0.0;
  // In GePNIC, 'Tender Value in ₹' is in absolute Rupees.
  // 1 Crore = 10,000,000 Rupees.
  return Math.round((num / 10000000.0) * 100) / 100;
}

export function cleanSectorFromTitle(title: string, workType: string = ''): string {
  const t = (title + ' ' + workType).toUpperCase();
  if (/(STP|SEW|EFFLUENT|CETP|ETP|DRAIN|SLUDGE|WASTE WATER|TREATMENT)/.test(t)) {
    return 'STP & Sewerage Network';
  }
  if (/(SOLAR|RENEW|KUSUM|PV|BESS)/.test(t)) {
    return 'Solar & Renewable Energy';
  }
  if (/(O&M|OPERATION|MAINTENANCE)/.test(t)) {
    return 'O&M Water & Civil Assets';
  }
  if (/(IRRIGATION|CANAL|DAM|BARRAGE|WEIR|ANICUT)/.test(t)) {
    return 'Canal, Dam & Irrigation';
  }
  if (/(SCADA|AUTOMATION|METER|IOT|PLC|TELEMETRY)/.test(t)) {
    return 'Smart Water, SCADA & Automation';
  }
  if (/(JJM|RURAL|VILLAGE|PUMP HOUSE)/.test(t)) {
    return 'JJM & Rural Water Supply';
  }
  if (/(PIPELINE|LAYING|DISTRIBUTION|TRANSMISSION|AUGMENTATION|WSS|RESERVOIR|CWR|OHSR|WATER SUPPLY)/.test(t)) {
    return 'Water Transmission & Pipelines';
  }
  return 'Turnkey EPC & Civil';
}

export async function crawlStateGePNICPortal(
  stateName: string,
  portalUrl: string,
  keywords: string[],
  minValueCr: number = 10.0,
  maxPerKw: number = 6
): Promise<GovtTenderResult[]> {
  const discovered: GovtTenderResult[] = [];
  const seenIds = new Set<string>();
  const baseDomain = portalUrl.split('/nicgep')[0];

  const browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
  };

  for (const kw of keywords) {
    try {
      // 1. Fetch homepage to obtain active session and form tokens
      const homeRes = await fetch(portalUrl, {
        headers: browserHeaders,
        cache: 'no-store'
      });

      const rawSetCookie = homeRes.headers.get('set-cookie') || '';
      const cookies = rawSetCookie.split(';')[0]; // Extract primary JSESSIONID
      const homeHtml = await homeRes.text();

      // Extract tenderSearch form
      const formMatch = homeHtml.match(/<form[^>]*id=["']tenderSearch["'][^>]*>([\s\S]*?)<\/form>/i);
      if (!formMatch) continue;

      const formHtml = formMatch[1];
      const postParams = new URLSearchParams();
      const inputRegex = /<input[^>]*name=["']([^"']+)["'][^>]*value=["']([^"']*)["']/gi;
      let m;
      while ((m = inputRegex.exec(formHtml)) !== null) {
        postParams.set(m[1], m[2]);
      }
      postParams.set('SearchDescription', kw);
      postParams.set('Go', 'Go');

      // 2. Submit keyword search
      const searchRes = await fetch(portalUrl, {
        method: 'POST',
        headers: {
          ...browserHeaders,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': portalUrl,
          'Cookie': cookies
        },
        body: postParams.toString(),
        cache: 'no-store'
      });

      const searchHtml = await searchRes.text();

      // 3. Extract direct tender links
      const directLinks: { href: string; title: string }[] = [];
      const linkRegex = /<a\s+[^>]*href=["']([^"']*component=%24DirectLink[^"']*sp=[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
      let linkMatch;
      while ((linkMatch = linkRegex.exec(searchHtml)) !== null) {
        const titleClean = linkMatch[2].replace(/<[^>]+>/g, '').trim();
        if (titleClean && !titleClean.toLowerCase().includes('back') && !titleClean.toLowerCase().includes('more...')) {
          directLinks.push({ href: linkMatch[1], title: titleClean });
        }
      }

      // 4. Inspect details for tenders up to maxPerKw
      for (const item of directLinks.slice(0, maxPerKw)) {
        try {
          const detailUrl = item.href.startsWith('http') 
            ? item.href 
            : `${baseDomain}${item.href.replace(/&amp;/g, '&')}`;

          const detRes = await fetch(detailUrl, {
            headers: {
              ...browserHeaders,
              'Referer': portalUrl,
              'Cookie': cookies
            },
            cache: 'no-store'
          });

          const detHtml = await detRes.text();

          // Extract table rows in pairs
          const tenderInfo: Record<string, string> = {};
          const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
          let rowMatch;
          while ((rowMatch = rowRegex.exec(detHtml)) !== null) {
            const rowContent = rowMatch[1];
            const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
            const cells: string[] = [];
            let cellMatch;
            while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
              const clean = cellMatch[1].replace(/<[^>]+>/g, '').replace(/&#8377;/g, '₹').replace(/\s+/g, ' ').trim();
              cells.push(clean);
            }
            for (let i = 0; i < cells.length - 1; i += 2) {
              const k = cells[i].trim();
              const v = cells[i + 1].trim();
              if (k && v) {
                tenderInfo[k] = v;
              }
            }
          }

          let tenderId = tenderInfo['Tender ID'] || '';
          if (!tenderId) {
            const idMatch = item.title.match(/\[([0-9]{4}_[A-Z0-9_]+)\]/);
            tenderId = idMatch ? idMatch[1] : `${stateName.slice(0, 2).toUpperCase()}-${Date.now() % 1000000}`;
          }

          if (seenIds.has(tenderId)) continue;

          // Find Tender Value
          let valRaw = '';
          for (const [k, v] of Object.entries(tenderInfo)) {
            if (/tender value|estimated value/i.test(k)) {
              valRaw = v;
              break;
            }
          }

          let valCr = cleanCurrencyToCr(valRaw);

          // EMD fallback calculation
          let emdRaw = '';
          for (const [k, v] of Object.entries(tenderInfo)) {
            if (/emd amount/i.test(k)) {
              emdRaw = v;
              break;
            }
          }
          const emdCr = cleanCurrencyToCr(emdRaw);
          if (valCr <= 0.0 && emdCr >= 0.20) {
            valCr = Math.round(emdCr * 50 * 100) / 100;
          }

          // STRICT RULE ENFORCEMENT: Tender Value >= minValueCr (Default: 10 Cr)
          if (valCr >= minValueCr) {
            const cleanTitle = (tenderInfo['Title'] || tenderInfo['Work Description'] || item.title)
              .replace(/\[.*?\]/g, '').trim() || item.title;
            const dept = tenderInfo['Organisation Chain'] || tenderInfo['Tender Inviting Authority'] || `${stateName} Govt`;
            const loc = tenderInfo['Location'] || stateName;
            const dueDate = tenderInfo['Bid Submission End Date'] || '';
            const preBid = tenderInfo['Pre Bid Meeting Date'] || '';

            const tenderObj: GovtTenderResult = {
              id: `govt-${tenderId}`,
              sr_no: String(seenIds.size + 1),
              tender_id: tenderId,
              title: cleanTitle,
              location: loc,
              state: stateName,
              raw_state: stateName,
              amount_inr: Math.round(valCr * 10000000),
              value_cr: valCr,
              pre_bid_date: preBid,
              due_date: dueDate,
              department: dept,
              type_of_work: tenderInfo['Product Category'] || kw,
              sector: cleanSectorFromTitle(cleanTitle, kw),
              status: 'Live',
              raw_status: 'Live',
              document_link: detailUrl,
              summary_sheet: '',
              bidders: [],
              bidders_count: 0,
              l1_price_info: '',
              remarks: `Live ingested from ${stateName} GePNIC portal for keyword: '${kw}' (Value >= ₹${minValueCr} Cr)`
            };

            discovered.push(tenderObj);
            seenIds.add(tenderId);
          }
        } catch (detailErr) {
          // Continue to next tender
        }
      }
    } catch (kwErr) {
      // Continue to next keyword
    }
  }

  return discovered;
}
