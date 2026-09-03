import os
import json
import re
import pandas as pd
import numpy as np

EXCEL_PATH = r"C:\Users\SHIWANGI SHARMA\Downloads\Tender Tracker -New.xlsx"
OUTPUT_DIR = r"d:\MAIL DATA\OneDrive - Desire Energy Solutions Pvt Ltd\Tender\Desire-Tender\apps\web\src\data"

os.makedirs(OUTPUT_DIR, exist_ok=True)

def safe_str(val):
    if pd.isna(val) or val is None:
        return ""
    if isinstance(val, pd.Timestamp):
        return val.strftime("%Y-%m-%d")
    s = str(val).strip()
    return "" if s.lower() == "nan" else s

def safe_float(val, default=0.0):
    if pd.isna(val) or val is None:
        return default
    if isinstance(val, (int, float)):
        return float(val) if not np.isnan(val) else default
    s = str(val).replace(",", "").replace("₹", "").replace("Cr", "").replace("cr", "").replace("Lakh", "").strip()
    try:
        return float(s)
    except:
        return default

def clean_state(st):
    s = safe_str(st).upper()
    if not s:
        return "Other"
    if "RAJ" in s: return "Rajasthan"
    if "GUJ" in s: return "Gujarat"
    if "UP" in s or "UTTAR" in s: return "Uttar Pradesh"
    if "MP" in s or "MADHYA" in s: return "Madhya Pradesh"
    if "HAR" in s or "HR" in s: return "Haryana"
    if "DEL" in s or "DL" in s: return "Delhi"
    if "MAH" in s or "MH" in s: return "Maharashtra"
    if "BIH" in s or "BR" in s: return "Bihar"
    if "PUN" in s or "PB" in s: return "Punjab"
    if "TAM" in s or "TN" in s: return "Tamil Nadu"
    if "KAR" in s or "KA" in s: return "Karnataka"
    if "ODI" in s or "OD" in s or "ORI" in s: return "Odisha"
    if "WB" in s or "WEST BENGAL" in s: return "West Bengal"
    if "TEL" in s or "TS" in s: return "Telangana"
    if "AP" in s or "ANDHRA" in s: return "Andhra Pradesh"
    return st.strip().title()

def clean_sector(work_type):
    wt = safe_str(work_type).upper()
    if not wt: return "Turnkey EPC & Civil"
    if any(k in wt for k in ["STP", "SEW", "EFFLUENT", "CETP", "ETP", "DRAIN", "SLUDGE", "WASTE WATER", "TREATMENT"]):
        return "STP & Sewerage Network"
    if any(k in wt for k in ["SOLAR", "RENEW", "KUSUM", "PV", "BESS"]):
        return "Solar & Renewable Energy"
    if any(k in wt for k in ["O&M", "OPERATION", "MAINTENANCE"]):
        return "O&M Water & Civil Assets"
    if any(k in wt for k in ["IRRIGATION", "CANAL", "DAM", "BARRAGE", "WEIR", "ANICUT", "CHECKDAM"]):
        return "Canal, Dam & Irrigation"
    if any(k in wt for k in ["SCADA", "AUTOMATION", "METER", "IOT", "RTU", "TELEMETRY", "ERP", "IT", "CCC"]):
        return "Smart Water, SCADA & Automation"
    if any(k in wt for k in ["JJM", "RURAL", "VILLAGE", "PANGHAT", "PUMP HOUSE"]):
        return "JJM & Rural Water Supply"
    if any(k in wt for k in ["PIPELINE", "LAYING", "DISTRIBUTION", "TRANSMISSION", "AUGMENTATION", "WSS", "RESERVOIR", "CWR", "OHSR", "TUBEWELL", "WATER SUPPLY"]):
        return "Water Transmission & Pipelines"
    return "Turnkey EPC & Civil"

def clean_status(st):
    s = safe_str(st)
    if not s: return "Archive"
    s_up = s.upper()
    if "LIVE" in s_up: return "Live"
    if "FINANCIAL BID OPENING" in s_up: return "Financial Bid Opening"
    if "FINANCIAL EVALUATION" in s_up: return "Financial Evaluation"
    if "TECHNICAL EVALUATION" in s_up: return "Technical Evaluation"
    if "TECHNICAL BID OPENING" in s_up: return "Technical Bid Opening"
    if "OPENING IN PROGRESS" in s_up: return "Opening in Progress"
    if "AOC" in s_up or "AWARD" in s_up: return "Awarded (AOC)"
    if "CANCEL" in s_up: return "Cancelled"
    if "ARCHIVE" in s_up: return "Archived"
    return s.title()

print("Reading Excel workbook...")

