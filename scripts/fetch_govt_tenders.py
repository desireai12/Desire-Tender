import os
import sys
import json
import re
import ssl
import time
import urllib.request
import urllib.parse
import http.cookiejar
from typing import List, Dict, Any, Optional

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OVERALL_PATH = os.path.join(ROOT_DIR, "apps", "web", "src", "data", "overall_tenders.json")
SUMMARY_PATH = os.path.join(ROOT_DIR, "apps", "web", "src", "data", "tracker_summary.json")

STATE_PORTALS = {
    "Rajasthan": "https://eproc.rajasthan.gov.in/nicgep/app",
    "Haryana": "https://etenders.hry.nic.in/nicgep/app",
    "Uttar Pradesh": "https://etender.up.nic.in/nicgep/app",
    "Madhya Pradesh": "https://mptenders.gov.in/nicgep/app",
    "Delhi": "https://govtprocurement.delhi.gov.in/nicgep/app",
    "Maharashtra": "https://mahatenders.gov.in/nicgep/app",
    "Punjab": "https://eproc.punjab.gov.in/nicgep/app",
    "Odisha": "https://tendersodisha.gov.in/nicgep/app",
    "Tamil Nadu": "https://tntenders.gov.in/nicgep/app",
    "Central (All India)": "https://etenders.gov.in/eprocure/app"
}

KEYWORD_CATEGORIES = {
    "Water Supply & JJM": [
        "Water Supply", "Supply Scheme", "RWSS", "UWSS", "WSS", "Drinking Water",
        "JJM", "Turnkey", "Augmentation", "Amrut", "Tubewell", "Intake Well", "WTP"
    ],
    "STP & Wastewater": [
        "STP or treatment", "FSTP", "Sewerage", "Sewer", "Reuse", "SBM",
        "Swachh bharat mission", "waste", "CETP OR ETP", "ZLD", "TTP", "waste water mangement"
    ],
    "Solar & Renewable": [
        "SOLAR", "Solar Energy Based", "Solar Based", "SPV", "Dual Pumps",
        "Solar Pumps", "Pumping System", "Solar Based Micro Irrigation", "REIL (CPPP)"
    ],
    "Irrigation & Canal": [
        "Irrigation", "Lift Irrigation", "Micro Irrigation", "PDN, PIPE DISTRIBUTION NETWORK",
        "Canal", "Barrage", "Anicut"
    ],
    "SCADA & Automation": [
        "SCADA", "Automation", "PLC", "Centralized Water Management", "IOT Based"
    ],
    "ESCO & Energy Efficiency": [
        "ESCO", "Energy Efficient", "PPP Model", "Pumps"
    ]
}

def clean_currency_to_cr(val_str) -> float:
    if not val_str:
        return 0.0
    s = str(val_str).replace(",", "").replace("₹", "").replace("&#8377;", "").replace("Rs.", "").replace("Rs", "").strip()
    s = re.sub(r'[^\d.]+', '', s)
    try:
        num = float(s)
        if num <= 0:
            return 0.0
        # In GePNIC, values are in absolute Rupees.
        # 1 Cr = 10,000,000 INR
        if num >= 100000:
            return round(num / 10000000.0, 2)
        return round(num, 2)
    except:
        return 0.0

def extract_value_from_text(text: str) -> float:
    if not text:
        return 0.0
    cr_match = re.search(r'([0-9]+(?:\.[0-9]+)?)\s*(?:cr|crore|crores)', text, re.IGNORECASE)
    if cr_match:
        try:
            return round(float(cr_match.group(1)), 2)
        except:
            pass
    lakh_match = re.search(r'([0-9]+(?:\.[0-9]+)?)\s*(?:lac|lacs|lakh|lakhs)', text, re.IGNORECASE)
    if lakh_match:
        try:
            return round(float(lakh_match.group(1)) / 100.0, 2)
        except:
            pass
    return 0.0

