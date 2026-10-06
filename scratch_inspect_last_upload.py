import psycopg2
import json

db_url = 'postgresql://postgres.udwjptggvaavoemuvjbm:desireenergy%401234@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres'
conn = psycopg2.connect(db_url)
cur = conn.cursor()

cur.execute("SELECT id, tender_name, project_category, created_at, updated_at FROM public.tenders ORDER BY updated_at DESC LIMIT 5;")
tenders = cur.fetchall()

print("=== RECENT TENDERS IN DATABASE ===")
for t in tenders:
    print(f"ID: {t[0]} | Title: {t[1].encode('ascii', 'replace').decode()} | Category: {t[2]} | Updated: {t[4]}")

print("\n=== RECENT TENDER CHUNKS IN DATABASE ===")
cur.execute("SELECT tender_id, count(*), max(created_at) FROM public.tender_chunks GROUP BY tender_id ORDER BY max(created_at) DESC LIMIT 10;")
chunks = cur.fetchall()
for c in chunks:
    print(f"Tender ID: {c[0]} | Chunks Count: {c[1]} | Last Chunk Created: {c[2]}")

print("\n=== RECENT AUDIT LOGS / EXTRACTED TEXT METRICS ===")
cur.execute("SELECT actor, action, target, details, timestamp FROM public.audit_logs ORDER BY timestamp DESC LIMIT 10;")
logs = cur.fetchall()
for l in logs:
    print(f"Time: {l[4]} | Actor: {l[0]} | Action: {l[1]} | Details: {l[3].encode('ascii', 'replace').decode()[:150]}")

cur.close()
conn.close()