# 1. Overall Tenders
df_overall = pd.read_excel(EXCEL_PATH, sheet_name='Overall tenders', header=1)
overall_list = []
for idx, row in df_overall.iterrows():
    t_id = safe_str(row.get('TENDER ID'))
    t_name = safe_str(row.get('TENDER NAME '))
    if not t_id and not t_name:
        continue
    
    val_cr = safe_float(row.get('Value'))
    amt = safe_float(row.get('Amount'))
    if val_cr == 0 and amt > 0:
        val_cr = round(amt / 10000000.0, 2)
    
    raw_status = safe_str(row.get('STATUS'))
    status = clean_status(raw_status)
    raw_state = safe_str(row.get('STATE'))
    state = clean_state(raw_state)
    raw_work = safe_str(row.get('TYPE OF WORK'))
    sector = clean_sector(raw_work)
    
    bidders_raw = safe_str(row.get('BIDDERS'))
    bidders = [b.strip() for b in bidders_raw.split('\n') if b.strip()] if bidders_raw else []

    item = {
        "id": f"tnd-{idx+1:04d}",
        "sr_no": safe_str(row.get('SR.No')) or str(idx + 1),
        "tender_id": t_id,
        "title": t_name or f"Tender {t_id}",
        "location": safe_str(row.get('LOCATION')),
        "state": state,
        "raw_state": raw_state,
        "amount_inr": amt,
        "value_cr": val_cr,
        "pre_bid_date": safe_str(row.get('PRE BID MEETING DATE')),
        "due_date": safe_str(row.get('BID SUBMISSION END DATE')),
        "department": safe_str(row.get('DEPARTMENT')),
        "type_of_work": raw_work or sector,
        "sector": sector,
        "status": status,
        "raw_status": raw_status,
        "document_link": safe_str(row.get('TENDER DOCUMENT LINK')),
        "summary_sheet": safe_str(row.get('SUMMARY SHEET')),
        "bidders": bidders,
        "bidders_count": len(bidders),
        "l1_price_info": safe_str(row.get('L1 AND ALL BIDDERS PRICES % ABOVE/BELOW')),
        "remarks": safe_str(row.get('REMARKS')) or safe_str(row.get('Remarks'))
    }
    overall_list.append(item)

print(f"Loaded {len(overall_list)} overall tenders.")

# 2. Progress Tracker
df_prog = pd.read_excel(EXCEL_PATH, sheet_name='Progress Tracker', header=1)
prog_list = []
for idx, row in df_prog.iterrows():
    t_id = safe_str(row.get('Tender ID'))
    t_name = safe_str(row.get('TENDER NAME '))
    if not t_id and not t_name:
        continue
    
    val_str = safe_str(row.get('Value'))
    val_cr = safe_float(val_str)

    prog_list.append({
        "id": f"prog-{idx+1:03d}",
        "sr_no": safe_str(row.get('S.no.')) or str(idx + 1),
        "tender_id": t_id,
        "title": t_name,
        "location_dept": safe_str(row.get('Location/ Department')),
        "value_str": val_str,
        "value_cr": val_cr,
        "entry_type": safe_str(row.get('Entry Type')),
        "category": safe_str(row.get('Category')),
        "activity_task": safe_str(row.get('Activity / Task')),
        "deadline": safe_str(row.get('Deadline')),
        "priority": safe_str(row.get('Priority')) or "Normal",
        "owner": safe_str(row.get('Owner')),
        "status": safe_str(row.get('Status')) or "In Progress",
        "dependency": safe_str(row.get('Dependency')),
        "remarks": safe_str(row.get('Remarks')),
        "contact_name": safe_str(row.get('Contact Name')),
        "designation": safe_str(row.get('Designation')),
        "phone": safe_str(row.get('Phone')),
        "email": safe_str(row.get('Email'))
    })

print(f"Loaded {len(prog_list)} progress tracker items.")

# 3. BID OR NO BID
df_bonb = pd.read_excel(EXCEL_PATH, sheet_name='BID OR NO BID', header=1)
bonb_list = []
for idx, row in df_bonb.iterrows():
    t_id = safe_str(row.get('Tender Id'))
    if not t_id:
        continue
    
    bonb_list.append({
        "id": f"bonb-{idx+1:03d}",
        "sr_no": safe_str(row.get('Sr.No')) or str(idx + 1),
        "state_desc": safe_str(row.get('State')),
        "tender_id": t_id,
        "value_cr": safe_float(row.get('Value (in Cr)')),
        "submission_date": safe_str(row.get('Date of Submission')),
        "fy_year": safe_str(row.get('FY Year')),
        "partners": safe_str(row.get('PARTNERS')),
        "status": safe_str(row.get('Status')),
        "final_status": safe_str(row.get('Final Status')),
        "updates": safe_str(row.get('Updates'))
    })

print(f"Loaded {len(bonb_list)} BID OR NO BID items.")