def clean_sector_from_title(title: str, work_type: str = "") -> str:
    t = (title + " " + work_type).upper()
    if any(k in t for k in ["STP", "SEW", "EFFLUENT", "CETP", "ETP", "DRAIN", "SLUDGE", "WASTE WATER", "TREATMENT"]):
        return "STP & Sewerage Network"
    if any(k in t for k in ["SOLAR", "RENEW", "KUSUM", "PV", "BESS", "SPV"]):
        return "Solar & Renewable Energy"
    if any(k in t for k in ["O&M", "OPERATION", "MAINTENANCE"]):
        return "O&M Water & Civil Assets"
    if any(k in t for k in ["IRRIGATION", "CANAL", "DAM", "BARRAGE", "WEIR", "ANICUT"]):
        return "Canal, Dam & Irrigation"
    if any(k in t for k in ["SCADA", "AUTOMATION", "METER", "IOT", "PLC", "TELEMETRY"]):
        return "Smart Water, SCADA & Automation"
    if any(k in t for k in ["JJM", "RURAL", "VILLAGE", "PUMP HOUSE"]):
        return "JJM & Rural Water Supply"
    if any(k in t for k in ["PIPELINE", "LAYING", "DISTRIBUTION", "TRANSMISSION", "AUGMENTATION", "WSS", "RESERVOIR", "CWR", "OHSR", "WATER SUPPLY"]):
        return "Water Transmission & Pipelines"
    return "Turnkey EPC & Civil"


