import { GovtTenderResult, cleanSectorFromTitle } from './gepnic-crawler';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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

function extractAllCookies(res: Response): string {
  try {
    if (typeof (res.headers as any).getSetCookie === 'function') {
      const list: string[] = (res.headers as any).getSetCookie();
      return list.map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');
    }
    const raw = res.headers.get('set-cookie') || '';
    return raw.split(/,(?=[^;]*=)/).map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');
  } catch {
    return '';
  }
}

export async function crawlTelanganaPortal(
  keywords: string[] = ['Solar', 'STP or treatment', 'Water Supply'],
  minValueCr: number = 0.0,
  maxPerKw: number = 5
): Promise<GovtTenderResult[]> {
  const discovered: GovtTenderResult[] = [];
  const seenIds = new Set<string>();

  const browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  };

  try {
    // 1. Fetch initial landing page to obtain JSESSIONID, Application Gateway cookies, and CSRFToken
    const homeUrl = 'https://tender.telangana.gov.in';
    const initRes = await fetchWithTimeout(homeUrl, {
      headers: browserHeaders,
      cache: 'no-store'
    }, 7000);

    const initCookies = extractAllCookies(initRes);
    const initHtml = await initRes.text();

    const actionMatch = initHtml.match(/action=["']([^"']+)["']/i);
    const csrfMatch = initHtml.match(/name=["']CSRFToken["'][^>]+value=["']([^"']+)["']/i);

    const actionStr = actionMatch ? actionMatch[1] : '';
    const csrfToken = csrfMatch ? csrfMatch[1] : '';
    const jsess = actionStr.includes('jsessionid=') ? actionStr.split('jsessionid=')[1] : '';

    // 2. Submit initial login form to activate session and obtain homepage live tenders
    const loginUrl = jsess
      ? `https://tender.telangana.gov.in/login.html;jsessionid=${jsess}`
      : `https://tender.telangana.gov.in/login.html`;

    const postParams = new URLSearchParams();
    postParams.set('CSRFToken', csrfToken);
    postParams.set('hdnEncryptNames', 'hdnEncryptNames');
    postParams.set('hdnEncryptValues', 'hdnEncryptValues');

    const loginRes = await fetchWithTimeout(loginUrl, {
      method: 'POST',
      headers: {
        ...browserHeaders,
        'Cookie': initCookies,
        'Referer': homeUrl,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: postParams.toString(),
      cache: 'no-store'
    }, 8000);

    const loginCookies = extractAllCookies(loginRes);
    const mergedCookies = [initCookies, loginCookies].filter(Boolean).join('; ');
    const loginHtml = await loginRes.text();

    // 3. Extract Live Tenders from update-nag blocks in loginHtml
    const cardRegex = /<div[^>]*class=["'][^"']*update-nag[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
    let cardMatch;

    while ((cardMatch = cardRegex.exec(loginHtml)) !== null) {
      const cardHtml = cardMatch[1];

      // Extract Tender ID
      const tidMatch = cardHtml.match(/Tender\s*ID\s*:\s*<a[^>]*>([^<]+)<\/a>/i);
      const tenderId = tidMatch ? tidMatch[1].trim() : '';
      if (!tenderId || seenIds.has(tenderId)) continue;

      // Extract Notice Number
      const noticeMatch = cardHtml.match(/Notice\s*Number\s*:\s*<a[^>]*>([^<]+)<\/a>/i);
      const noticeNo = noticeMatch ? noticeMatch[1].trim() : '';

      // Extract Title / Description
      const titleMatch = cardHtml.match(/<a[^>]*title=["']\(([^"']+)\)["']/i) ||
                         cardHtml.match(/<p>\s*<a[^>]*class=["']["'][^>]*>([\s\S]*?)<\/a>\s*<\/p>/i);
      const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : `Telangana Tender ${tenderId}`;

      // Extract Division / Department
      const divMatch = cardHtml.match(/in\s*Division\s*No\s*:\s*([^.<]+)/i);
      let division = divMatch ? divMatch[1].trim() : 'Telangana State Department';

      // Extract Date
      const monthMatch = cardHtml.match(/<h4>([A-Za-z]+)<\/h4>/i);
      const dayMatch = cardHtml.match(/<h4>(\d+)<\/h4>/i);
      const timeMatch = cardHtml.match(/<h4>(\d{1,2}:\d{2}\s*[AP]M)<\/h4>/i);
      let dueDate = (monthMatch && dayMatch)
        ? `${dayMatch[1]}-${monthMatch[1]}-2026 ${timeMatch ? timeMatch[1] : ''}`.trim()
        : 'Open';

      // Extract procurement ID for detail view
      const pidMatch = cardHtml.match(/viewtender\((\d+)\)/i);
      const procurementId = pidMatch ? pidMatch[1] : '';

      // Filter by keywords
      const titleUpper = title.toUpperCase();
      const kwMatched = keywords.length === 0 || keywords.some(k => {
        const parts = k.toUpperCase().split(/\s+OR\s+/i);
        return parts.some(p => titleUpper.includes(p.trim()));
      });

      if (!kwMatched) continue;

      let valueCr = 0.0;
      let amountInr = 0;
      let preBidDate = '';

      // 4. Fetch details via ViewTender.html if procurementId is present
      if (procurementId) {
        try {
          const viewUrl = jsess
            ? `https://tender.telangana.gov.in/ViewTender.html;jsessionid=${jsess}`
            : `https://tender.telangana.gov.in/ViewTender.html`;

          const detailParams = new URLSearchParams();
          detailParams.set('CSRFToken', csrfToken);
          detailParams.set('popUPRequestParameter', 'popUPRequestParameter');
          detailParams.set('hdnPage', 'login.html');
          detailParams.set('hdnProcurementID', procurementId);
          detailParams.set('hdnEncryptNames', 'hdnEncryptNames');
          detailParams.set('hdnEncryptValues', 'hdnEncryptValues');

          const detRes = await fetchWithTimeout(viewUrl, {
            method: 'POST',
            headers: {
              ...browserHeaders,
              'Cookie': mergedCookies,
              'Referer': loginUrl,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: detailParams.toString(),
            cache: 'no-store'
          }, 3500);

          const detHtml = await detRes.text();

          // Extract Estimated Contract Value
          const ecvMatch = detHtml.match(/Estimated\s*Contract\s*Value[^:]*:\s*([0-9,.]+)/i);
          if (ecvMatch) {
            const rawVal = ecvMatch[1].replace(/,/g, '').trim();
            amountInr = parseFloat(rawVal) || 0;
            valueCr = amountInr > 0 ? Math.round((amountInr / 10000000.0) * 100) / 100 : 0.0;
          }

          // Extract Department Name
          const deptMatch = detHtml.match(/Department\s*Name\s*:\s*([^:<]+)/i);
          if (deptMatch) {
            const deptClean = deptMatch[1].replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
            if (deptClean) division = deptClean;
          }

          // Extract Pre-Bid Meeting Date
          const preBidMatch = detHtml.match(/Pre\s*Bid\s*Meeting\s*Opening\s*Date\s*&\s*Time\s*:\s*([^:<]+)/i);
          if (preBidMatch) {
            preBidDate = preBidMatch[1].trim();
          }

          // Extract Closing Date
          const closeMatch = detHtml.match(/Bid\s*Submission\s*Closing\s*Date\s*&\s*Time\s*:\s*([^:<]+)/i);
          if (closeMatch) {
            const cleanClose = closeMatch[1].trim();
            if (cleanClose) dueDate = cleanClose;
          }
        } catch (detErr) {
          // Gracefully fallback to summary info
        }
      }

      if (minValueCr > 0 && valueCr > 0 && valueCr < minValueCr) continue;

      seenIds.add(tenderId);
      discovered.push({
        id: `TLG-${tenderId}`,
        sr_no: String(discovered.length + 1),
        tender_id: `2026_TELANGANA_${tenderId}`,
        title: title,
        location: division,
        state: 'Telangana',
        raw_state: 'Telangana',
        amount_inr: amountInr,
        value_cr: valueCr,
        pre_bid_date: preBidDate,
        due_date: dueDate,
        department: `Telangana - ${division}`,
        type_of_work: 'Turnkey Works',
        sector: cleanSectorFromTitle(title),
        status: 'Live',
        raw_status: 'Live',
        document_link: `https://tender.telangana.gov.in/login.html`,
        summary_sheet: '',
        bidders: [],
        bidders_count: 0,
        l1_price_info: noticeNo,
        remarks: 'Live from tender.telangana.gov.in'
      });

      if (discovered.length >= maxPerKw * (keywords.length || 1)) break;
    }
  } catch (err) {
    console.warn('[TELANGANA_CRAWLER] Crawl error:', err);
  }

  return discovered;
}