# 4. O&M Tenders
df_om = pd.read_excel(EXCEL_PATH, sheet_name='O&M Tenders', header=1)
om_list = []
for idx, row in df_om.iterrows():
    t_id = safe_str(row.get('TENDER ID'))
    t_name = safe_str(row.get('TENDER NAME '))
    if not t_id and not t_name:
        continue
    
    val_cr = safe_float(row.get('TENDER VALUE in crore'))
    val_raw = safe_float(row.get('TENDER VALUE'))
    if val_cr == 0 and val_raw > 0:
        val_cr = round(val_raw / 10000000.0, 2)
        
    bidders_raw = safe_str(row.get('Bidders'))
    bidders = [b.strip() for b in bidders_raw.split('\n') if b.strip()] if bidders_raw else []

    om_list.append({
        "id": f"om-{idx+1:03d}",
        "sr_no": safe_str(row.get('S.NO.')) or str(idx + 1),
        "tender_id": t_id,
        "title": t_name,
        "om_period": safe_str(row.get('O&M PERIOD')),
        "location": safe_str(row.get('LOCATION')),
        "state": clean_state(safe_str(row.get('STATE'))),
        "value_cr": val_cr,
        "pre_bid_date": safe_str(row.get('Pre bid Meeting Date')),
        "due_date": safe_str(row.get('BID SUBMISSION END DATE')),
        "department": safe_str(row.get('Department')),
        "status": clean_status(safe_str(row.get('Status'))),
        "bidders": bidders,
        "document_link": safe_str(row.get('TD Link')),
        "costing_notes": safe_str(row.get('Costing'))
    })

print(f"Loaded {len(om_list)} O&M tenders.")

# 5. Order Booking Sheet
df_order = pd.read_excel(EXCEL_PATH, sheet_name='Order Booking Sheet', header=0)
order_list = []
for idx, row in df_order.iterrows():
    work_name = safe_str(row.get('Name of work'))
    if not work_name:
        continue
        
    order_list.append({
        "id": f"ord-{idx+1:03d}",
        "sr_no": safe_str(row.get('S. No. ')) or str(idx + 1),
        "name_of_work": work_name,
        "type": safe_str(row.get('Type')),
        "client": safe_str(row.get('Name of Client')),
        "scope_of_work": safe_str(row.get('Scope of work ')),
        "state": safe_str(row.get('State')),
        "department": safe_str(row.get('Department')),
        "work_done_cr": safe_float(row.get('Work done  upto (As on date)')),
        "order_booking_cr": safe_float(row.get('Order Booking')),
        "fy_23_24": safe_str(row.get('FY\n23-24')),
        "fy_24_25": safe_str(row.get('FY\n24-25')),
        "fy_25_26": safe_str(row.get('FY\n25-26'))
    })

print(f"Loaded {len(order_list)} order booking items.")

# Compute summary stats
state_counts = {}
sector_counts = {}
status_counts = {}
total_val_cr = 0.0

for t in overall_list:
    st = t["state"]
    sec = t["sector"]
    sta = t["status"]
    state_counts[st] = state_counts.get(st, 0) + 1
    sector_counts[sec] = sector_counts.get(sec, 0) + 1
    status_counts[sta] = status_counts.get(sta, 0) + 1
    total_val_cr += t["value_cr"]

summary_data = {
    "total_tenders": len(overall_list),
    "total_value_cr": round(total_val_cr, 2),
    "total_progress_items": len(prog_list),
    "total_bonb_items": len(bonb_list),
    "total_om_items": len(om_list),
    "total_order_booking_items": len(order_list),
    "state_breakdown": state_counts,
    "sector_breakdown": sector_counts,
    "status_breakdown": status_counts
}

# Write JSON output files
with open(os.path.join(OUTPUT_DIR, "overall_tenders.json"), "w", encoding="utf-8") as f:
    json.dump(overall_list, f, ensure_ascii=False, indent=2)

with open(os.path.join(OUTPUT_DIR, "progress_tracker.json"), "w", encoding="utf-8") as f:
    json.dump(prog_list, f, ensure_ascii=False, indent=2)

with open(os.path.join(OUTPUT_DIR, "bid_or_no_bid.json"), "w", encoding="utf-8") as f:
    json.dump(bonb_list, f, ensure_ascii=False, indent=2)

with open(os.path.join(OUTPUT_DIR, "om_tenders.json"), "w", encoding="utf-8") as f:
    json.dump(om_list, f, ensure_ascii=False, indent=2)

with open(os.path.join(OUTPUT_DIR, "order_booking.json"), "w", encoding="utf-8") as f:
    json.dump(order_list, f, ensure_ascii=False, indent=2)

with open(os.path.join(OUTPUT_DIR, "tracker_summary.json"), "w", encoding="utf-8") as f:
    json.dump(summary_data, f, ensure_ascii=False, indent=2)

print("SUCCESS: All Excel tracker data exported to apps/web/src/data/!")