class GePNICGovtFetcher:
    def __init__(self):
        self.ctx = ssl.create_default_context()
        self.ctx.check_hostname = False
        self.ctx.verify_mode = ssl.CERT_NONE
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        }

    def _parse_detail_page(self, html: str) -> Dict[str, str]:
        info = {}
        rows = re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.DOTALL | re.IGNORECASE)
        for row in rows:
            tds = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL | re.IGNORECASE)
            clean_tds = [re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', td)).strip() for td in tds]
            for i in range(0, len(clean_tds) - 1, 2):
                k = clean_tds[i].replace('&#8377;', '₹').replace('&nbsp;', ' ').strip()
                v = clean_tds[i+1].replace('&#8377;', '₹').replace('&nbsp;', ' ').strip()
                if k and v:
                    info[k] = v
        return info

    def fetch_portal_tenders(
        self,
        state_name: str,
        portal_url: str,
        keywords: List[str],
        min_value_cr: float = 10.0,
        max_tenders_per_kw: int = 20
    ) -> List[Dict[str, Any]]:
        print(f"\n========================================================")
        print(f"Connecting to {state_name} GePNIC Portal: {portal_url}")
        print(f"Keywords to search: {keywords}")
        print(f"Threshold Filter: >= ₹{min_value_cr} Cr")
        print(f"========================================================")

        base_domain = portal_url.split("/nicgep")[0]
        portal_search_page = f"{portal_url}?page=FrontEndAdvancedSearch&service=page"
        discovered_tenders = []
        seen_tender_ids = set()

        for kw in keywords:
            print(f"\n[{state_name}] Searching Keyword: '{kw}'...")
            try:
                # Fresh cookie session per keyword
                cj = http.cookiejar.CookieJar()
                opener = urllib.request.build_opener(
                    urllib.request.HTTPCookieProcessor(cj),
                    urllib.request.HTTPSHandler(context=self.ctx)
                )

                # 1. Fetch homepage
                req = urllib.request.Request(portal_url, headers=self.headers)
                with opener.open(req, timeout=12) as r:
                    html = r.read().decode('utf-8', errors='ignore')

                form_match = re.search(r'<form[^>]*id=["\']tenderSearch["\'][^>]*>(.*?)</form>', html, re.DOTALL | re.IGNORECASE)
                if not form_match:
                    print(f"  Warning: tenderSearch form not found on {state_name}")
                    continue

                form_html = form_match.group(1)
                post_data = {n: v for n, v in re.findall(r'<input[^>]*name=["\']([^"\']+)["\'][^>]*value=["\']([^"\']*)["\']', form_html, re.IGNORECASE)}
                post_data['SearchDescription'] = kw
                post_data['Go'] = 'Go'

                encoded_data = urllib.parse.urlencode(post_data).encode('utf-8')
                post_headers = self.headers.copy()
                post_headers['Content-Type'] = 'application/x-www-form-urlencoded'
                post_headers['Referer'] = portal_url

                # 2. Submit keyword search
                post_req = urllib.request.Request(portal_url, data=encoded_data, headers=post_headers)
                with opener.open(post_req, timeout=15) as r:
                    res_html = r.read().decode('utf-8', errors='ignore')

                # 3. Extract all rows from results table
                rows = re.findall(r'<tr[^>]*class=["\'](?:even|odd)[\'"][^>]*>(.*?)</tr>', res_html, re.DOTALL | re.IGNORECASE)
                print(f"  Found {len(rows)} tenders in search table for '{kw}' on {state_name}")

                for idx, row in enumerate(rows[:max_tenders_per_kw]):
                    tds = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL | re.IGNORECASE)
                    if len(tds) < 6:
                        continue

                    clean_tds = [re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', td)).strip() for td in tds]
                    link_match = re.search(r'<a\s+[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', row, re.DOTALL | re.IGNORECASE)
                    href = link_match.group(1) if link_match else ""

                    full_col4 = clean_tds[4]
                    # Extract Tender ID
                    id_match = re.search(r'\[([0-9]{4}_[A-Z0-9_]+)\]', full_col4)
                    if id_match:
                        tender_id = id_match.group(1)
                    else:
                        id_fallback = re.search(r'([0-9]{4}_[A-Z0-9_]+)', full_col4)
                        tender_id = id_fallback.group(1) if id_fallback else f"{state_name[:2].upper()}-{int(time.time()*1000)%1000000}"

                    if tender_id in seen_tender_ids:
                        continue

                    clean_title = re.sub(r'\[.*?\]', '', full_col4).strip() or full_col4
                    pub_date = clean_tds[1]
                    due_date = clean_tds[2]
                    dept = clean_tds[5]

                    val_cr = 0.0

                    # 1. Check title/text for mentioned cost
                    val_from_title = extract_value_from_text(clean_title)
                    if val_from_title > 0:
                        val_cr = val_from_title

                    # 2. Fetch detail page
                    if href:
                        det_url = urllib.parse.urljoin(base_domain, href.replace('&amp;', '&'))
                        try:
                            det_req = urllib.request.Request(
                                det_url,
                                headers={
                                    'User-Agent': self.headers['User-Agent'],
                                    'Referer': portal_url,
                                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                                }
                            )
                            with opener.open(det_req, timeout=10) as det_r:
                                det_html = det_r.read().decode('utf-8', errors='ignore')

                            parsed_info = self._parse_detail_page(det_html)
                            
                            # Check Tender Value in parsed info
                            for k, v in parsed_info.items():
                                if 'tender value' in k.lower() or 'estimated value' in k.lower():
                                    val_parsed = clean_currency_to_cr(v)
                                    if val_parsed > 0:
                                        val_cr = val_parsed
                                        break

                            # If value was 0, check EMD Amount
                            if val_cr <= 0.0:
                                for k, v in parsed_info.items():
                                    if 'emd amount' in k.lower():
                                        emd_cr = clean_currency_to_cr(v)
                                        if emd_cr >= 0.20:
                                            val_cr = round(emd_cr * 50.0, 2)
                                        break
                        except Exception:
                            pass

                    # 3. Value Filter Evaluation
                    if val_cr >= min_value_cr:
                        print(f"  >>> MATCH (>= ₹{min_value_cr} Cr): [{tender_id}] ₹{val_cr} Cr | {clean_title[:50]}")
                        item = {
                            "id": f"govt-{tender_id}",
                            "sr_no": str(len(seen_tender_ids) + 1),
                            "tender_id": tender_id,
                            "title": clean_title,
                            "location": state_name,
                            "state": state_name,
                            "raw_state": state_name,
                            "amount_inr": round(val_cr * 10000000.0, 2),
                            "value_cr": val_cr,
                            "pre_bid_date": "",
                            "due_date": due_date,
                            "department": dept,
                            "type_of_work": kw,
                            "sector": clean_sector_from_title(clean_title, kw),
                            "status": "Live",
                            "raw_status": "Live",
                            "document_link": portal_search_page,
                            "portal_search_url": portal_search_page,
                            "portal_url": portal_url,
                            "summary_sheet": "",
                            "bidders": [],
                            "bidders_count": 0,
                            "l1_price_info": "",
                            "remarks": f"Live ingest from {state_name} GePNIC for '{kw}' (Value ₹{val_cr} Cr >= ₹{min_value_cr} Cr)"
                        }
                        discovered_tenders.append(item)
                        seen_tender_ids.add(tender_id)
                    else:
                        print(f"  [Skipped < ₹{min_value_cr} Cr]: [{tender_id}] ₹{val_cr} Cr | {clean_title[:45]}")

            except Exception as kw_err:
                print(f"  Error on keyword '{kw}': {kw_err}")

        print(f"\n[{state_name}] Scan Completed: Discovered {len(discovered_tenders)} high-value (>= ₹{min_value_cr} Cr) tenders.")
        return discovered_tenders


class FirecrawlGovtFetcher:
    """Optional Firecrawl API engine for robust cloud scraping with residential proxies."""
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("FIRECRAWL_API_KEY", "")

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    def fetch_portal_tenders(
        self,
        state_name: str,
        portal_url: str,
        keywords: List[str],
        min_value_cr: float = 10.0
    ) -> List[Dict[str, Any]]:
        if not self.is_configured():
            print("Firecrawl API key not configured. Falling back to native GePNIC fetcher.")
            native = GePNICGovtFetcher()
            return native.fetch_portal_tenders(state_name, portal_url, keywords, min_value_cr)

        print(f"Using Firecrawl API for {state_name} ({portal_url})...")
        try:
            results = []
            for kw in keywords:
                payload = {
                    "url": portal_url,
                    "formats": ["json"],
                    "jsonOptions": {
                        "prompt": f"Extract all government tenders on this page for keyword: {kw}. Return tender_id, title, department, estimated_value_in_rupees, and due_date."
                    },
                    "actions": [
                        {"type": "write", "text": kw, "selector": "input[name='SearchDescription']"},
                        {"type": "click", "selector": "input[name='Go']"},
                        {"type": "wait", "milliseconds": 3000}
                    ]
                }
                req = urllib.request.Request(
                    "https://api.firecrawl.dev/v1/scrape",
                    data=json.dumps(payload).encode('utf-8'),
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    }
                )
                with urllib.request.urlopen(req, timeout=40) as response:
                    data = json.loads(response.read().decode('utf-8'))
                    extracted = data.get("data", {}).get("json", {}).get("tenders", [])
                    for t in extracted:
                        val_cr = clean_currency_to_cr(t.get("estimated_value_in_rupees", 0))
                        if val_cr >= min_value_cr:
                            results.append({
                                "id": f"govt-{t.get('tender_id')}",
                                "tender_id": t.get("tender_id"),
                                "title": t.get("title"),
                                "location": state_name,
                                "state": state_name,
                                "value_cr": val_cr,
                                "due_date": t.get("due_date"),
                                "department": t.get("department"),
                                "sector": clean_sector_from_title(t.get("title", ""), kw),
                                "status": "Live",
                                "document_link": f"{portal_url}?page=FrontEndAdvancedSearch&service=page"
                            })
            return results
        except Exception as e:
            print(f"Firecrawl API error: {e}. Falling back to native fetcher...")
            native = GePNICGovtFetcher()
            return native.fetch_portal_tenders(state_name, portal_url, keywords, min_value_cr)


