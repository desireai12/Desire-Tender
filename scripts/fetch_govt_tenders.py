import os
import sys
import json
import re
import ssl
import time
import urllib.request
import urllib.parse
import http.cookiejar

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

OVERALL_PATH = r"d:\MAIL DATA\OneDrive - Desire Energy Solutions Pvt Ltd\Tender\Desire-Tender\apps\web\src\data\overall_tenders.json"
SUMMARY_PATH = r"d:\MAIL DATA\OneDrive - Desire Energy Solutions Pvt Ltd\Tender\Desire-Tender\apps\web\src\data\tracker_summary.json"

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

def clean_currency_to_cr(val_str):
    if not val_str:
        return 0.0
    s = str(val_str).replace(",", "").replace("₹", "").replace("&#8377;", "").strip()
    s = re.sub(r'[^\d.]+', '', s)
    try:
        num = float(s)
        # In GePNIC, 'Tender Value in ₹' is in absolute Rupees.
        # 1 Crore = 10,000,000 Rupees.
        # E.g., 121,100,000 -> 12.11 Cr; 97,398 -> 0.01 Cr.
        return round(num / 10000000.0, 2)
    except:
        return 0.0

def clean_sector_from_title(title, work_type=""):
    t = (title + " " + work_type).upper()
    if any(k in t for k in ["STP", "SEW", "EFFLUENT", "CETP", "ETP", "DRAIN", "SLUDGE", "WASTE WATER", "TREATMENT"]):
        return "STP & Sewerage Network"
    if any(k in t for k in ["SOLAR", "RENEW", "KUSUM", "PV", "BESS"]):
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

    def fetch_portal_tenders(self, state_name, portal_url, keywords, min_value_cr=10.0, max_tenders_per_kw=10):
        print(f"\n========================================================")
        print(f"Connecting to {state_name} GePNIC Portal: {portal_url}")
        print(f"Keywords to search: {keywords}")
        print(f"Threshold Filter: >= ₹{min_value_cr} Cr")
        print(f"========================================================")

        cj = http.cookiejar.CookieJar()
        opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj), urllib.request.HTTPSHandler(context=self.ctx))
        base_domain = portal_url.split("/nicgep")[0]

        discovered_tenders = []
        seen_tender_ids = set()

        for kw in keywords:
            print(f"\n[{state_name}] Searching Keyword: '{kw}'...")
            try:
                # 1. Fetch homepage to get active session and seedids
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

                # 3. Extract direct links to tender details
                links = re.findall(r'<a\s+[^>]*href=["\']([^"\']*component=%24DirectLink[^"\']*)["\'][^>]*>(.*?)</a>', res_html, re.DOTALL | re.IGNORECASE)
                links = [l for l in links if 'Back' not in l[1]]
                print(f"  Found {len(links)} tenders for '{kw}' on {state_name}")

                for href, text in links[:max_tenders_per_kw]:
                    raw_title = re.sub(r'<[^>]+>', '', text).strip()
                    detail_url = urllib.parse.urljoin(base_domain, href.replace('&amp;', '&'))

                    try:
                        req_det = urllib.request.Request(detail_url, headers={'User-Agent': self.headers['User-Agent'], 'Referer': portal_url})
                        with opener.open(req_det, timeout=12) as r:
                            det_html = r.read().decode('utf-8', errors='ignore')

                        # Extract table details
                        rows = re.findall(r'<tr[^>]*>(.*?)</tr>', det_html, re.DOTALL | re.IGNORECASE)
                        tender_info = {}
                        for row in rows:
                            tds = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL | re.IGNORECASE)
                            clean_tds = [re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', td)).strip() for td in tds]
                            for i in range(0, len(clean_tds) - 1, 2):
                                key = clean_tds[i].replace('&#8377;', '₹').strip()
                                val = clean_tds[i+1].replace('&#8377;', '₹').strip()
                                if key and val:
                                    tender_info[key] = val

                        tender_id = tender_info.get('Tender ID') or ""
                        if not tender_id:
                            # Try to find from title bracket e.g. [2026_PHCJA_593210_1]
                            id_match = re.search(r'\[([0-9]{4}_[A-Z0-9_]+)\]', raw_title)
                            tender_id = id_match.group(1) if id_match else f"{state_name[:2].upper()}-{int(time.time()*1000)%1000000}"

                        if tender_id in seen_tender_ids:
                            continue

                        # Extract Tender Value
                        val_raw = ""
                        for k, v in tender_info.items():
                            if 'tender value' in k.lower() or 'estimated value' in k.lower():
                                val_raw = v
                                break

                        val_cr = clean_currency_to_cr(val_raw)
                        
                        # Extract EMD Amount
                        emd_raw = ""
                        for k, v in tender_info.items():
                            if 'emd amount' in k.lower():
                                emd_raw = v
                                break
                        emd_cr = clean_currency_to_cr(emd_raw)

                        # If tender value was zero / not stated but EMD is present (standard 2% of contract value in Indian govt tenders)
                        if val_cr <= 0.0 and emd_cr >= 0.20:
                            val_cr = round(emd_cr * 50.0, 2)
                            print(f"  [Estimated Value from EMD ₹{emd_raw}]: ~₹{val_cr} Cr")

                        clean_title = tender_info.get('Title') or tender_info.get('Work Description') or raw_title
                        clean_title = re.sub(r'\[.*?\]', '', clean_title).strip() or raw_title

                        dept = tender_info.get('Organisation Chain') or tender_info.get('Tender Inviting Authority') or f"{state_name} Govt"
                        loc = tender_info.get('Location') or state_name
                        due_date = tender_info.get('Bid Submission End Date') or ""
                        pre_bid = tender_info.get('Pre Bid Meeting Date') or ""

                        # CRITICAL RULE ENFORCEMENT: Tender Value >= 10 Cr
                        if val_cr >= min_value_cr:
                            print(f"  >>> MATCH (>= ₹10 Cr): [{tender_id}] ₹{val_cr} Cr | {clean_title[:60]}")
                            item = {
                                "id": f"govt-{tender_id}",
                                "sr_no": str(len(seen_tender_ids) + 1),
                                "tender_id": tender_id,
                                "title": clean_title,
                                "location": loc,
                                "state": state_name,
                                "raw_state": state_name,
                                "amount_inr": round(val_cr * 10000000.0, 2),
                                "value_cr": val_cr,
                                "pre_bid_date": pre_bid,
                                "due_date": due_date,
                                "department": dept,
                                "type_of_work": tender_info.get('Product Category') or kw,
                                "sector": clean_sector_from_title(clean_title, kw),
                                "status": "Live",
                                "raw_status": "Live",
                                "document_link": detail_url,
                                "summary_sheet": "",
                                "bidders": [],
                                "bidders_count": 0,
                                "l1_price_info": "",
                                "remarks": f"Auto-ingested from {state_name} GePNIC portal for keyword: '{kw}' (Value >= ₹{min_value_cr} Cr)"
                            }
                            discovered_tenders.append(item)
                            seen_tender_ids.add(tender_id)
                        else:
                            print(f"  [Skipped < ₹10 Cr]: [{tender_id}] ₹{val_cr} Cr")

                    except Exception as det_err:
                        # Silently continue on single tender error
                        pass

            except Exception as kw_err:
                print(f"  Error on keyword '{kw}': {kw_err}")

        print(f"\n[{state_name}] Scan Completed: Discovered {len(discovered_tenders)} high-value (>= ₹{min_value_cr} Cr) tenders.")
        return discovered_tenders

def update_tracker_json(new_tenders):
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
    
    # Run test scan on Rajasthan and Haryana with top operational keywords
    test_keywords = ["Solar", "STP", "Water Supply", "Sewerage", "JJM"]
    
    all_found = []
    for state in ["Rajasthan", "Haryana"]:
        portal = STATE_PORTALS[state]
        tenders = fetcher.fetch_portal_tenders(state, portal, test_keywords, min_value_cr=10.0, max_tenders_per_kw=6)
        all_found.extend(tenders)

    if all_found:
        update_tracker_json(all_found)
    else:
        print("No tenders >= ₹10 Cr found in this sample batch.")
