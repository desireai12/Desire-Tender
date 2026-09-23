import crypto from 'crypto';
import { GovtTenderResult, cleanSectorFromTitle } from './gepnic-crawler';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 8000): Promise<Response> {
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

function generateRandomString(length: number = 5): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let res = '';
  for (let i = 0; i < length; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

function encryptNProcurePayload(plainPayload: string): { jsonData: string; iv: string; salt: string; key: string } {
  const randStr = generateRandomString(5);
  const passphraseB64 = Buffer.from(randStr, 'utf-8').toString('base64');

  const saltBytes = crypto.randomBytes(16);
  const ivBytes = crypto.randomBytes(16);

  // PBKDF2 with SHA1, 1000 iterations, 16 bytes (matches nProcure CryptoJS config)
  const key = crypto.pbkdf2Sync(randStr, saltBytes, 1000, 16, 'sha1');

  const cipher = crypto.createCipheriv('aes-128-cbc', key, ivBytes);
  let encrypted = cipher.update(plainPayload, 'utf-8', 'base64');
  encrypted += cipher.final('base64');

  return {
    jsonData: encrypted,
    iv: ivBytes.toString('hex'),
    salt: saltBytes.toString('hex'),
    key: passphraseB64
  };
}

export async function crawlGujaratNProcurePortal(
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
    // 1. Fetch homepage to get TSESSIONID and CSRF token
    const homeUrl = 'https://tender.nprocure.com';
    const homeRes = await fetchWithTimeout(homeUrl, {
      headers: browserHeaders,
      cache: 'no-store'
    }, 8000);

    const sessionCookie = extractAllCookies(homeRes);
    const homeHtml = await homeRes.text();
    const csrfMatch = homeHtml.match(/<meta\s+name=["']_csrf["']\s+content=["']([^"']*)["']/i);
    const csrf = csrfMatch ? csrfMatch[1] : '';

    const apiUrl = 'https://tender.nprocure.com/beforeLoginTenderTableList';

    // 2. Extract atomic keywords (e.g. "STP or treatment" -> "STP", "treatment")
    const atomicKws: string[] = [];
    for (const k of keywords) {
      const parts = k.split(/\s+or\s+/i).map(s => s.trim()).filter(Boolean);
      for (const p of parts) {
        if (!atomicKws.includes(p)) atomicKws.push(p);
      }
    }
    // Limit to top 4 search terms to stay safely within the portal timeout
    const searchTerms = atomicKws.length > 0 ? atomicKws.slice(0, 4) : ['Solar', 'Water'];

    await Promise.all(searchTerms.map(async (kw) => {
      try {
        const aoData = [
          { name: 'sEcho', value: 1 },
          { name: 'iColumns', value: 3 },
          { name: 'sColumns', value: ',,' },
          { name: 'iDisplayStart', value: 0 },
          { name: 'iDisplayLength', value: maxPerKw * 2 },
          { name: 'mDataProp_0', value: '1' },
          { name: 'mDataProp_1', value: '2' },
          { name: 'mDataProp_2', value: '3' },
          { name: 'SEARCH', value: 'ADV' },
          { name: 'TENDERTITLE', value: kw }
        ];

        const plainDict = {
          reqData: aoData,
          _csrf: csrf,
          idList: '0',
          id: 'Tenders In Progress'
        };

        const enc = encryptNProcurePayload(JSON.stringify(plainDict));
        const bodyPayload = JSON.stringify({
          jsonData: enc.jsonData,
          iv: enc.iv,
          salt: enc.salt,
          key: enc.key
        });

        const apiRes = await fetchWithTimeout(apiUrl, {
          method: 'POST',
          headers: {
            ...browserHeaders,
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': homeUrl,
            'Cookie': sessionCookie
          },
          body: bodyPayload,
          cache: 'no-store'
        }, 7000);

        if (!apiRes.ok) return;

        const resJson = await apiRes.json();
        const dataList = resJson?.data || [];

        for (const item of dataList) {
          const noticeNo = (item['1'] || '').trim();
          const briefHtml = item['2'] || '';

          // Extract Tender ID (e.g. "Tender Id :347800")
          const tidMatch = briefHtml.match(/Tender\s*Id\s*:\s*([0-9]+)/i);
          const tenderId = tidMatch ? tidMatch[1] : '';
          if (!tenderId || seenIds.has(tenderId)) continue;

          // Extract Work Name / Title
          const nameMatch = briefHtml.match(/Name\s*Of\s*Work\s*:\s*(?:<\/strong>)?\s*([^<]+)/i) ||
                            briefHtml.match(/<strong[^>]*>Name\s*Of\s*Work\s*:\s*<\/strong>\s*([^<]+)<\/a>/i);
          const title = nameMatch ? nameMatch[1].replace(/\s+/g, ' ').trim() : `Gujarat Tender ${tenderId}`;

          // Extract Department
          const deptMatch = briefHtml.match(/<span[^>]*style=[^>]*>\s*([^<]+)\s*<form/i) ||
                            briefHtml.match(/<span[^>]*>\s*([^<]+)\s*<\/span>/i);
          const department = deptMatch ? deptMatch[1].trim() : 'Gujarat State Department';

          // Extract Estimated Contract Value
          const ecvMatch = briefHtml.match(/Estimated\s*Contract\s*Value\s*:\s*([0-9,.]+)/i);
          let amountInr = 0;
          let valueCr = 0.0;
          if (ecvMatch) {
            const rawVal = ecvMatch[1].replace(/,/g, '').trim();
            amountInr = parseFloat(rawVal) || 0;
            valueCr = amountInr > 0 ? Math.round((amountInr / 10000000.0) * 100) / 100 : 0.0;
          }

          // Extract Submission Date
          const dateMatch = briefHtml.match(/Submission\s*:\s*([0-9-]+\s*[0-9:]+)/i) ||
                            briefHtml.match(/Last\s*Date\s*&\s*Time\s*For\s*Submission\s*:\s*([0-9-]+\s*[0-9:]+)/i);
          const dueDate = dateMatch ? dateMatch[1].trim() : 'Open';

          if (minValueCr > 0 && valueCr > 0 && valueCr < minValueCr) continue;

          seenIds.add(tenderId);
          discovered.push({
            id: `GUJ-${tenderId}`,
            sr_no: String(discovered.length + 1),
            tender_id: `2026_GUJARAT_${tenderId}`,
            title: title,
            location: 'Gujarat',
            state: 'Gujarat',
            raw_state: 'Gujarat',
            amount_inr: amountInr,
            value_cr: valueCr,
            pre_bid_date: '',
            due_date: dueDate,
            department: `Gujarat - ${department}`,
            type_of_work: 'Turnkey Works',
            sector: cleanSectorFromTitle(title),
            status: 'Live',
            raw_status: 'Live',
            document_link: `https://tender.nprocure.com`,
            summary_sheet: '',
            bidders: [],
            bidders_count: 0,
            l1_price_info: noticeNo,
            remarks: 'Live from tender.nprocure.com'
          });

          if (discovered.length >= maxPerKw * (keywords.length || 1)) break;
        }
      } catch (kwErr) {
        console.warn(`[NPROCURE_CRAWLER] Keyword '${kw}' crawl error:`, kwErr);
      }
    }));
  } catch (err) {
    console.warn('[NPROCURE_CRAWLER] General crawl error:', err);
  }

  return discovered;
}