def update_tracker_json(new_tenders: List[Dict[str, Any]]) -> int:
    if not new_tenders:
        print("No new tenders to update.")
        return 0

    print(f"\nMerging {len(new_tenders)} new live government tenders into Tracker...")
    with open(OVERALL_PATH, "r", encoding="utf-8") as f:
        existing = json.load(f)

    existing_ids = {t["tender_id"] for t in existing if t.get("tender_id")}
    added_count = 0

    for t in new_tenders:
        if t["tender_id"] not in existing_ids:
            existing.insert(0, t)
            existing_ids.add(t["tender_id"])
            added_count += 1

    # Re-calculate summary
    state_counts = {}
    sector_counts = {}
    status_counts = {}
    total_val = 0.0

    for item in existing:
        st = item.get("state", "Other")
        sec = item.get("sector", "Turnkey EPC & Civil")
        sta = item.get("status", "Archived")
        val = item.get("value_cr", 0.0)

        state_counts[st] = state_counts.get(st, 0) + 1
        sector_counts[sec] = sector_counts.get(sec, 0) + 1
        status_counts[sta] = status_counts.get(sta, 0) + 1
        total_val += val

    with open(SUMMARY_PATH, "r", encoding="utf-8") as f:
        summary = json.load(f)

    summary["total_tenders"] = len(existing)
    summary["total_value_cr"] = round(total_val, 2)
    summary["state_breakdown"] = state_counts
    summary["sector_breakdown"] = sector_counts
    summary["status_breakdown"] = status_counts

    with open(OVERALL_PATH, "w", encoding="utf-8") as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)

    with open(SUMMARY_PATH, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print(f"SUCCESS: Added {added_count} new tenders! Master Tracker now has {len(existing)} tenders.")
    return added_count


if __name__ == "__main__":
    fetcher = GePNICGovtFetcher()
    test_keywords = ["Solar", "STP", "Water Supply", "JJM"]
    
    all_found = []
    for state in ["Rajasthan", "Haryana"]:
        portal = STATE_PORTALS[state]
        tenders = fetcher.fetch_portal_tenders(state, portal, test_keywords, min_value_cr=0.01, max_tenders_per_kw=5)
        all_found.extend(tenders)

    print(f"\nTotal Discovered: {len(all_found)}")
