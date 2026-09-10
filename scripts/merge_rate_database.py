import json
import os

db_path = r'd:\MAIL DATA\OneDrive - Desire Energy Solutions Pvt Ltd\Tender\Desire-Tender\apps\web\src\lib\service_price_database.json'
vapi_path = r'd:\MAIL DATA\OneDrive - Desire Energy Solutions Pvt Ltd\Tender\Desire-Tender\apps\web\src\data\vapi_karvad_real_tender.json'

with open(db_path, 'r', encoding='utf-8') as f:
    existing_db = json.load(f)

with open(vapi_path, 'r', encoding='utf-8') as f:
    vapi_data = json.load(f)

print(f"Original items in DB: {len(existing_db)}")

new_items = []
for b in vapi_data.get('boq_items', []):
    desc = b.get('item_description', '').strip()
    if not desc:
        continue
    
    lines = [l.strip() for l in desc.split('\n') if l.strip()]
    main_desc = lines[0] if lines else desc
    sub_desc = ' '.join(lines[1:]) if len(lines) > 1 else ''
    
    p_cost = b.get('purchase_price', 0)
    s_cost = b.get('service_price', 0) + b.get('service_guj', 0)
    tot_rate = p_cost + s_cost
    
    new_entry = {
        'id': f"rate-vapi-{b.get('id', len(existing_db) + len(new_items) + 1)}",
        'project': 'Vapi Karvad Water Supply EPC (31.8 Cr)',
        'city': 'Vapi (Valsad)',
        'state': 'Gujarat',
        'category': b.get('work_type', 'Civil & Structural'),
        'item_description': main_desc,
        'sub_description': sub_desc,
        'unit': b.get('unit', 'Nos'),
        'sor_rate': b.get('sor_rate', 0),
        'purchase_cost': p_cost,
        'service_cost': s_cost,
        'total_unit_rate': tot_rate if tot_rate > 0 else b.get('sor_rate', 0),
        'vendor_quotes': b.get('vendor_quotes', {}),
        'remarks': f"Schedule: {b.get('schedule', '').split(':')[0]}"
    }
    new_items.append(new_entry)

combined_db = existing_db + new_items
print(f"Total combined items in DB: {len(combined_db)}")

with open(db_path, 'w', encoding='utf-8') as f:
    json.dump(combined_db, f, indent=2)

print("Updated service_price_database.json successfully!")
