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
  emd_cr?: number;
  emd_lakhs?: number;
  emd_raw?: string;
  is_estimated_from_emd?: boolean;
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
  // Existing Core States
  'Rajasthan': 'https://eproc.rajasthan.gov.in/nicgep/app',
  'Haryana': 'https://etenders.hry.nic.in/nicgep/app',
  'Uttar Pradesh': 'https://etender.up.nic.in/nicgep/app',
  'Madhya Pradesh': 'https://mptenders.gov.in/nicgep/app',
  'Delhi': 'https://govtprocurement.delhi.gov.in/nicgep/app',
  'Maharashtra': 'https://mahatenders.gov.in/nicgep/app',
  'Punjab': 'https://eproc.punjab.gov.in/nicgep/app',
  'Odisha': 'https://tendersodisha.gov.in/nicgep/app',
  'Tamil Nadu': 'https://tntenders.gov.in/nicgep/app',
  'Central (All India)': 'https://etenders.gov.in/eprocure/app',

  // Newly Verified Participating NIC States & UTs
  'Uttarakhand': 'https://uktenders.gov.in/nicgep/app',
  'Himachal Pradesh': 'https://hptenders.gov.in/nicgep/app',
  'Jharkhand': 'https://jharkhandtenders.gov.in/nicgep/app',
  'Assam': 'https://assamtenders.gov.in/nicgep/app',
  'West Bengal': 'https://wbtenders.gov.in/nicgep/app',
  'Kerala': 'https://etenders.kerala.gov.in/nicgep/app',
  'Jammu and Kashmir': 'https://jktenders.gov.in/nicgep/app',
  'Chandigarh': 'https://etenders.chd.nic.in/nicgep/app',
  'Tripura': 'https://tripuratenders.gov.in/nicgep/app',
  'Sikkim': 'https://sikkimtender.gov.in/nicgep/app',
  'Meghalaya': 'https://meghalayatenders.gov.in/nicgep/app',
  'Manipur': 'https://manipurtenders.gov.in/nicgep/app',
  'Mizoram': 'https://mizoramtenders.gov.in/nicgep/app',
  'Nagaland': 'https://nagalandtenders.gov.in/nicgep/app',
  'Arunachal Pradesh': 'https://arunachaltenders.gov.in/nicgep/app',
  'Puducherry': 'https://pudutenders.gov.in/nicgep/app',
  'Dadra and Nagar Haveli': 'https://dnhtenders.gov.in/nicgep/app',
  'Daman and Diu': 'https://ddtenders.gov.in/nicgep/app',

  // Central & PSU Portals (Standard NIC GePNIC Interface)
  'Central eProcure (CPPP 1)': 'https://eprocure.gov.in/eprocure/app',
  'Central ePublish / SAIL': 'https://eprocure.gov.in/epublish/app',
  'BHEL': 'https://eprocurebhel.co.in/nicgep/app',
  'NTPC': 'https://eprocurentpc.nic.in/nicgep/app',
  'Indian Oil (IOCL)': 'https://iocletenders.nic.in/nicgep/app',
  'Coal India (CIL)': 'https://coalindiatenders.nic.in/nicgep/app',
  'PMGSY / NRRDA': 'http://pmgsytenders.gov.in/nicgep/app',
  'Defence eProcurement': 'https://defproc.gov.in/nicgep/app'
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

