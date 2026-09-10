import json
import os

# 1. Update service_price_database.json
db_path = r'apps/web/src/lib/service_price_database.json'
with open(db_path, 'r', encoding='utf-8') as f:
    db = json.load(f)

print(f"Current database entries: {len(db)}")

with open(r'apps/web/src/data/banaskantha_kankrej_real_tender.json', 'r', encoding='utf-8') as f:
    banas = json.load(f)

db = [x for x in db if not str(x.get('id', '')).startswith('rate-banas-')]

new_entries = []
for item in banas['boq_items']:
    desc = item.get('item_description', '')
    if not desc or len(desc) < 3:
        continue
    item_id = f"rate-banas-{item['id']}"
    purchase_c = float(item.get('purchase_price') or 0)
    service_c = float(item.get('service_price') or 0)
    total_rate = purchase_c + service_c
    if total_rate == 0 and item.get('sor_rate', 0) > 0:
        total_rate = item['sor_rate']
        
    new_entries.append({
        'id': item_id,
        'project': 'Banaskantha Kankrej Pipeline Project (69.78 Cr)',
        'city': 'Banaskantha (Palanpur)',
        'state': 'Gujarat',
        'item_description': desc[:120].replace('\n', ' '),
        'sub_description': f"{item.get('work_type', '')} - Qty: {item.get('qty', 0)} {item.get('unit', '')}",
        'unit': item.get('unit', 'Nos'),
        'purchase_cost': purchase_c,
        'service_cost': service_c,
        'total_unit_rate': round(total_rate, 2),
        'remarks': f"SOR Rate: Rs.{item.get('sor_rate', 0)} | Type: {item.get('work_type', '')}"
    })

db.extend(new_entries)
print(f"Added {len(new_entries)} Banaskantha rates. Total now: {len(db)}")

with open(db_path, 'w', encoding='utf-8') as f:
    json.dump(db, f, indent=2)

print("service_price_database.json updated successfully.")
