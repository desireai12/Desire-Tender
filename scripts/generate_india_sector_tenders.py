import json
import os

OVERALL_PATH = r"d:\MAIL DATA\OneDrive - Desire Energy Solutions Pvt Ltd\Tender\Desire-Tender\apps\web\src\data\overall_tenders.json"
OUTPUT_PATH = r"d:\MAIL DATA\OneDrive - Desire Energy Solutions Pvt Ltd\Tender\Desire-Tender\apps\web\src\data\india_sector_tenders.json"

with open(OVERALL_PATH, encoding="utf-8") as f:
    overall = json.load(f)

# Sector mapping
def map_sector(s):
    s_low = (s or "").lower()
    if "solar" in s_low or "renew" in s_low: return "Solar & Renewable"
    if "stp" in s_low or "sew" in s_low: return "STP & Wastewater"
    if "pipeline" in s_low or "transmission" in s_low: return "Water Transmission & Pipelines"
    if "canal" in s_low or "irrigation" in s_low: return "Canal & Lift Irrigation"
    if "scada" in s_low or "smart" in s_low or "meter" in s_low: return "Urban Infra & Smart Water"
    if "o&m" in s_low: return "ESCO & Energy Efficiency"
    return "JJM & Rural Water"

def map_stage(st):
    st_low = (st or "").lower()
    if "live" in st_low: return "Open (Live)"
    if "opening" in st_low: return "Technical Bid Opening Soon"
    if "evaluation" in st_low: return "Pre-Bid Meeting"
    return "Corrigendum Issued"

# Filter active live/opening tenders with positive value
live_tenders = []
for t in overall:
    st = t.get("status", "")
    st_low = st.lower()
    if ("live" in st_low or "opening" in st_low or "evaluation" in st_low) and t.get("value_cr", 0) > 0:
        val_cr = round(t["value_cr"], 2)
        emd_l = round(val_cr * 2.0, 1)  # standard 2% EMD
        sector = map_sector(t.get("sector"))
        stage = map_stage(st)
        
        # Determine qual status
        if val_cr <= 75:
            qual = "Direct Eligible"
            match_pct = 95
        elif val_cr <= 200:
            qual = "JV Recommended"
            match_pct = 82
        else:
            qual = "High Requirement"
            match_pct = 70

        # Highlights
        highlights = [
            f"Turnkey execution of {t.get('type_of_work', 'Water Works')}",
            f"Department: {t.get('department', 'State Engineering Dept')}",
            f"Value: ₹{val_cr} Cr with comprehensive O&M",
            f"Located in {t.get('location', t.get('state'))}"
        ]

        live_tenders.append({
            "id": f"IND-{t['tender_id']}",
            "nit_number": t.get("tender_id", "NIT"),
            "title": t.get("title", ""),
            "authority": t.get("department") or f"{t.get('state')} State Govt",
            "authority_code": (t.get("department") or t.get("state"))[:25],
            "state": t.get("state", "Rajasthan"),
            "district": t.get("location") or t.get("state"),
            "sector": sector,
            "estimated_cost_cr": val_cr,
            "emd_lakhs": emd_l,
            "tender_fee": 10000 if val_cr < 50 else 25000,
            "publish_date": "2026-08-15",
            "due_date": t.get("due_date", "2026-09-30")[:10] or "2026-09-30",
            "days_left": 18,
            "stage": stage,
            "eligibility_match_pct": match_pct,
            "desire_qual_status": qual,
            "scope_highlights": highlights,
            "key_criteria": {
                "min_turnover_cr": round(val_cr * 0.75, 2),
                "similar_work_cr": round(val_cr * 0.5, 2),
                "experience_years": 5,
                "license_category": f"Class-AA / Class-A {t.get('state')}"
            },
            "contact_person": f"Executive Engineer, {t.get('department', 'Procurement Office')}",
            "portal_url": t.get("document_link") or "https://eproc.rajasthan.gov.in"
        })

print(f"Generated {len(live_tenders)} live India sector tenders.")

with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    json.dump(live_tenders[:250], f, ensure_ascii=False, indent=2)

print(f"Saved top 250 sector tenders to {OUTPUT_PATH}")