export function extractValueFromText(text: string): number {
  if (!text) return 0.0;
  const crMatch = text.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:cr|crore|crores)/i);
  if (crMatch) {
    const num = parseFloat(crMatch[1]);
    if (!isNaN(num)) return Math.round(num * 100) / 100;
  }
  const lakhMatch = text.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:lac|lacs|lakh|lakhs)/i);
  if (lakhMatch) {
    const num = parseFloat(lakhMatch[1]);
    if (!isNaN(num)) return Math.round((num / 100.0) * 100) / 100;
  }
  return 0.0;
}

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
  if (/(BUILDING|OFFICE|COMPLEX|HOSTEL|QUARTERS|RESIDENTIAL|SCHOOL|COLLEGE|COURT|HOSPITAL|HALL|AUDITORIUM)/.test(t) && !/(WATER SUPPLY NETWORK|BULK PIPELINE|MAIN TRANSMISSION)/.test(t)) {
    return 'Building & Civil Construction';
  }
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

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 7000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
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
      // 1. Fetch homepage to obtain active session and form tokens (max 7s timeout)
      const homeRes = await fetchWithTimeout(portalUrl, {
        headers: browserHeaders,
        cache: 'no-store'
      }, 7000);

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

      // 2. Submit keyword search (max 8s timeout)
      const searchRes = await fetchWithTimeout(portalUrl, {
        method: 'POST',
        headers: {
          ...browserHeaders,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': portalUrl,
          'Cookie': cookies
        },
        body: postParams.toString(),
        cache: 'no-store'
      }, 8000);

      const searchHtml = await searchRes.text();

      // 3. Extract table rows (<tr class="even"> or <tr class="odd">)
      const rowRegex = /<tr[^>]*class=["'](?:even|odd)["'][^>]*>([\s\S]*?)<\/tr>/gi;
      const extractedRows: string[] = [];
      let rMatch;
      while ((rMatch = rowRegex.exec(searchHtml)) !== null) {
        extractedRows.push(rMatch[1]);
      }

      // Fallback: extract direct links if table rows not matched
      const directLinks: { href: string; title: string }[] = [];
      const linkRegex = /<a\s+[^>]*href=["']([^"']*component=%24DirectLink[^"']*sp=[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
      let linkMatch;
      while ((linkMatch = linkRegex.exec(searchHtml)) !== null) {
        const titleClean = linkMatch[2].replace(/<[^>]+>/g, '').trim();
        if (titleClean && !titleClean.toLowerCase().includes('back') && !titleClean.toLowerCase().includes('more...')) {
          directLinks.push({ href: linkMatch[1], title: titleClean });
        }
      }

      // 4. Process each search result row
      if (extractedRows.length > 0) {
        for (const rowContent of extractedRows.slice(0, maxPerKw)) {
          try {
            const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
            const cells: string[] = [];
            let cellMatch;
            while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
              const clean = cellMatch[1].replace(/<[^>]+>/g, '').replace(/&#8377;/g, '₹').replace(/\s+/g, ' ').trim();
              cells.push(clean);
            }
            if (cells.length < 5) continue;

            const pubDate = cells[1] || '';
            const dueDate = cells[2] || '';
            const fullCol4 = cells[4] || cells[3] || '';
            const dept = cells[5] || `${stateName} Govt`;

            // Extract Tender ID from col 4 e.g. [2026_CEPWD_603142_1]
            const idMatch = fullCol4.match(/\[([0-9]{4}_[A-Z0-9_]+)\]/) || fullCol4.match(/([0-9]{4}_[A-Z0-9_]+)/);
            const tenderId = idMatch ? idMatch[1] : `${stateName.slice(0, 2).toUpperCase()}-${Date.now() % 1000000}`;

            if (seenIds.has(tenderId)) continue;

            const cleanTitle = fullCol4.replace(/\[.*?\]/g, '').trim() || fullCol4;

            // Extract href link for detail page
            const linkInRow = rowContent.match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/i);
            const href = linkInRow ? linkInRow[1] : '';

            // 1. First extract estimated value from title text
            let valCr = extractValueFromText(cleanTitle);
            let emdCr = 0.0;
            let emdRaw = '';
            let isEstimatedFromEmd = false;

            // 2. If title has no value, or to get EMD, fetch detail page (fast 4s timeout)
            if (href && (valCr <= 0 || minValueCr > 0)) {
              try {
                const detailUrl = href.startsWith('http')
                  ? href
                  : `${baseDomain}${href.replace(/&amp;/g, '&')}`;

                const detRes = await fetchWithTimeout(detailUrl, {
                  headers: {
                    ...browserHeaders,
                    'Referer': portalUrl,
                    'Cookie': cookies
                  },
                  cache: 'no-store'
                }, 4000);

                const detHtml = await detRes.text();
                const tenderInfo: Record<string, string> = {};
                const dRowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
                let dRowMatch;
                while ((dRowMatch = dRowRegex.exec(detHtml)) !== null) {
                  const dCells: string[] = [];
                  let dCellMatch;
                  const dCellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
                  while ((dCellMatch = dCellRegex.exec(dRowMatch[1])) !== null) {
                    dCells.push(dCellMatch[1].replace(/<[^>]+>/g, '').replace(/&#8377;/g, '₹').replace(/\s+/g, ' ').trim());
                  }
                  for (let i = 0; i < dCells.length - 1; i += 2) {
                    if (dCells[i] && dCells[i + 1]) tenderInfo[dCells[i]] = dCells[i + 1];
                  }
                }

                for (const [k, v] of Object.entries(tenderInfo)) {
                  if (/emd amount/i.test(k)) {
                    emdRaw = v;
                    emdCr = cleanCurrencyToCr(v);
                    break;
                  }
                }

                if (valCr <= 0) {
                  for (const [k, v] of Object.entries(tenderInfo)) {
                    if (/tender value|estimated value/i.test(k)) {
                      const parsed = cleanCurrencyToCr(v);
                      if (parsed > 0) {
                        valCr = parsed;
                        break;
                      }
                    }
                  }
                }

                if (valCr <= 0.0 && emdCr >= 0.20) {
                  valCr = Math.round(emdCr * 50 * 100) / 100;
                  isEstimatedFromEmd = true;
                }
              } catch (detErr) {
                // Ignore detail fetch failure & keep title-extracted value
              }
            }

            // Value Threshold Filter (If minValueCr === 0, keep all; otherwise valCr >= minValueCr)
            if (valCr >= minValueCr || minValueCr <= 0.01) {
              const tenderObj: GovtTenderResult = {
                id: `govt-${tenderId}`,
                sr_no: String(seenIds.size + 1),
                tender_id: tenderId,
                title: cleanTitle,
                location: stateName,
                state: stateName,
                raw_state: stateName,
                amount_inr: Math.round(valCr * 10000000),
                value_cr: valCr,
                emd_cr: emdCr > 0 ? emdCr : undefined,
                emd_lakhs: emdCr > 0 ? Math.round(emdCr * 100 * 100) / 100 : undefined,
                emd_raw: emdRaw || undefined,
                is_estimated_from_emd: isEstimatedFromEmd,
                pre_bid_date: pubDate,
                due_date: dueDate,
                department: dept,
                type_of_work: kw,
                sector: cleanSectorFromTitle(cleanTitle, kw),
                status: 'Live',
                raw_status: 'Live',
                document_link: `${portalUrl}?page=FrontEndAdvancedSearch&service=page`,
                summary_sheet: '',
                bidders: [],
                bidders_count: 0,
                l1_price_info: '',
                remarks: `Live ingested from ${stateName} GePNIC portal for keyword: '${kw}' (Value ₹${valCr} Cr, EMD ₹${emdCr} Cr)`
              };

              discovered.push(tenderObj);
              seenIds.add(tenderId);
            }
          } catch (rowErr) {
            // Ignore row error
          }
        }
      } else {
        // Fallback for directLinks if no table rows parsed
        for (const item of directLinks.slice(0, maxPerKw)) {
          const idMatch = item.title.match(/\[([0-9]{4}_[A-Z0-9_]+)\]/);
          const tenderId = idMatch ? idMatch[1] : `${stateName.slice(0, 2).toUpperCase()}-${Date.now() % 1000000}`;
          if (seenIds.has(tenderId)) continue;
          const cleanTitle = item.title.replace(/\[.*?\]/g, '').trim() || item.title;
          const valCr = extractValueFromText(cleanTitle);

          if (valCr >= minValueCr || minValueCr <= 0.01) {
            discovered.push({
              id: `govt-${tenderId}`,
              sr_no: String(seenIds.size + 1),
              tender_id: tenderId,
              title: cleanTitle,
              location: stateName,
              state: stateName,
              raw_state: stateName,
              amount_inr: Math.round(valCr * 10000000),
              value_cr: valCr,
              pre_bid_date: '',
              due_date: '',
              department: `${stateName} Govt`,
              type_of_work: kw,
              sector: cleanSectorFromTitle(cleanTitle, kw),
              status: 'Live',
              raw_status: 'Live',
              document_link: `${portalUrl}?page=FrontEndAdvancedSearch&service=page`,
              summary_sheet: '',
              bidders: [],
              bidders_count: 0,
              l1_price_info: '',
              remarks: `Live ingested from ${stateName} GePNIC portal for keyword: '${kw}' (Value ₹${valCr} Cr)`
            });
            seenIds.add(tenderId);
          }
        }
      }
    } catch (kwErr) {
      // Continue to next keyword
    }
  }

  return discovered;
}
